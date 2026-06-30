'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { Check, Plus, Clock, Repeat, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { getBrasiliaDate, formatBrasiliaDate } from '@/lib/date'
import { cn } from '@/lib/utils'
import { DayViewModal } from '@/components/DayViewModal'
import { getHabits } from '@/app/actions/habits'
import { createReminder, deleteReminder, getReminders, toggleReminderStatus } from '@/app/actions/planner'
import type { PlannerReminderRow } from '@/app/actions/planner'
import type { HabitWithStatus, Reminder } from '@/types/hexis'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { playSuccessSound } from '@/lib/sounds'

// Tipos de visão
type ViewMode = 'day' | 'week' | 'month'

// Meses em português
const MONTHS = [
  'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
  'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
]

// Dias da semana
const WEEKDAYS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB']
const WEEKDAY_NAMES = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']

// Converte uma row do Supabase para o tipo Reminder usado no frontend
function rowToReminder(row: PlannerReminderRow): Reminder {
  // date vem como "YYYY-MM-DD"; criar Date local para evitar offset de timezone
  const [y, m, d] = row.date.split('-').map(Number)
  return {
    id: row.id,
    title: row.title,
    date: new Date(y, m - 1, d),
    time: row.time,
    isCompleted: row.is_completed,
  }
}

// Interface para itens da timeline
interface TimelineItem {
  id: string
  title: string
  time: string | null
  isRecurring: boolean
  isReminder: boolean
}

// Função auxiliar para normalizar horário
function normalizeTime(time: string | null | undefined): string | null {
  if (!time) return null
  // Se já está no formato HH:MM, retornar
  if (/^\d{2}:\d{2}$/.test(time)) return time
  // Tentar converter outros formatos se necessário
  return null
}

// Função auxiliar para verificar se duas datas são o mesmo dia
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

// Função para obter dados do dia (hábitos + lembretes)
async function getDayTimelineData(
  date: Date,
  reminders: Reminder[],
  fallbackHabits: HabitWithStatus[]
): Promise<TimelineItem[]> {
  // Buscar hábitos do dia
  let dayHabits: HabitWithStatus[] = []
  try {
    const dateString = formatBrasiliaDate(date)
    const result = await getHabits(dateString)
    if (result.success && result.data) {
      dayHabits = result.data
    }
  } catch (error) {
    console.error('Erro ao buscar hábitos:', error)
    dayHabits = fallbackHabits
  }
  
  // Converter hábitos para TimelineItem
  const habitItems: TimelineItem[] = dayHabits.map(habit => ({
    id: habit.id,
    title: habit.title,
    time: normalizeTime(habit.notification_time),
    isRecurring: true,
    isReminder: false,
  }))
  
  // Filtrar e converter lembretes
  const dayReminders: TimelineItem[] = reminders
    .filter(r => isSameDay(r.date, date))
    .map(r => ({
      id: r.id,
      title: r.title,
      time: r.time,
      isRecurring: false,
      isReminder: true,
    }))
  
  // Combinar e ordenar
  const allItems = [...habitItems, ...dayReminders]
  return allItems.sort((a, b) => {
    const timeA = a.time || null
    const timeB = b.time || null
    if (timeA && timeB) return timeA.localeCompare(timeB)
    if (timeA && !timeB) return -1
    if (!timeA && timeB) return 1
    return 0
  })
}

interface PlannerClientProps {
  initialHabits: HabitWithStatus[]
  /** Quando true, não renderiza o título (já exibido no shell da página). */
  hideHeader?: boolean
}

export default function PlannerClient({ initialHabits, hideHeader = false }: PlannerClientProps) {
  // Estabilizar 'today' para evitar recálculos desnecessários
  const today = useMemo(() => getBrasiliaDate(), [])
  
  // O "dia atual" real
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()
  const currentDay = today.getDate()

  // Estado para visualização do mês (para podermos navegar entre meses)
  const [viewDate, setViewDate] = useState<Date>(today)
  const viewMonth = viewDate.getMonth()
  const viewYear = viewDate.getFullYear()

  const handlePreviousMonth = () => {
    setViewDate(new Date(viewYear, viewMonth - 1, 1))
  }
  
  const handleNextMonth = () => {
    setViewDate(new Date(viewYear, viewMonth + 1, 1))
  }

  // Estado para viewMode com persistência no localStorage
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('planner_view_mode')
      if (saved === 'day' || saved === 'week' || saved === 'month') {
        return saved
      }
    }
    return 'day'
  })

  // Salvar viewMode no localStorage quando mudar
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('planner_view_mode', viewMode)
    }
  }, [viewMode])

  // Estado para modal de detalhes do dia
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isDayViewOpen, setIsDayViewOpen] = useState(false)

  // Estado para hábitos reais - INICIALIZAR COM DADOS DO SERVIDOR
  const [habits, setHabits] = useState<HabitWithStatus[]>(initialHabits)
  const [habitsLoading, setHabitsLoading] = useState(false) // Não precisa de loading inicial

  // Estado para timeline do dia (para view 'day')
  const [dayTimeline, setDayTimeline] = useState<TimelineItem[]>([])
  const [dayTimelineLoading, setDayTimelineLoading] = useState(false)

  // Gatilho de atualização para evitar loops infinitos
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Estado para modal de criação de lembrete
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  
  // AÇÃO 1: Estado para modal de confirmação de exclusão
  const [itemToDelete, setItemToDelete] = useState<string | null>(null)

  // Filtro de visualização do dia: Tudo (hábitos + lembretes) ou Apenas Lembretes (persistido no localStorage)
  const [listFilter, setListFilter] = useState<'all' | 'reminders'>(() => {
    if (typeof window === 'undefined') return 'all'
    const saved = localStorage.getItem('hexis_planner_filter')
    if (saved === 'all' || saved === 'reminders') return saved
    return 'all'
  })

  // Estado para lembretes — fonte de verdade: Supabase
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [newReminderText, setNewReminderText] = useState('')
  const [newReminderTime, setNewReminderTime] = useState<string>('')
  const [newReminderDate, setNewReminderDate] = useState<Date | null>(null) // Data selecionada para o lembrete

  // Carregar lembretes do Supabase na inicialização
  useEffect(() => {
    let cancelled = false
    getReminders().then((result) => {
      if (cancelled) return
      if (result.success && result.data) {
        setReminders(result.data.map(rowToReminder))
        // Disparar refresh da timeline após carregar lembretes
        setRefreshTrigger((prev) => prev + 1)
      }
    })
    return () => { cancelled = true }
  }, [])

  // Refs para armazenar valores atuais sem causar re-renders
  const remindersRef = useRef(reminders)
  const habitsRef = useRef(habits)

  // Atualizar refs quando os valores mudarem
  useEffect(() => {
    remindersRef.current = reminders
  }, [reminders])

  useEffect(() => {
    habitsRef.current = habits
  }, [habits])

  // Carregar timeline do dia quando viewMode for 'day' (APENAS via refreshTrigger)
  useEffect(() => {
    if (viewMode === 'day') {
      setDayTimelineLoading(true)
      // Usar valores atuais através das refs
      getDayTimelineData(today, remindersRef.current, habitsRef.current)
        .then(items => {
          setDayTimeline(items)
          setDayTimelineLoading(false)
        })
        .catch(() => {
          setDayTimelineLoading(false)
        })
    }
  }, [viewMode, today, refreshTrigger]) // Apenas viewMode, today e refreshTrigger

  // Filtrar lembretes apenas do dia de hoje
  const todayReminders = reminders.filter(r => isSameDay(r.date, today))

  // Calcular dias da semana (para view 'week')
  const weekDays = useMemo(() => {
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay()) // Domingo
    startOfWeek.setHours(0, 0, 0, 0)
    
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      return date
    })
  }, [today])

  // Calcular dias do mês (para view 'month')
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  
  const monthDays: (number | null)[] = []
  for (let i = 0; i < firstDayOfMonth; i++) {
    monthDays.push(null)
  }
  for (let i = 1; i <= daysInMonth; i++) {
    monthDays.push(i)
  }

  // Handler para clicar em um dia
  const handleDayClick = (day: number) => {
    const clickedDate = new Date(currentYear, currentMonth, day)
    setSelectedDate(clickedDate)
    setIsDayViewOpen(true)
  }

  // Handler para toggle de lembrete (com som e animação)
  const handleToggleReminder = (id: string) => {
    // Tocar som de sucesso
    playSuccessSound()
    
    // Calcular novo valor
    const current = reminders.find(r => r.id === id)
    const newCompleted = !(current?.isCompleted ?? false)

    // Atualizar estado local (optimistic)
    setReminders(prev =>
      prev.map(r =>
        r.id === id ? { ...r, isCompleted: newCompleted } : r
      )
    )
    setRefreshTrigger(prev => prev + 1)

    // Persistir no Supabase em background
    toggleReminderStatus(id, newCompleted).catch((err) => {
      console.error('Erro ao sincronizar toggle:', err)
    })
  }

  // Handler para abrir modal de confirmação de exclusão
  const handleRequestDelete = (id: string) => {
    setItemToDelete(id)
  }

  // AÇÃO 2: Handler para confirmar exclusão (Optimistic UI Silencioso)
  const handleConfirmDelete = async () => {
    if (!itemToDelete) return

    // AÇÃO 2.1: Atualização Visual Imediata (0ms) - Guardar estado anterior para rollback
    const deletedReminder = reminders.find(r => r.id === itemToDelete)
    const previousReminders = [...reminders]
    
    setReminders(prev => prev.filter(r => r.id !== itemToDelete))
    // AÇÃO: Zero Reload — atualizar a timeline local sem re-fetch/refreshTrigger
    setDayTimeline((prev) => prev.filter((item) => item.id !== itemToDelete))
    
    // Fechar modal imediatamente
    setItemToDelete(null)

    // AÇÃO 2.2: Sincronização em Background (Fire & Forget)
    // NÃO fazer router.refresh() - confiar na atualização local
    try {
      const result = await deleteReminder(itemToDelete)
      
      if (!result.success) {
        // AÇÃO 2.3: Rollback em caso de erro
        console.error('❌ [handleConfirmDelete] Falha ao deletar:', result.error)
        // Restaurar estado anterior
        setReminders(previousReminders)
        // Recalcular timeline do dia em rollback
        setRefreshTrigger((prev) => prev + 1)
        // TODO: Adicionar toast de erro quando disponível
        alert(`Erro ao apagar: ${result.error || 'Tente novamente'}`)
      } else {
        console.log('✅ [handleConfirmDelete] Lembrete deletado com sucesso')
      }
    } catch (error: any) {
      // AÇÃO 2.3: Rollback em caso de exceção
      console.error('❌ [handleConfirmDelete] Exceção ao deletar:', error)
      // Restaurar estado anterior
      setReminders(previousReminders)
      // Recalcular timeline do dia em rollback
      setRefreshTrigger((prev) => prev + 1)
      // TODO: Adicionar toast de erro quando disponível
      alert(`Erro ao apagar: ${error?.message || 'Tente novamente'}`)
    }
  }

  // Handler para abrir modal de adicionar lembrete
  const handleOpenAddModal = (date?: Date | null) => {
    if (date) {
      setNewReminderDate(new Date(date))
    } else {
      setNewReminderDate(null) // Usar hoje como padrão
    }
    setIsAddModalOpen(true)
  }

  // Handler para salvar novo lembrete (Optimistic UI + troca de ID)
  const handleSaveReminder = async () => {
    if (!newReminderText.trim()) return

    const reminderDate = newReminderDate || today
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`

    const tempItem: Reminder = {
      id: tempId,
      title: newReminderText.trim(),
      date: reminderDate,
      time: newReminderTime || null,
      isCompleted: false,
    }

    // 1) Renderização imediata (0ms)
    setReminders((prev) => [...prev, tempItem])
    // Atualizar timeline local sem recarregar a página
    setDayTimeline((prev) => [
      ...prev,
      { id: tempId, title: tempItem.title, time: tempItem.time, isRecurring: false, isReminder: true },
    ])

    // 2) Fechar modal imediatamente
    setNewReminderText('')
    setNewReminderTime('')
    setNewReminderDate(null)
    setIsAddModalOpen(false)

    // 3) Sincronização silenciosa (sem router.refresh)
    try {
      const response = await createReminder({
        title: tempItem.title,
        date: formatBrasiliaDate(reminderDate),
        time: tempItem.time,
      })

      if (response.success && response.data) {
        // 4) Consolidação: trocar tempId pelo ID real do banco
        const realId = response.data.id
        setReminders((prev) =>
          prev.map((r) =>
            r.id === tempId
              ? {
                  id: realId,
                  title: response.data!.title,
                  date: new Date(response.data!.date),
                  time: response.data!.time,
                  isCompleted: response.data!.is_completed,
                }
              : r
          )
        )
        setDayTimeline((prev) =>
          prev.map((item) => (item.id === tempId ? { ...item, id: realId } : item))
        )
      } else {
        // Falhou no banco: manter item local (sem flicker)
        console.error('Erro ao criar lembrete no banco:', response.error)
      }
    } catch (e) {
      console.error('Erro ao criar lembrete no banco:', e)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white pt-12 pb-24 px-6">
      {!hideHeader && (
        <header className="flex justify-center items-center mb-8">
          <h1 className="text-4xl font-heading uppercase tracking-[0.2em] text-[#d4af37]">
            PLANNER
          </h1>
        </header>
      )}

      {/* Seletor de Visão */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex bg-zinc-900 border border-zinc-800 rounded-lg p-1 gap-1">
          {(['day', 'week', 'month'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-heading uppercase tracking-wider',
                viewMode === mode
                  ? 'bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/30'
                  : 'text-zinc-500 hover:text-zinc-300'
              )}
            >
              {mode === 'day' ? 'DIA' : mode === 'week' ? 'SEMANA' : 'MÊS'}
            </button>
          ))}
        </div>
      </div>

      {/* Botão de Adicionar Lembrete */}
      <div className="w-full max-w-3xl mx-auto mb-6">
        <button
          onClick={() => handleOpenAddModal()}
          className="w-full py-5 bg-[#d4af37] text-black font-heading uppercase tracking-widest text-lg hover:bg-[#d4af37]/90 transition-colors duration-300 rounded-lg shadow-[0_0_20px_rgba(212,175,55,0.3)]"
        >
          ADICIONAR LEMBRETE
        </button>
      </div>

      {/* Filtro de visualização (apenas na view Dia) */}
      {viewMode === 'day' && (
        <div className="flex justify-center mb-6">
          <div className="inline-flex bg-zinc-900 border border-zinc-800 rounded-lg p-1 gap-1">
            <button
              type="button"
              onClick={() => {
                setListFilter('all')
                localStorage.setItem('hexis_planner_filter', 'all')
              }}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-heading uppercase tracking-wider',
                listFilter === 'all'
                  ? 'bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/30'
                  : 'text-zinc-500 hover:text-zinc-300'
              )}
            >
              Tudo
            </button>
            <button
              type="button"
              onClick={() => {
                setListFilter('reminders')
                localStorage.setItem('hexis_planner_filter', 'reminders')
              }}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-heading uppercase tracking-wider',
                listFilter === 'reminders'
                  ? 'bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/30'
                  : 'text-zinc-500 hover:text-zinc-300'
              )}
            >
              Apenas Lembretes
            </button>
          </div>
        </div>
      )}

      {/* Renderização Condicional Baseada no ViewMode */}
      {viewMode === 'day' && (
        <DayViewContent
          today={today}
          timeline={listFilter === 'reminders' ? dayTimeline.filter((i) => i.isReminder) : dayTimeline}
          loading={dayTimelineLoading}
          reminders={reminders}
          onToggleReminder={handleToggleReminder}
          onDeleteReminder={handleRequestDelete}
        />
      )}

      {viewMode === 'week' && (
        <WeekViewContent
          weekDays={weekDays}
          today={today}
          reminders={reminders}
          habits={habits}
          onDayClick={(date) => {
            setSelectedDate(date)
            setIsDayViewOpen(true)
          }}
        />
      )}

      {viewMode === 'month' && (
        <MonthViewContent
          currentMonth={viewMonth}
          currentYear={viewYear}
          currentDay={viewMonth === currentMonth && viewYear === currentYear ? currentDay : -1}
          monthDays={monthDays}
          onDayClick={(day) => {
            setSelectedDate(new Date(viewYear, viewMonth, day))
            setIsDayViewOpen(true)
          }}
          onPreviousMonth={handlePreviousMonth}
          onNextMonth={handleNextMonth}
        />
      )}

      {/* Modal de Detalhes do Dia */}
      <DayViewModal
        open={isDayViewOpen}
        onOpenChange={setIsDayViewOpen}
        selectedDate={selectedDate}
        reminders={reminders}
        habits={habits}
        onAddReminder={() => {
          // Fechar o modal de detalhes e abrir o modal de criação com a data selecionada
          setIsDayViewOpen(false)
          handleOpenAddModal(selectedDate)
        }}
        onDeleteReminder={handleRequestDelete}
        onToggleReminder={handleToggleReminder}
      />

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

      {/* Modal de Criação de Lembrete */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="bg-zinc-950 border border-[#d4af37]/30 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-heading uppercase tracking-widest text-[#d4af37]">
              NOVO LEMBRETE
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-heading uppercase tracking-wide text-zinc-400 mb-2">
                TEXTO
              </label>
              <input
                type="text"
                value={newReminderText}
                onChange={(e) => setNewReminderText(e.target.value)}
                placeholder="Ex: Reunião com equipe"
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#d4af37]/50 transition-colors"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-heading uppercase tracking-wide text-zinc-400 mb-2">
                DATA
              </label>
              <input
                type="date"
                value={newReminderDate ? formatBrasiliaDate(newReminderDate) : formatBrasiliaDate(today)}
                onChange={(e) => {
                  if (e.target.value) {
                    const [year, month, day] = e.target.value.split('-').map(Number)
                    setNewReminderDate(new Date(year, month - 1, day))
                  } else {
                    setNewReminderDate(null)
                  }
                }}
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-[#d4af37]/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-heading uppercase tracking-wide text-zinc-400 mb-2">
                HORÁRIO (OPCIONAL)
              </label>
              <input
                type="time"
                value={newReminderTime}
                onChange={(e) => setNewReminderTime(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-[#d4af37]/50 transition-colors"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => {
                  setIsAddModalOpen(false)
                  setNewReminderText('')
                  setNewReminderTime('')
                  setNewReminderDate(null)
                }}
                className="flex-1 px-4 py-3 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors"
              >
                CANCELAR
              </button>
              <button
                onClick={handleSaveReminder}
                className="flex-1 px-4 py-3 bg-[#d4af37] text-black font-heading uppercase tracking-widest rounded-lg hover:bg-[#d4af37]/90 transition-colors"
              >
                SALVAR
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Componente para View de Dia
function DayViewContent({
  today,
  timeline,
  loading,
  reminders,
  onToggleReminder,
  onDeleteReminder,
}: {
  today: Date
  timeline: TimelineItem[]
  loading: boolean
  reminders: Reminder[]
  onToggleReminder: (id: string) => void
  onDeleteReminder: (id: string) => void
}) {
  return (
    <section>
      <h2 className="text-xl font-heading uppercase tracking-widest text-[#d4af37] mb-6 text-center w-full mx-auto">
        {WEEKDAY_NAMES[today.getDay()]}, {today.getDate()} DE {MONTHS[today.getMonth()]}
      </h2>

      {loading ? (
        <div className="text-center py-12 text-zinc-500 text-sm">
          <p>Carregando agenda...</p>
        </div>
      ) : timeline.length > 0 ? (
        <div className="space-y-3">
            {/* Ordenar: Não concluídos primeiro, concluídos por último */}
            {[...timeline]
              .sort((a, b) => {
                const aCompleted = reminders.find(r => r.id === a.id)?.isCompleted ?? false
                const bCompleted = reminders.find(r => r.id === b.id)?.isCompleted ?? false
                return Number(aCompleted) - Number(bCompleted)
              })
              .map((item) => {
                const reminder = reminders.find(r => r.id === item.id)
                const isCompleted = reminder?.isCompleted ?? false
                
                return (
                  <div
                    key={item.id}
                    className={cn(
                      'flex items-start gap-3 p-4 rounded-lg border',
                      item.isRecurring
                        ? 'bg-[#d4af37]/5 border-[#d4af37]/20'
                        : 'bg-white/5 border-white/10',
                      isCompleted && 'opacity-60'
                    )}
                  >
                    {/* Checkbox */}
                    {item.isReminder && (
                      <button
                        type="button"
                        onClick={() => {
                          playSuccessSound()
                          onToggleReminder(item.id)
                        }}
                        className={cn(
                          'flex-shrink-0 mt-0.5 h-6 w-6 rounded-full border-2 flex items-center justify-center',
                          isCompleted
                            ? 'border-[#d4af37] bg-[#d4af37]'
                            : 'border-white/30 bg-transparent'
                        )}
                      >
                        {isCompleted && (
                          <Check className="w-4 h-4 text-black" strokeWidth={3} />
                        )}
                      </button>
                    )}
                    
                    <div className="flex-shrink-0 mt-0.5">
                      {item.isRecurring ? (
                        <Repeat className="w-4 h-4 text-[#d4af37]" strokeWidth={2} />
                      ) : (
                        <Clock className="w-4 h-4 text-white/60" strokeWidth={2} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        {item.time ? (
                          <span className="text-sm font-mono text-[#d4af37]/80 font-medium">
                            {item.time}
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-500 italic">Dia Todo</span>
                        )}
                        <div className="flex items-center gap-2">
                          {item.isRecurring && (
                            <span className="text-[10px] uppercase tracking-wider text-[#d4af37]/60">
                              Hábito
                            </span>
                          )}
                          {item.isReminder && (
                            <span className="text-[10px] uppercase tracking-wider text-zinc-500">
                              Lembrete
                            </span>
                          )}
                          {/* AÇÃO 2: Botão de Excluir - Apenas para Lembretes */}
                          {item.isReminder && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onDeleteReminder(item.id)
                              }}
                              className="p-1.5 text-red-500/50 hover:text-red-500 rounded hover:bg-red-500/10"
                              title="Excluir lembrete"
                            >
                              <Trash2 className="w-4 h-4" strokeWidth={2} />
                            </button>
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
                  </div>
                )
              })}
        </div>
      ) : (
        <div className="text-center py-12 text-zinc-500 text-sm">
          <p>Nenhum item agendado para hoje.</p>
        </div>
      )}
    </section>
  )
}

// Componente para View de Semana
function WeekViewContent({
  weekDays,
  today,
  reminders,
  habits,
  onDayClick,
}: {
  weekDays: Date[]
  today: Date
  reminders: Reminder[]
  habits: HabitWithStatus[]
  onDayClick: (date: Date) => void
}) {
  return (
    <section>
      <h2 className="text-xl font-heading uppercase tracking-widest text-[#d4af37] mb-6 text-center">
        SEMANA
      </h2>
      <div className="grid grid-cols-7 gap-4">
        {weekDays.map((date, index) => {
          const dayReminders = reminders.filter(r => isSameDay(r.date, date))
          const isToday = isSameDay(date, today)
          
          return (
            <button
              key={index}
              onClick={() => onDayClick(date)}
              className={cn(
                'p-4 rounded-lg border text-left',
                isToday
                  ? 'bg-[#d4af37]/20 border-[#d4af37]'
                  : 'bg-zinc-900 border-zinc-800 hover:border-[#d4af37]/30'
              )}
            >
              <div className="text-sm font-heading uppercase tracking-wider text-zinc-400 mb-2">
                {WEEKDAYS[date.getDay()]}
              </div>
              <div className={cn('text-2xl font-bold mb-2', isToday ? 'text-[#d4af37]' : 'text-white')}>
                {date.getDate()}
              </div>
              {dayReminders.length > 0 && (
                <div className="text-xs text-zinc-500">
                  {dayReminders.length} lembrete{dayReminders.length > 1 ? 's' : ''}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </section>
  )
}

// Componente para View de Mês
function MonthViewContent({
  currentMonth,
  currentYear,
  currentDay,
  monthDays,
  onDayClick,
  onPreviousMonth,
  onNextMonth,
}: {
  currentMonth: number
  currentYear: number
  currentDay: number
  monthDays: (number | null)[]
  onDayClick: (day: number) => void
  onPreviousMonth: () => void
  onNextMonth: () => void
}) {
  return (
    <section>
      {/* Cabeçalho do Mês com Navegação */}
      <div className="flex items-center justify-between mb-6 px-4">
        <button
          onClick={onPreviousMonth}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white border border-zinc-700 hover:border-[#d4af37] hover:text-[#d4af37]"
          aria-label="Mês anterior"
        >
          <ChevronLeft className="w-6 h-6" strokeWidth={2} />
        </button>

        <h2 className="text-xl font-heading uppercase tracking-widest text-[#d4af37]">
          {MONTHS[currentMonth]} {currentYear}
        </h2>

        <button
          onClick={onNextMonth}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white border border-zinc-700 hover:border-[#d4af37] hover:text-[#d4af37]"
          aria-label="Próximo mês"
        >
          <ChevronRight className="w-6 h-6" strokeWidth={2} />
        </button>
      </div>

      {/* Grid de Dias da Semana (Cabeçalho) */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-heading uppercase tracking-widest text-zinc-500 py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Grid de Dias do Mês */}
      <div className="grid grid-cols-7 gap-2">
        {monthDays.map((day, index) => {
          const isToday = day === currentDay
          return (
            <button
              key={index}
              onClick={() => day !== null && onDayClick(day)}
              className={cn(
                'aspect-square flex items-center justify-center rounded-lg',
                day === null
                  ? 'opacity-0 pointer-events-none'
                  : isToday
                  ? 'bg-[#d4af37]/20 border-2 border-[#d4af37] text-[#d4af37] font-bold hover:bg-[#d4af37]/30'
                  : 'text-zinc-300 hover:bg-white/10 cursor-pointer border border-transparent hover:border-[#d4af37]/30'
              )}
            >
              {day !== null && (
                <span className={cn('text-sm', isToday && 'font-bold')}>
                  {day}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </section>
  )
}
