'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Repeat, CheckCircle2, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Reminder } from '@/app/planner/page'
import type { HabitWithStatus } from '@/types/hexis'
import { formatBrasiliaDate } from '@/lib/date'
import { getHabits } from '@/app/actions/habits'
import { useState, useEffect } from 'react'

// Interfaces para timeline
interface HabitItem {
  id: string
  title: string
  time: string | null // Formato "HH:MM" ou null para "Dia Todo"
  icon?: string
  isRecurring: true
}

interface ReminderItem {
  id: string
  title: string
  time: string | null // Formato "HH:MM" ou null para "Dia Todo"
  isRecurring: false
  isReminder: true
}

type TimelineItem = HabitItem | ReminderItem

interface DayViewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedDate: Date | null
  reminders: Reminder[]
  habits: HabitWithStatus[] // Hábitos do dia atual (para usar como fallback)
  onAddReminder?: () => void // Callback para abrir modal de criação
}

// Função helper para comparar apenas dia/mês/ano
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

// Converter horário de "HH:MM:SS" ou "HH:MM" para "HH:MM"
function normalizeTime(time: string | null | undefined): string | null {
  if (!time) return null
  // Se já está em formato HH:MM, retorna direto
  if (time.match(/^\d{2}:\d{2}$/)) return time
  // Se está em formato HH:MM:SS, pega apenas HH:MM
  if (time.match(/^\d{2}:\d{2}:\d{2}$/)) return time.substring(0, 5)
  return null
}

// Função para obter dados do dia (hábitos reais + lembretes)
async function getDayData(
  date: Date | null,
  reminders: Reminder[],
  fallbackHabits: HabitWithStatus[]
): Promise<TimelineItem[]> {
  if (!date) return []
  
  // Buscar hábitos do dia selecionado
  let dayHabits: HabitWithStatus[] = []
  try {
    const dateString = formatBrasiliaDate(date)
    const result = await getHabits(dateString)
    if (result.success && result.data) {
      dayHabits = result.data
    }
  } catch (error) {
    console.error('Erro ao buscar hábitos:', error)
    // Em caso de erro, usar fallback (hábitos do dia atual)
    dayHabits = fallbackHabits
  }
  
  // Converter hábitos reais para HabitItem
  const habitItems: HabitItem[] = dayHabits.map(habit => ({
    id: habit.id,
    title: habit.title,
    time: normalizeTime(habit.notification_time), // Usar notification_time como horário
    icon: habit.icon || undefined,
    isRecurring: true,
  }))
  
  // Filtrar lembretes do dia selecionado e converter para ReminderItem
  const dayReminders: ReminderItem[] = reminders
    .filter(r => isSameDay(r.date, date))
    .map(r => ({
      id: r.id,
      title: r.title,
      time: r.time, // Pode ser null para "Dia Todo"
      isRecurring: false,
      isReminder: true,
    }))
  
  // Combinar todos os itens
  const allItems: TimelineItem[] = [...habitItems, ...dayReminders]
  
  // Ordenar por horário (itens sem horário vão para o final)
  return allItems.sort((a, b) => {
    const timeA = a.time || null
    const timeB = b.time || null
    
    // Se ambos têm horário, ordena normalmente
    if (timeA && timeB) {
      return timeA.localeCompare(timeB)
    }
    // Se apenas 'a' tem horário, 'a' vem primeiro
    if (timeA && !timeB) return -1
    // Se apenas 'b' tem horário, 'b' vem primeiro
    if (!timeA && timeB) return 1
    // Se nenhum tem horário, mantém ordem original
    return 0
  })
}

// Função helper para verificar se é lembrete
function isReminderItem(item: TimelineItem): item is ReminderItem {
  return 'isReminder' in item && item.isReminder === true
}

// Formatar nome do dia da semana
function getDayName(date: Date): string {
  const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
  return days[date.getDay()]
}

export function DayViewModal({ open, onOpenChange, selectedDate, reminders, habits, onAddReminder }: DayViewModalProps) {
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([])
  const [loading, setLoading] = useState(false)
  
  const dayName = selectedDate ? getDayName(selectedDate) : ''
  const dayNumber = selectedDate ? selectedDate.getDate() : 0

  // Carregar dados quando o modal abrir ou a data mudar
  useEffect(() => {
    if (open && selectedDate) {
      setLoading(true)
      getDayData(selectedDate, reminders, habits)
        .then(items => {
          setTimelineItems(items)
          setLoading(false)
        })
        .catch(error => {
          console.error('Erro ao carregar dados do dia:', error)
          setLoading(false)
        })
    } else {
      setTimelineItems([])
    }
  }, [open, selectedDate, reminders, habits])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black border border-[#d4af37]/30 text-white max-w-md max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-white/10">
          <DialogTitle className="text-xl font-heading uppercase tracking-widest text-[#d4af37]">
            {dayName}, {dayNumber}
          </DialogTitle>
        </DialogHeader>

        {/* Timeline Vertical */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {loading ? (
            <div className="text-center py-12 text-zinc-500 text-sm">
              <p>Carregando agenda...</p>
            </div>
          ) : timelineItems.length > 0 ? (
            timelineItems.map((item) => (
              <div
                key={item.id}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border transition-all',
                  item.isRecurring
                    ? 'bg-[#d4af37]/5 border-[#d4af37]/20'
                    : 'bg-white/5 border-white/10'
                )}
              >
                {/* Ícone */}
                <div className="flex-shrink-0 mt-0.5">
                  {item.isRecurring ? (
                    <Repeat className="w-4 h-4 text-[#d4af37]" strokeWidth={2} />
                  ) : isReminderItem(item) ? (
                    <Clock className="w-4 h-4 text-white/60" strokeWidth={2} />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-white/60" strokeWidth={2} />
                  )}
                </div>

                {/* Conteúdo */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    {item.time ? (
                      <span className="text-sm font-mono text-[#d4af37]/80 font-medium">
                        {item.time}
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-500 italic">
                        Dia Todo
                      </span>
                    )}
                    <div className="flex items-center gap-2">
                      {item.isRecurring && (
                        <span className="text-[10px] uppercase tracking-wider text-[#d4af37]/60">
                          Hábito
                        </span>
                      )}
                      {isReminderItem(item) && (
                        <span className="text-[10px] uppercase tracking-wider text-zinc-500">
                          Lembrete
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-base text-white font-body mt-1">
                    {item.title}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-zinc-500 text-sm">
              <p>Nenhum evento agendado</p>
              <p className="text-xs mt-2 text-zinc-600">Este dia está livre</p>
            </div>
          )}
        </div>

        {/* Botão de Adicionar Lembrete */}
        <div className="px-6 py-4 border-t border-white/10">
          <button
            onClick={() => {
              if (onAddReminder) {
                onAddReminder()
              }
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#d4af37] text-black font-heading uppercase tracking-widest text-sm hover:bg-[#d4af37]/90 transition-colors duration-300 rounded-lg shadow-[0_0_20px_rgba(212,175,55,0.3)]"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            Adicionar Lembrete Único
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
