/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta "Karasuno" — fundo escuro + laranja vibrante como cor de ação
        court: {
          bg: '#18181b',       // zinc-900, fundo principal do app
          surface: '#27272a',  // zinc-800, cards e superfícies elevadas
          border: '#3f3f46',   // zinc-700, divisores sutis
        },
        crow: {
          500: '#FF6B00',      // laranja primário — botões, ícones ativos, destaques
          600: '#E05F00',      // laranja escurecido — estados de pressed/hover
        },
      },
      fontFamily: {
        sans: ['Inter', 'Nunito', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
