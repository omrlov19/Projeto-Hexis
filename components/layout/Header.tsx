'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { HabitWithStatus } from '@/types/hexis'

interface HeaderProps {
  date: Date
  habits: HabitWithStatus[]
}

/**
 * Calcula o progresso das tarefas do dia
 * Retorna { completed, total } ou null se não houver tarefas
 */
function calculateProgress(habits: HabitWithStatus[]) {
  if (habits.length === 0) {
    return null
  }

  const completed = habits.filter((habit) => habit.completed === true).length
  const total = habits.length

  return { completed, total }
}

export function Header({ date, habits }: HeaderProps) {
  const progress = useMemo(() => calculateProgress(habits), [habits])

  // Determinar cor do indicador de progresso
  const progressColor = useMemo(() => {
    if (!progress) return 'text-muted-foreground/50'
    if (progress.completed === progress.total && progress.total > 0) {
      return 'text-green-400' // 100% completo
    }
    return 'text-muted-foreground' // Incompleto
  }, [progress])

  return (
    <div className="flex flex-col items-center justify-center mt-6 mb-8">
      {/* Contador de Progresso - Acima do Título */}
      {progress && (
        <span className="text-sm font-mono text-[#d4af37]/70 tracking-widest mb-1">
          {progress.completed} / {progress.total}
        </span>
      )}
      
      {/* Título do App - Estilo Códice */}
      <h1 className="text-3xl font-heading uppercase tracking-[0.2em] text-[#E5C06E] text-center">
        HABIT TRACKER
      </h1>
    </div>
  )
}
