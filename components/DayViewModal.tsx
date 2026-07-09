'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Repeat, CheckCircle2, Clock, Trash2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { HabitWithStatus, Reminder } from '@/types/hexis'
import { formatBrasiliaDate } from '@/lib/date'
import { getHabits } from '@/app/actions/habits'
import { deleteReminder } from '@/app/actions/planner'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { playSuccessSound } from '@/lib/sounds'

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
  onDeleteReminder?: (id: string) => void // Callback para deletar lembrete
  onToggleReminder?: (id: string) => void // Callback para toggle de lembrete
}

// Função helper para comparar apenas dia/mês/ano
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

// Converter horário de "HH:MM:SS", "HH:MM" ou "HH:MM - HH:MM" para formato exibível
function normalizeTime(time: string | null | undefined): string | null {
  if (!time) return null
  // Se for range "HH:MM - HH:MM", retorna direto (Planner do Hábito)
  if (time.match(/^\d{2}:\d{2}\s*-\s*\d{2}:\d{2}$/)) return time
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

export function DayViewModal({ open, onOpenChange, selectedDate, reminders, habits, onAddReminder, onDeleteReminder, onToggleReminder }: DayViewModalProps) {
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([])
  const [loading, setLoading] = useState(false)
  
  // AÇÃO 1: Estado para modal de confirmação de exclusão
  const [itemToDelete, setItemToDelete] = useState<string | null>(null)

  // Handler para solicitar exclusão (abre modal)
  const handleRequestDelete = (id: string) => {
    setItemToDelete(id)
  }

  // AÇÃO 2: Handler para confirmar exclusão (Optimistic UI Silencioso)
  const handleConfirmDelete = async () => {
    if (!itemToDelete) return

    // AÇÃO 2.1: Atualização Visual Imediata (0ms) - Guardar estado anterior
    const deletedItem = timelineItems.find(item => item.id === itemToDelete)
    const previousTimeline = [...timelineItems]
    
    setTimelineItems(prev => prev.filter(item => item.id !== itemToDelete))
    
    // Fechar modal imediatamente
    setItemToDelete(null)

    // AÇÃO 2.2: Sincronização em Background (Fire & Forget)
    // Notificar o componente pai para atualizar o estado global
    if (onDeleteReminder) {
      onDeleteReminder(itemToDelete)
    }
    
    // Chamar server action em background para garantir sincronização
    try {
      const result = await deleteReminder(itemToDelete)
      
      if (!result.success) {
        // AÇÃO 2.3: Rollback em caso de erro
        console.error('❌ [DayViewModal] Falha ao deletar:', result.error)
        // Restaurar timeline anterior
        setTimelineItems(previousTimeline)
        // TODO: Adicionar toast de erro quando disponível
        alert(`Erro ao apagar: ${result.error || 'Tente novamente'}`)
      }
    } catch (error: any) {
      // AÇÃO 2.3: Rollback em caso de exceção
      console.error('❌ [DayViewModal] Exceção ao deletar:', error)
      // Restaurar timeline anterior
      setTimelineItems(previousTimeline)
      // TODO: Adicionar toast de erro quando disponível
      alert(`Erro ao apagar: ${error?.message || 'Tente novamente'}`)
    }
  }
  
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

  // Estado de filtro persistido no localStorage
  const [filter, setFilter] = useState<'all' | 'reminders' | 'habits'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hexis_dayview_filter')
      if (saved === 'all' || saved === 'reminders' || saved === 'habits') {
        return saved
      }
    }
    return 'all'
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('hexis_dayview_filter', filter)
    }
  }, [filter])

  const filteredItems = timelineItems.filter(item => {
    if (filter === 'reminders') return isReminderItem(item)
    if (filter === 'habits') return item.isRecurring
    return true
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black border border-[#d4af37]/30 text-white max-w-md max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-white/10">
          <DialogTitle className="text-xl font-heading uppercase tracking-widest text-[#d4af37] text-center mb-4">
            {dayName}, {dayNumber}
          </DialogTitle>
          
          {/* Toggle de Filtro */}
          <div className="flex justify-center w-full">
            <div className="inline-flex bg-zinc-900 border border-zinc-800 rounded-lg p-1 w-full max-w-xs">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={cn(
                  'flex-1 text-xs py-1.5 rounded-md font-heading uppercase tracking-widest transition-all',
                  filter === 'all' ? 'bg-[#d4af37] text-black shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                )}
              >
                Tudo
              </button>
              <button
                type="button"
                onClick={() => setFilter('reminders')}
                className={cn(
                  'flex-1 text-xs py-1.5 rounded-md font-heading uppercase tracking-widest transition-all',
                  filter === 'reminders' ? 'bg-[#d4af37] text-black shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                )}
              >
                Lembretes
              </button>
              <button
                type="button"
                onClick={() => setFilter('habits')}
                className={cn(
                  'flex-1 text-xs py-1.5 rounded-md font-heading uppercase tracking-widest transition-all',
                  filter === 'habits' ? 'bg-[#d4af37] text-black shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                )}
              >
                Hábitos
              </button>
            </div>
          </div>
        </DialogHeader>

        {/* Timeline Vertical */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4 space-y-3">
          {loading ? (
            <div className="text-center py-12 text-zinc-500 text-sm">
              <p>Carregando agenda...</p>
            </div>
          ) : filteredItems.length > 0 ? (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {[...filteredItems]
                  .sort((a, b) => {
                    // Ordenar: Não concluídos primeiro, concluídos por último
                    const aCompleted = isReminderItem(a) 
                      ? reminders.find(r => r.id === a.id)?.isCompleted ?? false
                      : false
                    const bCompleted = isReminderItem(b)
                      ? reminders.find(r => r.id === b.id)?.isCompleted ?? false
                      : false
                    return Number(aCompleted) - Number(bCompleted)
                  })
                  .map((item) => {
                  const reminder = isReminderItem(item) ? reminders.find(r => r.id === item.id) : null
                  const isCompleted = reminder?.isCompleted ?? false
                  
                  return (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.2 }}
                      className={cn(
                        'flex items-start gap-3 p-3 rounded-lg border transition-all',
                        item.isRecurring
                          ? 'bg-[#d4af37]/5 border-[#d4af37]/20'
                          : 'bg-white/5 border-white/10',
                        isCompleted && 'opacity-60'
                      )}
                    >
                      {/* Checkbox com animação (apenas para lembretes) */}
                      {isReminderItem(item) && (
                        <motion.button
                          type="button"
                          onClick={() => {
                            // Tocar som de sucesso
                            playSuccessSound()
                            // Notificar componente pai para atualizar estado
                            if (onToggleReminder) {
                              onToggleReminder(item.id)
                            }
                          }}
                          whileTap={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 0.2 }}
                          className={cn(
                            'flex-shrink-0 mt-0.5 h-6 w-6 rounded-full border-2 transition-all duration-300 flex items-center justify-center',
                            isCompleted
                              ? 'border-[#d4af37] bg-[#d4af37]'
                              : 'border-white/30 bg-transparent'
                          )}
                        >
                          {isCompleted && (
                            <Check className="w-4 h-4 text-black" strokeWidth={3} />
                          )}
                        </motion.button>
                      )}
                      
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
                              <>
                                <span className="text-[10px] uppercase tracking-wider text-zinc-500">
                                  Lembrete
                                </span>
                                {/* AÇÃO 2: Botão de Excluir - Apenas para Lembretes */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleRequestDelete(item.id)
                                  }}
                                  className="p-1.5 text-red-500/50 hover:text-red-500 transition-colors duration-200 rounded hover:bg-red-500/10"
                                  title="Excluir lembrete"
                                >
                                  <Trash2 className="w-4 h-4" strokeWidth={2} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        <p className={cn(
                          'text-base text-white font-body mt-1',
                          isCompleted && 'line-through decoration-[#d4af37] text-white/50'
                        )}>
                          {item.title}
                        </p>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
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
      
      {/* AÇÃO 1: Modal de Confirmação de Exclusão */}
      <Dialog open={itemToDelete !== null} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <DialogContent className="bg-black border border-[#d4af37]/30 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-heading uppercase tracking-widest text-[#d4af37] text-center">
              CONFIRMAR EXCLUSÃO
            </DialogTitle>
          </DialogHeader>
          <div className="py-6">
            <p className="text-center text-white/80 font-body">
              Deseja excluir este lembrete?
            </p>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              onClick={() => setItemToDelete(null)}
              className="flex-1 px-4 py-3 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors font-heading uppercase tracking-widest text-sm"
            >
              CANCELAR
            </button>
            <button
              onClick={handleConfirmDelete}
              className="flex-1 px-4 py-3 bg-red-600 text-white font-heading uppercase tracking-widest rounded-lg hover:bg-red-700 transition-colors text-sm"
            >
              CONFIRMAR
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
