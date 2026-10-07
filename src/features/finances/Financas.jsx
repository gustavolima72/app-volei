import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Copy, Check, Wallet, AlertCircle } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore.js'

// Os valores abaixo têm que bater EXATAMENTE com o check constraint da coluna
// status_pagamento na tabela `presencas` ('Pendente' | 'Pago' | 'Isento') —
// um update com valor fora disso é rejeitado pelo Postgres.
const PROXIMO_STATUS = {
  Pendente: 'Pago',
  Pago: 'Isento',
  Isento: 'Pendente',
}

const ESTILO_STATUS = {
  Pendente: { label: 'Deve', classe: 'bg-red-500/20 text-red-400' },
  Pago: { label: 'Pago', classe: 'bg-crow-500 text-white' },
  Isento: { label: 'Isento', classe: 'border border-dashed border-zinc-600 text-zinc-500' },
}

function formatarReais(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function Financas() {
  const eventoAtual = useAppStore((estado) => estado.eventoAtual)
  const todasPresencas = useAppStore((estado) => estado.presencas)
  const carregando = useAppStore((estado) => estado.carregandoEvento)
  const erro = useAppStore((estado) => estado.erroEvento)
  const carregarEvento = useAppStore((estado) => estado.carregarEvento)
  const atualizarCustoTotal = useAppStore((estado) => estado.atualizarCustoTotal)
  const alternarStatusPagamento = useAppStore((estado) => estado.alternarStatusPagamento)

  const [pixCopiado, setPixCopiado] = useState(false)

  useEffect(() => {
    carregarEvento()
  }, [carregarEvento])

  // A Vaquinha só se importa com quem está de fato confirmado — Fila_de_Espera e Nao_Vou não entram na conta.
  const presencas = useMemo(
    () => todasPresencas.filter((p) => p.status_presenca === 'Confirmado'),
    [todasPresencas],
  )

  const custoTotal = eventoAtual?.custo_total ?? 0
  const confirmados = presencas.length
  const valorPorPessoa = confirmados > 0 ? custoTotal / confirmados : 0

  const arrecadado = useMemo(
    () => presencas.filter((p) => p.status_pagamento === 'Pago').length * valorPorPessoa,
    [presencas, valorPorPessoa],
  )

  const progresso = custoTotal > 0 ? Math.min(100, (arrecadado / custoTotal) * 100) : 0

  function alternarStatus(presenca) {
    alternarStatusPagamento(presenca.id, PROXIMO_STATUS[presenca.status_pagamento])
  }

  async function copiarPix() {
    if (!eventoAtual?.chave_pix) return
    try {
      await navigator.clipboard.writeText(eventoAtual.chave_pix)
    } catch {
      // clipboard pode falhar em contexto não seguro (http) — a chave já aparece em texto na tela
    }
    setPixCopiado(true)
    setTimeout(() => setPixCopiado(false), 2000)
  }

  if (carregando && !eventoAtual) {
    return <p className="mt-10 text-center text-sm text-zinc-500">Carregando finanças…</p>
  }

  if (!eventoAtual) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
        <p className="text-sm text-zinc-500">Nenhum evento em aberto encontrado.</p>
        <p className="text-xs text-zinc-600">
          Crie um evento (status "Aberto") na tabela `eventos` pra a vaquinha aparecer aqui.
        </p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto px-4 pt-5 pb-6">
      <h1 className="mb-4 text-xl font-semibold text-white">Vaquinha</h1>

      {erro && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          <AlertCircle size={14} className="shrink-0" />
          <span className="truncate">{erro}</span>
        </div>
      )}

      {/* Resumo e divisão */}
      <div className="mb-4 rounded-xl border border-court-border bg-court-surface p-4">
        <label className="mb-1 block text-sm text-zinc-400">Custo total da quadra</label>
        <div className="mb-4 flex items-center rounded-lg border border-court-border bg-court-bg px-3">
          <span className="text-zinc-500">R$</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            value={custoTotal}
            onChange={(e) => atualizarCustoTotal(Number(e.target.value) || 0)}
            className="w-full bg-transparent px-2 py-2.5 text-white focus:outline-none"
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-400">{confirmados} jogadores confirmados</span>
          <div className="text-right">
            <p className="text-[11px] text-zinc-500">Valor por pessoa</p>
            <p className="text-lg font-semibold text-crow-500">{formatarReais(valorPorPessoa)}</p>
          </div>
        </div>
      </div>

      {/* Card do Pix */}
      {eventoAtual.chave_pix && (
        <div className="mb-4 rounded-xl border border-crow-500 bg-crow-500/10 p-4">
          <p className="mb-1 text-xs font-medium text-crow-500">Chave Pix do organizador</p>
          <p className="mb-3 truncate text-sm text-white">{eventoAtual.chave_pix}</p>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={copiarPix}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-crow-500 py-2.5 text-sm font-medium text-white"
          >
            {pixCopiado ? <Check size={16} /> : <Copy size={16} />}
            {pixCopiado ? 'Copiado!' : 'Copiar Chave Pix'}
          </motion.button>
        </div>
      )}

      {/* Barra de progresso */}
      <div className="mb-3">
        <div className="mb-1.5 flex items-center justify-between text-xs text-zinc-400">
          <span className="flex items-center gap-1">
            <Wallet size={12} />
            Arrecadado
          </span>
          <span>
            {formatarReais(arrecadado)} / {formatarReais(custoTotal)}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-court-surface">
          <motion.div
            className="h-full rounded-full bg-crow-500"
            animate={{ width: `${progresso}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Lista de pagamentos */}
      {presencas.length === 0 ? (
        <p className="mt-6 text-center text-sm text-zinc-500">
          Ninguém confirmado presença neste evento ainda.
        </p>
      ) : (
        <ul className="space-y-2">
          {presencas.map((presenca) => {
            const estilo = ESTILO_STATUS[presenca.status_pagamento]
            return (
              <li
                key={presenca.id}
                className="flex items-center justify-between rounded-xl border border-court-border bg-court-surface p-3"
              >
                <span className="truncate text-sm font-medium text-white">
                  {presenca.jogadores?.nome ?? 'Jogador'}
                </span>

                <motion.button
                  key={presenca.status_pagamento}
                  initial={presenca.status_pagamento === 'Pago' ? { scale: 1.1 } : false}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  onClick={() => alternarStatus(presenca)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${estilo.classe}`}
                >
                  {estilo.label}
                </motion.button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
