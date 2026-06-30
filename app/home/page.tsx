'use client'

import { Suspense } from 'react'
import HabitsClientLoader from '@/components/home/HabitsClientLoader'
import HabitTrackerSkeleton from '@/components/habits/HabitTrackerSkeleton'

/** Mesmo padrão do Journal: página 100% client, shell imediato, dados em segundo plano (useEffect no loader). */
export default function HomePage() {
  return (
    <div className="min-h-screen relative w-full">
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 pt-4 pb-28 w-full">
        <div className="text-center mb-4">
          <div className="flex flex-col items-center justify-center mt-6 mb-8">
            <h1 className="text-3xl font-heading uppercase tracking-[0.2em] text-[#E5C06E] text-center">
              HABIT TRACKER
            </h1>
          </div>
        </div>
        <Suspense fallback={<HabitTrackerSkeleton />}>
          <HabitsClientLoader />
        </Suspense>
      </div>
    </div>
  )
}
