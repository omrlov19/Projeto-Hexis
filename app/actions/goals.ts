'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface WeeklyGoalItemInput {
  text: string
  done: boolean
}

export interface UpdateUserGoalsInput {
  dailyFocusGoal: number
  dailyHabitGoal: number
  weeklyPriorities: WeeklyGoalItemInput[]
}

function sanitizeWeeklyPriorities(raw: unknown): WeeklyGoalItemInput[] {
  if (!Array.isArray(raw)) return []
  const out = raw.slice(0, 5).map((el) => {
    if (el && typeof el === 'object' && 'text' in el)
      return { text: String((el as { text?: unknown }).text ?? '').trim(), done: Boolean((el as { done?: unknown }).done) }
    if (typeof el === 'string') return { text: String(el).trim(), done: false }
    return { text: '', done: false }
  })
  while (out.length < 5) out.push({ text: '', done: false })
  return out
}

export async function updateUserGoals(
  data: UpdateUserGoalsInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'Usuário não autenticado' }
  }

  const weeklyPrioritiesSanitized = sanitizeWeeklyPriorities(data.weeklyPriorities)

  const dailyFocusGoal = Math.max(0, Math.round(Number(data.dailyFocusGoal)))
  const dailyHabitGoal = Math.max(0, Math.round(Number(data.dailyHabitGoal)))

  const { error } = await supabase
    .from('hexis_user_goals')
    .upsert(
      {
        user_id: user.id,
        daily_focus_goal: dailyFocusGoal,
        daily_habit_goal: dailyHabitGoal,
        weekly_priorities: weeklyPrioritiesSanitized,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

  if (error) {
    console.error('Erro ao salvar metas (hexis_user_goals):', error.message, error.code, error)
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function toggleGoalStatus(
  index: number,
  done: boolean
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'Usuário não autenticado' }
  }

  const { data: row, error: fetchErr } = await supabase
    .from('hexis_user_goals')
    .select('weekly_priorities')
    .eq('user_id', user.id)
    .maybeSingle()

  if (fetchErr || !row) {
    return { success: false, error: fetchErr?.message ?? 'Metas não encontradas' }
  }

  const current = Array.isArray(row.weekly_priorities) ? row.weekly_priorities : []
  const items = current.slice(0, 5).map((el: unknown, i: number) => {
    if (el && typeof el === 'object' && 'text' in el)
      return { text: String((el as { text?: unknown }).text ?? ''), done: i === index ? done : Boolean((el as { done?: unknown }).done) }
    if (typeof el === 'string') return { text: String(el), done: i === index ? done : false }
    return { text: '', done: i === index ? done : false }
  })
  while (items.length < 5) items.push({ text: '', done: false })

  const { error: updateErr } = await supabase
    .from('hexis_user_goals')
    .update({
      weekly_priorities: items,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)

  if (updateErr) {
    console.error('Erro ao atualizar status da meta:', updateErr.message)
    return { success: false, error: updateErr.message }
  }

  revalidatePath('/dashboard')
  return { success: true }
}
