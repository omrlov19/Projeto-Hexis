'use server'

import { createClient } from '@/lib/supabase/server'
import { getBrasiliaDate, formatBrasiliaDate } from '@/lib/date'
import { subDays } from 'date-fns'

export interface DashboardMetrics {
  today: {
    completedHabits: number
    totalHabits: number
    focusMinutes: number
    productivityScore: number
  }
  history: Array<{
    date: string // Formato "14/01"
    score: number // % de conclusão (0-100)
  }>
}

export async function getDashboardMetrics(days: 7 | 30 = 30): Promise<{
  success: boolean
  data?: DashboardMetrics
  error?: string
}> {
  try {
    const supabase = await createClient()

    // Validar usuário autenticado
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Usuário não autenticado' }
    }

    const today = getBrasiliaDate()
    const todayString = formatBrasiliaDate(today)

    // ============================================
    // MÉTRICAS DE HOJE
    // ============================================

    // Buscar hábitos ativos de hoje (considerando frequency_days)
    const [year, month, day] = todayString.split('-').map(Number)
    const contextDate = new Date(year, month - 1, day)
    const todayIndex = contextDate.getDay()
    const todayStr = String(todayIndex)
    const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
    const currentDayName = dayNames[todayIndex]

    // Buscar todos os hábitos do usuário
    const { data: allHabits, error: habitsError } = await supabase
      .from('hexis_habits')
      .select('id, goal_type, target_value, target_unit, frequency_days, created_at')
      .eq('user_id', user.id)

    if (habitsError) {
      return { success: false, error: 'Erro ao buscar hábitos' }
    }

    // Filtrar hábitos ativos para hoje (baseado em frequency_days)
    const activeHabitsToday = (allHabits || []).filter((habit) => {
      const frequencyDays = habit.frequency_days as number[] | string[] | null | undefined
      const habitCreatedAtISO = habit.created_at
      const habitCreatedDate = habitCreatedAtISO.split('T')[0]

      // Se foi criado hoje ou depois, não mostrar
      if (habitCreatedDate > todayString) {
        return false
      }

      // Se frequency_days é null ou vazio, é diário
      if (!frequencyDays || !Array.isArray(frequencyDays) || frequencyDays.length === 0) {
        return true
      }

      // Verificar se hoje está na lista de dias
      const frequencyDaysAsStrings = frequencyDays.map((d) => String(d))
      const dayNamesAsNumbers = ['0', '1', '2', '3', '4', '5', '6']
      const dayNamesAsStrings = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

      return (
        frequencyDaysAsStrings.includes(todayStr) ||
        frequencyDaysAsStrings.includes(currentDayName) ||
        frequencyDaysAsStrings.includes(dayNamesAsNumbers[todayIndex]) ||
        frequencyDaysAsStrings.includes(dayNamesAsStrings[todayIndex])
      )
    })

    const totalHabits = activeHabitsToday.length

    // Buscar tracking de hoje
    const habitIds = activeHabitsToday.map((h) => h.id)
    const { data: todayTracking, error: trackingError } = await supabase
      .from('hexis_daily_tracking')
      .select('habit_id, completed, achieved_value, achieved_unit, goal_type')
      .eq('user_id', user.id)
      .eq('date', todayString)
      .in('habit_id', habitIds)

    if (trackingError) {
      console.error('Erro ao buscar tracking de hoje:', trackingError)
    }

    // Calcular métricas de hoje
    const completedHabits = (todayTracking || []).filter((t) => t.completed === true).length

    // Calcular focusMinutes (soma de achieved_value de hábitos tipo 'time')
    const focusMinutes = (todayTracking || []).reduce((total, tracking) => {
      const habit = activeHabitsToday.find((h) => h.id === tracking.habit_id)
      if (habit?.goal_type === 'time' && tracking.achieved_value) {
        // Converter para minutos se necessário
        let minutes = tracking.achieved_value
        if (tracking.achieved_unit === 'horas') {
          minutes = tracking.achieved_value * 60
        }
        return total + minutes
      }
      return total
    }, 0)

    // Calcular productivityScore (% de conclusão)
    const productivityScore = totalHabits > 0 ? Math.round((completedHabits / totalHabits) * 100) : 0

    // ============================================
    // HISTÓRICO (Últimos N dias)
    // ============================================

    const history: Array<{ date: string; score: number }> = []

    // Gerar array de datas do período
    const dateRange: string[] = []
    for (let i = 0; i < days; i++) {
      const date = subDays(today, days - 1 - i)
      dateRange.push(formatBrasiliaDate(date))
    }

    // Buscar todos os hábitos do usuário (para calcular hábitos ativos por dia)
    const allHabitIds = (allHabits || []).map((h) => h.id)

    // Buscar todos os hábitos ativos para cada dia do período
    // Estratégia: Buscar tracking de todo o período de uma vez (mais eficiente)
    const { data: periodTracking, error: periodError } = await supabase
      .from('hexis_daily_tracking')
      .select('date, habit_id, completed')
      .eq('user_id', user.id)
      .in('date', dateRange)
      .in('habit_id', allHabitIds)

    if (periodError) {
      console.error('Erro ao buscar histórico:', periodError)
    }

    // Para cada dia do período, calcular o score
    for (const dateStr of dateRange) {
      const [y, m, d] = dateStr.split('-').map(Number)
      const date = new Date(y, m - 1, d)
      const dateIndex = date.getDay()
      const dateStrIndex = String(dateIndex)
      const dateDayName = dayNames[dateIndex]

      // Filtrar hábitos ativos para este dia específico
      const activeHabitsForDay = (allHabits || []).filter((habit) => {
        const frequencyDays = habit.frequency_days as number[] | string[] | null | undefined
        const habitCreatedAtISO = habit.created_at
        const habitCreatedDate = habitCreatedAtISO.split('T')[0]

        // Se foi criado depois deste dia, não contar
        if (habitCreatedDate > dateStr) {
          return false
        }

        // Se frequency_days é null ou vazio, é diário
        if (!frequencyDays || !Array.isArray(frequencyDays) || frequencyDays.length === 0) {
          return true
        }

        // Verificar se este dia está na lista
        const frequencyDaysAsStrings = frequencyDays.map((d) => String(d))
        const dayNamesAsNumbers = ['0', '1', '2', '3', '4', '5', '6']
        const dayNamesAsStrings = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

        return (
          frequencyDaysAsStrings.includes(dateStrIndex) ||
          frequencyDaysAsStrings.includes(dateDayName) ||
          frequencyDaysAsStrings.includes(dayNamesAsNumbers[dateIndex]) ||
          frequencyDaysAsStrings.includes(dayNamesAsStrings[dateIndex])
        )
      })

      const totalForDay = activeHabitsForDay.length

      if (totalForDay === 0) {
        // Se não há hábitos ativos neste dia, score é 0
        // Formatar data como "DD/MM"
        const day = String(date.getDate()).padStart(2, '0')
        const month = String(date.getMonth() + 1).padStart(2, '0')
        history.push({
          date: `${day}/${month}`,
          score: 0,
        })
        continue
      }

      // Buscar tracking deste dia (apenas para hábitos ativos neste dia)
      const activeHabitIdsForDay = activeHabitsForDay.map((h) => h.id)
      const dayTracking = (periodTracking || []).filter(
        (t) => t.date === dateStr && activeHabitIdsForDay.includes(t.habit_id)
      )
      const completedForDay = dayTracking.filter((t) => t.completed === true).length

      const score = Math.round((completedForDay / totalForDay) * 100)

      // Formatar data como "DD/MM"
      const day = String(date.getDate()).padStart(2, '0')
      const month = String(date.getMonth() + 1).padStart(2, '0')
      history.push({
        date: `${day}/${month}`,
        score,
      })
    }

    return {
      success: true,
      data: {
        today: {
          completedHabits,
          totalHabits,
          focusMinutes,
          productivityScore,
        },
        history,
      },
    }
  } catch (error: any) {
    console.error('❌ ERRO CRÍTICO: Exceção ao buscar métricas do dashboard', error?.message, error)
    return { success: false, error: error?.message || 'Erro ao buscar métricas' }
  }
}
