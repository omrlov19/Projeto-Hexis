'use server'

import { createClient } from '@/lib/supabase/server'

export type PlannerReminderRow = {
  id: string
  user_id: string
  title: string
  date: string // YYYY-MM-DD
  time: string | null
  is_completed: boolean
  created_at?: string
}

export async function createReminder(input: {
  title: string
  date: string // YYYY-MM-DD
  time: string | null
}): Promise<{ success: boolean; data?: PlannerReminderRow; error?: string }> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Usuário não autenticado' }
    }

    if (!input.title || input.title.trim().length === 0) {
      return { success: false, error: 'Título é obrigatório' }
    }

    // IMPORTANTE: tabela esperada para o Planner no banco
    const { data, error } = await supabase
      .from('hexis_planner_items')
      .insert({
        user_id: user.id,
        title: input.title.trim(),
        date: input.date,
        time: input.time,
        is_completed: false,
      })
      .select('id, user_id, title, date, time, is_completed, created_at')
      .single()

    if (error || !data) {
      return { success: false, error: error?.message || 'Falha ao criar lembrete' }
    }

    return { success: true, data: data as PlannerReminderRow }
  } catch (error: any) {
    console.error('❌ ERRO CRÍTICO: Exceção ao criar lembrete', error?.message, error)
    return { success: false, error: error?.message || 'Erro ao criar lembrete' }
  }
}

/**
 * Deleta um lembrete do banco de dados.
 */
export async function deleteReminder(id: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Usuário não autenticado' }
    }

    // IDs temporários (optimistic UI) não existem no banco
    if (id.startsWith('temp-')) {
      return { success: true }
    }

    const { data, error: deleteError } = await supabase
      .from('hexis_planner_items')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
      .select()

    if (deleteError) {
      console.error('❌ [deleteReminder] Erro Supabase:', deleteError)
      return { success: false, error: deleteError.message || 'Falha ao deletar lembrete' }
    }

    return { success: true }
  } catch (error: any) {
    console.error('❌ ERRO CRÍTICO: Exceção ao deletar lembrete', error?.message, error)
    return { success: false, error: error?.message || 'Erro ao deletar lembrete' }
  }
}

/**
 * Busca todos os lembretes do usuário logado no Supabase.
 * Fonte de verdade para sincronização entre dispositivos.
 */
export async function getReminders(): Promise<{
  success: boolean
  data?: PlannerReminderRow[]
  error?: string
}> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Usuário não autenticado' }
    }

    const { data, error } = await supabase
      .from('hexis_planner_items')
      .select('id, user_id, title, date, time, is_completed, created_at')
      .eq('user_id', user.id)
      .order('date', { ascending: true })
      .order('time', { ascending: true, nullsFirst: false })

    if (error) {
      console.error('❌ [getReminders] Erro Supabase:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: (data ?? []) as PlannerReminderRow[] }
  } catch (error: any) {
    console.error('❌ ERRO CRÍTICO: Exceção ao buscar lembretes', error?.message, error)
    return { success: false, error: error?.message || 'Erro ao buscar lembretes' }
  }
}

/**
 * Alterna o status de conclusão de um lembrete no banco.
 */
export async function toggleReminderStatus(
  id: string,
  isCompleted: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Usuário não autenticado' }
    }

    // IDs temporários — o item ainda não chegou no banco
    if (id.startsWith('temp-')) {
      return { success: true }
    }

    const { error } = await supabase
      .from('hexis_planner_items')
      .update({ is_completed: isCompleted })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('❌ [toggleReminderStatus] Erro Supabase:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error('❌ ERRO CRÍTICO: Exceção ao alternar lembrete', error?.message, error)
    return { success: false, error: error?.message || 'Erro ao alternar lembrete' }
  }
}

/**
 * Atualiza título, data e/ou horário de um lembrete existente.
 */
export async function updateReminder(
  id: string,
  input: { title: string; date: string; time: string | null }
): Promise<{ success: boolean; data?: PlannerReminderRow; error?: string }> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Usuário não autenticado' }
    }

    if (!input.title || input.title.trim().length === 0) {
      return { success: false, error: 'Título é obrigatório' }
    }

    // IDs temporários não existem no banco
    if (id.startsWith('temp-')) {
      return { success: false, error: 'Lembrete ainda não sincronizado' }
    }

    const { data, error } = await supabase
      .from('hexis_planner_items')
      .update({
        title: input.title.trim(),
        date: input.date,
        time: input.time,
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id, user_id, title, date, time, is_completed, created_at')
      .single()

    if (error || !data) {
      return { success: false, error: error?.message || 'Falha ao atualizar lembrete' }
    }

    return { success: true, data: data as PlannerReminderRow }
  } catch (error: any) {
    console.error('❌ ERRO CRÍTICO: Exceção ao atualizar lembrete', error?.message, error)
    return { success: false, error: error?.message || 'Erro ao atualizar lembrete' }
  }
}
