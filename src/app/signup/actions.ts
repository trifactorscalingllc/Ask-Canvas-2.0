'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { encrypt } from '@/lib/crypto'

export async function signup(formData: FormData) {
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
    console.error('Signup error:', authError.message)
    redirect(`/signup?error=${encodeURIComponent(authError.message)}`)
  }

  const user = authData.user
  if (user) {
    const { encryptedData, iv } = encrypt(data.canvas_key)
    const { error: dbError } = await supabase.from('users').insert({
      id: user.id,
      email: data.email,
      encrypted_canvas_key: encryptedData,
      iv: iv,
      name: data.email.split('@')[0], 
    })

    if (dbError) {
      console.error('DB Insert Error:', dbError.message)
      redirect(`/signup?error=${encodeURIComponent(dbError.message)}`)
    }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}
