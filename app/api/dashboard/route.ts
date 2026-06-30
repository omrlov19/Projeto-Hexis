import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getDashboardMetrics,
  getTodayMetrics,
  getHistoryMetrics,
  getUserGoals,
  getTodayStats,
  getUserProfile,
} from '@/app/actions/dashboard'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Usuário não autenticado' },
        { status: 401 }
      )
    }

    const profile = await getUserProfile()
    const userName =
      (profile.success && profile.fullName ? profile.fullName : null) ??
      (user.user_metadata?.full_name as string) ??
      (user.user_metadata?.name as string) ??
      'Soberano'

    const { searchParams } = new URL(request.url)
    const scope = searchParams.get('scope') // 'goals' | 'todayStats' | 'today' | 'history' | null (full)

    if (scope === 'goals') {
      const result = await getUserGoals()
      if (!result.success) {
        if (result.error === 'Usuário não autenticado') {
          return NextResponse.json({ success: false, error: result.error }, { status: 401 })
        }
        return NextResponse.json(
          { success: false, error: result.error ?? 'Erro ao buscar metas' },
          { status: 500 }
        )
      }
      return NextResponse.json({
        success: true,
        goals: result.data ?? null,
        userName,
      })
    }

    if (scope === 'todayStats') {
      const result = await getTodayStats()
      if (!result.success) {
        if (result.error === 'Usuário não autenticado') {
          return NextResponse.json({ success: false, error: result.error }, { status: 401 })
        }
        return NextResponse.json(
          { success: false, error: result.error ?? 'Erro ao buscar métricas' },
          { status: 500 }
        )
      }
      return NextResponse.json({
        success: true,
        todayStats: result.data ?? null,
      })
    }

    if (scope === 'today') {
      const result = await getTodayMetrics()
      if (!result.success) {
        if (result.error === 'Usuário não autenticado') {
          return NextResponse.json({ success: false, error: result.error }, { status: 401 })
        }
        return NextResponse.json(
          { success: false, error: result.error ?? 'Erro ao buscar métricas' },
          { status: 500 }
        )
      }
      return NextResponse.json({
        success: true,
        metrics: result.data,
        userGoals: result.data?.goals ?? null,
        userName,
      })
    }

    if (scope === 'history') {
      const result = await getHistoryMetrics(30)
      if (!result.success) {
        if (result.error === 'Usuário não autenticado') {
          return NextResponse.json({ success: false, error: result.error }, { status: 401 })
        }
        return NextResponse.json(
          { success: false, error: result.error ?? 'Erro ao buscar histórico' },
          { status: 500 }
        )
      }
      return NextResponse.json({
        success: true,
        history: result.data?.history ?? [],
      })
    }

    // scope=full ou sem scope: compatibilidade
    const result = await getDashboardMetrics(30)
    if (!result.success) {
      if (result.error === 'Usuário não autenticado') {
        return NextResponse.json({ success: false, error: result.error }, { status: 401 })
      }
      return NextResponse.json(
        { success: false, error: result.error ?? 'Erro ao buscar métricas' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      metrics: result.data,
      userGoals: result.data?.goals ?? null,
      userName,
    })
  } catch (err) {
    console.error('[api/dashboard]', err)
    return NextResponse.json(
      { success: false, error: 'Erro interno' },
      { status: 500 }
    )
  }
}
