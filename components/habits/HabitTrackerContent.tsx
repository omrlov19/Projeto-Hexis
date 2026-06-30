'use client'

import { useEffect, useState } from 'react'
import { getHabits } from '@/app/actions/habits'
import { getBrasiliaDate, formatBrasiliaDate, parseBrasiliaDate } from '@/lib/date'
import HabitTrackerClient from './HabitTrackerClient'
import { useRouter } from 'next/navigation'
import type { HabitWithStatus } from '@/types/hexis'

export default function HabitTrackerContent({
  date,
}: {
  date?: string
}) {
  const router = useRouter()
  
  // Obter data (já resolvida pelo Page) ou usar hoje
  const todayBrasilia = getBrasiliaDate()
  const dateString = date || formatBrasiliaDate(todayBrasilia)
  const selectedDate = date ? parseBrasiliaDate(date) : todayBrasilia

  // AÇÃO: Persistência de Dados (Keep Previous Data)
  // Manter os hábitos da data anterior visíveis durante o carregamento
  const [habits, setHabits] = useState<HabitWithStatus[]>([])
  const [isFetching, setIsFetching] = useState(false)

  // Fetch client-side com persistência de dados anteriores
  useEffect(() => {
    let cancelled = false
    
    // AÇÃO 1: NÃO limpar o estado - manter dados anteriores visíveis
    // Apenas marcar como "fetching" para aplicar opacidade sutil
    setIsFetching(true)
    
    getHabits(dateString)
      .then((res) => {
        if (cancelled) return
        
        // Verificar autenticação
        if (!res.success && res.error === 'Usuário não autenticado') {
          router.push('/login')
          return
        }
        
        // AÇÃO 3: Transição Suave - atualizar apenas quando dados chegarem
        setHabits(res.success && res.data ? res.data : [])
      })
      .finally(() => {
        if (cancelled) return
        // AÇÃO 2: Remover indicador de carregamento (opacidade volta ao normal)
        setIsFetching(false)
      })
    return () => {
      cancelled = true
    }
  }, [dateString, router])

  return (
    <div className={isFetching ? 'opacity-70' : undefined}>
      <HabitTrackerClient
        initialHabits={habits}
        date={dateString}
        currentDate={selectedDate}
      />
    </div>
  )
}
