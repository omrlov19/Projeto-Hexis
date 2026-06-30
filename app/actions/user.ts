'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateProfile(data: {
  fullName?: string
  phone?: string
  avatarUrl?: string
}) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Usuário não autenticado' }
    }

    const updates: Record<string, any> = {
      user_id: user.id,
      updated_at: new Date().toISOString(),
    }

    if (data.fullName !== undefined) updates.full_name = data.fullName
    if (data.phone !== undefined) updates.phone_number = data.phone
    if (data.avatarUrl !== undefined) updates.avatar_url = data.avatarUrl

    const { error: updateError } = await supabase
      .from('hexis_profiles')
      .upsert(updates, { onConflict: 'user_id' })

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    revalidatePath('/dashboard')

    return { success: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao atualizar perfil'
    console.error('updateProfile:', msg)
    return { success: false, error: msg }
  }
}
