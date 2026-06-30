'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getBrasiliaDate, formatBrasiliaDate } from '@/lib/date'
import { HomeViewClient } from '@/components/home/HomeViewClient'
import type { HabitWithStatus } from '@/types/hexis'

export default function HabitsClientLoader() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const dateParam = searchParams.get('date')
  const dateString = dateParam ?? formatBrasiliaDate(getBrasiliaDate())

  const [habits, setHabits] = useState<HabitWithStatus[]>([])
  const [history, setHistory] = useState<Record<string, number>>({})
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setError(null)
    fetch(`/api/habits?date=${encodeURIComponent(dateString)}`)
      .then((res) => {
        if (cancelled) return
        if (res.status === 401) {
          router.push('/login')
          return null
        }
        if (!res.ok) throw new Error('Erro ao carregar hábitos')
        return res.json()
      })
      .then((data) => {
        if (cancelled || !data) return
        if (data.success) {
          setHabits(data.habits ?? [])
          setHistory(data.history ?? {})
          if (data.selectedDate) setSelectedDate(new Date(data.selectedDate))
        } else {
          setError(data.error ?? 'Erro ao carregar')
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? 'Erro ao carregar')
      })
    return () => { cancelled = true }
  }, [router, dateString])

  // UI First: sempre renderizar estrutura (header, calendário, lista). Dados brotam quando o fetch terminar.
  return (
    <div>
      {error && (
        <p className="text-center text-[#E5C06E] text-sm py-4" role="alert">
          {error}
        </p>
      )}
      <HomeViewClient
        initialHabits={habits}
        initialProgress={history}
        dateString={dateString}
        selectedDate={selectedDate}
        showTitle={false}
        noWrapper
      />
    </div>
  )
}
