import { NextResponse } from 'next/server'
import { addDays } from 'date-fns'
import { getBrasiliaDate, formatBrasiliaDate, parseBrasiliaDate } from '@/lib/date'
import { getHabits } from '@/app/actions/habits'
import { getCalendarHabitHistory } from '@/app/actions/dashboard'

export const dynamic = 'force-dynamic'

const DAYS_BACK = 15
const DAYS_FORWARD = 15

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')
    const today = getBrasiliaDate()
    const dateString = dateParam ?? formatBrasiliaDate(today)
    const startDate = addDays(today, -DAYS_BACK)
    const endDate = addDays(today, DAYS_FORWARD)
    const startStr = formatBrasiliaDate(startDate)
    const endStr = formatBrasiliaDate(endDate)

    const [habitsRes, historyRes] = await Promise.all([
      getHabits(dateString),
      getCalendarHabitHistory(startStr, endStr),
    ])

    if (!habitsRes.success && habitsRes.error === 'Usuário não autenticado') {
      return NextResponse.json(
        { success: false, error: habitsRes.error },
        { status: 401 }
      )
    }
    if (!habitsRes.success || !historyRes.success) {
      return NextResponse.json(
        { success: false, error: habitsRes.error ?? historyRes.error ?? 'Erro ao buscar hábitos' },
        { status: 500 }
      )
    }

    const habits = habitsRes.data ?? []
    const history = historyRes.data ?? {}
    const selectedDate = dateParam ? parseBrasiliaDate(dateParam) : today

    return NextResponse.json({
      success: true,
      habits,
      history,
      dateString,
      selectedDate: selectedDate.toISOString(),
    })
  } catch (err) {
    console.error('[api/habits]', err)
    return NextResponse.json(
      { success: false, error: 'Erro interno' },
      { status: 500 }
    )
  }
}
