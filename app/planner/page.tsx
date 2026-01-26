'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { Check, Plus, Clock, Repeat } from 'lucide-react'
import { getBrasiliaDate, formatBrasiliaDate } from '@/lib/date'
import { cn } from '@/lib/utils'
import { DayViewModal } from '@/components/DayViewModal'
import { getHabits } from '@/app/actions/habits'
import type { HabitWithStatus } from '@/types/hexis'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

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

export interface Reminder {
  id: string
  title: string
  date: Date // Data associada
  time: string | null // Horário opcional (formato "HH:MM" ou null para "Dia Todo")
  isCompleted: boolean
}

// Interface para formato serializado (localStorage)
interface SerializedReminder {
  id: string
  title: string
  date: string // ISO string format
  time: string | null
  isCompleted: boolean
}

// Função para serializar lembretes (Date -> string)
function serializeReminders(reminders: Reminder[]): SerializedReminder[] {
  return reminders.map(r => ({
    ...r,
    date: r.date.toISOString(),
  }))
}

// Função para deserializar lembretes (string -> Date)
function deserializeReminders(serialized: SerializedReminder[]): Reminder[] {
  return serialized.map(r => ({
    ...r,
    date: new Date(r.date),
  }))
}

// Função para carregar lembretes do localStorage
function loadRemindersFromStorage(): Reminder[] {
  if (typeof window === 'undefined') return []
  
  try {
    const stored = localStorage.getItem('hexis_reminders')
    if (!stored) return []
    
    const parsed = JSON.parse(stored) as SerializedReminder[]
    return deserializeReminders(parsed)
  } catch (error) {
    console.error('Erro ao carregar lembretes do localStorage:', error)
    return []
  }
}

// Função para salvar lembretes no localStorage
function saveRemindersToStorage(reminders: Reminder[]): void {
  if (typeof window === 'undefined') return
  
  try {
    const serialized = serializeReminders(reminders)
    localStorage.setItem('hexis_reminders', JSON.stringify(serialized))
  } catch (error) {
    console.error('Erro ao salvar lembretes no localStorage:', error)
  }
}

// Função helper para comparar apenas dia/mês/ano (ignorando hora)
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
  if (time.match(/^\d{2}:\d{2}$/)) return time
  if (time.match(/^\d{2}:\d{2}:\d{2}$/)) return time.substring(0, 5)
  return null
}

// Interface para itens da timeline
interface TimelineItem {
  id: string
  title: string
  time: string | null
  isRecurring: boolean
  isReminder: boolean
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

export default function PlannerPage() {
  // Estabilizar 'today' para evitar recálculos desnecessários
  const today = useMemo(() => getBrasiliaDate(), [])
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()
  const currentDay = today.getDate()

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

  // Estado para hábitos reais
  const [habits, setHabits] = useState<HabitWithStatus[]>([])
  const [habitsLoading, setHabitsLoading] = useState(true)

  // Estado para timeline do dia (para view 'day')
  const [dayTimeline, setDayTimeline] = useState<TimelineItem[]>([])
  const [dayTimelineLoading, setDayTimelineLoading] = useState(false)

  // Gatilho de atualização para evitar loops infinitos
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Estado para modal de criação de lembrete
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  // Estado para lembretes (carregar do localStorage na inicialização)
  const [reminders, setReminders] = useState<Reminder[]>(() => {
    if (typeof window !== 'undefined') {
      return loadRemindersFromStorage()
    }
    return []
  })
  const [newReminderText, setNewReminderText] = useState('')
  const [newReminderTime, setNewReminderTime] = useState<string>('')
  const [newReminderDate, setNewReminderDate] = useState<Date | null>(null) // Data selecionada para o lembrete

  // Salvar lembretes no localStorage sempre que mudarem
  useEffect(() => {
    saveRemindersToStorage(reminders)
  }, [reminders])

  // Buscar hábitos do dia atual (apenas uma vez ao montar)
  useEffect(() => {
    const loadHabits = async () => {
      setHabitsLoading(true)
      const todayString = formatBrasiliaDate(today)
      const result = await getHabits(todayString)
      if (result.success && result.data) {
        setHabits(result.data)
      }
      setHabitsLoading(false)
    }
    loadHabits()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Executar apenas uma vez ao montar

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
    const day = startOfWeek.getDay()
    const diff = startOfWeek.getDate() - day // Domingo como início da semana
    startOfWeek.setDate(diff)
    startOfWeek.setHours(0, 0, 0, 0)
    
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      return date
    })
  }, [today])

  // Calcular dias do mês (para view 'month')
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay()
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  
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

  const handleAddReminder = () => {
    if (newReminderText.trim()) {
      // Usar data selecionada (se houver) ou hoje como padrão
      const reminderDate = newReminderDate || new Date(today)
      
      const newReminder: Reminder = {
        id: Date.now().toString(),
        title: newReminderText.trim(),
        date: reminderDate,
        time: newReminderTime || null, // Horário opcional
        isCompleted: false,
      }
      setReminders([...reminders, newReminder])
      setNewReminderText('')
      setNewReminderTime('')
      setNewReminderDate(null)
      setIsAddModalOpen(false) // Fechar modal após criar
      // Disparar atualização da timeline sem causar loop
      setRefreshTrigger(prev => prev + 1)
    }
  }

  const handleCancelAdd = () => {
    setNewReminderText('')
    setNewReminderTime('')
    setNewReminderDate(null)
    setIsAddModalOpen(false)
  }

  const handleOpenAddModal = (date?: Date | null) => {
    // Se uma data foi passada (do DayViewModal), usar ela como padrão
    if (date) {
      setNewReminderDate(new Date(date))
    } else {
      setNewReminderDate(null) // Usar hoje como padrão
    }
    setIsAddModalOpen(true)
  }

  const handleToggleReminder = (id: string) => {
    setReminders(reminders.map(r => 
      r.id === id ? { ...r, isCompleted: !r.isCompleted } : r
    ))
    // Disparar atualização da timeline sem causar loop
    setRefreshTrigger(prev => prev + 1)
  }

  return (
    <div className="min-h-screen bg-black text-white pt-12 pb-24 px-6">
      {/* Título */}
      <header className="flex justify-center items-center mb-8">
        <h1 className="text-4xl font-heading uppercase tracking-[0.2em] text-[#d4af37]">
          PLANNER
        </h1>
      </header>

      {/* Seletor de Visão */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex bg-zinc-900 border border-zinc-800 rounded-lg p-1 gap-1">
          {(['day', 'week', 'month'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-heading uppercase tracking-wider transition-all',
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
      <button
        onClick={() => handleOpenAddModal()}
        className="w-full mb-8 py-5 bg-[#d4af37] text-black font-heading uppercase tracking-widest text-lg hover:bg-[#d4af37]/90 transition-colors duration-300 rounded-lg shadow-[0_0_20px_rgba(212,175,55,0.3)]"
      >
        ADICIONAR LEMBRETE
      </button>

      {/* Renderização Condicional Baseada no ViewMode */}
      {viewMode === 'day' && (
        <DayViewContent
          today={today}
          timeline={dayTimeline}
          loading={dayTimelineLoading}
          reminders={reminders}
          onToggleReminder={handleToggleReminder}
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
          currentMonth={currentMonth}
          currentYear={currentYear}
          currentDay={currentDay}
          monthDays={monthDays}
          onDayClick={handleDayClick}
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
      />

      {/* Modal de Criação de Lembrete */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="bg-zinc-950 border border-[#d4af37]/30 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-heading uppercase tracking-widest text-[#d4af37]">
              Novo Lembrete
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Campo de Texto */}
            <div>
              <input
                type="text"
                value={newReminderText}
                onChange={(e) => setNewReminderText(e.target.value)}
                placeholder="O que você precisa fazer?"
                className="w-full text-base bg-transparent border-b border-zinc-700 text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#d4af37] pb-2 transition-colors"
                autoFocus
              />
            </div>

            {/* Campo de Data */}
            <div className="flex items-center gap-2">
              <span className="text-[#d4af37]/60 text-xs font-mono">📅</span>
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
                className="text-base bg-zinc-900 text-white p-2 rounded border border-zinc-700 focus:outline-none focus:border-[#d4af37] transition-colors flex-1"
              />
            </div>

            {/* Campo de Horário */}
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#d4af37]/60 flex-shrink-0" />
              <input
                type="time"
                value={newReminderTime}
                onChange={(e) => setNewReminderTime(e.target.value)}
                className="text-base bg-zinc-900 text-white p-2 rounded border border-zinc-700 focus:outline-none focus:border-[#d4af37] transition-colors"
              />
              {newReminderTime && (
                <button
                  onClick={() => setNewReminderTime('')}
                  className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1"
                >
                  Dia Todo
                </button>
              )}
            </div>

            {/* Botões de Ação */}
            <div className="flex items-center justify-end gap-3 pt-4">
              <button
                onClick={handleCancelAdd}
                className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddReminder}
                disabled={!newReminderText.trim()}
                className={cn(
                  'px-6 py-3 bg-[#d4af37] text-black font-heading uppercase tracking-widest text-sm hover:bg-[#d4af37]/90 transition-colors duration-300 rounded-lg shadow-[0_0_20px_rgba(212,175,55,0.3)]',
                  !newReminderText.trim()
                    ? 'opacity-50 cursor-not-allowed'
                    : ''
                )}
              >
                Salvar
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
}: {
  today: Date
  timeline: TimelineItem[]
  loading: boolean
  reminders: Reminder[]
  onToggleReminder: (id: string) => void
}) {
  return (
    <div className="space-y-6">
      {/* Cabeçalho do Dia */}
      <div className="text-center">
        <h2 className="text-xl font-heading uppercase tracking-widest text-[#d4af37]">
          {WEEKDAY_NAMES[today.getDay()]}, {today.getDate()} de {MONTHS[today.getMonth()]}
        </h2>
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12 text-zinc-500 text-sm">
            <p>Carregando agenda...</p>
          </div>
        ) : timeline.length > 0 ? (
          timeline.map((item) => (
            <div
              key={item.id}
              className={cn(
                'flex items-start gap-3 p-4 rounded-lg border transition-all',
                item.isRecurring
                  ? 'bg-[#d4af37]/5 border-[#d4af37]/20'
                  : 'bg-white/5 border-white/10'
              )}
            >
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
                </div>
                <p className="text-base text-white font-body mt-1">{item.title}</p>
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
    </div>
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
    <div className="space-y-4">
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((date, index) => {
          const isToday = 
            date.getFullYear() === today.getFullYear() &&
            date.getMonth() === today.getMonth() &&
            date.getDate() === today.getDate()
          
          const dayReminders = reminders.filter(r =>
            r.date.getFullYear() === date.getFullYear() &&
            r.date.getMonth() === date.getMonth() &&
            r.date.getDate() === date.getDate()
          )

          return (
            <button
              key={index}
              onClick={() => onDayClick(date)}
              className={cn(
                'p-3 rounded-lg border transition-all text-left',
                isToday
                  ? 'bg-[#d4af37]/20 border-[#d4af37]'
                  : 'bg-white/5 border-white/10 hover:border-[#d4af37]/30'
              )}
            >
              <div className="text-xs font-heading uppercase tracking-widest text-zinc-500 mb-1">
                {WEEKDAYS[date.getDay()]}
              </div>
              <div className={cn(
                'text-lg font-bold mb-2',
                isToday ? 'text-[#d4af37]' : 'text-white'
              )}>
                {date.getDate()}
              </div>
              {dayReminders.length > 0 && (
                <div className="text-xs text-[#d4af37]/70">
                  {dayReminders.length} lembrete{dayReminders.length > 1 ? 's' : ''}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Componente para View de Mês
function MonthViewContent({
  currentMonth,
  currentYear,
  currentDay,
  monthDays,
  onDayClick,
}: {
  currentMonth: number
  currentYear: number
  currentDay: number
  monthDays: (number | null)[]
  onDayClick: (day: number) => void
}) {
  return (
    <section>
      {/* Cabeçalho do Mês */}
      <div className="text-center mb-6">
        <h2 className="text-xl font-heading uppercase tracking-widest text-[#d4af37]">
          {MONTHS[currentMonth]} {currentYear}
        </h2>
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
                'aspect-square flex items-center justify-center rounded-lg transition-all',
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
