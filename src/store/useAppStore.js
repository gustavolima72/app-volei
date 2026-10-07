import { create } from 'zustand'
import { supabase } from '../lib/supabaseClient.js'
import { chaveParceria } from '../features/matchmaking/algorithms/balanceTeams.js'

export const useAppStore = create((set, get) => ({
  // ---- Elenco (roster) — agora persistido na tabela `jogadores` do Supabase ----
  jogadores: [],
  carregandoJogadores: false,
  erroJogadores: null,

  carregarJogadores: async () => {
    set({ carregandoJogadores: true, erroJogadores: null })

    const { data, error } = await supabase
      .from('jogadores')
      .select('*')
      .order('criado_em', { ascending: false })

    if (error) {
      set({ erroJogadores: error.message, carregandoJogadores: false })
      return
    }

    set({ jogadores: data, carregandoJogadores: false })
  },

  // Update otimista: o jogador aparece na lista na hora, antes da confirmação do banco.
  // Se o insert falhar, o registro temporário é removido e o erro fica disponível em erroJogadores.
  adicionarJogador: async (dados) => {
    const idTemporario = `temp-${Date.now()}`
    const registroTemporario = { id: idTemporario, criado_em: new Date().toISOString(), ...dados }

    set((estado) => ({ jogadores: [registroTemporario, ...estado.jogadores] }))

    const { data, error } = await supabase.from('jogadores').insert(dados).select().single()

    if (error) {
      set((estado) => ({
        jogadores: estado.jogadores.filter((j) => j.id !== idTemporario),
        erroJogadores: error.message,
      }))
      return
    }

    // Troca o registro temporário pelo real, já com o UUID definitivo do banco.
    set((estado) => ({
      jogadores: estado.jogadores.map((j) => (j.id === idTemporario ? data : j)),
    }))
  },

  atualizarJogador: async (id, patch) => {
    set((estado) => ({
      jogadores: estado.jogadores.map((j) => (j.id === id ? { ...j, ...patch } : j)),
    }))

    const { error } = await supabase.from('jogadores').update(patch).eq('id', id)
    if (error) set({ erroJogadores: error.message })
  },

  // ---- Evento atual (compartilhado por Agenda e Vaquinha) ----
  // eventoAtual: a linha de `eventos` mais próxima com status 'Aberto'.
  // presencas: TODAS as linhas desse evento (Confirmado / Fila_de_Espera / Nao_Vou),
  // já trazendo nome/sexo/posicao do jogador via join (jogadores(...)).
  // A Agenda usa a lista inteira pra montar confirmados + fila; a Vaquinha filtra
  // só os 'Confirmado' na hora de calcular a divisão do custo.
  eventoAtual: null,
  presencas: [],
  carregandoEvento: false,
  erroEvento: null,

  carregarEvento: async () => {
    set({ carregandoEvento: true, erroEvento: null })

    const { data: evento, error: erroBuscaEvento } = await supabase
      .from('eventos')
      .select('*')
      .eq('status', 'Aberto')
      .order('data_hora', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (erroBuscaEvento) {
      set({ erroEvento: erroBuscaEvento.message, carregandoEvento: false })
      return
    }

    if (!evento) {
      set({ eventoAtual: null, presencas: [], carregandoEvento: false })
      return
    }

    const { data: presencas, error: erroPresencas } = await supabase
      .from('presencas')
      .select(
        'id, jogador_id, status_presenca, status_pagamento, data_confirmacao, jogadores(nome, sexo, posicao)',
      )
      .eq('evento_id', evento.id)
      .order('data_confirmacao', { ascending: true })

    if (erroPresencas) {
      set({ eventoAtual: evento, erroEvento: erroPresencas.message, carregandoEvento: false })
      return
    }

    set({ eventoAtual: evento, presencas: presencas ?? [], carregandoEvento: false })
  },

  criarEvento: async (dados) => {
    // Só um evento "Aberto" por vez — fecha qualquer evento aberto anterior antes de criar o novo,
    // pra `carregarEvento()` nunca ficar em dúvida sobre qual é "o" evento atual.
    await supabase.from('eventos').update({ status: 'Finalizado' }).eq('status', 'Aberto')

    const { data, error } = await supabase
      .from('eventos')
      .insert({ ...dados, status: 'Aberto' })
      .select()
      .single()

    if (error) {
      set({ erroEvento: error.message })
      return { sucesso: false, erro: error.message }
    }

    // O evento recém-criado passa a ser o evento atual da sessão, sem precisar
    // de um novo round-trip ao banco só pra confirmar o que a gente já tem em mãos.
    set({ eventoAtual: data, presencas: [] })
    return { sucesso: true }
  },

  atualizarCustoTotal: async (novoCusto) => {
    const eventoAtual = get().eventoAtual
    if (!eventoAtual) return

    set({ eventoAtual: { ...eventoAtual, custo_total: novoCusto } })

    const { error } = await supabase
      .from('eventos')
      .update({ custo_total: novoCusto })
      .eq('id', eventoAtual.id)

    if (error) set({ erroEvento: error.message })
  },

  alternarStatusPagamento: async (presencaId, proximoStatus) => {
    set((estado) => ({
      presencas: estado.presencas.map((p) =>
        p.id === presencaId ? { ...p, status_pagamento: proximoStatus } : p,
      ),
    }))

    const { error } = await supabase
      .from('presencas')
      .update({ status_pagamento: proximoStatus })
      .eq('id', presencaId)

    if (error) set({ erroEvento: error.message })
  },

  // ---- Identidade do dispositivo (sem login) ----
  // Guardamos qual jogador do roster "é você" neste dispositivo, direto no localStorage —
  // é o suficiente pra RSVP funcionar sem exigir cadastro/login de ninguém.
  meuJogadorId:
    typeof window !== 'undefined' ? localStorage.getItem('volei-app:meu-jogador-id') : null,

  definirMeuJogadorId: (id) => {
    if (typeof window !== 'undefined') localStorage.setItem('volei-app:meu-jogador-id', id)
    set({ meuJogadorId: id })
  },

  // ---- RSVP (Agenda) ----
  // upsert com onConflict: 'evento_id,jogador_id' aproveita a constraint UNIQUE que já existe
  // na tabela `presencas` — então confirmar de novo só atualiza a linha, nunca duplica.
  confirmarPresenca: async (jogadorId) => {
    const { eventoAtual, presencas } = get()
    if (!eventoAtual) return

    const totalConfirmados = presencas.filter((p) => p.status_presenca === 'Confirmado').length
    const novoStatus = totalConfirmados < eventoAtual.limite_jogadores ? 'Confirmado' : 'Fila_de_Espera'

    const { data, error } = await supabase
      .from('presencas')
      .upsert(
        { evento_id: eventoAtual.id, jogador_id: jogadorId, status_presenca: novoStatus },
        { onConflict: 'evento_id,jogador_id' },
      )
      .select('id, jogador_id, status_presenca, status_pagamento, data_confirmacao, jogadores(nome, sexo, posicao)')
      .single()

    if (error) {
      set({ erroEvento: error.message })
      return
    }

    set((estado) => {
      const jaExiste = estado.presencas.some((p) => p.jogador_id === jogadorId)
      return {
        presencas: jaExiste
          ? estado.presencas.map((p) => (p.jogador_id === jogadorId ? data : p))
          : [...estado.presencas, data],
      }
    })
  },

  // Marca "Não Vou" e, se a vaga era de um "Confirmado", promove automaticamente
  // quem está há mais tempo esperando na fila — a "mágica" da fila de espera.
  recusarPresenca: async (jogadorId) => {
    const { eventoAtual, presencas } = get()
    if (!eventoAtual) return

    const minhaPresencaAnterior = presencas.find((p) => p.jogador_id === jogadorId)
    const abriuVaga = minhaPresencaAnterior?.status_presenca === 'Confirmado'

    const { data, error } = await supabase
      .from('presencas')
      .upsert(
        { evento_id: eventoAtual.id, jogador_id: jogadorId, status_presenca: 'Nao_Vou' },
        { onConflict: 'evento_id,jogador_id' },
      )
      .select('id, jogador_id, status_presenca, status_pagamento, data_confirmacao, jogadores(nome, sexo, posicao)')
      .single()

    if (error) {
      set({ erroEvento: error.message })
      return
    }

    set((estado) => ({
      presencas: estado.presencas.map((p) => (p.jogador_id === jogadorId ? data : p)),
    }))

    if (!abriuVaga) return

    const proximoDaFila = get()
      .presencas.filter((p) => p.status_presenca === 'Fila_de_Espera')
      .sort((a, b) => new Date(a.data_confirmacao) - new Date(b.data_confirmacao))[0]

    if (!proximoDaFila) return

    const { data: promovido, error: erroPromocao } = await supabase
      .from('presencas')
      .update({ status_presenca: 'Confirmado' })
      .eq('id', proximoDaFila.id)
      .select('id, jogador_id, status_presenca, status_pagamento, data_confirmacao, jogadores(nome, sexo, posicao)')
      .single()

    if (erroPromocao) {
      set({ erroEvento: erroPromocao.message })
      return
    }

    set((estado) => ({
      presencas: estado.presencas.map((p) => (p.id === promovido.id ? promovido : p)),
    }))
  },

  // ---- Sorteio -> Placar ----
  // O resultado "ao vivo" continua em memória (é o que a tela de Placar usa agora),
  // mas agora também é gravado nas tabelas `times` e `jogadores_time` pra virar histórico.
  timesGerados: null,
  definirTimesGerados: (times) => set({ timesGerados: times }),

  // Monta um mapa { "idA|idB": quantasVezesJogaramJuntos } varrendo todo o histórico
  // de `jogadores_time`. Usado pelo algoritmo como critério de variedade (desempate).
  buscarHistoricoParcerias: async () => {
    const { data, error } = await supabase.from('jogadores_time').select('jogador_id, time_id')

    if (error || !data) {
      if (error) set({ erroEvento: error.message })
      return {}
    }

    const jogadoresPorTime = {}
    for (const linha of data) {
      if (!jogadoresPorTime[linha.time_id]) jogadoresPorTime[linha.time_id] = []
      jogadoresPorTime[linha.time_id].push(linha.jogador_id)
    }

    const contagem = {}
    for (const idsDoTime of Object.values(jogadoresPorTime)) {
      for (let i = 0; i < idsDoTime.length; i += 1) {
        for (let j = i + 1; j < idsDoTime.length; j += 1) {
          const chave = chaveParceria(idsDoTime[i], idsDoTime[j])
          contagem[chave] = (contagem[chave] ?? 0) + 1
        }
      }
    }

    return contagem
  },

  // Grava o sorteio gerado nas tabelas `times` + `jogadores_time`, associado ao evento aberto.
  // Sem evento aberto, o sorteio continua funcionando normalmente na tela, só não vira histórico.
  salvarTimesNoEvento: async (times) => {
    const eventoAtual = get().eventoAtual
    if (!eventoAtual) {
      set({ erroEvento: 'Nenhum evento aberto — este sorteio não entrou pro histórico.' })
      return
    }

    for (const time of times) {
      const { data: timeInserido, error: erroTime } = await supabase
        .from('times')
        .insert({ evento_id: eventoAtual.id, nome_time: time.nome })
        .select()
        .single()

      if (erroTime) {
        set({ erroEvento: erroTime.message })
        return
      }

      const vinculos = time.jogadores.map((jogador) => ({
        time_id: timeInserido.id,
        jogador_id: jogador.id,
      }))

      const { error: erroVinculo } = await supabase.from('jogadores_time').insert(vinculos)
      if (erroVinculo) {
        set({ erroEvento: erroVinculo.message })
        return
      }
    }
  },

  // ---- Conquistas (MVP e medalhas do Placar) ----
  registrarConquista: async (jogadorId, tipoConquista) => {
    const eventoAtual = get().eventoAtual
    if (!eventoAtual) return // sem evento aberto, fica só visual na tela mesmo

    const { error } = await supabase
      .from('conquistas')
      .insert({ evento_id: eventoAtual.id, jogador_id: jogadorId, tipo_conquista: tipoConquista })

    if (error) set({ erroEvento: error.message })
  },

  removerConquista: async (jogadorId, tipoConquista) => {
    const eventoAtual = get().eventoAtual
    if (!eventoAtual) return

    const { error } = await supabase
      .from('conquistas')
      .delete()
      .eq('evento_id', eventoAtual.id)
      .eq('jogador_id', jogadorId)
      .eq('tipo_conquista', tipoConquista)

    if (error) set({ erroEvento: error.message })
  },
}))
