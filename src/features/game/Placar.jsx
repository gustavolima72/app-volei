import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CircleDot, Minus, Crown, Shield, Zap, Frown, X } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore.js'

const PONTOS_PARA_VENCER_SET = 25
const DIFERENCA_MINIMA = 2
const SETS_EXIBIDOS = 3 // quantidade de bolinhas mostradas (melhor de 3, ajuste se jogarem melhor de 5)

const MEDALHAS = [
  { id: 'muralha', label: 'Muralha', icone: Shield },
  { id: 'ace', label: 'Ace', icone: Zap },
  { id: 'pantufa', label: 'Mão de Pantufa', icone: Frown },
]

export default function Placar() {
  const timesGerados = useAppStore((estado) => estado.timesGerados)
  const registrarConquista = useAppStore((estado) => estado.registrarConquista)
  const removerConquista = useAppStore((estado) => estado.removerConquista)

  const [placar, setPlacar] = useState({ A: 0, B: 0 })
  const [setsVencidos, setSetsVencidos] = useState({ A: 0, B: 0 })
  const [saque, setSaque] = useState('A')
  const [pulsando, setPulsando] = useState({ A: false, B: false })
  const [mvpAberto, setMvpAberto] = useState(false)
  const [mvpId, setMvpId] = useState(null)
  const [medalhaAtiva, setMedalhaAtiva] = useState(null)
  const [medalhasAtribuidas, setMedalhasAtribuidas] = useState({}) // { [jogadorId]: Set(medalhaId) }

  // Detecta fim de set sempre que o placar muda: quem chegou a 25 com 2 de vantagem
  // vence o set, ganha uma bolinha, e o placar da partida zera pro próximo set.
  useEffect(() => {
    const { A, B } = placar
    const maior = Math.max(A, B)
    const diferenca = Math.abs(A - B)

    if (maior >= PONTOS_PARA_VENCER_SET && diferenca >= DIFERENCA_MINIMA) {
      const vencedor = A > B ? 'A' : 'B'
      setSetsVencidos((atual) => ({ ...atual, [vencedor]: atual[vencedor] + 1 }))
      setPlacar({ A: 0, B: 0 })
    }
  }, [placar])

  function pontuar(time) {
    setPlacar((atual) => ({ ...atual, [time]: atual[time] + 1 }))

    // Regra do rally point: quem faz o ponto assume o saque.
    // Se o time que já sacava pontuar, isso é um "no-op" (continua sacando).
    // Se for o time que estava recebendo, o saque troca automaticamente — é exatamente essa a regra pedida.
    setSaque(time)

    setPulsando((atual) => ({ ...atual, [time]: true }))
    setTimeout(() => setPulsando((atual) => ({ ...atual, [time]: false })), 300)
  }

  function corrigir(time) {
    setPlacar((atual) => ({ ...atual, [time]: Math.max(0, atual[time] - 1) }))
  }

  function alternarMvp(jogadorId) {
    if (medalhaAtiva) {
      // modo "atribuir medalha": toca no jogador pra dar a medalha selecionada.
      // Checa o estado ANTES de disparar o update — evita duplicar o insert/delete
      // no Supabase caso o React reexecute essa função (StrictMode faz isso em dev).
      const label = MEDALHAS.find((m) => m.id === medalhaAtiva).label
      const jaTinha = (medalhasAtribuidas[jogadorId] ?? new Set()).has(medalhaAtiva)

      setMedalhasAtribuidas((atual) => {
        const atuais = new Set(atual[jogadorId] ?? [])
        jaTinha ? atuais.delete(medalhaAtiva) : atuais.add(medalhaAtiva)
        return { ...atual, [jogadorId]: atuais }
      })

      if (jaTinha) removerConquista(jogadorId, label)
      else registrarConquista(jogadorId, label)

      setMedalhaAtiva(null) // volta ao modo normal depois de atribuir, evita cliques acidentais em cascata
      return
    }

    const mvpAnterior = mvpId
    const eraMvp = mvpAnterior === jogadorId

    setMvpId(eraMvp ? null : jogadorId)

    if (eraMvp) {
      removerConquista(jogadorId, 'MVP')
    } else {
      if (mvpAnterior) removerConquista(mvpAnterior, 'MVP') // só pode ter um craque do jogo por vez
      registrarConquista(jogadorId, 'MVP')
    }
    return
  }

  // Sem sorteio feito ainda nesta sessão, não tem nome de time nem roster pra mostrar.
  // Todos os hooks acima já foram declarados, então esse retorno antecipado é seguro.
  if (!timesGerados) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm text-zinc-500">Nenhum time foi sorteado ainda nesta sessão.</p>
        <Link
          to="/sorteio"
          className="rounded-lg bg-crow-500 px-4 py-2 text-sm font-medium text-white"
        >
          Ir para o Sorteio
        </Link>
      </div>
    )
  }

  const [timeA, timeB] = timesGerados
  const NOMES_TIMES = { A: timeA.nome, B: timeB.nome }
  const jogadoresPartida = [
    ...timeA.jogadores.map((j) => ({ ...j, time: 'A' })),
    ...timeB.jogadores.map((j) => ({ ...j, time: 'B' })),
  ]

  return (
    <div className="relative flex h-full flex-col bg-court-bg">
      {/* Marcadores de set */}
      <div className="flex items-center justify-center gap-8 pt-4">
        {['A', 'B'].map((time) => (
          <div key={time} className="flex gap-1.5">
            {Array.from({ length: SETS_EXIBIDOS }).map((_, i) => (
              <span
                key={i}
                className={`h-2 w-2 rounded-full ${
                  i < setsVencidos[time] ? 'bg-crow-500' : 'bg-court-border'
                }`}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Placar principal — dois lados, toque em qualquer área soma ponto */}
      <div className="flex flex-1">
        {['A', 'B'].map((time) => (
          <div key={time} className="flex flex-1 flex-col">
            {/* Nome do time + indicador de saque */}
            <div className="flex items-center justify-center gap-1.5 pt-3">
              {saque === time && <CircleDot size={16} className="text-crow-500" />}
              <span className="text-sm font-medium text-zinc-400">{NOMES_TIMES[time]}</span>
            </div>

            {/* Área de toque gigante — ocupa quase toda a metade da tela */}
            <button
              onClick={() => pontuar(time)}
              className="flex flex-1 items-center justify-center active:bg-white/5"
              aria-label={`+1 ponto para ${NOMES_TIMES[time]}`}
            >
              <motion.span
                key={placar[time]}
                initial={{ scale: 1.25 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className={`text-8xl font-bold tabular-nums ${
                  pulsando[time] ? 'text-crow-500' : 'text-white'
                }`}
              >
                {placar[time]}
              </motion.span>
            </button>

            {/* Correção manual */}
            <div className="flex justify-center pb-5">
              <button
                onClick={() => corrigir(time)}
                aria-label={`-1 ponto para ${NOMES_TIMES[time]}`}
                className="grid h-10 w-10 place-items-center rounded-full bg-court-surface text-zinc-400 active:bg-court-border"
              >
                <Minus size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Divisor central sutil entre os dois lados */}
      <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-court-border" />

      {/* Encerrar partida */}
      <div
        className="px-4 pb-4"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <button
          onClick={() => setMvpAberto(true)}
          className="w-full rounded-xl bg-court-surface py-3 text-sm font-medium text-zinc-300 active:bg-court-border"
        >
          Finalizar Jogo e Escolher MVP
        </button>
      </div>

      {/* Overlay de fim de jogo — MVP e medalhas */}
      <AnimatePresence>
        {mvpAberto && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="absolute inset-0 z-50 flex flex-col bg-court-bg"
          >
            <div className="flex items-center justify-between px-4 pt-5">
              <h2 className="text-lg font-semibold text-white">Fim de Jogo 🏐</h2>
              <button onClick={() => setMvpAberto(false)} aria-label="Fechar" className="text-zinc-400">
                <X size={22} />
              </button>
            </div>
            <p className="px-4 pt-1 text-sm text-zinc-500">Toque em um jogador para eleger o Craque do Jogo</p>

            {/* Lista de jogadores */}
            <ul className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
              {jogadoresPartida.map((jogador) => {
                const ehMvp = mvpId === jogador.id
                const medalhasDele = medalhasAtribuidas[jogador.id]
                return (
                  <li key={jogador.id}>
                    <button
                      onClick={() => alternarMvp(jogador.id)}
                      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                        ehMvp ? 'border-crow-500 bg-crow-500/10' : 'border-court-border bg-court-surface'
                      }`}
                    >
                      {ehMvp ? (
                        <Crown size={18} className="shrink-0 text-crow-500" />
                      ) : (
                        <span className="w-[18px] shrink-0" />
                      )}

                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-white">
                        {jogador.nome}
                      </span>

                      <span className="text-[10px] text-zinc-500">{NOMES_TIMES[jogador.time]}</span>

                      {/* Badges das medalhas extras já atribuídas */}
                      {medalhasDele &&
                        [...medalhasDele].map((idMedalha) => {
                          const medalha = MEDALHAS.find((m) => m.id === idMedalha)
                          const Icone = medalha.icone
                          return <Icone key={idMedalha} size={14} className="shrink-0 text-crow-500" />
                        })}
                    </button>
                  </li>
                )
              })}
            </ul>

            {/* Medalhas extras */}
            <div
              className="border-t border-court-border px-4 py-4"
              style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
            >
              <p className="mb-2 text-xs text-zinc-500">
                {medalhaAtiva
                  ? 'Agora toque no jogador que vai receber a medalha'
                  : 'Medalhas extras — toque em uma e depois no jogador'}
              </p>
              <div className="flex gap-2">
                {MEDALHAS.map(({ id, label, icone: Icone }) => (
                  <button
                    key={id}
                    onClick={() => setMedalhaAtiva((atual) => (atual === id ? null : id))}
                    className={`flex flex-1 flex-col items-center gap-1 rounded-lg py-2.5 text-[11px] font-medium transition-colors ${
                      medalhaAtiva === id
                        ? 'bg-crow-500 text-white'
                        : 'bg-court-surface text-zinc-400'
                    }`}
                  >
                    <Icone size={16} />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
