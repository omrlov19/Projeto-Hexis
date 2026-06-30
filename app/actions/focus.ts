'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * Persiste uma sessão de foco na tabela hexis_focus_sessions.
 * Usado pelo timer global (habit_id = null) e, no futuro, por sessões vinculadas a hábitos.
 * A dashboard soma a coluna duration (em segundos) e converte para minutos.
 */
export async function saveFocusSession(
  durationSeconds: number,
  habitId?: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    if (durationSeconds <= 0) return { success: true }

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Usuário não autenticado' }
    }

    const duration = Math.round(durationSeconds)
    const { error: insertError } = await supabase.from('hexis_focus_sessions').insert({
      user_id: user.id,
      duration,
      habit_id: habitId ?? null,
    })

    if (insertError) {
      console.error('Erro ao salvar sessão de foco:', insertError.message)
      return { success: false, error: insertError.message }
    }

    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao salvar sessão de foco'
    console.error(message, err)
    return { success: false, error: message }
  }
}
