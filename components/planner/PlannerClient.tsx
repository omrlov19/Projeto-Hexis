'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Plus, Clock, Repeat, Trash2, ChevronLeft, ChevronRight, Play, Pencil } from 'lucide-react'
import { getBrasiliaDate, formatBrasiliaDate } from '@/lib/date'
import { cn } from '@/lib/utils'
import { DayViewModal } from '@/components/DayViewModal'
import { TimePickerHotbar } from '@/components/ui/TimePickerHotbar'
import { getHabits } from '@/app/actions/habits'
import { createReminder, deleteReminder, getReminders, toggleReminderStatus, updateReminder } from '@/app/actions/planner'
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
    time: normalizeTime(row.time),
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
  isFreeSlot?: boolean // Para blocos de tempo livre (Eco)
}

// Converter horário de "HH:MM:SS", "HH:MM" ou "HH:MM - HH:MM" para "HH:MM" ou range
function normalizeTime(time: string | null | undefined): string | null {
  if (!time) return null
  // Se for range "HH:MM - HH:MM"
  if (time.match(/^\d{2}:\d{2}\s*-\s*\d{2}:\d{2}$/)) return time
  // Se já está em formato HH:MM, retorna direto
  if (time.match(/^\d{2}:\d{2}$/)) return time
  // Se está em formato HH:MM:SS, pega apenas HH:MM
  if (time.match(/^\d{2}:\d{2}:\d{2}$/)) return time.substring(0, 5)
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

// =============================================
// Componente: HexisCalendar — Calendário customizado com identidade visual Hexis
// =============================================
function HexisCalendar({
  selectedDate,
  onSelectDate,
  today,
}: {
  selectedDate: Date
  onSelectDate: (date: Date) => void
  today: Date
}) {
  const [calViewDate, setCalViewDate] = useState<Date>(
    new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  )
  const calMonth = calViewDate.getMonth()
  const calYear = calViewDate.getFullYear()

  const firstDay = new Date(calYear, calMonth, 1).getDay()
  const daysInMo = new Date(calYear, calMonth + 1, 0).getDate()

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let i = 1; i <= daysInMo; i++) cells.push(i)

  const CAL_MONTHS = [
    'JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO',
    'JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO',
  ]

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3">
      {/* Header — Mês / Ano / Setas */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => setCalViewDate(new Date(calYear, calMonth - 1, 1))}
          className="p-1.5 rounded hover:bg-white/10 text-zinc-400 hover:text-[#d4af37] transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-heading uppercase tracking-widest text-[#d4af37]">
          {CAL_MONTHS[calMonth]} {calYear}
        </span>
        <button
          type="button"
          onClick={() => setCalViewDate(new Date(calYear, calMonth + 1, 1))}
          className="p-1.5 rounded hover:bg-white/10 text-zinc-400 hover:text-[#d4af37] transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Dias da semana */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['D','S','T','Q','Q','S','S'].map((d, i) => (
          <div key={i} className="text-center text-[10px] font-heading uppercase tracking-wider text-zinc-500 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Grid de dias */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, idx) => {
          if (day === null) return <div key={idx} />
          const cellDate = new Date(calYear, calMonth, day)
          const isSelected = isSameDay(cellDate, selectedDate)
          const isToday = isSameDay(cellDate, today)
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectDate(cellDate)}
              className={cn(
                'aspect-square flex items-center justify-center rounded-md text-sm transition-all duration-200',
                isSelected
                  ? 'bg-[#d4af37] text-black font-bold shadow-[0_0_12px_rgba(212,175,55,0.4)]'
                  : isToday
                  ? 'border border-[#d4af37]/50 text-[#d4af37] hover:bg-[#d4af37]/20'
                  : 'text-zinc-300 hover:bg-white/10 hover:text-white'
              )}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface PlannerClientProps {
  initialHabits: HabitWithStatus[]
  initialReminders?: PlannerReminderRow[]
  /** Quando true, não renderiza o título (já exibido no shell da página). */
  hideHeader?: boolean
}

export default function PlannerClient({ initialHabits, initialReminders = [], hideHeader = false }: PlannerClientProps) {
  const router = useRouter()
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
  const [viewMode, setViewMode] = useState<ViewMode>('day')

  // Salvar viewMode no localStorage quando mudar
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('planner_view_mode')
      if (saved === 'day' || saved === 'week' || saved === 'month') {
        setViewMode(saved as ViewMode)
      }
    }
  }, [])

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

  // Filtro de visualização do dia: Tudo, Apenas Lembretes, ou Eco (tempo livre)
  const [listFilter, setListFilter] = useState<'all' | 'reminders' | 'eco'>('all')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hexis_planner_filter')
      if (saved === 'all' || saved === 'reminders' || saved === 'eco') {
        setListFilter(saved)
      }
    }
  }, [])

  // Calcular blocos de tempo livre (Eco) a partir da timeline
  const computeEcoTimeline = (timeline: TimelineItem[]): TimelineItem[] => {
    const DAY_START = '06:00' // Início do período útil do dia
    const DAY_END = '23:00'   // Fim do período útil do dia

    // Extrair todos os horários ocupados (apenas itens com horário definido)
    const occupiedSlots: { start: string; end: string }[] = []

    for (const item of timeline) {
      if (!item.time) continue
      const rangeMatch = item.time.match(/^(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})$/)
      if (rangeMatch) {
        occupiedSlots.push({ start: rangeMatch[1], end: rangeMatch[2] })
      } else {
        // Item com apenas horário de início: assumir 30min de duração
        const [h, m] = item.time.split(':').map(Number)
        const endMin = h * 60 + m + 30
        const endH = String(Math.floor(endMin / 60)).padStart(2, '0')
        const endM = String(endMin % 60).padStart(2, '0')
        occupiedSlots.push({ start: item.time, end: `${endH}:${endM}` })
      }
    }

    // Ordenar por horário de início
    occupiedSlots.sort((a, b) => a.start.localeCompare(b.start))

    // Merge de slots sobrepostos
    const merged: { start: string; end: string }[] = []
    for (const slot of occupiedSlots) {
      if (merged.length === 0 || slot.start > merged[merged.length - 1].end) {
        merged.push({ ...slot })
      } else {
        merged[merged.length - 1].end =
          slot.end > merged[merged.length - 1].end ? slot.end : merged[merged.length - 1].end
      }
    }

    // Calcular lacunas (tempo livre)
    const freeSlots: TimelineItem[] = []
    let cursor = DAY_START

    for (const slot of merged) {
      if (cursor < slot.start) {
        freeSlots.push({
          id: `eco-${cursor}-${slot.start}`,
          title: 'Tempo Livre',
          time: `${cursor} - ${slot.start}`,
          isRecurring: false,
          isReminder: false,
          isFreeSlot: true,
        })
      }
      cursor = slot.end > cursor ? slot.end : cursor
    }

    // Último bloco livre até o fim do dia
    if (cursor < DAY_END) {
      freeSlots.push({
        id: `eco-${cursor}-${DAY_END}`,
        title: 'Tempo Livre',
        time: `${cursor} - ${DAY_END}`,
        isRecurring: false,
        isReminder: false,
        isFreeSlot: true,
      })
    }

    return freeSlots
  }

  // Estado para lembretes — fonte de verdade: Supabase
  const [reminders, setReminders] = useState<Reminder[]>(() =>
    (initialReminders ?? []).map(rowToReminder)
  )
  const [newReminderText, setNewReminderText] = useState('')
  const [newReminderTimeStart, setNewReminderTimeStart] = useState<string>('')
  const [newReminderTimeEnd, setNewReminderTimeEnd] = useState<string>('')
  const [hasEndTime, setHasEndTime] = useState(false)
  const [newReminderDate, setNewReminderDate] = useState<Date | null>(null) // Data selecionada para o lembrete

  // Estado para modo edição de lembrete
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null)

  // Sincronizar initialReminders quando mudar
  useEffect(() => {
    if (initialReminders && initialReminders.length > 0) {
      setReminders(initialReminders.map(rowToReminder))
      setRefreshTrigger((prev) => prev + 1)
    }
  }, [initialReminders])

  // Carregar lembretes do Supabase na inicialização para garantir sincronização final
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
    // Limpar estado de edição
    setEditingReminder(null)
    setNewReminderText('')
    setNewReminderTimeStart('')
    setNewReminderTimeEnd('')
    setHasEndTime(false)
    if (date) {
      setNewReminderDate(new Date(date))
    } else {
      setNewReminderDate(null) // Usar hoje como padrão
    }
    setIsAddModalOpen(true)
  }

  // Handler para abrir modal em modo edição
  const handleOpenEditModal = (reminder: Reminder) => {
    setEditingReminder(reminder)
    setNewReminderText(reminder.title)
    setNewReminderDate(new Date(reminder.date))
    // Parsear time para início/fim
    if (reminder.time) {
      const rangeMatch = reminder.time.match(/^(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})$/)
      if (rangeMatch) {
        setNewReminderTimeStart(rangeMatch[1])
        setNewReminderTimeEnd(rangeMatch[2])
        setHasEndTime(true)
      } else {
        setNewReminderTimeStart(reminder.time.substring(0, 5))
        setNewReminderTimeEnd('')
        setHasEndTime(false)
      }
    } else {
      setNewReminderTimeStart('')
      setNewReminderTimeEnd('')
      setHasEndTime(false)
    }
    setIsAddModalOpen(true)
  }

  // Handler para redirecionar para Focus
  const handleGoToFocus = (title: string) => {
    router.push(`/blocker?taskName=${encodeURIComponent(title)}&autoStart=true`)
  }

  // Montar o valor de time a partir dos campos de início/fim
  const buildTimeValue = (): string | null => {
    const start = newReminderTimeStart.trim()
    const end = newReminderTimeEnd.trim()
    if (!start) return null
    if (hasEndTime && end) return `${start} - ${end}`
    return start
  }

  // Handler para salvar novo lembrete OU atualizar existente
  const handleSaveReminder = async () => {
    if (!newReminderText.trim()) return

    const reminderDate = newReminderDate || today
    const timeValue = buildTimeValue()

    // ——— Modo Edição ———
    if (editingReminder) {
      const editId = editingReminder.id
      const savedTitle = newReminderText.trim()
      const savedDateStr = formatBrasiliaDate(reminderDate)

      // Optimistic update local
      setReminders((prev) =>
        prev.map((r) =>
          r.id === editId
            ? { ...r, title: savedTitle, date: reminderDate, time: timeValue }
            : r
        )
      )
      setDayTimeline((prev) =>
        prev.map((item) =>
          item.id === editId
            ? { ...item, title: savedTitle, time: timeValue }
            : item
        )
      )

      // Fechar modal
      setNewReminderText('')
      setNewReminderTimeStart('')
      setNewReminderTimeEnd('')
      setHasEndTime(false)
      setNewReminderDate(null)
      setEditingReminder(null)
      setIsAddModalOpen(false)

      // Sincronizar com banco
      try {
        const response = await updateReminder(editId, {
          title: savedTitle,
          date: savedDateStr,
          time: timeValue,
        })
        if (!response.success) {
          console.error('Erro ao atualizar lembrete:', response.error)
          // Recarregar dados frescos em caso de falha
          setRefreshTrigger((prev) => prev + 1)
        }
      } catch (e) {
        console.error('Erro ao atualizar lembrete:', e)
        setRefreshTrigger((prev) => prev + 1)
      }
      return
    }

    // ——— Modo Criação ———
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`

    const tempItem: Reminder = {
      id: tempId,
      title: newReminderText.trim(),
      date: reminderDate,
      time: timeValue,
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
    setNewReminderTimeStart('')
    setNewReminderTimeEnd('')
    setHasEndTime(false)
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
                  time: normalizeTime(response.data!.time),
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
              Lembretes
            </button>
            <button
              type="button"
              onClick={() => {
                setListFilter('eco')
                localStorage.setItem('hexis_planner_filter', 'eco')
              }}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-heading uppercase tracking-wider',
                listFilter === 'eco'
                  ? 'bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/30'
                  : 'text-zinc-500 hover:text-zinc-300'
              )}
            >
              Eco
            </button>
          </div>
        </div>
      )}

      {/* Renderização Condicional Baseada no ViewMode */}
      {viewMode === 'day' && (
        <DayViewContent
          today={today}
          timeline={
            listFilter === 'reminders'
              ? dayTimeline.filter((i) => i.isReminder)
              : listFilter === 'eco'
              ? computeEcoTimeline(dayTimeline)
              : dayTimeline
          }
          loading={dayTimelineLoading}
          reminders={reminders}
          onToggleReminder={handleToggleReminder}
          onDeleteReminder={handleRequestDelete}
          onEditReminder={handleOpenEditModal}
          onGoToFocus={handleGoToFocus}
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

      {/* Modal de Criação / Edição de Lembrete */}
      <Dialog open={isAddModalOpen} onOpenChange={(open) => {
        if (!open) {
          setIsAddModalOpen(false)
          setEditingReminder(null)
          setNewReminderText('')
          setNewReminderTimeStart('')
          setNewReminderTimeEnd('')
          setHasEndTime(false)
          setNewReminderDate(null)
        }
      }}>
        <DialogContent className="bg-zinc-950 border border-[#d4af37]/30 text-white max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-heading uppercase tracking-widest text-[#d4af37]">
              {editingReminder ? 'EDITAR LEMBRETE' : 'NOVO LEMBRETE'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 mt-4">
            {/* Campo Texto */}
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

            {/* Calendário customizado Hexis */}
            <div>
              <label className="block text-sm font-heading uppercase tracking-wide text-zinc-400 mb-2">
                DATA
              </label>
              <HexisCalendar
                selectedDate={newReminderDate || today}
                onSelectDate={(date) => setNewReminderDate(date)}
                today={today}
              />
            </div>

            {/* Horário — Início e Fim */}
            <div>
              <label className="block text-sm font-heading uppercase tracking-wide text-zinc-400 mb-2">
                HORÁRIO (OPCIONAL)
              </label>
              <div className="space-y-3">
                {/* Início */}
                <div className="flex items-center gap-3">
                  <span className="text-xs font-heading uppercase tracking-wider text-zinc-500 w-12 flex-shrink-0">Início</span>
                  <TimePickerHotbar
                    value={newReminderTimeStart}
                    onChange={setNewReminderTimeStart}
                    className="flex-1 bg-zinc-900 border-zinc-700"
                  />
                </div>

                {/* Toggle para horário de fim */}
                <button
                  type="button"
                  onClick={() => {
                    setHasEndTime(!hasEndTime)
                    if (hasEndTime) setNewReminderTimeEnd('')
                  }}
                  className={cn(
                    'flex items-center gap-2 text-xs font-heading uppercase tracking-wider transition-colors',
                    hasEndTime ? 'text-[#d4af37]' : 'text-zinc-500 hover:text-zinc-300'
                  )}
                >
                  <div className={cn(
                    'w-8 h-[18px] rounded-full relative transition-colors duration-300',
                    hasEndTime ? 'bg-[#d4af37]' : 'bg-zinc-700'
                  )}>
                    <div className={cn(
                      'absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white transition-all duration-300',
                      hasEndTime ? 'left-[16px]' : 'left-[2px]'
                    )} />
                  </div>
                  Adicionar horário de fim
                </button>

                {/* Fim (condicional) */}
                {hasEndTime && (
                  <div className="flex items-center gap-3 animate-in slide-in-from-top-2 fade-in duration-200">
                    <span className="text-xs font-heading uppercase tracking-wider text-zinc-500 w-12 flex-shrink-0">Fim</span>
                    <TimePickerHotbar
                      value={newReminderTimeEnd}
                      onChange={setNewReminderTimeEnd}
                      className="flex-1 bg-zinc-900 border-zinc-700"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Botões de ação */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => {
                  setIsAddModalOpen(false)
                  setEditingReminder(null)
                  setNewReminderText('')
                  setNewReminderTimeStart('')
                  setNewReminderTimeEnd('')
                  setHasEndTime(false)
                  setNewReminderDate(null)
                }}
                className="flex-1 px-4 py-3 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors font-heading uppercase tracking-widest text-sm"
              >
                CANCELAR
              </button>
              <button
                onClick={handleSaveReminder}
                className="flex-1 px-4 py-3 bg-[#d4af37] text-black font-heading uppercase tracking-widest rounded-lg hover:bg-[#d4af37]/90 transition-colors text-sm"
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
  onEditReminder,
  onGoToFocus,
}: {
  today: Date
  timeline: TimelineItem[]
  loading: boolean
  reminders: Reminder[]
  onToggleReminder: (id: string) => void
  onDeleteReminder: (id: string) => void
  onEditReminder: (reminder: Reminder) => void
  onGoToFocus: (title: string) => void
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
                      item.isFreeSlot
                        ? 'bg-[#d4af37]/5 border-[#d4af37]/20 border-dashed'
                        : item.isRecurring
                        ? 'bg-[#d4af37]/5 border-[#d4af37]/20'
                        : 'bg-white/5 border-white/10',
                      isCompleted && 'opacity-60'
                    )}
                  >
                    {/* Free slot — render especial */}
                    {item.isFreeSlot ? (
                      <>
                        <div className="flex-shrink-0 mt-0.5">
                          <svg className="w-4 h-4 text-[#d4af37]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66l.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-mono text-[#d4af37]/80 font-medium">
                              {item.time}
                            </span>
                            <span className="text-[10px] uppercase tracking-wider text-[#d4af37]/60">
                              Disponível
                            </span>
                          </div>
                          <div className="mt-3">
                            <p className="text-base text-white/70 font-body">
                              {(() => {
                                if (!item.time) return item.title
                                const rangeMatch = item.time.match(/^(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})$/)
                                if (!rangeMatch) return item.title
                                const startMin = parseInt(rangeMatch[1]) * 60 + parseInt(rangeMatch[2])
                                const endMin = parseInt(rangeMatch[3]) * 60 + parseInt(rangeMatch[4])
                                const diffMin = endMin - startMin
                                const h = Math.floor(diffMin / 60)
                                const m = diffMin % 60
                                if (h > 0 && m > 0) return `${h} h ${m} min livre`
                                if (h > 0) return `${h} h livre`
                                return `${m} min livre`
                              })()}
                            </p>
                          </div>
                        </div>
                      </>
                    ) : (
                    <>

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
                        <div className="flex items-center gap-1.5">
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
                          {/* Botão Play → Focus */}
                          {item.isReminder && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onGoToFocus(item.title)
                              }}
                              className="p-1.5 text-[#d4af37]/50 hover:text-[#d4af37] rounded hover:bg-[#d4af37]/10 transition-colors"
                              title="Iniciar Focus"
                            >
                              <Play className="w-4 h-4" strokeWidth={2} fill="currentColor" />
                            </button>
                          )}
                          {/* Botão Editar (Lápis) */}
                          {item.isReminder && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                if (reminder) onEditReminder(reminder)
                              }}
                              className="p-1.5 text-zinc-500 hover:text-white rounded hover:bg-white/10 transition-colors"
                              title="Editar lembrete"
                            >
                              <Pencil className="w-3.5 h-3.5" strokeWidth={2} />
                            </button>
                          )}
                          {/* Botão de Excluir - Apenas para Lembretes */}
                          {item.isReminder && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onDeleteReminder(item.id)
                              }}
                              className="p-1.5 text-red-500/50 hover:text-red-500 rounded hover:bg-red-500/10 transition-colors"
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
                    </>
                    )}
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
      <div className="grid grid-cols-7 gap-1 sm:gap-2 md:gap-4">
        {weekDays.map((date, index) => {
          const dayReminders = reminders.filter(r => isSameDay(r.date, date))
          const isToday = isSameDay(date, today)
          
          return (
            <button
              key={index}
              onClick={() => onDayClick(date)}
              className={cn(
                'p-1 sm:p-2 md:p-4 rounded-lg border flex flex-col items-center justify-center transition-colors',
                isToday
                  ? 'bg-[#d4af37]/20 border-[#d4af37]'
                  : 'bg-zinc-900 border-zinc-800 hover:border-[#d4af37]/30'
              )}
            >
              <div className="text-[9px] sm:text-[10px] md:text-sm font-heading uppercase tracking-wider text-zinc-400 mb-1 md:mb-2 text-center">
                {WEEKDAYS[date.getDay()]}
              </div>
              <div className={cn('text-lg sm:text-xl md:text-2xl font-bold mb-1 md:mb-2 text-center', isToday ? 'text-[#d4af37]' : 'text-white')}>
                {date.getDate()}
              </div>
              {dayReminders.length > 0 && (
                <div className="text-[8px] sm:text-[9px] md:text-xs text-zinc-500 text-center leading-tight">
                  <span className="md:hidden">{dayReminders.length} item{dayReminders.length > 1 ? 's' : ''}</span>
                  <span className="hidden md:inline">{dayReminders.length} lembrete{dayReminders.length > 1 ? 's' : ''}</span>
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
