import { Suspense } from 'react'
import PlannerContent from '@/components/planner/PlannerContent'

// Skeleton de carregamento para o Planner (visualmente idêntico ao layout real)
function PlannerSkeleton() {
  return (
    <div className="min-h-screen bg-black text-white pt-12 pb-24 px-6">
      {/* Título */}
      <header className="flex justify-center items-center mb-8">
        <h1 className="text-4xl font-heading uppercase tracking-[0.2em] text-[#d4af37]">
          PLANNER
        </h1>
      </header>

      {/* Seletor de Visão Skeleton */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex bg-zinc-900 border border-zinc-800 rounded-lg p-1 gap-1">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-9 w-20 bg-zinc-800 rounded-md animate-pulse"
            />
          ))}
        </div>
      </div>

      {/* Botão Skeleton */}
      <div className="w-full mb-8 h-14 bg-zinc-900 rounded-lg animate-pulse" />

      {/* Conteúdo Skeleton */}
      <div className="space-y-3 max-w-2xl mx-auto">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 bg-zinc-900 rounded-lg border border-zinc-800 animate-pulse"
          />
        ))}
      </div>
    </div>
  )
}

// Página síncrona - SEM await bloqueante
export default function PlannerPage() {
  return (
    <Suspense fallback={<PlannerSkeleton />}>
      <PlannerContent />
    </Suspense>
  )
}
