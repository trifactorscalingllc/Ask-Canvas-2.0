'use server'

import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/crypto'
import { get_canvas_user_profile } from '@/lib/canvas-tools'

export async function fetchCanvasProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: userData } = await supabase
    .from('users')
    .select('encrypted_canvas_key, iv')
    .eq('id', user.id)
    .single()

  if (!userData?.encrypted_canvas_key || !userData?.iv) {
    throw new Error('Canvas key missing')
  }

  const canvasKey = decrypt(userData.encrypted_canvas_key, userData.iv)
  const profile = await get_canvas_user_profile(canvasKey)
  
  if (profile) {
    // Optionally sync back to Supabase
    await supabase.from('users').update({
      name: profile.name,
      avatar_url: profile.avatarUrl
    }).eq('id', user.id)
  }

  return profile
}
