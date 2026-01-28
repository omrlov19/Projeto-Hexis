'use client'

import { HabitTracker } from './HabitTracker'
import { Header } from '@/components/layout/Header'
import type { HabitWithStatus } from '@/types/hexis'

interface HabitTrackerWrapperProps {
  initialHabits: HabitWithStatus[]
  date: string
  currentDate: Date
}

export default function HabitTrackerWrapper({
  initialHabits,
  date,
  currentDate,
}: HabitTrackerWrapperProps) {
  return (
    <>
      {/* Header com progresso atualizado */}
      <div className="text-center mb-4">
        <Header date={currentDate} habits={initialHabits} />
      </div>

      {/* Lista de hábitos */}
      <HabitTracker initialHabits={initialHabits} date={date} currentDate={currentDate} />
    </>
  )
}
