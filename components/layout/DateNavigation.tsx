'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getBrasiliaDate, formatBrasiliaDate } from '@/lib/date'
import { cn } from '@/lib/utils'

interface DateNavigationProps {
  currentDate: Date
}

export function DateNavigation({ currentDate }: DateNavigationProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const containerRef = useRef<HTMLDivElement>(null)
  const selectedRef = useRef<HTMLButtonElement>(null)
  const [isPending, startTransition] = useTransition()

  const today = getBrasiliaDate()
  const todayString = formatBrasiliaDate(today)

  // Fonte de verdade da URL (pode demorar a refletir após router.push)
  const urlDateString = searchParams.get('date') || formatBrasiliaDate(currentDate)

  // Estado otimista: acende a bolinha em 0ms
  const [optimisticDateString, setOptimisticDateString] = useState<string>(urlDateString)

  // Quando a URL mudar (ex: back/forward), sincroniza o estado otimista
  useEffect(() => {
    setOptimisticDateString(urlDateString)
  }, [urlDateString])

  const selectedDate = useMemo(() => {
    const [year, month, day] = optimisticDateString.split('-').map(Number)
    return new Date(year, month - 1, day)
  }, [optimisticDateString])

  // Gerar array de 31 dias (15 para trás + hoje + 15 para frente)
  const dates = Array.from({ length: 31 }, (_, i) => {
    const date = new Date(today)
    date.setDate(date.getDate() + (i - 15)) // -15 até +15
    return date
  })

  // Nomes dos dias da semana abreviados
  const dayNames = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB']

  // Função para formatar data como YYYY-MM-DD
  const formatDate = (date: Date): string => {
    return formatBrasiliaDate(date)
  }

  // Função para verificar se é hoje
  const isToday = (date: Date): boolean => {
    return formatBrasiliaDate(date) === todayString
  }

  // Função para verificar se está selecionado
  const isSelected = (date: Date): boolean => {
    return formatBrasiliaDate(date) === optimisticDateString
  }

  // Scroll automático para centralizar a data selecionada
  useEffect(() => {
    if (selectedRef.current && containerRef.current) {
      const container = containerRef.current
      const selected = selectedRef.current
      const containerWidth = container.offsetWidth
      const selectedLeft = selected.offsetLeft
      const selectedWidth = selected.offsetWidth
      const scrollLeft = selectedLeft - containerWidth / 2 + selectedWidth / 2

      container.scrollTo({
        left: scrollLeft,
        behavior: 'smooth',
      })
    }
  }, [optimisticDateString])

  const handleDateClick = (date: Date) => {
    const dateString = formatDate(date)

    // 1) Atualiza a UI imediatamente (0ms)
    setOptimisticDateString(dateString)

    // 2) Atualiza a URL em transição (evita sensação de travamento)
    startTransition(() => {
      router.push(`/home?date=${dateString}`, { scroll: false })
    })
  }

  return (
    <div className="mb-8">
      {/* Container com scroll horizontal */}
      <div
        ref={containerRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide px-4 py-2 -mx-4"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {dates.map((date, index) => {
          const dateString = formatDate(date)
          const dayOfWeek = dayNames[date.getDay()]
          const dayNumber = date.getDate()
          const selected = isSelected(date)
          const today = isToday(date)

          return (
            <button
              key={dateString}
              ref={selected ? selectedRef : null}
              onClick={() => handleDateClick(date)}
              className={cn(
                'flex flex-col items-center gap-1 flex-shrink-0 transition-all duration-300 touch-manipulation',
                'min-w-[48px]', // Largura mínima para evitar compressão
                isPending && selected && 'opacity-95'
              )}
            >
              {/* Dia da Semana */}
              <span
                className={cn(
                  'text-[10px] uppercase tracking-widest font-heading',
                  selected ? 'text-[#d4af37] font-bold' : 'text-[#d4af37]/60'
                )}
              >
                {dayOfWeek}
              </span>

              {/* Círculo com número do dia */}
              <div className="relative">
                <div
                  className={cn(
                    'w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300',
                    'border-2',
                    selected
                      ? 'bg-[#d4af37] border-[#d4af37] shadow-[0_0_10px_rgba(212,175,55,0.5)]'
                      : 'bg-transparent border-[#d4af37]/30'
                  )}
                >
                  <span
                    className={cn(
                      'text-sm font-heading',
                      selected ? 'text-black font-bold' : 'text-[#d4af37]/60'
                    )}
                  >
                    {dayNumber}
                  </span>
                </div>

                {/* Marcador de "Hoje" - Ponto brilhante abaixo do círculo */}
                {today && (
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#d4af37] shadow-[0_0_6px_rgba(212,175,55,0.8)]" />
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>

    </div>
  )
}
