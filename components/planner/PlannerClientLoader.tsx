'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getBrasiliaDate, formatBrasiliaDate } from '@/lib/date'
import PlannerClient from '@/components/planner/PlannerClient'
import type { HabitWithStatus } from '@/types/hexis'

export default function PlannerClientLoader() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const dateParam = searchParams.get('date')
  const today = getBrasiliaDate()
  const dateString = dateParam ?? formatBrasiliaDate(today)

  const [items, setItems] = useState<HabitWithStatus[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setError(null)
    fetch(`/api/planner?date=${encodeURIComponent(dateString)}`)
      .then((res) => {
        if (cancelled) return
        if (res.status === 401) {
          router.push('/login')
          return null
        }
        if (!res.ok) throw new Error('Erro ao carregar planner')
        return res.json()
      })
      .then((data) => {
        if (cancelled || !data) return
        if (data.success && Array.isArray(data.items)) {
          setItems(data.items)
        } else {
          setError(data.error ?? 'Erro ao carregar')
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? 'Erro ao carregar')
      })
    return () => { cancelled = true }
  }, [router, dateString])

  // UI First: sempre renderizar estrutura (header, abas, views). Dados brotam quando o fetch terminar.
  return (
    <div>
      {error && (
        <p className="text-center text-[#d4af37] text-sm py-4" role="alert">
          {error}
        </p>
      )}
      <PlannerClient initialHabits={items} hideHeader />
    </div>
  )
}
