'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { encrypt } from '@/lib/crypto'

export async function signup(prevState: any, formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    canvas_key: formData.get('canvas_key') as string,
  }

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
  })

  if (authError) {
    console.error('Auth Failure:', authError)
    return { error: authError.message }
  }

  const user = authData.user
  if (user) {
    if (authData.session) {
      // Forcefully hydrate the current Supabase client with the newly minted access token
      // This bypasses the Next.js `cookies()` async race condition that drops the headers for this specific execution block.
      await supabase.auth.setSession({
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
      })
    }

    const { encryptedData, iv } = encrypt(data.canvas_key)
    const { error: dbError } = await supabase.from('users').insert({
      id: user.id,
      email: data.email,
      encrypted_canvas_key: encryptedData,
      iv: iv,
      name: data.email.split('@')[0], 
    })

    if (dbError) {
      console.error('Auth Failure (DB):', dbError)
      return { error: dbError.message }
    }
  }

  revalidatePath('/', 'layout')
  redirect('/chat')
}
