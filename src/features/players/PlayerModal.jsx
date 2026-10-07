import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

const POSICOES = ['Levantador', 'Ponteiro', 'Central', 'Líbero', 'Oposto']

const ESTADO_INICIAL = {
  nome: '',
  sexo: 'M',
  visitante: false,
  nivel_tecnico: null,
  posicao: null,
}

export default function PlayerModal({ aberto, aoFechar, aoSalvar }) {
  const [form, setForm] = useState(ESTADO_INICIAL)

  function atualizar(campo, valor) {
    setForm((atual) => ({ ...atual, [campo]: valor }))
  }

  function handleSalvar() {
    const nomeLimpo = form.nome.trim()
    if (!nomeLimpo) return // única validação real: nome não pode ser vazio

    aoSalvar({ ...form, nome: nomeLimpo })
    setForm(ESTADO_INICIAL)
  }

  function handleFechar() {
    setForm(ESTADO_INICIAL)
    aoFechar()
  }

  return (
    <AnimatePresence>
      {aberto && (
        <>
          {/* Overlay escurecido */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 bg-black/60"
            onClick={handleFechar}
          />

          {/* Bottom sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-court-surface px-5 pt-4"
            style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-zinc-600" />

            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Adicionar jogador</h2>
              <button onClick={handleFechar} aria-label="Fechar" className="text-zinc-400">
                <X size={22} />
              </button>
            </div>

            {/* Nome — único campo obrigatório */}
            <div className="mb-4">
              <label className="mb-1 block text-sm text-zinc-400">
                Nome <span className="text-crow-500">*</span>
              </label>
              <input
                autoFocus
                type="text"
                value={form.nome}
                onChange={(e) => atualizar('nome', e.target.value)}
                placeholder="Como vamos chamar essa pessoa?"
                className="w-full rounded-lg border border-court-border bg-court-bg px-3 py-2.5 text-white placeholder:text-zinc-600 focus:border-crow-500 focus:outline-none"
              />
            </div>

            {/* Sexo — toggle M/F */}
            <div className="mb-4">
              <span className="mb-1 block text-sm text-zinc-400">Sexo</span>
              <div className="flex gap-2">
                {['M', 'F'].map((opcao) => (
                  <button
                    key={opcao}
                    onClick={() => atualizar('sexo', opcao)}
                    className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                      form.sexo === opcao
                        ? 'bg-crow-500 text-white'
                        : 'bg-court-bg text-zinc-400'
                    }`}
                  >
                    {opcao === 'M' ? 'Masculino' : 'Feminino'}
                  </button>
                ))}
              </div>
            </div>

            {/* Visitante — toggle sim/não */}
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm text-zinc-400">É visitante?</span>
              <button
                onClick={() => atualizar('visitante', !form.visitante)}
                className={`h-7 w-12 rounded-full p-1 transition-colors ${
                  form.visitante ? 'bg-crow-500' : 'bg-court-border'
                }`}
              >
                <motion.div
                  animate={{ x: form.visitante ? 20 : 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="h-5 w-5 rounded-full bg-white"
                />
              </button>
            </div>

            {/* Posição — opcional */}
            <div className="mb-4">
              <span className="mb-1 block text-sm text-zinc-400">Posição (opcional)</span>
              <div className="flex flex-wrap gap-2">
                {POSICOES.map((pos) => (
                  <button
                    key={pos}
                    onClick={() => atualizar('posicao', form.posicao === pos ? null : pos)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                      form.posicao === pos
                        ? 'bg-crow-500 text-white'
                        : 'bg-court-bg text-zinc-400'
                    }`}
                  >
                    {pos}
                  </button>
                ))}
              </div>
            </div>

            {/* Nível técnico — opcional, 1 a 5 */}
            <div className="mb-6">
              <span className="mb-1 block text-sm text-zinc-400">Nível técnico (opcional)</span>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => atualizar('nivel_tecnico', form.nivel_tecnico === n ? null : n)}
                    className={`h-9 w-9 rounded-lg text-sm font-medium transition-colors ${
                      form.nivel_tecnico === n
                        ? 'bg-crow-500 text-white'
                        : 'bg-court-bg text-zinc-400'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSalvar}
              disabled={!form.nome.trim()}
              className="w-full rounded-lg bg-crow-500 py-3 font-medium text-white disabled:opacity-40"
            >
              Adicionar
            </motion.button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
