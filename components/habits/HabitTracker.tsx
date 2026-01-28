'use client'

import { useState, useEffect, useMemo, memo, useCallback, useRef } from 'react'
import { getHabits, toggleHabit, deleteHabit, getAllHabits } from '@/app/actions/habits'
import { emitHabitsChanged, HABITS_CHANGED_EVENT } from '@/lib/habits-events'
import type { HabitWithStatus, Habit } from '@/types/hexis'
import { CreateHabitDialog } from './CreateHabitDialog'
import { iconMap } from './CreateHabitDialog'
import type { LucideIcon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ArrowUpDown, RotateCcw, Edit2, Trash2, ChevronsLeft, Pencil, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { HabitReorderDialog } from './HabitReorderDialog'
import { motion, useMotionValue, useTransform } from 'framer-motion'

interface HabitTrackerProps {
  initialHabits: HabitWithStatus[]
  date: string
  currentDate: Date
}

// Função para mapear categoria/cor para cores de joia
function getJewelColor(category?: string | null, color?: string | null): string {
  // Se tiver categoria, mapear para joia
  if (category) {
    const categoryLower = category.toLowerCase()
    if (categoryLower.includes('saúde') || categoryLower.includes('corpo') || categoryLower.includes('guerra')) {
      return 'ruby' // Rubi Sangue - Para Corpo/Guerra
    }
    if (categoryLower.includes('mente') || categoryLower.includes('mental') || categoryLower.includes('estudo')) {
      return 'lapis' // Azul Ultramarino - Para Mente
    }
    if (categoryLower.includes('espírito') || categoryLower.includes('espirito') || categoryLower.includes('meditação')) {
      return 'amethyst' // Roxo Imperial - Para Espírito
    }
    if (categoryLower.includes('negócio') || categoryLower.includes('negocio') || categoryLower.includes('business') || categoryLower.includes('produtividade')) {
      return 'amber' // Âmbar Queimado - Para Negócios
    }
  }
  // Se tiver cor customizada, usar ouro como padrão
  if (color) {
    return 'gold' // Ouro Veneziano - Padrão
  }
  // Padrão: Ouro
  return 'gold'
}

// AÇÃO 3: Componente memoizado para isolar renderização
const HabitsListMemoized = memo(({
  habits,
  onToggle,
  onEdit,
  onDelete,
}: {
  habits: HabitWithStatus[]
  onToggle: (id: string, completed: boolean, habit?: HabitWithStatus) => void
  onEdit: (habit: Habit) => void
  onDelete: (id: string, title: string) => void
}) => {
  if (habits.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted-foreground text-center font-body">
          Nenhum hábito registrado.
          <br />
          <span className="text-muted-foreground/60">Adicione um hábito para começar.</span>
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3 max-w-xl mx-auto">
      {habits.map((habit) => (
        <SwipeableHabitCard
          key={habit.id}
          habit={habit}
          onToggle={(id, completed) => onToggle(id, completed, habit)}
          onEdit={() => onEdit(habit)}
          onDelete={() => onDelete(habit.id, habit.title)}
        />
      ))}
    </div>
  )
}, (prevProps, nextProps) => {
  // Comparação customizada: só re-renderiza se os IDs mudarem
  const prevIds = prevProps.habits.map(h => h.id).join(',')
  const nextIds = nextProps.habits.map(h => h.id).join(',')
  return prevIds === nextIds
})
HabitsListMemoized.displayName = 'HabitsListMemoized'

// Componente Swipeable que envolve o HabitItem
function SwipeableHabitCard({
  habit,
  onToggle,
  onEdit,
  onDelete,
}: {
  habit: HabitWithStatus
  onToggle: (id: string, completed: boolean) => void
  onEdit: () => void
  onDelete: () => void
}) {
  const x = useMotionValue(0)
  const opacity = useTransform(x, [-140, -70, 0], [1, 0.5, 0])

  return (
    <div className="relative overflow-hidden">
      {/* AÇÃO 2: Camada de Fundo (Ações) */}
      <div className="absolute inset-0 flex justify-end z-0">
        {/* Botão Editar - Dourado */}
        <motion.button
          onClick={(e) => {
            e.stopPropagation()
            x.set(0) // Fechar o swipe antes de editar
            setTimeout(() => onEdit(), 100)
          }}
          className="w-[70px] bg-[#E5C06E] flex items-center justify-center touch-manipulation cursor-pointer active:bg-[#E5C06E]/90 transition-colors"
          style={{ opacity }}
        >
          <Pencil className="w-5 h-5 text-black" strokeWidth={2} />
        </motion.button>
        {/* Botão Excluir - Vermelho */}
        <motion.button
          onClick={(e) => {
            e.stopPropagation()
            x.set(0) // Fechar o swipe antes de excluir
            setTimeout(() => onDelete(), 100)
          }}
          className="w-[70px] bg-red-900 flex items-center justify-center touch-manipulation cursor-pointer active:bg-red-800 transition-colors"
          style={{ opacity }}
        >
          <Trash2 className="w-5 h-5 text-white" strokeWidth={2} />
        </motion.button>
      </div>

      {/* AÇÃO 2: Camada de Frente (O Card) */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -140, right: 0 }}
        dragElastic={0.1}
        style={{ x }}
        className="relative z-10"
        onDragEnd={() => {
          // Snap back se não arrastou o suficiente
          const currentX = x.get()
          if (currentX > -70) {
            x.set(0)
          } else {
            x.set(-140)
          }
        }}
      >
        <HabitItem
          habit={habit}
          onToggle={onToggle}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </motion.div>
    </div>
  )
}

// Componente simples para cada item (sem drag-and-drop)
function HabitItem({
  habit,
  onToggle,
  onEdit,
  onDelete,
}: {
  habit: HabitWithStatus
  onToggle: (id: string, completed: boolean) => void
  onEdit: () => void
  onDelete: () => void
}) {
  const Icon = habit.icon ? (iconMap[habit.icon] as LucideIcon) : null
  const jewelColor = getJewelColor(habit.category, habit.color)
  const isCompleted = habit.completed === true

  // Barra de Progresso: usar achieved_value
  const achieved = habit.achieved_value || 0
  const target = habit.target_value || 1
  const targetUnit = habit.target_unit || 'minutos'
  const achievedUnit = habit.achieved_unit || targetUnit

  // Converter para minutos para cálculo de progresso
  let comparisonAchieved = achieved
  if (achievedUnit === 'horas') {
    comparisonAchieved = achieved * 60
  }

  let comparisonTarget = target
  if (targetUnit === 'horas') {
    comparisonTarget = target * 60
  }

  const safeTarget = Math.max(1, comparisonTarget)
  const progress = Math.min(100, (comparisonAchieved / safeTarget) * 100)

  // Mapear cor de joia para classes Tailwind e valores RGB para shadow
  const jewelConfig = {
    ruby: { class: 'text-jewel-ruby', bg: 'bg-jewel-ruby', border: 'border-jewel-ruby', shadow: 'rgba(159,18,57,0.4)' },
    lapis: { class: 'text-jewel-lapis', bg: 'bg-jewel-lapis', border: 'border-jewel-lapis', shadow: 'rgba(30,58,138,0.4)' },
    amethyst: { class: 'text-jewel-amethyst', bg: 'bg-jewel-amethyst', border: 'border-jewel-amethyst', shadow: 'rgba(88,28,135,0.4)' },
    amber: { class: 'text-jewel-amber', bg: 'bg-jewel-amber', border: 'border-jewel-amber', shadow: 'rgba(180,83,9,0.4)' },
    gold: { class: 'text-[#E5C06E]', bg: 'bg-[#E5C06E]', border: 'border-[#E5C06E]', shadow: 'rgba(229,192,110,0.4)' },
  }
  const jewel = jewelConfig[jewelColor as keyof typeof jewelConfig] || jewelConfig.gold

  return (
    <div
      className={cn(
        // AÇÃO 2: Refatorar o Estilo dos Cards - Alto Contraste
        'group backdrop-blur-sm border rounded-sm px-4 py-5',
        'shadow-[0_0_15px_-5px_rgba(229,192,110,0.15)]',
        // AÇÃO 1: Correção do Clique Duplo - Hover só em Desktop, Touch em Mobile
        'transition-all duration-300 active:scale-[0.98] active:bg-white/5',
        'cursor-pointer touch-manipulation',
        // AÇÃO 2: Fundo do Card - Quase preto (OPACO para cobrir botões de swipe)
        'bg-[#0a0a0a]',
        // AÇÃO 1: Container do Card - Relative e Overflow para Barra de Progresso
        'relative overflow-hidden',
        // AÇÃO 2: Borda - Dourada sutil para visibilidade
        isCompleted 
          ? 'border border-[#d4af37]/20 bg-black/40 opacity-60 md:hover:opacity-100' 
          : 'border-[#E5C06E]/20'
      )}
      style={isCompleted ? {
        boxShadow: `0 0 20px ${jewel.shadow}`
      } : undefined}
    >
      {/* AÇÃO 2: Progresso como "Enchimento de Fundo" */}
      {habit.goal_type === 'time' && habit.target_value && habit.target_value > 0 && (
        <div 
          className="absolute inset-y-0 left-0 bg-[#E5C06E]/10 z-0 transition-all duration-500"
          style={{ width: `${Math.min(100, progress)}%` }}
        />
      )}

      {/* Conteúdo do Card */}
      <div className="relative z-10">
        {/* Linha principal: Checkbox + Título (com Tempo) + Menu */}
        <div className="flex items-center gap-3">
          {/* AÇÃO 2: O Checkbox (A Partícula) - Círculo Renascentista - Aumentado para Mobile */}
          <motion.button
            type="button"
            onClick={() => onToggle(habit.id, isCompleted)}
            whileTap={{ scale: 1.1 }}
            className={cn(
              // AÇÃO 2: Aumentar Checkbox - w-7 h-7 com área de toque generosa
              'h-7 w-7 flex-shrink-0 rounded-full border-2 transition-all duration-300 relative overflow-hidden',
              'cursor-pointer touch-manipulation min-w-[28px] min-h-[28px]',
              'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-card',
              'flex items-center justify-center',
              isCompleted 
                ? 'border-[#d4af37] bg-[#d4af37] focus:ring-[#d4af37]' 
                : 'border-[#E5C06E]/50 focus:ring-[#E5C06E]/50'
            )}
          >
            {/* Estado Inicial: Borda fina dourada */}
            {!isCompleted && (
              <div className="absolute inset-0 rounded-full border border-[#E5C06E]/30" />
            )}
            
            {/* AÇÃO 2: Estado Marcado - Preenchimento Dourado Brilhante com Ícone Check */}
            {isCompleted && (
              <>
                <div 
                  className="absolute inset-0 rounded-full bg-[#d4af37] animate-pulse-flash"
                />
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#d4af37]/80 via-[#d4af37]/60 to-white/40" />
                <Check className="w-4 h-4 text-black relative z-10" strokeWidth={3} />
              </>
            )}
          </motion.button>

          {/* AÇÃO: Container de Texto - Vertical (Nome + Tempo) */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* AÇÃO 2: Ícones - Dourado brilhante com brilho aumentado */}
            {Icon && (
              <div className="flex-shrink-0 drop-shadow-[0_0_5px_rgba(229,192,110,0.3)]">
                <Icon className="w-5 h-5 text-[#E5C06E]" strokeWidth={2} />
              </div>
            )}
            {/* Container de Texto - Vertical */}
            <div className="flex flex-col items-start gap-0.5 flex-1 min-w-0">
              {/* AÇÃO 2: Texto do Hábito - Quase branco para brilho */}
              <h3
                className={cn(
                  'text-lg font-heading uppercase tracking-widest break-words whitespace-normal line-clamp-2 transition-all duration-300',
                  isCompleted 
                    ? 'line-through decoration-[#d4af37] text-white/30' 
                    : 'text-[#f5f5f4]'
                )}
              >
                {habit.title}
              </h3>
              {/* AÇÃO 2: Visualização Inteligente no Card - Converter para horas quando fizer sentido */}
              {habit.goal_type === 'time' && habit.target_value && habit.target_value > 0 && (() => {
                // Função para formatar tempo de forma inteligente
                const formatTime = (value: number, unit: string): string => {
                  if (unit === 'horas') {
                    // Se já está em horas, mostrar direto
                    return `${value} ${value === 1 ? 'hr' : 'hrs'}`
                  } else {
                    // Se está em minutos e > 59, converter para horas
                    if (value >= 60) {
                      const hours = Math.floor(value / 60)
                      const minutes = value % 60
                      if (minutes === 0) {
                        return `${hours} ${hours === 1 ? 'hr' : 'hrs'}`
                      }
                      return `${hours}h ${minutes}m`
                    }
                    return `${value} min`
                  }
                }
                
                const achievedDisplay = formatTime(achieved, achievedUnit)
                const targetDisplay = formatTime(target, targetUnit)
                
                return (
                  <span className="text-[10px] font-mono tracking-wide text-[#E5C06E]/60">
                    {achievedDisplay} / {targetDisplay}
                  </span>
                )
              })()}
            </div>
          </div>

          {/* AÇÃO 3: Indicador Visual (A Setinha) */}
          <div className="flex-shrink-0">
            <ChevronsLeft className="w-4 h-4 text-white animate-pulse" strokeWidth={2} />
          </div>
        </div>
      </div>
    </div>
  )
}

export function HabitTracker({ initialHabits, date, currentDate }: HabitTrackerProps) {
  // Estado local otimista (fonte da verdade para a UI)
  const [localHabits, setLocalHabits] = useState<HabitWithStatus[]>(initialHabits)
  const [allHabitsForReorder, setAllHabitsForReorder] = useState<HabitWithStatus[]>([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isReorderOpen, setIsReorderOpen] = useState(false)
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null)
  const [selectedHabit, setSelectedHabit] = useState<HabitWithStatus | null>(null)
  const [timeValue, setTimeValue] = useState<string>('')
  const [timeUnit, setTimeUnit] = useState<'minutos' | 'horas'>('minutos')

  // Calcular stats em tempo real baseadas em localHabits
  const totalTasks = localHabits.length
  const completedTasks = localHabits.filter(h => h.completed === true).length
  const progressString = `${completedTasks}/${totalTasks}`

  // AÇÃO 1: Sincronização Estável (Deep Compare)
  // Usar useRef para armazenar a string JSON dos hábitos anteriores
  const previousHabitsRef = useRef<string>('')
  
  // Sincronizar localHabits quando initialHabits mudar
  // CRÍTICO: Quando a URL muda, o servidor manda `initialHabits` novos (dados do passado/futuro).
  // O estado local PRECISA resetar para refletir isso.
  // AÇÃO 1: Deep Compare - Só atualizar se os dados realmente mudaram (comparação profunda)
  useEffect(() => {
    // Normalizar os dados para comparação (remover campos que mudam mas não são relevantes)
    const normalizeHabits = (habits: HabitWithStatus[]) => {
      return habits.map(h => ({
        id: h.id,
        title: h.title,
        completed: h.completed,
        achieved_value: h.achieved_value,
        achieved_unit: h.achieved_unit,
        goal_type: h.goal_type,
        target_value: h.target_value,
        target_unit: h.target_unit,
        position: h.position,
        icon: h.icon,
        color: h.color,
        category: h.category,
        frequency_days: h.frequency_days,
      }))
    }
    
    const currentHabitsString = JSON.stringify(normalizeHabits(localHabits))
    const newHabitsString = JSON.stringify(normalizeHabits(initialHabits))
    
    // Comparar strings JSON - só atualizar se forem diferentes
    if (newHabitsString !== previousHabitsRef.current) {
      previousHabitsRef.current = newHabitsString
      
      // Só atualizar se os dados realmente mudaram
      if (newHabitsString !== currentHabitsString) {
        setLocalHabits(initialHabits)
      }
    }
  }, [initialHabits]) // eslint-disable-line react-hooks/exhaustive-deps

  // AÇÃO 2: Lógica de Ordenação Visual (sortedHabits)
  // Mantém a regra de "Feitos no Final", mas usa a position para desempatar.
  // AÇÃO 2: Estabilidade da Derivação - Só recalcula se localHabits mudar de verdade
  const sortedHabits = useMemo(() => {
    // Criar uma cópia estável para evitar re-renders desnecessários
    const habitsCopy = [...localHabits]
    return habitsCopy.sort((a, b) => {
      // Critério 1: Status (Soberano na Visualização)
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1 // Feitos vão para baixo
      }
      // Critério 2: Posição (Soberano na Estrutura)
      return (a.position || 0) - (b.position || 0)
    })
  }, [localHabits])


  async function loadHabits() {
    setLoading(true)
    const result = await getHabits(date)
    if (result.success && result.data) {
      setLocalHabits(result.data)
    }
    setLoading(false)
  }

  // Função para criação otimista de hábito (retorna o tempId para troca posterior)
  function handleOptimisticCreate(habitData: {
    title: string
    icon?: string
    color?: string
    category?: string
    period?: string
    target_value?: number
    target_unit?: string
    goal_type?: 'check' | 'time'
    frequency_days?: string[]
  }): string {
    // Criar objeto Habit completo com ID temporário
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const now = new Date().toISOString()
    
    const optimisticHabit: HabitWithStatus = {
      id: tempId,
      user_id: '', // Será preenchido pelo servidor
      title: habitData.title,
      goal_value: habitData.target_value || 1,
      created_at: now,
      icon: habitData.icon || null,
      color: habitData.color || null,
      category: habitData.category || null,
      period: habitData.period || null,
      target_value: habitData.target_value || null,
      target_unit: habitData.target_unit || null,
      goal_type: habitData.goal_type || null,
      frequency_days: habitData.frequency_days && habitData.frequency_days.length > 0 
        ? habitData.frequency_days 
        : null,
      position: 0, // Adiciona no topo
      // Estado inicial (reset automático)
      completed: false,
      achieved_value: 0,
      achieved_unit: null,
    }

    // Adicionar ao topo da lista (position: 0)
    setLocalHabits((prev) => [optimisticHabit, ...prev])
    
    // Retornar o tempId para troca posterior
    return tempId
  }

  // Função para troca silenciosa de ID (tempId -> realId)
  function handleReplaceHabit(tempId: string, realHabit: Habit) {
    setLocalHabits((prev) =>
      prev.map((habit) => {
        if (habit.id === tempId) {
          // Substituir o hábito temporário pelo real, mantendo o estado local (completed, achieved_value)
          return {
            ...realHabit,
            completed: habit.completed, // Manter estado local
            achieved_value: habit.achieved_value, // Manter estado local
            achieved_unit: habit.achieved_unit, // Manter estado local
          } as HabitWithStatus
        }
        return habit
      })
    )
  }

  function handleToggle(habitId: string, currentCompleted: boolean, habit?: HabitWithStatus) {
    const habitData = habit || localHabits.find(h => h.id === habitId)
    if (!habitData) return
    
    // CRÍTICO: Usar a prop `date` (vem da URL), NÃO usar getBrasiliaDate() ou new Date()
    // Isso garante que se estou olhando o dia 13, eu salvo no dia 13
    
    // Lógica de Novo Status
    const newStatus = !currentCompleted
    
    // AÇÃO 1: Lógica de Auto-Reset para hábitos de tempo
    // Se for hábito de tempo E estamos desmarcando (newStatus === false) -> Valor vira 0
    const newValue = (habitData.goal_type === 'time' && !newStatus) ? 0 : undefined
    
    // Se for tipo 'check', marca direto
    if (habitData.goal_type === 'check') {
      // 1. Atualização Local Imediata (Optimistic UI)
      setLocalHabits((prev) =>
        prev.map((h) =>
          h.id === habitId
            ? { ...h, completed: newStatus }
            : h
        )
      )

      // 2. Envio em Background (Fire-and-Forget)
      // Usa a prop `date` (string YYYY-MM-DD da URL), não "hoje"
      toggleHabit(habitId, date, undefined, undefined, newStatus).catch((error) => {
        console.error('Erro ao atualizar hábito:', error)
        // Reverter em caso de erro
        loadHabits()
        })
      return
    }

    // Se for tipo 'time'
    if (habitData.goal_type === 'time') {
      // Se já está feito, desmarca direto (com auto-reset)
      if (currentCompleted) {
        // 1. Atualização Local Imediata (Optimistic UI)
        // Zera o achieved_value visualmente quando desmarca
        setLocalHabits((prev) =>
          prev.map((h) =>
            h.id === habitId
              ? { 
                  ...h, 
                  completed: false,
                  achieved_value: 0,
                  achieved_unit: null
                }
              : h
          )
        )

        // 2. Envio em Background (Fire-and-Forget)
        // Se newValue for 0, enviamos explicitamente para o banco limpar
        // Usa a prop `date` (string YYYY-MM-DD da URL), não "hoje"
        toggleHabit(habitId, date, 0, undefined, false).catch((error) => {
          console.error('Erro ao desmarcar hábito:', error)
          // Reverter em caso de erro
          loadHabits()
        })
        return
      }

      // Se não está feito, abre o dialog
      setSelectedHabit(habitData)
      setTimeValue('')
      setTimeUnit(habitData.target_unit === 'horas' ? 'horas' : 'minutos')
    }
  }

  function handleTimeConfirm() {
    if (!selectedHabit || !timeValue) return

    const numericValue = parseFloat(timeValue)
    if (isNaN(numericValue) || numericValue <= 0) return

    // AÇÃO 1: Lógica de Acúmulo (Soma)
    // Pegar o valor atual acumulado
    const currentValue = selectedHabit.achieved_value || 0
    const currentUnit = selectedHabit.achieved_unit || selectedHabit.target_unit || 'minutos'
    
    // Converter tudo para minutos para calcular a soma corretamente
    let currentValueInMinutes = currentValue
    if (currentUnit === 'horas') {
      currentValueInMinutes = currentValue * 60
    }
    
    let newValueInMinutes = numericValue
    if (timeUnit === 'horas') {
      newValueInMinutes = numericValue * 60
    }
    
    // Somar os valores
    const totalInMinutes = currentValueInMinutes + newValueInMinutes
    
    // Converter de volta para a unidade do hábito (ou manter a unidade digitada se for diferente)
    const targetUnit = selectedHabit.target_unit || 'minutos'
    let finalValue: number
    let finalUnit: string
    
    // Se a unidade digitada for diferente da unidade do hábito, usar a unidade digitada
    // Caso contrário, usar a unidade do hábito
    if (timeUnit !== targetUnit) {
      // Converter total para a unidade digitada
      finalValue = timeUnit === 'horas' ? totalInMinutes / 60 : totalInMinutes
      finalUnit = timeUnit
    } else {
      // Usar a unidade do hábito
      finalValue = targetUnit === 'horas' ? totalInMinutes / 60 : totalInMinutes
      finalUnit = targetUnit
    }

    // AÇÃO 3: UX de Conclusão
    // Se finalValue >= targetValue, marque como completed: true
    const targetValue = selectedHabit.target_value || 1
    let comparisonTarget = targetValue
    if (targetUnit === 'horas') {
      comparisonTarget = targetValue * 60
    }
    
    const isCompleted = totalInMinutes >= comparisonTarget

    // Fechar dialog IMEDIATAMENTE
    setSelectedHabit(null)
    setTimeValue('')

    // 1. Atualização Local Imediata (Optimistic UI)
    setLocalHabits((prev) =>
      prev.map((h) =>
        h.id === selectedHabit.id
          ? {
              ...h,
              achieved_value: finalValue,
              achieved_unit: finalUnit,
              completed: isCompleted,
            }
          : h
      )
    )

    // 2. Envio em Background (Fire-and-Forget)
    // CRÍTICO: Usa a prop `date` (string YYYY-MM-DD da URL), não "hoje"
    // Isso garante que se estou olhando o dia 13, eu salvo no dia 13
    toggleHabit(selectedHabit.id, date, finalValue, finalUnit).catch((error) => {
      console.error('Erro ao salvar progresso:', error)
      // Reverter em caso de erro
      loadHabits()
    })
  }

  // AÇÃO 2: Botão de Restart (Zerar)
  function handleTimeRestart() {
    if (!selectedHabit) return

    // Fechar dialog IMEDIATAMENTE
    setSelectedHabit(null)
    setTimeValue('')

    // Usar a target_unit do hábito para manter consistência
    const targetUnit = selectedHabit.target_unit || 'minutos'

    // 1. Atualização Local Imediata (Optimistic UI)
    setLocalHabits((prev) =>
      prev.map((h) =>
        h.id === selectedHabit.id
          ? {
              ...h,
              achieved_value: 0,
              achieved_unit: null,
              completed: false,
            }
          : h
      )
    )

    // 2. Envio em Background (Fire-and-Forget)
    // Zerar o valor e marcar como não completado
    // Passamos 0 com a unidade do hábito para manter consistência no banco
    toggleHabit(selectedHabit.id, date, 0, targetUnit, false).catch((error) => {
      console.error('Erro ao reiniciar hábito:', error)
      // Reverter em caso de erro
      loadHabits()
    })
  }

  async function handleHabitCreated() {
    // AÇÃO 1: Recarregar hábitos imediatamente após criação
    // Isso garante que o hábito apareça na lista mesmo se o filtro de dias mudar
    await loadHabits()
  }

  // AÇÃO 3: Estabilizar funções com useCallback para componente memoizado
  // Essas funções são estáveis e não mudam entre renders
  const handleEditStable = useCallback((habit: Habit) => {
    setEditingHabit(habit)
    setDialogOpen(true)
  }, [])

  const handleDeleteStable = useCallback((habitId: string, habitTitle: string) => {
    // 1. Atualização Visual Imediata (Optimistic UI)
    setLocalHabits((prev) => prev.filter((h) => h.id !== habitId))

    // 2. Persistência em Background (Fire-and-Forget)
    deleteHabit(habitId)
      .then((result) => {
        if (result.success) {
          // AÇÃO: Broadcast de mudança (Event-Driven Refresh)
          emitHabitsChanged('delete')
        } else {
          // Em caso de erro, recarregar para reverter
          console.error('Erro ao excluir hábito:', result.error)
          loadHabits()
        }
      })
      .catch((error) => {
        console.error('Erro ao excluir hábito:', error)
        loadHabits()
      })
  }, [date]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleStable = useCallback((id: string, completed: boolean, habit?: HabitWithStatus) => {
    const habitData = habit || localHabits.find(h => h.id === id)
    if (!habitData) return
    
    const newStatus = !completed
    const newValue = (habitData.goal_type === 'time' && !newStatus) ? 0 : undefined
    
    if (habitData.goal_type === 'check') {
      setLocalHabits((prev) =>
        prev.map((h) =>
          h.id === id ? { ...h, completed: newStatus } : h
        )
      )
      toggleHabit(id, date, undefined, undefined, newStatus).catch((error) => {
        console.error('Erro ao atualizar hábito:', error)
        loadHabits()
      })
      return
    }

    if (habitData.goal_type === 'time') {
      if (completed) {
        setLocalHabits((prev) =>
          prev.map((h) =>
            h.id === id
              ? { ...h, completed: false, achieved_value: 0, achieved_unit: null }
              : h
          )
        )
        toggleHabit(id, date, 0, undefined, false).catch((error) => {
          console.error('Erro ao desmarcar hábito:', error)
          loadHabits()
        })
        return
      }
      setSelectedHabit(habitData)
      setTimeValue('')
      setTimeUnit(habitData.target_unit === 'horas' ? 'horas' : 'minutos')
    }
  }, [date, localHabits]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleDeleteHabit(habitId: string, habitTitle: string) {
    // 1. Atualização Visual Imediata (Optimistic UI)
    setLocalHabits((prev) => prev.filter((h) => h.id !== habitId))

    // 2. Persistência em Background (Fire-and-Forget)
    deleteHabit(habitId)
      .then((result) => {
        if (result.success) {
          // AÇÃO: Broadcast de mudança (Event-Driven Refresh)
          emitHabitsChanged('delete')
        } else {
          // Em caso de erro, recarregar para reverter
          console.error('Erro ao excluir hábito:', result.error)
          loadHabits()
        }
        // Se sucesso, não precisa fazer nada - o item já foi removido visualmente
      })
      .catch((error) => {
        // Em caso de exceção, recarregar para reverter
        console.error('Erro ao excluir hábito:', error)
        loadHabits()
      })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted-foreground font-body">Carregando hábitos...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho com Botões de Ação */}
      <div className="flex justify-center gap-4 mb-12">
        <button
          onClick={() => {
            setEditingHabit(null)
            setDialogOpen(true)
          }}
          className="px-6 py-3 border border-primary text-primary md:hover:bg-primary md:hover:text-primary-foreground active:bg-primary active:text-primary-foreground transition-all duration-300 font-heading uppercase tracking-widest text-sm touch-manipulation cursor-pointer"
        >
          NOVO HÁBITO
        </button>
        <button
          onClick={async () => {
            // Buscar TODOS os hábitos quando abrir o organizador
            const result = await getAllHabits()
            if (result.success && result.data) {
              // Converter Habit[] para HabitWithStatus[] (adicionar campos de status vazios)
              const habitsWithStatus: HabitWithStatus[] = result.data.map((h) => ({
                ...h,
                completed: false,
                achieved_value: null,
                achieved_unit: null,
              }))
              setAllHabitsForReorder(habitsWithStatus)
            }
            setIsReorderOpen(true)
          }}
          className="px-6 py-3 border border-border text-foreground md:hover:bg-muted/50 active:bg-muted/50 transition-all duration-300 font-heading uppercase tracking-widest text-sm flex items-center gap-2 touch-manipulation cursor-pointer"
        >
          <ArrowUpDown className="w-4 h-4" />
          ORGANIZAR
        </button>
      </div>

      {/* Dialog de Criação/Edição */}
      <CreateHabitDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) {
            setEditingHabit(null)
          }
        }}
        onSuccess={handleHabitCreated}
        habitToEdit={editingHabit}
        onOptimisticCreate={handleOptimisticCreate}
        onReplaceHabit={handleReplaceHabit}
      />

      {/* AÇÃO 2: Dialog de Entrada de Tempo - Alinhamento Refatorado */}
      {selectedHabit && (
        <Dialog open={!!selectedHabit} onOpenChange={(open) => !open && setSelectedHabit(null)}>
          <DialogContent 
            onOpenAutoFocus={(e) => e.preventDefault()}
            className="w-[95%] max-w-[380px] rounded-xl p-6 bg-[#0a0a0c]/95 backdrop-blur-xl border border-[#E5C06E]/20 shadow-[0_0_50px_-10px_rgba(0,0,0,0.8)]"
          >
            {/* AÇÃO 1: Título Dourado no Topo */}
            <DialogHeader>
              <DialogTitle className="text-[#E5C06E] font-heading uppercase tracking-widest text-lg text-center">
                {selectedHabit.title}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* AÇÃO 1: Mostrar Valor Acumulado Atual */}
              {selectedHabit.achieved_value && selectedHabit.achieved_value > 0 && (
                <div className="text-center">
                  <p className="text-sm text-white/60 font-body">
                    Acumulado: <span className="font-semibold text-white/90">{selectedHabit.achieved_value} {selectedHabit.achieved_unit || selectedHabit.target_unit || 'minutos'}</span>
                  </p>
                </div>
              )}

              {/* AÇÃO 1: Input Livre no Dialog de Tempo - Sem limites artificiais */}
              <div className="flex flex-col items-center gap-4">
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="0"
                  value={timeValue}
                  onChange={(e) => setTimeValue(e.target.value)}
                  className="text-7xl font-heading text-center bg-transparent border-none focus-visible:ring-0 text-[#E5C06E] placeholder:text-[#E5C06E]/30 h-24 w-full"
                />
                {/* AÇÃO 3: Seletor "Minutos | Horas" logo abaixo */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTimeUnit('minutos')}
                    className={cn(
                      'px-4 py-2 h-10 border transition-all duration-300 font-heading uppercase tracking-widest text-xs touch-manipulation cursor-pointer',
                      timeUnit === 'minutos'
                        ? 'border-[#E5C06E] bg-[#E5C06E] text-black font-bold'
                        : 'border-[#E5C06E]/30 bg-transparent text-white/60 md:hover:border-[#E5C06E]/50 md:hover:text-white/90 active:border-[#E5C06E]/50 active:text-white/90'
                    )}
                  >
                    MINUTOS
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeUnit('horas')}
                    className={cn(
                      'px-4 py-2 h-10 border transition-all duration-300 font-heading uppercase tracking-widest text-xs touch-manipulation cursor-pointer',
                      timeUnit === 'horas'
                        ? 'border-[#E5C06E] bg-[#E5C06E] text-black font-bold'
                        : 'border-[#E5C06E]/30 bg-transparent text-white/60 md:hover:border-[#E5C06E]/50 md:hover:text-white/90 active:border-[#E5C06E]/50 active:text-white/90'
                    )}
                  >
                    HORAS
                  </button>
                </div>
              </div>
            </div>

            {/* AÇÃO 3: Rodapé Equilibrado - Restart na Esquerda, Ações na Direita */}
            <div className="flex items-center justify-between w-full mt-6 pt-4 border-t border-white/10">
              {/* Lado Esquerdo: Botão Restart */}
              <button
                onClick={handleTimeRestart}
                className="text-[#E5C06E] p-2 md:hover:bg-[#E5C06E]/10 active:bg-[#E5C06E]/10 rounded-full transition-colors touch-manipulation cursor-pointer"
                title="Reiniciar (Zerar)"
              >
                <RotateCcw className="w-6 h-6" strokeWidth={2} />
              </button>
              
              {/* Lado Direito: Ações (Cancelar e Salvar) */}
              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedHabit(null)}
                  className="px-4 py-2 h-10 text-white/60 md:hover:text-white/90 active:text-white/90 transition-all duration-300 font-heading uppercase tracking-widest text-xs touch-manipulation cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleTimeConfirm}
                  className="px-4 py-2 h-10 bg-[#E5C06E] text-black font-bold md:hover:shadow-[0_0_20px_rgba(229,192,110,0.6)] transition-all duration-300 font-heading uppercase tracking-widest text-xs touch-manipulation cursor-pointer"
                >
                  Salvar
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* As Tábuas - Lista de Hábitos (Estática) */}
      {/* AÇÃO 3: Isolamento Visual - Componente memoizado para evitar re-renders */}
      <HabitsListMemoized
        habits={sortedHabits}
        onToggle={handleToggleStable}
        onEdit={handleEditStable}
        onDelete={handleDeleteStable}
      />

      {/* Dialog de Reordenação */}
      <HabitReorderDialog
        open={isReorderOpen}
        onOpenChange={(open) => {
          setIsReorderOpen(open)
          if (!open) {
            // Recarregar hábitos quando fechar o dialog para refletir mudanças
            loadHabits()
          }
        }}
        habits={allHabitsForReorder.length > 0 ? allHabitsForReorder : localHabits}
        onReorder={(newOrderedList) => {
          // Atualização Otimista Imediata (0ms)
          setAllHabitsForReorder(newOrderedList)
        }}
        onEdit={(habit) => {
          // Fechar o dialog de organização
          setIsReorderOpen(false)
          // Abrir o dialog de edição
          setEditingHabit(habit)
          setDialogOpen(true)
        }}
        onDelete={(habitId) => {
          // Remover da lista de reordenação também
          setAllHabitsForReorder((prev) => prev.filter((h) => h.id !== habitId))
          // Usar a função de delete estável
          handleDeleteStable(habitId, '')
        }}
      />
    </div>
  )
}
