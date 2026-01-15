'use client'

import { useMemo } from 'react'
import { format } from 'date-fns'
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

  // Formatar data como DD/MM (sem dia da semana)
  const formattedDate = format(date, 'dd/MM')

  // Determinar cor do indicador de progresso
  const progressColor = useMemo(() => {
    if (!progress) return 'text-muted-foreground/50'
    if (progress.completed === progress.total && progress.total > 0) {
      return 'text-green-400' // 100% completo
    }
    return 'text-muted-foreground' // Incompleto
  }, [progress])

  return (
    <div className="flex items-baseline justify-center gap-3">
      {/* Data formatada DD/MM */}
      <h1 className="text-5xl font-heading uppercase tracking-widest text-foreground">
        {formattedDate}
      </h1>

      {/* HUD de Progresso */}
      {progress && (
        <span
          className={cn(
            'text-lg font-mono font-bold tracking-tight',
            progressColor
          )}
        >
          {progress.completed}/{progress.total}
        </span>
      )}
    </div>
  )
}
