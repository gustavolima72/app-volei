import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Nome do repositório no GitHub — isso define o caminho onde o app vai
// morar no GitHub Pages: https://SEU_USUARIO.github.io/app-volei/
// Se um dia o repositório mudar de nome, essa é a ÚNICA linha que precisa mudar.
const NOME_DO_REPOSITORIO = 'app-volei'

export default defineConfig({
  base: `/${NOME_DO_REPOSITORIO}/`,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Vôlei App — Gestão de Turma',
        short_name: 'Vôlei App',
        description:
          'Elenco, sorteio de times equilibrados, placar ao vivo, vaquinha e agenda com RSVP para a turma de vôlei amador.',
        theme_color: '#18181b',
        background_color: '#18181b',
        display: 'standalone',
        orientation: 'portrait',
        start_url: `/${NOME_DO_REPOSITORIO}/`,
        scope: `/${NOME_DO_REPOSITORIO}/`,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Cacheia os arquivos da build pra o app abrir rápido (e até funcionar
        // offline pra navegação básica) depois da primeira visita.
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
      },
    }),
  ],
})
