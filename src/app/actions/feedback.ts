'use server'

import { createClient } from '@/lib/supabase/server'

export async function submitFeedback(query: string, response: string, is_helpful: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  if (!user) return { error: 'Unauthorized' }

  const { error } = await (supabase as any).from('feedback').insert({
    user_id: user.id,
    query,
    response,
    is_helpful
  })

  if (error) {
    console.error('Feedback error:', error)
    return { error: error.message }
  }

  return { success: true }
}
