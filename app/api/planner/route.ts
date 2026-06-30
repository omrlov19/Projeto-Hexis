import { NextResponse } from 'next/server'
import { getBrasiliaDate, formatBrasiliaDate } from '@/lib/date'
import { getHabits } from '@/app/actions/habits'
import { getReminders } from '@/app/actions/planner'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')
    const today = getBrasiliaDate()
    const dateString = dateParam ?? formatBrasiliaDate(today)

    const [resHabits, resReminders] = await Promise.all([
      getHabits(dateString),
      getReminders()
    ])

    if (!resHabits.success && resHabits.error === 'Usuário não autenticado') {
      return NextResponse.json(
        { success: false, error: resHabits.error },
        { status: 401 }
      )
    }
    if (!resHabits.success) {
      return NextResponse.json(
        { success: false, error: resHabits.error ?? 'Erro ao buscar planner' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      items: resHabits.data ?? [],
      reminders: resReminders.success ? (resReminders.data ?? []) : [],
    })
  } catch (err) {
    console.error('[api/planner]', err)
    return NextResponse.json(
      { success: false, error: 'Erro interno' },
      { status: 500 }
    )
  }
}
