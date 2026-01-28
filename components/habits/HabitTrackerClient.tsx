'use client'

import { HabitTracker } from './HabitTracker'
import type { HabitWithStatus } from '@/types/hexis'

interface HabitTrackerClientProps {
  initialHabits: HabitWithStatus[]
  date: string
  currentDate: Date
}

export default function HabitTrackerClient({
  initialHabits,
  date,
  currentDate,
}: HabitTrackerClientProps) {
  return (
    <HabitTracker initialHabits={initialHabits} date={date} currentDate={currentDate} />
  )
}
