import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

function amanha() {
  const data = new Date()
  data.setDate(data.getDate() + 1)
  return data.toISOString().slice(0, 10) // yyyy-mm-dd, formato que o <input type="date"> espera
}

const ESTADO_INICIAL = {
  data: amanha(),
  horario: '19:00',
  local: '',
  limiteJogadores: 12,
  custoTotal: '',
  chavePix: '',
}

export default function CreateEventModal({ aberto, aoFechar, aoCriar }) {
  const [form, setForm] = useState(ESTADO_INICIAL)
  const [salvando, setSalvando] = useState(false)

  function atualizar(campo, valor) {
    setForm((atual) => ({ ...atual, [campo]: valor }))
  }

  function handleFechar() {
    setForm(ESTADO_INICIAL)
    aoFechar()
  }

  async function handleCriar() {
    if (!form.data || !form.horario || !form.limiteJogadores) return

    setSalvando(true)
    const dataHoraISO = new Date(`${form.data}T${form.horario}`).toISOString()

    await aoCriar({
      data_hora: dataHoraISO,
      local: form.local.trim() || null,
      limite_jogadores: Number(form.limiteJogadores),
      custo_total: form.custoTotal ? Number(form.custoTotal) : null,
      chave_pix: form.chavePix.trim() || null,
    })

    setSalvando(false)
    setForm(ESTADO_INICIAL)
  }

  const podeCriar = form.data && form.horario && Number(form.limiteJogadores) > 0 && !salvando

  return (
    <AnimatePresence>
      {aberto && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 bg-black/60"
            onClick={handleFechar}
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-court-surface px-5 pt-4"
            style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-zinc-600" />

            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Novo evento</h2>
              <button onClick={handleFechar} aria-label="Fechar" className="text-zinc-400">
                <X size={22} />
              </button>
            </div>

            {/* Data e horário — obrigatórios, o banco exige data_hora */}
            <div className="mb-4 flex gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-sm text-zinc-400">
                  Data <span className="text-crow-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.data}
                  onChange={(e) => atualizar('data', e.target.value)}
                  className="w-full rounded-lg border border-court-border bg-court-bg px-3 py-2.5 text-white focus:border-crow-500 focus:outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-sm text-zinc-400">
                  Horário <span className="text-crow-500">*</span>
                </label>
                <input
                  type="time"
                  value={form.horario}
                  onChange={(e) => atualizar('horario', e.target.value)}
                  className="w-full rounded-lg border border-court-border bg-court-bg px-3 py-2.5 text-white focus:border-crow-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Local — opcional */}
            <div className="mb-4">
              <label className="mb-1 block text-sm text-zinc-400">Local (opcional)</label>
              <input
                type="text"
                value={form.local}
                onChange={(e) => atualizar('local', e.target.value)}
                placeholder="Ex: Arena Vôlei Clube — Quadra 2"
                className="w-full rounded-lg border border-court-border bg-court-bg px-3 py-2.5 text-white placeholder:text-zinc-600 focus:border-crow-500 focus:outline-none"
              />
            </div>

            {/* Limite de vagas — obrigatório, o banco exige limite_jogadores */}
            <div className="mb-4">
              <label className="mb-1 block text-sm text-zinc-400">
                Limite de vagas <span className="text-crow-500">*</span>
              </label>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={form.limiteJogadores}
                onChange={(e) => atualizar('limiteJogadores', e.target.value)}
                className="w-full rounded-lg border border-court-border bg-court-bg px-3 py-2.5 text-white focus:border-crow-500 focus:outline-none"
              />
            </div>

            {/* Custo total — opcional, alimenta a Vaquinha depois */}
            <div className="mb-4">
              <label className="mb-1 block text-sm text-zinc-400">Custo total (opcional)</label>
              <div className="flex items-center rounded-lg border border-court-border bg-court-bg px-3">
                <span className="text-zinc-500">R$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={form.custoTotal}
                  onChange={(e) => atualizar('custoTotal', e.target.value)}
                  placeholder="120"
                  className="w-full bg-transparent px-2 py-2.5 text-white placeholder:text-zinc-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Chave Pix — opcional, alimenta o card da Vaquinha */}
            <div className="mb-6">
              <label className="mb-1 block text-sm text-zinc-400">Chave Pix do organizador (opcional)</label>
              <input
                type="text"
                value={form.chavePix}
                onChange={(e) => atualizar('chavePix', e.target.value)}
                placeholder="email, telefone ou chave aleatória"
                className="w-full rounded-lg border border-court-border bg-court-bg px-3 py-2.5 text-white placeholder:text-zinc-600 focus:border-crow-500 focus:outline-none"
              />
            </div>

            <motion.button
              whileTap={{ scale: podeCriar ? 0.97 : 1 }}
              onClick={handleCriar}
              disabled={!podeCriar}
              className="w-full rounded-lg bg-crow-500 py-3 font-medium text-white disabled:opacity-40"
            >
              {salvando ? 'Criando…' : 'Criar evento'}
            </motion.button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
