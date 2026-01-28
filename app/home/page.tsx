import { Suspense } from 'react'
import { getBrasiliaDate, formatBrasiliaDate, parseBrasiliaDate } from '@/lib/date'
import { Header } from '@/components/layout/Header'
import { DateNavigation } from '@/components/layout/DateNavigation'
import HabitTrackerList from '@/components/habits/HabitTrackerList'

// Skeleton apenas para a lista de hábitos (Header e DateNavigation aparecem instantaneamente)
function HabitListSkeleton() {
  return (
    <div className="space-y-3 max-w-xl mx-auto">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="bg-[#0a0a0a] border border-[#E5C06E]/20 rounded-sm px-4 py-5 animate-pulse"
        >
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 bg-zinc-800 rounded border border-zinc-700" />
            <div className="flex-1">
              <div className="h-5 bg-zinc-800 rounded w-3/4 mb-2" />
              <div className="h-3 bg-zinc-800 rounded w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Página síncrona - SEM await bloqueante
export default function HomePage({
  searchParams,
}: {
  searchParams?: Promise<{ date?: string }> | { date?: string }
}) {
  // Resolver searchParams de forma síncrona para Header/DateNavigation
  // (mas não vamos esperar por isso, apenas usar para renderizar UI estática)
  const todayBrasilia = getBrasiliaDate()
  const resolvedSearchParams = searchParams instanceof Promise ? null : searchParams
  const dateParam = resolvedSearchParams?.date
  const dateString = dateParam || formatBrasiliaDate(todayBrasilia)
  const selectedDate = dateParam ? parseBrasiliaDate(dateParam) : todayBrasilia

  return (
    <div className="min-h-screen relative">
      {/* Container principal */}
      <div className="max-w-2xl mx-auto px-8 pt-4 pb-28">
        {/* Header renderizado INSTANTANEAMENTE (sem await) */}
        <div className="text-center mb-4">
          <div className="flex flex-col items-center justify-center mt-6 mb-8">
            <h1 className="text-3xl font-heading uppercase tracking-[0.2em] text-[#E5C06E] text-center">
              HABIT TRACKER
            </h1>
          </div>
        </div>

        {/* DateNavigation dentro de Suspense (usa useSearchParams) */}
        <Suspense fallback={<div className="h-14 w-full mb-8 animate-pulse bg-white/5 rounded-lg" />}>
          <DateNavigation currentDate={selectedDate} />
        </Suspense>

        {/* Lista de hábitos dentro do Suspense (streaming) */}
        <Suspense fallback={<HabitListSkeleton />}>
          <HabitTrackerList searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  )
}
