import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import MainLayout from './layouts/MainLayout.jsx'
import { useAppStore } from './store/useAppStore.js'

// Cada tela só é baixada quando o usuário realmente navega até ela —
// o pacote inicial fica bem menor, o que importa bastante numa PWA
// acessada por 4G na beira da quadra.
const Agenda = lazy(() => import('./features/events/Agenda.jsx'))
const Elenco = lazy(() => import('./features/players/Elenco.jsx'))
const Sorteio = lazy(() => import('./features/matchmaking/Sorteio.jsx'))
const Placar = lazy(() => import('./features/game/Placar.jsx'))
const Financas = lazy(() => import('./features/finances/Financas.jsx'))

function CarregandoTela() {
  return <p className="mt-10 text-center text-sm text-zinc-500">Carregando…</p>
}

export default function App() {
  const carregarJogadores = useAppStore((estado) => estado.carregarJogadores)

  // Carrega o roster uma vez, no nível do app — assim ele já está disponível
  // pro Sorteio mesmo que o usuário nunca tenha passado pela aba Elenco nesta sessão.
  useEffect(() => {
    carregarJogadores()
  }, [carregarJogadores])

  return (
    <Suspense fallback={<CarregandoTela />}>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Agenda />} />
          <Route path="/elenco" element={<Elenco />} />
          <Route path="/sorteio" element={<Sorteio />} />
          <Route path="/placar" element={<Placar />} />
          <Route path="/vaquinha" element={<Financas />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
