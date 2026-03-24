'use server'

import { createClient } from '@/lib/supabase/server'
import { encrypt } from '@/lib/crypto'
import { redirect } from 'next/navigation'

export async function updateToken(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const canvas_key = formData.get('canvas_key') as string
  if (!canvas_key) {
    return { error: 'Token is required' }
  }

  const { encryptedData, iv } = encrypt(canvas_key)
  const { error } = await supabase.from('users').update({
    encrypted_canvas_key: encryptedData,
    iv: iv
  }).eq('id', user.id)

  if (error) {
    console.error('Update Token Error:', error)
    return { error: error.message }
  }
  
  return { success: true }
}

export async function deleteAccount() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase.from('users').delete().eq('id', user.id)
  if (error) {
    console.error('Delete Account Error:', error)
  }

  await supabase.auth.signOut()
  redirect('/')
}
