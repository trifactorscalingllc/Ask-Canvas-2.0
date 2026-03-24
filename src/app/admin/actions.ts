'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function markAsResolved(formData: FormData) {
  const id = formData.get('id') as string
  if (!id) return;

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== 'admin@trifactorscaling.com') return;

  const { error } = await (supabase as any).from('proposed_tools').update({ status: 'resolved' }).eq('id', id)
  if (error) console.error("Error resolving:", error)
    
  revalidatePath('/admin')
}
