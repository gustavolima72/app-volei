// balanceTeams.js
// Lógica pura (sem React) do sorteio de times equilibrados.
// Isolada aqui para poder ser testada/ajustada sem mexer na tela.

const NIVEL_PADRAO = 3 // usado quando o jogador não tem nivel_tecnico definido

export function inferirNivel(jogador) {
  return jogador.nivel_tecnico ?? NIVEL_PADRAO
}

// Chave única e não-ordenada pra identificar uma dupla de jogadores — "A|B" e "B|A"
// sempre viram a mesma chave, porque ordenamos antes de juntar. Exportada pra loja
// usar exatamente a mesma convenção ao montar o mapa de histórico.
export function chaveParceria(idJogadorA, idJogadorB) {
  return [idJogadorA, idJogadorB].sort().join('|')
}

function somaNivel(time) {
  return time.reduce((acc, jogador) => acc + inferirNivel(jogador), 0)
}

/**
 * Distribui uma lista já ordenada (do maior nível pro menor) entre os times
 * em formato "snake": 0,1,...,N-1,N-1,...,1,0,0,1,...
 * Isso evita que o time que "começa" a escolha sempre fique com o melhor
 * E o pior jogador do grupo (o clássico problema do draft em ordem fixa).
 */
function distribuirSnake(listaOrdenada, times) {
  let indice = 0
  let direcao = 1 // 1 = indo pra frente, -1 = voltando

  for (const jogador of listaOrdenada) {
    times[indice].push(jogador)

    if (direcao === 1) {
      if (indice === times.length - 1) direcao = -1
      else indice += 1
    } else {
      if (indice === 0) direcao = 1
      else indice -= 1
    }
  }
}

/**
 * Ajuste fino: tenta trocar jogadores do MESMO SEXO entre os times
 * (nunca entre sexos diferentes, pra não desequilibrar a contagem M/F)
 * sempre que a troca reduzir a diferença de nível técnico total entre os times.
 * Repete até não conseguir mais melhorar ou atingir um limite de tentativas.
 */
function ajustarFino(times) {
  const [timeA, timeB] = times
  let melhorou = true
  let rodadas = 0
  const LIMITE_RODADAS = 200 // trava de segurança, roster real nunca chega perto disso

  while (melhorou && rodadas < LIMITE_RODADAS) {
    melhorou = false
    rodadas += 1
    const diferencaAtual = Math.abs(somaNivel(timeA) - somaNivel(timeB))

    for (let i = 0; i < timeA.length; i += 1) {
      for (let j = 0; j < timeB.length; j += 1) {
        const jogadorA = timeA[i]
        const jogadorB = timeB[j]
        if (jogadorA.sexo !== jogadorB.sexo) continue

        const novaSomaA = somaNivel(timeA) - inferirNivel(jogadorA) + inferirNivel(jogadorB)
        const novaSomaB = somaNivel(timeB) - inferirNivel(jogadorB) + inferirNivel(jogadorA)
        const novaDiferenca = Math.abs(novaSomaA - novaSomaB)

        if (novaDiferenca < diferencaAtual) {
          timeA[i] = jogadorB
          timeB[j] = jogadorA
          melhorou = true
          break // recalcula a partir do estado novo na próxima rodada
        }
      }
      if (melhorou) break
    }
  }

  return times
}

/** Soma quantas vezes os jogadores de UM time já jogaram juntos antes, somando cada par. */
function custoRepeticao(time, contagemParcerias) {
  let custo = 0
  for (let i = 0; i < time.length; i += 1) {
    for (let j = i + 1; j < time.length; j += 1) {
      custo += contagemParcerias[chaveParceria(time[i].id, time[j].id)] ?? 0
    }
  }
  return custo
}

/**
 * Terceira passada, só depois do equilíbrio técnico já estar pronto: tenta trocar
 * jogadores do mesmo sexo entre os times pra DIMINUIR quantas duplas repetidas
 * (que já jogaram juntas antes, segundo o histórico) ficam no mesmo time desta vez.
 *
 * Regra de ouro aqui: uma troca só é aceita se ela NÃO piorar o equilíbrio técnico.
 * Variedade é desempate, nunca prioridade — equilibrado sempre vem primeiro.
 */
function ajustarVariedade(times, contagemParcerias) {
  if (!contagemParcerias || Object.keys(contagemParcerias).length === 0) return times

  const [timeA, timeB] = times
  let melhorou = true
  let rodadas = 0
  const LIMITE_RODADAS = 200

  while (melhorou && rodadas < LIMITE_RODADAS) {
    melhorou = false
    rodadas += 1

    const diferencaNivelAtual = Math.abs(somaNivel(timeA) - somaNivel(timeB))
    const repeticaoAtual = custoRepeticao(timeA, contagemParcerias) + custoRepeticao(timeB, contagemParcerias)

    for (let i = 0; i < timeA.length; i += 1) {
      for (let j = 0; j < timeB.length; j += 1) {
        const jogadorA = timeA[i]
        const jogadorB = timeB[j]
        if (jogadorA.sexo !== jogadorB.sexo) continue

        const novoTimeA = timeA.slice()
        const novoTimeB = timeB.slice()
        novoTimeA[i] = jogadorB
        novoTimeB[j] = jogadorA

        const novaDiferencaNivel = Math.abs(somaNivel(novoTimeA) - somaNivel(novoTimeB))
        if (novaDiferencaNivel > diferencaNivelAtual) continue // pioraria o equilíbrio — descarta na hora

        const novaRepeticao =
          custoRepeticao(novoTimeA, contagemParcerias) + custoRepeticao(novoTimeB, contagemParcerias)

        if (novaRepeticao < repeticaoAtual) {
          timeA[i] = jogadorB
          timeB[j] = jogadorA
          melhorou = true
          break
        }
      }
      if (melhorou) break
    }
  }

  return times
}

/**
 * Gera 2 times equilibrados a partir dos jogadores selecionados.
 * Prioridade: 1º quantidade igual de homens e mulheres por time,
 *             2º soma de nível técnico o mais próxima possível,
 *             3º (desempate) menos duplas repetidas em relação ao histórico.
 *
 * `contagemParcerias` é opcional: um mapa { "idA|idB": quantasVezesJogaramJuntos }.
 * Sem ele (ou vazio), o sorteio se comporta exatamente como antes.
 */
export function generateTeams(jogadoresSelecionados, contagemParcerias = {}) {
  const mulheres = jogadoresSelecionados
    .filter((j) => j.sexo === 'F')
    .sort((a, b) => inferirNivel(b) - inferirNivel(a))

  const homens = jogadoresSelecionados
    .filter((j) => j.sexo === 'M')
    .sort((a, b) => inferirNivel(b) - inferirNivel(a))

  const timeA = []
  const timeB = []
  const times = [timeA, timeB]

  distribuirSnake(mulheres, times) // mulheres primeiro, garante paridade de gênero
  distribuirSnake(homens, times) // depois preenche o restante com os homens

  ajustarFino(times)
  ajustarVariedade(times, contagemParcerias)

  return [
    { nome: 'Time A', jogadores: timeA, forca: somaNivel(timeA) },
    { nome: 'Time B', jogadores: timeB, forca: somaNivel(timeB) },
  ]
}
