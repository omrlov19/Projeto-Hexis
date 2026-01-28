import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDashboardMetrics } from '@/app/actions/dashboard'
import DashboardMetrics from '@/components/dashboard/DashboardMetrics'
import LogoutButton from '@/components/dashboard/LogoutButton'

// Força renderização dinâmica (evita cache estático)
export const dynamic = 'force-dynamic'

// Componente Server que busca métricas
async function DashboardMetricsContent() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Buscar métricas (últimos 30 dias)
  const metricsResult = await getDashboardMetrics(30)

  if (!metricsResult.success || !metricsResult.data) {
    return (
      <div className="text-center py-12" style={{ color: '#ffffff' }}>
        <p>Erro ao carregar métricas: {metricsResult.error || 'Erro desconhecido'}</p>
      </div>
    )
  }

  return <DashboardMetrics metrics={metricsResult.data} />
}

// Skeleton de carregamento
function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      {/* Skeleton dos 3 círculos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-xl p-6"
            style={{ backgroundColor: '#111111', border: '1px solid #333333' }}
          >
            <div className="flex flex-col items-center">
              <div
                className="w-32 h-32 rounded-full animate-pulse"
                style={{ backgroundColor: '#333333' }}
              />
              <div className="mt-4 space-y-2">
                <div
                  className="h-4 w-20 rounded animate-pulse mx-auto"
                  style={{ backgroundColor: '#333333' }}
                />
                <div
                  className="h-3 w-16 rounded animate-pulse mx-auto"
                  style={{ backgroundColor: '#333333' }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Skeleton do gráfico */}
      <div
        className="rounded-xl p-6"
        style={{ backgroundColor: '#111111', border: '1px solid #333333' }}
      >
        <div
          className="h-8 w-48 rounded animate-pulse mx-auto mb-6"
          style={{ backgroundColor: '#333333' }}
        />
        <div
          className="h-64 w-full rounded animate-pulse"
          style={{ backgroundColor: '#222222' }}
        />
      </div>
    </div>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen pt-12 pb-24 px-6" style={{ backgroundColor: '#000000' }}>
      {/* Título de Debug */}
      <div className="max-w-6xl mx-auto mb-4">
        <h1 className="text-3xl font-bold" style={{ color: '#ffffff' }}>
          PAINEL DE CONTROLE
        </h1>
      </div>

      {/* Header */}
      <header className="flex items-center justify-between mb-12 max-w-6xl mx-auto">
        <h1
          className="text-4xl font-heading font-bold uppercase tracking-[0.2em]"
          style={{ color: '#ffffff' }}
        >
          BEM-VINDO, SOBERANO
        </h1>
        <LogoutButton />
      </header>

      {/* Corpo com Suspense */}
      <div className="max-w-6xl mx-auto">
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardMetricsContent />
        </Suspense>
      </div>
    </div>
  )
}
