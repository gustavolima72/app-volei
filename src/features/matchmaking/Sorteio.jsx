import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shuffle, Check, Star, Trophy, AlertCircle } from 'lucide-react'
import { generateTeams, inferirNivel } from './algorithms/balanceTeams.js'
import { useAppStore } from '../../store/useAppStore.js'

const FORMATOS = [2, 3, 4, 5, 6] // jogadores por time (sempre 2 times: A x B)

function NivelMini({ nivel }) {
  const valor = inferirNivel({ nivel_tecnico: nivel })
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={11}
          className={n <= valor ? 'fill-crow-500 text-crow-500' : 'fill-transparent text-zinc-700'}
        />
      ))}
    </div>
  )
}

export default function Sorteio() {
  const jogadores = useAppStore((estado) => estado.jogadores)
  const times = useAppStore((estado) => estado.timesGerados)
  const definirTimesGerados = useAppStore((estado) => estado.definirTimesGerados)
  const buscarHistoricoParcerias = useAppStore((estado) => estado.buscarHistoricoParcerias)
  const salvarTimesNoEvento = useAppStore((estado) => estado.salvarTimesNoEvento)
  const erro = useAppStore((estado) => estado.erroEvento)

  const [formato, setFormato] = useState(4)
  const [selecionados, setSelecionados] = useState(() => new Set())
  const [sorteando, setSorteando] = useState(false)

  const alvo = formato * 2 // 2 times sempre, ex: 4x4 precisa de 8 no total

  function alternarSelecao(id) {
    setSelecionados((atual) => {
      const novo = new Set(atual)
      if (novo.has(id)) novo.delete(id)
      else novo.add(id)
      return novo
    })
    definirTimesGerados(null) // qualquer mudança na seleção invalida o sorteio anterior
  }

  async function handleGerarTimes() {
    setSorteando(true)
    const jogadoresSelecionados = jogadores.filter((j) => selecionados.has(j.id))

    // Busca quantas vezes cada dupla já jogou junta antes, pra variar os times
    // sem nunca sacrificar o equilíbrio técnico (prioridade 1) nem o de gênero.
    const contagemParcerias = await buscarHistoricoParcerias()
    const timesGerados = generateTeams(jogadoresSelecionados, contagemParcerias)

    definirTimesGerados(timesGerados)
    await salvarTimesNoEvento(timesGerados) // entra pro histórico — alimenta o próximo sorteio também
    setSorteando(false)
  }

  const podeGerar = selecionados.size === alvo && !sorteando

  return (
    <div className="h-full overflow-y-auto px-4 pt-5 pb-6">
      <h1 className="mb-4 text-xl font-semibold text-white">Sorteio de Times</h1>

      {erro && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          <AlertCircle size={14} className="shrink-0" />
          <span className="truncate">{erro}</span>
        </div>
      )}

      {/* Seleção de formato */}
      <div className="mb-5">
        <p className="mb-2 text-sm text-zinc-400">Formato</p>
        <div className="flex gap-2">
          {FORMATOS.map((n) => (
            <button
              key={n}
              onClick={() => {
                setFormato(n)
                definirTimesGerados(null)
              }}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                formato === n ? 'bg-crow-500 text-white' : 'bg-court-surface text-zinc-400'
              }`}
            >
              {n}x{n}
            </button>
          ))}
        </div>
      </div>

      {/* Contador + checklist de presentes */}
      <div className="mb-3 flex items-baseline justify-between">
        <p className="text-sm text-zinc-400">Selecione quem está presente</p>
        <span className={`text-sm font-medium ${podeGerar ? 'text-crow-500' : 'text-zinc-500'}`}>
          Selecionados: {selecionados.size}/{alvo}
        </span>
      </div>

      <ul className="mb-5 space-y-2">
        {jogadores.map((jogador) => {
          const ativo = selecionados.has(jogador.id)
          return (
            <li key={jogador.id}>
              <button
                onClick={() => alternarSelecao(jogador.id)}
                className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                  ativo ? 'border-crow-500 bg-crow-500/10' : 'border-court-border bg-court-surface'
                }`}
              >
                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border ${
                    ativo ? 'border-crow-500 bg-crow-500' : 'border-zinc-600'
                  }`}
                >
                  {ativo && <Check size={14} className="text-white" />}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-white">{jogador.nome}</span>
                    <span className="text-[10px] text-zinc-500">
                      {jogador.sexo === 'F' ? 'Fem.' : 'Masc.'}
                    </span>
                    {jogador.visitante && (
                      <span className="shrink-0 rounded-full bg-crow-500/15 px-1.5 py-0.5 text-[9px] font-medium text-crow-500">
                        Visitante
                      </span>
                    )}
                  </span>
                </span>

                <NivelMini nivel={jogador.nivel_tecnico} />
              </button>
            </li>
          )
        })}
      </ul>

      {/* Botão principal */}
      <motion.button
        whileTap={{ scale: podeGerar ? 0.97 : 1 }}
        onClick={handleGerarTimes}
        disabled={!podeGerar}
        className="mb-6 flex w-full items-center justify-center gap-2 rounded-xl bg-crow-500 py-3.5 font-semibold text-white disabled:opacity-30"
      >
        <Shuffle size={18} />
        {sorteando ? 'Sorteando…' : 'Gerar Times Equilibrados'}
      </motion.button>

      {!podeGerar && selecionados.size > 0 && (
        <p className="-mt-4 mb-6 text-center text-xs text-zinc-500">
          Selecione exatamente {alvo} jogadores para o formato {formato}x{formato}
        </p>
      )}

      {/* Resultado do sorteio */}
      <AnimatePresence>
        {times && (
          <div className="space-y-3">
            {times.map((time, index) => (
              <motion.div
                key={time.nome}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: index * 0.12, ease: 'easeOut' }}
                className="rounded-xl border border-court-border bg-court-surface p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold text-white">{time.nome}</h3>
                  <span className="flex items-center gap-1 rounded-full bg-crow-500/15 px-2.5 py-1 text-xs font-medium text-crow-500">
                    <Trophy size={12} />
                    Força: {time.forca}
                  </span>
                </div>

                <ul className="space-y-1.5">
                  {time.jogadores.map((jogador) => (
                    <li key={jogador.id} className="flex items-center gap-2 text-sm text-zinc-300">
                      <span className="text-[10px] text-zinc-500">{jogador.sexo}</span>
                      <span className="truncate">{jogador.nome}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
