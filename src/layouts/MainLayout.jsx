import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { CalendarDays, Users, Shuffle, Trophy, Wallet } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/', label: 'Agenda', icon: CalendarDays, end: true },
  { to: '/elenco', label: 'Elenco', icon: Users },
  { to: '/sorteio', label: 'Sorteio', icon: Shuffle },
  { to: '/placar', label: 'Placar', icon: Trophy },
  { to: '/vaquinha', label: 'Vaquinha', icon: Wallet },
]

export default function MainLayout() {
  const location = useLocation()

  return (
    <div className="flex h-screen flex-col bg-court-bg text-zinc-100">
      {/* Área de conteúdo — cada troca de rota faz um fade + leve slide, como um app nativo */}
      <main className="flex-1 overflow-y-auto pb-[calc(4.5rem+env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)]">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="h-full"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation — fixa, com destaque laranja no item ativo */}
      <nav
        className="fixed inset-x-0 bottom-0 border-t border-court-border bg-court-surface/95 backdrop-blur"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <ul className="flex items-stretch justify-between px-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <li key={to} className="flex-1">
              <NavLink to={to} end={end} className="block">
                {({ isActive }) => (
                  <motion.div
                    whileTap={{ scale: 0.92 }}
                    className="flex flex-col items-center gap-1 py-2.5"
                  >
                    <Icon
                      size={22}
                      strokeWidth={isActive ? 2.4 : 1.8}
                      className={isActive ? 'text-crow-500' : 'text-zinc-500'}
                    />
                    <span
                      className={`text-[11px] leading-none ${
                        isActive ? 'font-medium text-crow-500' : 'text-zinc-500'
                      }`}
                    >
                      {label}
                    </span>
                  </motion.div>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
