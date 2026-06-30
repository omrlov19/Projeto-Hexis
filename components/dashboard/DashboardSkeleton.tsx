import { Skeleton } from '@/components/ui/Skeleton'

/**
 * Skeleton da Dashboard: mesmo padding e estrutura da página real (evita layout shift).
 * Header (logo) + Hotbar de Metas + Gráfico + Lista de metas.
 */
export default function DashboardSkeleton() {
  return (
    <div className="space-y-6 pb-8">
      {/* Header (logo Hexis + logout) — mesmo layout que DashboardHeader */}
      <header className="flex items-center justify-between w-full mb-6">
        <Skeleton className="h-8 w-24 rounded" />
        <Skeleton className="h-9 w-9 rounded-lg" />
      </header>

      {/* Título + data (como na página real) */}
      <div className="text-center">
        <Skeleton className="h-8 w-48 mx-auto rounded" />
        <Skeleton className="h-5 w-56 mx-auto mt-2 rounded" />
      </div>

      {/* Grid 2 colunas — Hábitos Concluídos + Tempo de Foco (hotbar de números) */}
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="rounded-3xl min-h-[140px]" />
        <Skeleton className="rounded-3xl min-h-[140px]" />
      </div>

      {/* Card Performance (barra) */}
      <div className="rounded-3xl border border-zinc-700 p-5 bg-zinc-900/50">
        <div className="flex justify-between mb-3">
          <Skeleton className="h-4 w-40 rounded" />
          <Skeleton className="h-6 w-12 rounded" />
        </div>
        <Skeleton className="h-4 w-full rounded-full" />
      </div>

      {/* Linha Steve Jobs + Hotbar de Metas */}
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="rounded-3xl min-h-[120px] border border-zinc-700" />
        <Skeleton className="rounded-3xl min-h-[120px] border border-zinc-700" />
      </div>

      {/* Linha Journal + Members */}
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="rounded-3xl min-h-[100px] border border-zinc-700" />
        <Skeleton className="rounded-3xl min-h-[100px] border border-zinc-700" />
      </div>

      {/* Gráfico Consistência (quadrado grande cinza) */}
      <div className="rounded-3xl border border-zinc-700 p-5 bg-zinc-900/50">
        <div className="flex justify-between mb-4">
          <Skeleton className="h-4 w-24 rounded" />
          <Skeleton className="h-8 w-32 rounded-lg" />
        </div>
        <Skeleton className="h-48 w-full rounded" />
      </div>
    </div>
  )
}
