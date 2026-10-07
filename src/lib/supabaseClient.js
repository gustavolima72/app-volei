import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ndntadwtmbkdcgwwdoqu.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kbnRhZHd0bWJrZGNnd3dkb3F1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzMzkwMzQsImV4cCI6MjEwNjkxNTAzNH0.mvoui7pkaF8S0nIcqjtq7pZz3NnsNjC5SifoChqg85k'

if (!supabaseUrl || !supabaseAnonKey) {
  // Falha alto e claro em vez de deixar toda query falhar silenciosamente depois.
  throw new Error(
    'Variáveis VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY não encontradas. ' +
      'Copie .env.example para .env e preencha com os dados do seu projeto Supabase.',
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
