'use client'

import { useEffect, useState, useRef } from 'react'
import { getBrasiliaDate, formatBrasiliaDate } from '@/lib/date'
import { getCalendarHabitHistory } from '@/app/actions/dashboard'
import { addDays } from 'date-fns'
import { cn } from '@/lib/utils'

const GOLD = '#D4AF37'
const BG = '#1f2937'
const DAYS_BACK = 15
const DAYS_FORWARD = 15
const dayNames = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB']

export interface CalendarStripProps {
  /** Data selecionada (YYYY-MM-DD). Quando informada, o dia fica destacado. */
  selectedDate?: string
  /** Chamado ao clicar em um dia. Permite navegar por data (ex.: atualizar URL). */
  onDateSelect?: (dateString: string) => void
  /** Histórico de progresso por dia (0–100). Quando informado, evita fetch no client. */
  initialProgress?: Record<string, number> | null
}

export function CalendarStrip({ selectedDate, onDateSelect, initialProgress = null }: CalendarStripProps) {
  const today = getBrasiliaDate()
  const todayString = formatBrasiliaDate(today)
  const [progress, setProgress] = useState<Record<string, number>>(initialProgress ?? {})
  const containerRef = useRef<HTMLDivElement>(null)
  const selectedRef = useRef<HTMLButtonElement | null>(null)

  const startDate = addDays(today, -DAYS_BACK)
  const endDate = addDays(today, DAYS_FORWARD)
  const startStr = formatBrasiliaDate(startDate)
  const endStr = formatBrasiliaDate(endDate)

  useEffect(() => {
    if (initialProgress != null && Object.keys(initialProgress).length > 0) {
      setProgress(initialProgress)
      return
    }
    getCalendarHabitHistory(startStr, endStr).then((res) => {
      if (res.success && res.data) setProgress(res.data)
    })
  }, [startStr, endStr, initialProgress])

  useEffect(() => {
    if (selectedRef.current && containerRef.current && selectedDate) {
      const container = containerRef.current
      const selected = selectedRef.current
      const containerWidth = container.offsetWidth
      const selectedLeft = selected.offsetLeft
      const selectedWidth = selected.offsetWidth
      container.scrollTo({
        left: selectedLeft - containerWidth / 2 + selectedWidth / 2,
        behavior: 'smooth',
      })
    }
  }, [selectedDate])

  const dates = Array.from({ length: DAYS_BACK + 1 + DAYS_FORWARD }, (_, i) =>
    addDays(startDate, i)
  )

  const content = dates.map((date) => {
    const dateStr = formatBrasiliaDate(date)
    const percentage = progress[dateStr] ?? 0
    const isToday = dateStr === todayString
    const isSelected = selectedDate != null && selectedDate === dateStr
    const dayNumber = date.getDate()
    const dayOfWeek = dayNames[date.getDay()]

    const circle = (
      <div className="relative">
        <div
          className={cn(
            'relative w-12 h-12 rounded-full border-2 overflow-hidden flex items-center justify-center bg-[#1f2937]',
            isSelected
              ? 'border-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.5)]'
              : 'border-[#D4AF37]/50'
          )}
        >
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `conic-gradient(${GOLD} 0% ${percentage}%, ${BG} ${percentage}% 100%)`,
            }}
          />
          <span
            className="relative z-10 text-sm font-heading font-bold text-white drop-shadow-md"
            aria-hidden
          >
            {dayNumber}
          </span>
        </div>
        {isToday && (
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#D4AF37] shadow-[0_0_6px_rgba(212,175,55,0.8)] pointer-events-none" />
        )}
      </div>
    )

    const dayBlock = (
      <>
        <span
          className={cn(
            'text-[10px] uppercase tracking-widest font-heading',
            isSelected ? 'text-[#D4AF37] font-bold' : 'text-[#D4AF37]/70'
          )}
        >
          {dayOfWeek}
        </span>
        {circle}
      </>
    )

    if (onDateSelect) {
      return (
        <button
          key={dateStr}
          ref={isSelected ? selectedRef : null}
          type="button"
          onClick={() => onDateSelect(dateStr)}
          className={cn(
            'flex flex-col items-center gap-1 flex-shrink-0 min-w-[48px] transition-all duration-300 touch-manipulation',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/50 rounded-lg'
          )}
          aria-label={`Dia ${dayNumber}, ${dayOfWeek}`}
          aria-pressed={isSelected}
        >
          {dayBlock}
        </button>
      )
    }

    return (
      <div
        key={dateStr}
        className={cn('flex flex-col items-center gap-1 flex-shrink-0 min-w-[48px]')}
      >
        {dayBlock}
      </div>
    )
  })

  return (
    <div className="mb-6">
      <div
        ref={containerRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide px-1 py-2 -mx-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {content}
      </div>
    </div>
  )
}
