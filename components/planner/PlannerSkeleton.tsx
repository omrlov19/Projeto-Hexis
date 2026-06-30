import { Skeleton } from '@/components/ui/Skeleton'

/**
 * Skeleton do Planner.
 * Com hideHeader=true (fallback no Shell First), só tabs + lista (título já está no shell).
 */
export default function PlannerSkeleton({ hideHeader = false }: { hideHeader?: boolean }) {
  return (
    <div className="space-y-4">
      {!hideHeader && (
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48 rounded" />
          <Skeleton className="h-10 w-10 rounded-lg" />
        </div>
      )}

      {/* Tabs Dia/Semana/Mês */}
      <div className="flex gap-2 p-1 rounded-lg w-fit">
        <Skeleton className="h-9 w-20 rounded-md" />
        <Skeleton className="h-9 w-20 rounded-md" />
        <Skeleton className="h-9 w-20 rounded-md" />
      </div>

      {/* Lista vertical de tarefas (retângulos cinzas) */}
      <div className="space-y-2 mt-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    </div>
  )
}
