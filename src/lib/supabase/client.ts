import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/supabase'

export function createClient() {
  let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co'
  if (supabaseUrl && !supabaseUrl.startsWith('http')) supabaseUrl = `https://${supabaseUrl}`
  if (supabaseUrl && !supabaseUrl.includes('.supabase.co')) supabaseUrl = `${supabaseUrl}.supabase.co`

  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy'
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) console.warn('NEXT_PUBLIC_SUPABASE_URL is missing')

  return createBrowserClient<Database>(supabaseUrl, supabaseKey)
}
