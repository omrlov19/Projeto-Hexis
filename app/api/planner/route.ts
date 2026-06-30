import { NextResponse } from 'next/server'
import { getBrasiliaDate, formatBrasiliaDate } from '@/lib/date'
import { getHabits } from '@/app/actions/habits'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')
    const today = getBrasiliaDate()
    const dateString = dateParam ?? formatBrasiliaDate(today)

    const res = await getHabits(dateString)
    if (!res.success && res.error === 'Usuário não autenticado') {
      return NextResponse.json(
        { success: false, error: res.error },
        { status: 401 }
      )
    }
    if (!res.success) {
      return NextResponse.json(
        { success: false, error: res.error ?? 'Erro ao buscar planner' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      items: res.data ?? [],
    })
  } catch (err) {
    console.error('[api/planner]', err)
    return NextResponse.json(
      { success: false, error: 'Erro interno' },
      { status: 500 }
    )
  }
}
