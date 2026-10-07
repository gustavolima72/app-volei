import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Star, MapPin, AlertCircle } from 'lucide-react'
import PlayerModal from './PlayerModal.jsx'
import { useAppStore } from '../../store/useAppStore.js'

function BadgeSexo({ sexo }) {
  const cor = sexo === 'F' ? 'bg-pink-500/15 text-pink-400' : 'bg-sky-500/15 text-sky-400'
  return (
    <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${cor}`}>
      {sexo}
    </span>
  )
}

function NivelTecnico({ nivel }) {
  if (!nivel) {
    return <span className="text-xs text-zinc-600">Nível não avaliado</span>
  }
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={13}
          className={n <= nivel ? 'fill-crow-500 text-crow-500' : 'fill-transparent text-zinc-600'}
        />
      ))}
    </div>
  )
}

function PlayerCard({ jogador, index }) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      className={`flex items-center gap-3 rounded-xl border bg-court-surface p-3.5 ${
        jogador.visitante ? 'border-crow-500/40' : 'border-court-border'
      }`}
    >
      <BadgeSexo sexo={jogador.sexo} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium text-white">{jogador.nome}</p>
          {jogador.visitante && (
            <span className="shrink-0 rounded-full bg-crow-500/15 px-2 py-0.5 text-[10px] font-medium text-crow-500">
              Visitante
            </span>
          )}
        </div>

        <div className="mt-1 flex items-center gap-3">
          {jogador.posicao && (
            <span className="flex items-center gap-1 text-xs text-zinc-400">
              <MapPin size={11} />
              {jogador.posicao}
            </span>
          )}
          <NivelTecnico nivel={jogador.nivel_tecnico} />
        </div>
      </div>
    </motion.li>
  )
}

export default function Elenco() {
  const jogadores = useAppStore((estado) => estado.jogadores)
  const carregando = useAppStore((estado) => estado.carregandoJogadores)
  const erro = useAppStore((estado) => estado.erroJogadores)
  const carregarJogadores = useAppStore((estado) => estado.carregarJogadores)
  const adicionarJogadorNaStore = useAppStore((estado) => estado.adicionarJogador)
  const [modalAberto, setModalAberto] = useState(false)

  // Busca o roster no Supabase assim que a tela monta.
  useEffect(() => {
    carregarJogadores()
  }, [carregarJogadores])

  function adicionarJogador(novoJogador) {
    adicionarJogadorNaStore(novoJogador)
    setModalAberto(false)
  }

  return (
    <div className="relative h-full px-4 pt-5">
      {/* Header */}
      <div className="mb-4 flex items-baseline justify-between">
        <h1 className="text-xl font-semibold text-white">Nosso Elenco</h1>
        <span className="text-sm text-zinc-500">
          {jogadores.length} {jogadores.length === 1 ? 'jogador' : 'jogadores'}
        </span>
      </div>

      {/* Erro de conexão com o Supabase */}
      {erro && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          <AlertCircle size={14} className="shrink-0" />
          <span className="truncate">{erro}</span>
        </div>
      )}

      {/* Lista de jogadores */}
      {carregando && jogadores.length === 0 ? (
        <p className="mt-10 text-center text-sm text-zinc-500">Carregando elenco…</p>
      ) : jogadores.length === 0 ? (
        <p className="mt-10 text-center text-sm text-zinc-500">
          Ninguém cadastrado ainda. Toque no + para adicionar o primeiro jogador.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {jogadores.map((jogador, index) => (
            <PlayerCard key={jogador.id} jogador={jogador} index={index} />
          ))}
        </ul>
      )}

      {/* FAB — adicionar jogador */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setModalAberto(true)}
        aria-label="Adicionar jogador"
        className="fixed bottom-24 right-5 z-30 grid h-14 w-14 place-items-center rounded-full bg-crow-500 text-white shadow-lg shadow-crow-500/30"
      >
        <Plus size={26} />
      </motion.button>

      <PlayerModal
        aberto={modalAberto}
        aoFechar={() => setModalAberto(false)}
        aoSalvar={adicionarJogador}
      />
    </div>
  )
}
