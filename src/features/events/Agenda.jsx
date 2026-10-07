import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, Clock, MapPin, Check, CalendarPlus, AlertCircle } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore.js'
import CreateEventModal from './CreateEventModal.jsx'

function inicial(nome) {
  return nome.trim().charAt(0).toUpperCase()
}

function corAvatar(jogador) {
  if (jogador.souEu) return 'bg-crow-500 text-white'
  if (jogador.sexo === 'F') return 'bg-pink-500/15 text-pink-400'
  if (jogador.sexo === 'M') return 'bg-sky-500/15 text-sky-400'
  return 'bg-zinc-700 text-zinc-300'
}

function formatarData(isoString) {
  return new Date(isoString).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  })
}

function formatarHora(isoString) {
  return new Date(isoString).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function LinhaJogador({ jogador }) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`flex items-center gap-3 rounded-xl border p-2.5 ${
        jogador.souEu ? 'border-crow-500 bg-crow-500/10' : 'border-court-border bg-court-surface'
      }`}
    >
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-semibold ${corAvatar(jogador)}`}>
        {inicial(jogador.nome)}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm text-white">{jogador.nome}</span>
      {jogador.posicao && <span className="shrink-0 text-xs text-zinc-500">{jogador.posicao}</span>}
    </motion.li>
  )
}

export default function Agenda() {
  const jogadores = useAppStore((estado) => estado.jogadores)
  const eventoAtual = useAppStore((estado) => estado.eventoAtual)
  const presencas = useAppStore((estado) => estado.presencas)
  const carregando = useAppStore((estado) => estado.carregandoEvento)
  const erro = useAppStore((estado) => estado.erroEvento)
  const carregarEvento = useAppStore((estado) => estado.carregarEvento)
  const meuJogadorId = useAppStore((estado) => estado.meuJogadorId)
  const definirMeuJogadorId = useAppStore((estado) => estado.definirMeuJogadorId)
  const confirmarPresenca = useAppStore((estado) => estado.confirmarPresenca)
  const recusarPresenca = useAppStore((estado) => estado.recusarPresenca)
  const criarEvento = useAppStore((estado) => estado.criarEvento)

  const [modalAberto, setModalAberto] = useState(false)

  useEffect(() => {
    carregarEvento()
  }, [carregarEvento])

  async function handleCriarEvento(dados) {
    const resultado = await criarEvento(dados)
    if (resultado.sucesso) setModalAberto(false)
  }

  // ---- Ainda não sabemos quem é o usuário deste dispositivo ----
  if (!meuJogadorId) {
    return (
      <div className="h-full overflow-y-auto px-4 pt-5 pb-6">
        <h1 className="mb-1 text-xl font-semibold text-white">Quem é você?</h1>
        <p className="mb-4 text-sm text-zinc-500">
          Escolha seu nome no elenco pra poder confirmar presença nos jogos deste aparelho.
        </p>
        <ul className="space-y-2">
          {jogadores.map((jogador) => (
            <li key={jogador.id}>
              <button
                onClick={() => definirMeuJogadorId(jogador.id)}
                className="w-full rounded-xl border border-court-border bg-court-surface p-3 text-left text-sm font-medium text-white active:border-crow-500"
              >
                {jogador.nome}
              </button>
            </li>
          ))}
        </ul>
        {jogadores.length === 0 && (
          <p className="mt-6 text-center text-sm text-zinc-500">
            Ninguém cadastrado ainda — vá em Elenco e adicione seu nome primeiro.
          </p>
        )}
      </div>
    )
  }

  // ---- Carregando ou sem evento aberto ----
  if (carregando && !eventoAtual) {
    return <p className="mt-10 text-center text-sm text-zinc-500">Carregando agenda…</p>
  }

  if (!eventoAtual) {
    return (
      <div className="relative flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
        <p className="text-sm text-zinc-500">Nenhum jogo em aberto no momento.</p>
        <p className="text-xs text-zinc-600">Toque no + para criar o próximo evento.</p>

        <button
          aria-label="Criar novo evento"
          onClick={() => setModalAberto(true)}
          className="fixed bottom-24 right-5 z-30 grid h-11 w-11 place-items-center rounded-full border border-crow-500 bg-court-surface text-crow-500 shadow-lg"
        >
          <CalendarPlus size={18} />
        </button>

        <CreateEventModal
          aberto={modalAberto}
          aoFechar={() => setModalAberto(false)}
          aoCriar={handleCriarEvento}
        />
      </div>
    )
  }

  const minhaPresenca = presencas.find((p) => p.jogador_id === meuJogadorId)
  const meuStatus = minhaPresenca?.status_presenca ?? null

  const confirmados = presencas
    .filter((p) => p.status_presenca === 'Confirmado')
    .map((p) => ({
      id: p.id,
      nome: p.jogadores?.nome ?? 'Jogador',
      sexo: p.jogadores?.sexo ?? null,
      posicao: p.jogadores?.posicao ?? null,
      souEu: p.jogador_id === meuJogadorId,
    }))

  const filaDeEspera = presencas
    .filter((p) => p.status_presenca === 'Fila_de_Espera')
    .map((p) => ({
      id: p.id,
      nome: p.jogadores?.nome ?? 'Jogador',
      sexo: p.jogadores?.sexo ?? null,
      posicao: p.jogadores?.posicao ?? null,
      souEu: p.jogador_id === meuJogadorId,
    }))

  return (
    <div className="relative h-full overflow-y-auto px-4 pt-5 pb-6">
      <h1 className="mb-4 text-xl font-semibold text-white">Agenda</h1>

      {erro && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          <AlertCircle size={14} className="shrink-0" />
          <span className="truncate">{erro}</span>
        </div>
      )}

      {/* Card do próximo jogo */}
      <div className="mb-4 rounded-xl border border-court-border bg-court-surface p-4">
        <div className="mb-3 space-y-2">
          <div className="flex items-center gap-2 text-sm capitalize text-zinc-300">
            <Calendar size={15} className="text-crow-500" />
            {formatarData(eventoAtual.data_hora)}
          </div>
          <div className="flex items-center gap-2 text-sm text-zinc-300">
            <Clock size={15} className="text-crow-500" />
            {formatarHora(eventoAtual.data_hora)}
          </div>
          {eventoAtual.local && (
            <div className="flex items-center gap-2 text-sm text-zinc-300">
              <MapPin size={15} className="text-crow-500" />
              {eventoAtual.local}
            </div>
          )}
        </div>

        <div className="mb-4 flex items-center justify-between border-t border-court-border pt-3">
          <span className="text-xs text-zinc-500">Vagas preenchidas</span>
          <span className="text-sm font-medium text-white">
            {confirmados.length}/{eventoAtual.limite_jogadores} confirmados
          </span>
        </div>

        {/* Ações de RSVP */}
        {meuStatus === 'Confirmado' || meuStatus === 'Fila_de_Espera' ? (
          <motion.button
            initial={{ scale: 0.96 }}
            animate={{ scale: 1 }}
            onClick={() => recusarPresenca(meuJogadorId)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-crow-500/15 py-3 text-sm font-medium text-crow-500"
          >
            <Check size={16} />
            {meuStatus === 'Confirmado' ? 'Presença Confirmada' : 'Você está na Fila de Espera'}
          </motion.button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => confirmarPresenca(meuJogadorId)}
              className="flex-[2] rounded-xl bg-crow-500 py-3 text-sm font-semibold text-white active:opacity-90"
            >
              Tô Dentro!
            </button>
            <button
              onClick={() => recusarPresenca(meuJogadorId)}
              className={`flex-1 rounded-xl py-3 text-sm font-medium transition-colors ${
                meuStatus === 'Nao_Vou' ? 'bg-court-border text-white' : 'bg-court-bg text-zinc-400'
              }`}
            >
              Não Vou
            </button>
          </div>
        )}
      </div>

      {/* Confirmados */}
      <p className="mb-2 text-sm font-medium text-zinc-400">Confirmados</p>
      <ul className="mb-5 space-y-2">
        {confirmados.length === 0 && (
          <p className="text-sm text-zinc-600">Ninguém confirmou presença ainda.</p>
        )}
        <AnimatePresence initial={false}>
          {confirmados.map((jogador) => (
            <LinhaJogador key={jogador.id} jogador={jogador} />
          ))}
        </AnimatePresence>
      </ul>

      {/* Fila de espera */}
      {filaDeEspera.length > 0 && (
        <>
          <div className="mb-2 flex items-center gap-2">
            <span className="h-px flex-1 border-t border-dashed border-crow-500/40" />
            <p className="text-xs font-medium text-crow-500">Fila de espera</p>
            <span className="h-px flex-1 border-t border-dashed border-crow-500/40" />
          </div>
          <ul className="space-y-2">
            <AnimatePresence initial={false}>
              {filaDeEspera.map((jogador) => (
                <LinhaJogador key={jogador.id} jogador={jogador} />
              ))}
            </AnimatePresence>
          </ul>
        </>
      )}

      {/* FAB do organizador — agora abre o modal de criação de verdade */}
      <button
        aria-label="Criar novo evento (organizador)"
        onClick={() => setModalAberto(true)}
        className="fixed bottom-24 right-5 z-30 grid h-11 w-11 place-items-center rounded-full border border-crow-500 bg-court-surface text-crow-500 shadow-lg"
      >
        <CalendarPlus size={18} />
      </button>

      <CreateEventModal
        aberto={modalAberto}
        aoFechar={() => setModalAberto(false)}
        aoCriar={handleCriarEvento}
      />
    </div>
  )
}
