'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { CalendarStrip } from '@/components/dashboard/CalendarStrip'
import { HabitTracker } from '@/components/habits/HabitTracker'
import type { HabitWithStatus } from '@/types/hexis'

type Props = {
  initialHabits: HabitWithStatus[]
  initialProgress: Record<string, number>
  dateString: string
  selectedDate: Date
  /** Quando true, não renderiza o título (já exibido no shell da página). */
  showTitle?: boolean
  /** Quando true, não usa wrapper próprio (a página já fornece). */
  noWrapper?: boolean
}

export function HomeViewClient({
  initialHabits,
  initialProgress,
  dateString,
  selectedDate,
  showTitle = true,
  noWrapper = false,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const content = (
    <>
      {showTitle && (
        <div className="text-center mb-4">
          <div className="flex flex-col items-center justify-center mt-6 mb-8">
            <h1 className="text-3xl font-heading uppercase tracking-[0.2em] text-[#E5C06E] text-center">
              HABIT TRACKER
            </h1>
          </div>
        </div>
      )}

      <CalendarStrip
        selectedDate={dateString}
        initialProgress={initialProgress}
        onDateSelect={(d) => {
          startTransition(() => {
            router.push(`/home?date=${d}`, { scroll: false })
          })
        }}
      />

      <div className={isPending ? 'opacity-70' : undefined}>
        <HabitTracker
          initialHabits={initialHabits}
          date={dateString}
          currentDate={selectedDate}
        />
      </div>
    </>
  )

  if (noWrapper) return content
  return (
    <div className="min-h-screen relative">
      <div className="max-w-2xl mx-auto px-8 pt-4 pb-28">
        {content}
      </div>
    </div>
  )
}
