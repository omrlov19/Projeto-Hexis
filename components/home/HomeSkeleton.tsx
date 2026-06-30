import { Skeleton } from '@/components/ui/Skeleton'

/**
 * Skeleton da página Hábitos (Home).
 * Com showTitle=false (fallback no Shell First), só calendário + lista (título já está no shell).
 */
export default function HomeSkeleton({ showTitle = true }: { showTitle?: boolean }) {
  const content = (
    <>
      {showTitle && (
        <div className="text-center mb-4">
          <div className="flex flex-col items-center justify-center mt-6 mb-8">
            <Skeleton className="h-9 w-64 rounded" />
          </div>
        </div>
      )}
      <div className="mb-6 flex gap-3 overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="flex-shrink-0 w-12 h-12 rounded-full" />
        ))}
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-[60px] w-full rounded-2xl" />
        ))}
      </div>
    </>
  )
  if (!showTitle) return content
  return (
    <div className="min-h-screen relative">
      <div className="max-w-2xl mx-auto px-8 pt-4 pb-28">
        {content}
      </div>
    </div>
  )
}
