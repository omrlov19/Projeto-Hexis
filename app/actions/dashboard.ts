'use server'

import { createClient } from '@/lib/supabase/server'
import { getBrasiliaDate, formatBrasiliaDate } from '@/lib/date'
import { subDays, addDays, startOfWeek, differenceInCalendarDays } from 'date-fns'

/**
 * Single Source of Truth: gráfico e cards saem do mesmo loop.
 * Foco do dia = cálculo On-Read: sessões de foco (timer) + hábitos concluídos sem sessão (duração do hábito).
 */
export interface WeeklyGoalItem {
  text: string
  done: boolean
}

function parseWeeklyPriorities(wp: unknown): WeeklyGoalItem[] {
  if (!Array.isArray(wp)) {
    if (typeof wp === 'string') {
      try {
        const parsed = JSON.parse(wp) as unknown
        return parseWeeklyPriorities(parsed)
      } catch {
        return []
      }
    }
    return []
  }
  return wp.slice(0, 5).map((el) => {
    if (typeof el === 'string') {
      const trimmed = el.trim()
      if (!trimmed) return { text: '', done: false }
      if (trimmed.startsWith('{')) {
        try {
          const parsed = JSON.parse(trimmed) as unknown
          if (parsed && typeof parsed === 'object' && 'text' in parsed)
            return {
              text: String((parsed as { text?: unknown }).text ?? '').trim(),
              done: Boolean((parsed as { done?: unknown }).done),
            }
        } catch {
          // fallback: usar string como texto
        }
      }
      return { text: trimmed, done: false }
    }
    if (el && typeof el === 'object' && 'text' in el)
      return {
        text: String((el as { text?: unknown }).text ?? '').trim(),
        done: Boolean((el as { done?: unknown }).done),
      }
    return { text: '', done: false }
  })
}

function ensureFiveGoals(items: WeeklyGoalItem[]): WeeklyGoalItem[] {
  const out = [...items.slice(0, 5)]
  while (out.length < 5) out.push({ text: '', done: false })
  return out
}

/** Dia da semana: JS getDay() = 0 (dom) .. 6 (sáb). Índice alinhado. */
const DAY_NAMES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
const DAY_NUMBERS = ['0', '1', '2', '3', '4', '5', '6'] as const

type HabitRow = {
  id: string
  frequency_days?: number[] | string[] | null
  created_at?: string | null
}

type TrackingRow = { date: string; habit_id: string; completed?: boolean }

/**
 * Retorna hábitos ativos para uma data (created_at + frequency_days).
 * getDay(): 0=dom, 1=seg, ..., 6=sáb.
 */
function getActiveHabitIdsForDate(dateStr: string, allHabits: HabitRow[]): string[] {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const dateIndex = date.getDay()
  const dateStrIndex = String(dateIndex)
  const dateDayName = DAY_NAMES[dateIndex]

  return allHabits
    .filter((habit) => {
      const frequencyDays = habit.frequency_days as number[] | string[] | null | undefined
      const habitCreatedDate = (habit.created_at || '').split('T')[0]
      if (habitCreatedDate > dateStr) return false
      if (!frequencyDays || !Array.isArray(frequencyDays) || frequencyDays.length === 0) return true
      const frequencyDaysAsStrings = frequencyDays.map((x) => String(x))
      return (
        frequencyDaysAsStrings.includes(dateStrIndex) ||
        frequencyDaysAsStrings.includes(dateDayName) ||
        frequencyDaysAsStrings.includes(DAY_NUMBERS[dateIndex]) ||
        frequencyDaysAsStrings.includes(DAY_NAMES[dateIndex])
      )
    })
    .map((h) => h.id)
}

/**
 * Fórmula única para Consistência (gráfico) e Performance do Dia.
 * Total = hábitos ativos na data (created_at + frequency_days).
 * Concluídos = registros completed: true na data.
 * Score = (Concluídos / Total) * 100 (arredondado).
 */
function calculateDailyScore(
  dateStr: string,
  allHabits: HabitRow[],
  trackingLogs: TrackingRow[]
): { total: number; completed: number; score: number } {
  const activeHabitIdsForDay = getActiveHabitIdsForDate(dateStr, allHabits)
  const total = activeHabitIdsForDay.length
  const dayTracking = trackingLogs.filter(
    (t) => t.date === dateStr && activeHabitIdsForDay.includes(t.habit_id)
  )
  const completed = dayTracking.filter((t) => t.completed === true).length
  const score = total > 0 ? Math.round((completed / total) * 100) : 0

  return { total, completed, score }
}

export interface UserGoals {
  dailyFocusGoal: number
  dailyHabitGoal: number
  weeklyPriorities: WeeklyGoalItem[]
}

export interface DashboardMetrics {
  history: Array<{
    date: string // "DD/MM"
    score: number
    total: number
    completed: number
  }>
  today: {
    completed: number
    total: number
    focusMinutes: number
    score: number
  }
  goals: UserGoals | null
  hasJournaledToday: boolean
}

/** Métricas de hoje + metas + journal. Rápida (~200ms). */
export interface TodayMetrics {
  today: DashboardMetrics['today']
  goals: UserGoals | null
  hasJournaledToday: boolean
}

/** Histórico de 30 dias para o gráfico. Pesada (~800ms+). */
export interface HistoryMetrics {
  history: DashboardMetrics['history']
}

/** Stats de hoje (sem goals). Score calculado no cliente. */
export interface TodayStats {
  completed: number
  total: number
  focusMinutes: number
  hasJournaledToday: boolean
}

/** Busca full_name na tabela public.profiles pelo usuário logado. */
export async function getUserProfile(): Promise<{
  success: boolean
  fullName?: string | null
  email?: string | null
  phone?: string | null
  avatarUrl?: string | null
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

    // Try to get full_name, phone_number and avatar_url from hexis_profiles table
    const { data: profile, error: profileError } = await supabase
      .from('hexis_profiles')
      .select('full_name, phone_number, avatar_url')
      .eq('user_id', user.id)
      .maybeSingle()

    if (profileError && profileError.code !== 'PGRST116') {
      console.warn('Erro ao buscar hexis_profile (ignorando):', profileError.message)
    }

    return {
      success: true,
      fullName: profile?.full_name ?? null,
      email: user.email ?? null,
      phone: profile?.phone_number ?? user.phone ?? null,
      avatarUrl: profile?.avatar_url ?? null,
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao buscar perfil'
    console.error('getUserProfile:', msg)
    return { success: false, error: msg }
  }
}

/** Busca APENAS hexis_user_goals. Muito rápida (<50ms). Prioridade máxima. */
export async function getUserGoals(): Promise<{
  success: boolean
  data?: UserGoals | null
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

    const today = getBrasiliaDate()
    const { data: goalsRow, error: goalsError } = await supabase
      .from('hexis_user_goals')
      .select('daily_focus_goal, daily_habit_goal, weekly_priorities, updated_at')
      .eq('user_id', user.id)
      .maybeSingle()

    if (goalsError) {
      return { success: false, error: goalsError.message }
    }

    if (!goalsRow) {
      return { success: true, data: null }
    }

    const updatedAt = goalsRow.updated_at ? new Date(goalsRow.updated_at) : null
    const lastMondayBrasilia = startOfWeek(today, { weekStartsOn: 1 })
    const needsReset = updatedAt != null && updatedAt < lastMondayBrasilia

    if (needsReset) {
      const resetPriorities = ensureFiveGoals([]).map((g) => ({ ...g, done: false }))
      const preservedFocus = goalsRow.daily_focus_goal ?? 60
      const preservedHabit = goalsRow.daily_habit_goal ?? 5
      const { error: updateErr } = await supabase
        .from('hexis_user_goals')
        .update({ weekly_priorities: resetPriorities, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
      return {
        success: true,
        data: !updateErr
          ? { dailyFocusGoal: preservedFocus, dailyHabitGoal: preservedHabit, weeklyPriorities: resetPriorities }
          : {
              dailyFocusGoal: goalsRow.daily_focus_goal ?? 60,
              dailyHabitGoal: goalsRow.daily_habit_goal ?? 5,
              weeklyPriorities: ensureFiveGoals(parseWeeklyPriorities(goalsRow.weekly_priorities)),
            },
      }
    }

    return {
      success: true,
      data: {
        dailyFocusGoal: goalsRow.daily_focus_goal ?? 60,
        dailyHabitGoal: goalsRow.daily_habit_goal ?? 5,
        weeklyPriorities: ensureFiveGoals(parseWeeklyPriorities(goalsRow.weekly_priorities)),
      },
    }
  } catch (error: any) {
    console.error('getUserGoals:', error?.message)
    return { success: false, error: error?.message || 'Erro ao buscar metas' }
  }
}

/** Busca APENAS hábitos e foco de hoje (+ journal). Sem goals. Score no cliente. */
export async function getTodayStats(): Promise<{
  success: boolean
  data?: TodayStats
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

    const today = getBrasiliaDate()
    const todayString = formatBrasiliaDate(today)
    const dayBefore = formatBrasiliaDate(subDays(today, 1))
    const dayAfter = formatBrasiliaDate(addDays(today, 1))

    const [habitsResult, journalResult] = await Promise.all([
      supabase
        .from('hexis_habits')
        .select('id, title, goal_type, target_value, target_unit, frequency_days, created_at, category')
        .eq('user_id', user.id),
      supabase
        .from('hexis_journal_entries')
        .select('id')
        .eq('user_id', user.id)
        .eq('date', todayString)
        .maybeSingle(),
    ])

    const { data: allHabits, error: habitsError } = habitsResult
    if (habitsError) return { success: false, error: 'Erro ao buscar hábitos' }

    const allHabitIds = (allHabits || []).map((h) => h.id)

    const [trackingResult, sessionsResult] = await Promise.all([
      supabase
        .from('hexis_daily_tracking')
        .select('date, habit_id, completed, achieved_value, achieved_unit')
        .eq('user_id', user.id)
        .eq('date', todayString)
        .in('habit_id', allHabitIds),
      supabase
        .from('hexis_focus_sessions')
        .select('duration, created_at, habit_id')
        .eq('user_id', user.id)
        .gte('created_at', `${dayBefore}T00:00:00.000Z`)
        .lt('created_at', `${dayAfter}T00:00:00.000Z`),
    ])

    const periodTracking = (trackingResult.data ?? []).map((t) => ({
      date: t.date,
      habit_id: t.habit_id,
      completed: t.completed,
    }))
    const focusSessionsRaw = sessionsResult.data ?? []
    const sessionsToday = focusSessionsRaw.filter((s) => {
      if (!s.created_at) return false
      const brDate = new Date(s.created_at).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
      return brDate === todayString
    })

    const { total: todayTotal, completed: todayCompleted } = calculateDailyScore(
      todayString,
      allHabits || [],
      periodTracking
    )
    const activeHabitIdsForDay = getActiveHabitIdsForDate(todayString, allHabits || [])
    const completedToday = periodTracking.filter(
      (t) => activeHabitIdsForDay.includes(t.habit_id) && t.completed === true
    )

    const FOCUS_TITLE_BLACKLIST = ['sono', 'dormir', 'sleep', 'descanso', 'soneca']
    const FOCUS_CATEGORY_BLACKLIST = ['rest', 'physiology', 'descanso']
    const habitIdsWithSession = new Set(
      sessionsToday.map((s) => s.habit_id).filter((id): id is string => id != null)
    )
    let totalFocusMinutes =
      sessionsToday.reduce((sum, s) => sum + (typeof s.duration === 'number' ? s.duration : 0), 0) / 60
    for (const t of completedToday) {
      if (habitIdsWithSession.has(t.habit_id)) continue
      const habit = (allHabits || []).find((h) => h.id === t.habit_id)
      if (!habit) continue
      const titleLower = String(habit.title ?? '').toLowerCase()
      if (FOCUS_TITLE_BLACKLIST.some((word) => titleLower.includes(word))) continue
      const categoryLower = String((habit as { category?: string | null }).category ?? '').toLowerCase()
      if (categoryLower && FOCUS_CATEGORY_BLACKLIST.includes(categoryLower)) continue
      const targetVal = habit.target_value ?? 0
      const unit = String(habit.target_unit || 'minutos').toLowerCase()
      totalFocusMinutes += unit === 'horas' ? targetVal * 60 : targetVal
    }
    const todayFocusMinutes = Math.round(totalFocusMinutes)

    return {
      success: true,
      data: {
        completed: todayCompleted,
        total: todayTotal,
        focusMinutes: todayFocusMinutes,
        hasJournaledToday: !!journalResult.data,
      },
    }
  } catch (error: any) {
    console.error('getTodayStats:', error?.message)
    return { success: false, error: error?.message || 'Erro ao buscar métricas' }
  }
}

/** Busca APENAS dados de hoje (hábitos, foco, metas, journal). Rápida. */
export async function getTodayMetrics(): Promise<{
  success: boolean
  data?: TodayMetrics
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

    const today = getBrasiliaDate()
    const todayString = formatBrasiliaDate(today)
    const dayBefore = formatBrasiliaDate(subDays(today, 1))
    const dayAfter = formatBrasiliaDate(addDays(today, 1))

    const [habitsResult, goalsResult, journalResult] = await Promise.all([
      supabase
        .from('hexis_habits')
        .select('id, title, goal_type, target_value, target_unit, frequency_days, created_at, category')
        .eq('user_id', user.id),
      supabase
        .from('hexis_user_goals')
        .select('daily_focus_goal, daily_habit_goal, weekly_priorities, updated_at')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('hexis_journal_entries')
        .select('id')
        .eq('user_id', user.id)
        .eq('date', todayString)
        .maybeSingle(),
    ])

    const { data: allHabits, error: habitsError } = habitsResult
    if (habitsError) return { success: false, error: 'Erro ao buscar hábitos' }

    const allHabitIds = (allHabits || []).map((h) => h.id)

    const [trackingResult, sessionsResult] = await Promise.all([
      supabase
        .from('hexis_daily_tracking')
        .select('date, habit_id, completed, achieved_value, achieved_unit')
        .eq('user_id', user.id)
        .eq('date', todayString)
        .in('habit_id', allHabitIds),
      supabase
        .from('hexis_focus_sessions')
        .select('duration, created_at, habit_id')
        .eq('user_id', user.id)
        .gte('created_at', `${dayBefore}T00:00:00.000Z`)
        .lt('created_at', `${dayAfter}T00:00:00.000Z`),
    ])

    const periodTracking = (trackingResult.data ?? []).map((t) => ({
      date: t.date,
      habit_id: t.habit_id,
      completed: t.completed,
    }))
    const focusSessionsRaw = sessionsResult.data ?? []
    const sessionsToday = focusSessionsRaw.filter((s) => {
      if (!s.created_at) return false
      const brDate = new Date(s.created_at).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
      return brDate === todayString
    })

    const { total: todayTotal, completed: todayCompleted } = calculateDailyScore(
      todayString,
      allHabits || [],
      periodTracking
    )
    const activeHabitIdsForDay = getActiveHabitIdsForDate(todayString, allHabits || [])
    const completedToday = periodTracking.filter(
      (t) => activeHabitIdsForDay.includes(t.habit_id) && t.completed === true
    )

    const FOCUS_TITLE_BLACKLIST = ['sono', 'dormir', 'sleep', 'descanso', 'soneca']
    const FOCUS_CATEGORY_BLACKLIST = ['rest', 'physiology', 'descanso']
    const habitIdsWithSession = new Set(
      sessionsToday.map((s) => s.habit_id).filter((id): id is string => id != null)
    )
    let totalFocusMinutes =
      sessionsToday.reduce((sum, s) => sum + (typeof s.duration === 'number' ? s.duration : 0), 0) / 60
    for (const t of completedToday) {
      if (habitIdsWithSession.has(t.habit_id)) continue
      const habit = (allHabits || []).find((h) => h.id === t.habit_id)
      if (!habit) continue
      const titleLower = String(habit.title ?? '').toLowerCase()
      if (FOCUS_TITLE_BLACKLIST.some((word) => titleLower.includes(word))) continue
      const categoryLower = String((habit as { category?: string | null }).category ?? '').toLowerCase()
      if (categoryLower && FOCUS_CATEGORY_BLACKLIST.includes(categoryLower)) continue
      const targetVal = habit.target_value ?? 0
      const unit = String(habit.target_unit || 'minutos').toLowerCase()
      totalFocusMinutes += unit === 'horas' ? targetVal * 60 : targetVal
    }
    const todayFocusMinutes = Math.round(totalFocusMinutes)

    let goals: UserGoals | null = null
    const { data: goalsRow, error: goalsError } = goalsResult
    if (!goalsError && goalsRow) {
      const updatedAt = goalsRow.updated_at ? new Date(goalsRow.updated_at) : null
      const lastMondayBrasilia = startOfWeek(today, { weekStartsOn: 1 })
      const needsReset = updatedAt != null && updatedAt < lastMondayBrasilia

      if (needsReset) {
        const resetPriorities = ensureFiveGoals([]).map((g) => ({ ...g, done: false }))
        const preservedFocus = goalsRow.daily_focus_goal ?? 60
        const preservedHabit = goalsRow.daily_habit_goal ?? 5
        const { error: updateErr } = await supabase
          .from('hexis_user_goals')
          .update({ weekly_priorities: resetPriorities, updated_at: new Date().toISOString() })
          .eq('user_id', user.id)
        goals = !updateErr
          ? { dailyFocusGoal: preservedFocus, dailyHabitGoal: preservedHabit, weeklyPriorities: resetPriorities }
          : {
              dailyFocusGoal: goalsRow.daily_focus_goal ?? 60,
              dailyHabitGoal: goalsRow.daily_habit_goal ?? 5,
              weeklyPriorities: ensureFiveGoals(parseWeeklyPriorities(goalsRow.weekly_priorities)),
            }
      } else {
        goals = {
          dailyFocusGoal: goalsRow.daily_focus_goal ?? 60,
          dailyHabitGoal: goalsRow.daily_habit_goal ?? 5,
          weeklyPriorities: ensureFiveGoals(parseWeeklyPriorities(goalsRow.weekly_priorities)),
        }
      }
    }

    /** Score = Consistência (hábitos). Mesma fórmula do gráfico: (completed/total)*100 */
    const todayScore = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0

    return {
      success: true,
      data: {
        today: {
          completed: todayCompleted,
          total: todayTotal,
          focusMinutes: todayFocusMinutes,
          score: todayScore,
        },
        goals,
        hasJournaledToday: !!journalResult.data,
      },
    }
  } catch (error: any) {
    console.error('getTodayMetrics:', error?.message)
    return { success: false, error: error?.message || 'Erro ao buscar métricas' }
  }
}

/** Busca histórico de 30 dias para o gráfico. Pesada. */
export async function getHistoryMetrics(days: 7 | 30 = 30): Promise<{
  success: boolean
  data?: HistoryMetrics
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

    const today = getBrasiliaDate()
    const todayString = formatBrasiliaDate(today)

    const dateRange: string[] = []
    for (let i = 0; i < days; i++) {
      dateRange.push(formatBrasiliaDate(subDays(today, days - 1 - i)))
    }

    const { data: allHabits, error: habitsError } = await supabase
      .from('hexis_habits')
      .select('id, title, goal_type, target_value, target_unit, frequency_days, created_at, category')
      .eq('user_id', user.id)

    if (habitsError) return { success: false, error: 'Erro ao buscar hábitos' }

    const allHabitIds = (allHabits || []).map((h) => h.id)
    if (allHabitIds.length === 0) {
      const empty: DashboardMetrics['history'] = []
      for (let i = 0; i < days; i++) {
        const d = subDays(today, days - 1 - i)
        empty.push({
          date: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
          score: 0,
          total: 0,
          completed: 0,
        })
      }
      return { success: true, data: { history: empty } }
    }

    const { data: periodTrackingRaw, error: trackingError } = await supabase
      .from('hexis_daily_tracking')
      .select('date, habit_id, completed')
      .eq('user_id', user.id)
      .in('date', dateRange)
      .in('habit_id', allHabitIds)

    if (trackingError) return { success: false, error: trackingError.message }

    const periodTracking = (periodTrackingRaw || []).map((t) => ({
      date: t.date,
      habit_id: t.habit_id,
      completed: t.completed,
    }))

    const history: DashboardMetrics['history'] = []
    for (const dateStr of dateRange) {
      const [y, m, d] = dateStr.split('-').map(Number)
      const date = new Date(y, m - 1, d)
      const { total, completed: completedCount, score } = calculateDailyScore(
        dateStr,
        allHabits || [],
        periodTracking
      )

      history.push({
        date: `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`,
        score,
        total,
        completed: completedCount,
      })
    }

    return { success: true, data: { history } }
  } catch (error: any) {
    console.error('getHistoryMetrics:', error?.message)
    return { success: false, error: error?.message || 'Erro ao buscar histórico' }
  }
}

export async function getDashboardMetrics(days: 7 | 30 = 7): Promise<{
  success: boolean
  data?: DashboardMetrics
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

    const today = getBrasiliaDate()
    const todayString = formatBrasiliaDate(today)
    const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

    // ——— 1. Definição de Período ———
    const dateRange: string[] = []
    for (let i = 0; i < days; i++) {
      const date = subDays(today, days - 1 - i)
      dateRange.push(formatBrasiliaDate(date))
    }

    const dayBefore = formatBrasiliaDate(subDays(today, 1))
    const dayAfter = formatBrasiliaDate(addDays(today, 1))

    // ——— 2. Fetch Paralelo: hábitos + metas + journal (independentes) ———
    const [habitsResult, goalsResult, journalResult] = await Promise.all([
      supabase
        .from('hexis_habits')
        .select('id, title, goal_type, target_value, target_unit, frequency_days, created_at, category')
        .eq('user_id', user.id),
      supabase
        .from('hexis_user_goals')
        .select('daily_focus_goal, daily_habit_goal, weekly_priorities, updated_at')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('hexis_journal_entries')
        .select('id')
        .eq('user_id', user.id)
        .eq('date', todayString)
        .maybeSingle(),
    ])

    const { data: allHabits, error: habitsError } = habitsResult
    if (habitsError) {
      return { success: false, error: 'Erro ao buscar hábitos' }
    }

    const allHabitIds = (allHabits || []).map((h) => h.id)

    // ——— 3. Fetch Paralelo: tracking + sessões (dependem de allHabitIds) ———
    const [trackingResult, sessionsResult] = await Promise.all([
      supabase
        .from('hexis_daily_tracking')
        .select('date, habit_id, completed, achieved_value, achieved_unit')
        .eq('user_id', user.id)
        .in('date', dateRange)
        .in('habit_id', allHabitIds),
      supabase
        .from('hexis_focus_sessions')
        .select('duration, created_at, habit_id')
        .eq('user_id', user.id)
        .gte('created_at', `${dayBefore}T00:00:00.000Z`)
        .lt('created_at', `${dayAfter}T00:00:00.000Z`),
    ])

    let focusSessionsRaw: Array<{ duration?: number; created_at?: string; habit_id?: string | null }> = []
    if (sessionsResult.error) {
      console.error('Erro ao buscar sessões de foco:', sessionsResult.error.message, sessionsResult.error.code)
    } else {
      focusSessionsRaw = sessionsResult.data ?? []
    }

    const periodTrackingRaw = trackingResult.data
    if (trackingResult.error) console.error('Erro ao buscar histórico:', trackingResult.error)
    const periodTracking = (periodTrackingRaw || []).map((t) => ({
      date: t.date,
      habit_id: t.habit_id,
      completed: t.completed,
    }))
    const sessionsToday = focusSessionsRaw.filter((s) => {
      if (!s.created_at) return false
      const brDate = new Date(s.created_at).toLocaleDateString('en-CA', {
        timeZone: 'America/Sao_Paulo',
      })
      return brDate === todayString
    })

    // ——— Tempo de Foco On-Read: sessões (timer) + hábitos concluídos sem sessão (duração do hábito) ———
    const FOCUS_TITLE_BLACKLIST = ['sono', 'dormir', 'sleep', 'descanso', 'soneca']
    const FOCUS_CATEGORY_BLACKLIST = ['rest', 'physiology', 'descanso']
    const activeHabitIdsToday = getActiveHabitIdsForDate(todayString, allHabits || [])
    const completedToday = periodTracking.filter(
      (t) => t.date === todayString && activeHabitIdsToday.includes(t.habit_id) && t.completed === true
    )
    const habitIdsWithSession = new Set(
      sessionsToday.map((s) => s.habit_id).filter((id): id is string => id != null)
    )
    let totalFocusMinutes =
      sessionsToday.reduce((sum, s) => sum + (typeof s.duration === 'number' ? s.duration : 0), 0) / 60
    for (const t of completedToday) {
      if (habitIdsWithSession.has(t.habit_id)) continue
      const habit = (allHabits || []).find((h) => h.id === t.habit_id)
      if (!habit) continue
      const titleLower = String(habit.title ?? '').toLowerCase()
      if (FOCUS_TITLE_BLACKLIST.some((word) => titleLower.includes(word))) continue
      const categoryLower = String((habit as { category?: string | null }).category ?? '').toLowerCase()
      if (categoryLower && FOCUS_CATEGORY_BLACKLIST.includes(categoryLower)) continue
      const targetVal = habit.target_value ?? 0
      const unit = String(habit.target_unit || 'minutos').toLowerCase()
      totalFocusMinutes += unit === 'horas' ? targetVal * 60 : targetVal
    }
    const todayFocusMinutesComputed = Math.round(totalFocusMinutes)

    // ——— 3. Loop Mestre (do mais antigo para hoje) ———
    const history: DashboardMetrics['history'] = []
    let todayCompleted = 0
    let todayTotal = 0
    let todayScore = 0
    let todayFocusMinutes = todayFocusMinutesComputed

    for (const dateStr of dateRange) {
      const [y, m, d] = dateStr.split('-').map(Number)
      const date = new Date(y, m - 1, d)
      const { total, completed: completedCount, score } = calculateDailyScore(
        dateStr,
        allHabits || [],
        periodTracking
      )

      const day = String(date.getDate()).padStart(2, '0')
      const month = String(date.getMonth() + 1).padStart(2, '0')
      history.push({
        date: `${day}/${month}`,
        score,
        total,
        completed: completedCount,
      })

      if (dateStr === todayString) {
        todayTotal = total
        todayCompleted = completedCount
      }
    }

    // ——— Metas do usuário (já buscadas em paralelo) + Lazy Reset Semanal ———
    let goals: UserGoals | null = null
    const { data: goalsRow, error: goalsError } = goalsResult

    if (goalsError) {
      console.error('Erro ao buscar metas (hexis_user_goals):', goalsError.message, goalsError.code)
    } else if (goalsRow) {
      const updatedAt = goalsRow.updated_at ? new Date(goalsRow.updated_at) : null
      const lastMondayBrasilia = startOfWeek(today, { weekStartsOn: 1 })
      const needsReset = updatedAt != null && updatedAt < lastMondayBrasilia

      if (needsReset) {
        // Reset apenas weekly_priorities (done flags). Preservar daily_focus_goal e daily_habit_goal.
        const resetPriorities = ensureFiveGoals([]).map((g) => ({ ...g, done: false }))
        const preservedFocus = goalsRow.daily_focus_goal ?? 60
        const preservedHabit = goalsRow.daily_habit_goal ?? 5
        const { error: updateErr } = await supabase
          .from('hexis_user_goals')
          .update({
            weekly_priorities: resetPriorities,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id)
        if (!updateErr) {
          goals = {
            dailyFocusGoal: preservedFocus,
            dailyHabitGoal: preservedHabit,
            weeklyPriorities: resetPriorities,
          }
        } else {
          const parsed = parseWeeklyPriorities(goalsRow.weekly_priorities)
          goals = {
            dailyFocusGoal: goalsRow.daily_focus_goal ?? 60,
            dailyHabitGoal: goalsRow.daily_habit_goal ?? 5,
            weeklyPriorities: ensureFiveGoals(parsed),
          }
        }
      } else {
        const parsed = parseWeeklyPriorities(goalsRow.weekly_priorities)
        goals = {
          dailyFocusGoal: goalsRow.daily_focus_goal ?? 60,
          dailyHabitGoal: goalsRow.daily_habit_goal ?? 5,
          weeklyPriorities: ensureFiveGoals(parsed),
        }
      }
    }

    // ——— Performance de Hoje: Consistência (hábitos). Mesma fórmula do gráfico ———
    todayScore = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0

    // ——— Journaling hoje (já buscado em paralelo) ———
    const hasJournaledToday = !!journalResult.data

    // ——— 4. Retorno Unificado ———
    return {
      success: true,
      data: {
        history,
        today: {
          completed: todayCompleted,
          total: todayTotal,
          focusMinutes: todayFocusMinutes,
          score: todayScore,
        },
        goals,
        hasJournaledToday,
      },
    }
  } catch (error: any) {
    console.error('❌ ERRO CRÍTICO: Exceção ao buscar métricas do dashboard', error?.message, error)
    return { success: false, error: error?.message || 'Erro ao buscar métricas' }
  }
}

/**
 * Retorna a taxa de conclusão de hábitos (0–100) por dia para um intervalo de datas.
 * Usado pelo CalendarStrip para desenhar o preenchimento circular de cada dia.
 */
export async function getCalendarHabitHistory(
  startDate: string,
  endDate: string
): Promise<{ success: boolean; data?: Record<string, number>; error?: string }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Usuário não autenticado' }
    }

    const [yS, mS, dS] = startDate.split('-').map(Number)
    const [yE, mE, dE] = endDate.split('-').map(Number)
    const start = new Date(yS, mS - 1, dS)
    const end = new Date(yE, mE - 1, dE)
    const dayCount = Math.max(0, differenceInCalendarDays(end, start) + 1)

    const dateRange: string[] = []
    for (let i = 0; i < dayCount; i++) {
      const d = addDays(start, i)
      dateRange.push(formatBrasiliaDate(d))
    }

    if (dateRange.length === 0) {
      return { success: true, data: {} }
    }

    const { data: allHabits, error: habitsError } = await supabase
      .from('hexis_habits')
      .select('id, title, goal_type, target_value, target_unit, frequency_days, created_at')
      .eq('user_id', user.id)

    if (habitsError) {
      return { success: false, error: 'Erro ao buscar hábitos' }
    }

    const allHabitIds = (allHabits || []).map((h) => h.id)
    if (allHabitIds.length === 0) {
      const empty: Record<string, number> = {}
      dateRange.forEach((d) => (empty[d] = 0))
      return { success: true, data: empty }
    }

    const trackingResult = await supabase
      .from('hexis_daily_tracking')
      .select('date, habit_id, completed')
      .eq('user_id', user.id)
      .in('date', dateRange)
      .in('habit_id', allHabitIds)

    if (trackingResult.error) {
      return { success: false, error: trackingResult.error.message }
    }

    const periodTracking = (trackingResult.data || []).map((t) => ({
      date: t.date,
      habit_id: t.habit_id,
      completed: t.completed,
    }))
    const result: Record<string, number> = {}

    for (const dateStr of dateRange) {
      const { score } = calculateDailyScore(dateStr, allHabits || [], periodTracking)
      result[dateStr] = Math.min(100, Math.max(0, score))
    }

    return { success: true, data: result }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao buscar histórico do calendário'
    console.error(message, err)
    return { success: false, error: message }
  }
}
