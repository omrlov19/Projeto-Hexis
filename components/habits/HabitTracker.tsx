'use client'

import { useState, useEffect, useMemo, memo, useCallback, useRef } from 'react'
import { getHabits, toggleHabit, deleteHabit, getHabitsStatus } from '@/app/actions/habits'
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
import { ArrowUpDown, RotateCcw, Trash2, ChevronsLeft, Pencil, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { HabitReorderDialog } from './HabitReorderDialog'
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion'
import { playSuccessSound } from '@/lib/sounds'

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

  // ===== ORDENAÇÃO AUTOMÁTICA ANTES DO RENDER =====
  // Garantir que não-concluídos aparecem primeiro, concluídos por último
  const sortedHabits = [...habits].sort((a, b) => {
    // Critério 1: Status (Não-concluídos primeiro)
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1 // Feitos vão para baixo
    }
    // Critério 2: Posição (manter ordem original)
    return (a.position || 0) - (b.position || 0)
  })

  return (
    <div className="space-y-3 max-w-xl md:max-w-2xl lg:max-w-4xl mx-auto">
      <AnimatePresence mode="popLayout">
        {sortedHabits.map((habit) => (
          <SwipeableHabitCard
            key={habit.id}
            habit={habit}
            onToggle={(id, completed) => onToggle(id, completed, habit)}
            onEdit={() => onEdit(habit)}
            onDelete={() => onDelete(habit.id, habit.title)}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}, (prevProps, nextProps) => {
  // Comparação customizada: re-renderiza se IDs mudarem OU se valores de progresso mudarem
  // CRÍTICO: Comparar também achieved_value e completed para detectar mudanças de progresso
  if (prevProps.habits.length !== nextProps.habits.length) {
    return false // Re-renderiza se o tamanho mudou
  }
  
  // Comparar cada hábito individualmente
  for (let i = 0; i < prevProps.habits.length; i++) {
    const prev = prevProps.habits[i]
    const next = nextProps.habits[i]
    
    // Se o ID mudou, re-renderiza
    if (prev.id !== next.id) {
      return false
    }
    
    // Se o progresso mudou, re-renderiza (CRÍTICO para atualização de barra)
    if (prev.achieved_value !== next.achieved_value ||
        prev.achieved_unit !== next.achieved_unit ||
        prev.completed !== next.completed) {
      return false
    }
  }
  
  // Se nada mudou, não re-renderiza
  return true
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
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3 }}
      className="relative overflow-hidden"
    >
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

      {/* AÇÃO 2: Camada de Frente (O Card) — touch-action: pan-y para scroll vertical no mobile */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -140, right: 0 }}
        dragElastic={0.1}
        dragDirectionLock
        style={{ x, touchAction: 'pan-y' }}
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
    </motion.div>
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
        'active:scale-[0.98] active:bg-white/5',
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
          className="absolute inset-y-0 left-0 bg-[#E5C06E]/10 z-0"
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
            whileTap={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.2 }}
            className={cn(
              // AÇÃO 2: Aumentar Checkbox - w-7 h-7 com área de toque generosa
              'h-7 w-7 flex-shrink-0 rounded-full border-2 relative overflow-hidden',
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
                  'text-lg font-heading uppercase tracking-widest break-words whitespace-normal line-clamp-2',
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
  // CACHE DE ESTRUTURA: Definições dos hábitos (não muda quando troca de data)
  const [habitsStructure, setHabitsStructure] = useState<Habit[]>(() => {
    // Extrair apenas a estrutura (sem status) dos initialHabits
    return initialHabits.map(({ completed, achieved_value, achieved_unit, ...rest }) => rest as Habit)
  })
  
  // STATUS DO DIA: Mapa de habit_id -> status (completed, achieved_value, achieved_unit)
  const [habitsStatus, setHabitsStatus] = useState<Record<string, { completed: boolean; achieved_value: number | null; achieved_unit: string | null }>>(() => {
    // Inicializar com o status dos initialHabits
    const statusMap: Record<string, { completed: boolean; achieved_value: number | null; achieved_unit: string | null }> = {}
    initialHabits.forEach(h => {
      statusMap[h.id] = {
        completed: h.completed ?? false,
        achieved_value: h.achieved_value ?? null,
        achieved_unit: h.achieved_unit ?? null,
      }
    })
    return statusMap
  })
  
  // Estado de loading apenas para status (estrutura já está em cache)
  const [statusLoading, setStatusLoading] = useState(false)
  const [allHabitsForReorder, setAllHabitsForReorder] = useState<HabitWithStatus[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isReorderOpen, setIsReorderOpen] = useState(false)
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null)
  const [selectedHabit, setSelectedHabit] = useState<HabitWithStatus | null>(null)
  const [timeValue, setTimeValue] = useState<string>('')
  const [timeUnit, setTimeUnit] = useState<'minutos' | 'horas'>('minutos')

  // DERIVAR: Combinar estrutura + status para criar HabitWithStatus[]
  // Ordenar: Não concluídos primeiro, concluídos por último
  const localHabits = useMemo(() => {
    const habits = habitsStructure.map(habit => ({
      ...habit,
      completed: habitsStatus[habit.id]?.completed ?? false,
      achieved_value: habitsStatus[habit.id]?.achieved_value ?? null,
      achieved_unit: habitsStatus[habit.id]?.achieved_unit ?? null,
    } as HabitWithStatus))
    
    // Ordenação automática: não concluídos primeiro
    return [...habits].sort((a, b) => {
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1 // Feitos vão para baixo
      }
      return 0
    })
  }, [habitsStructure, habitsStatus])

  // Calcular stats em tempo real baseadas em localHabits
  const totalTasks = localHabits.length
  const completedTasks = localHabits.filter(h => h.completed === true).length
  const progressString = `${completedTasks}/${totalTasks}`

  // AÇÃO 1: Sincronização Inteligente (Estrutura + Status)
  // Quando a data muda: atualizar estrutura (filtro frequency_days) + buscar status
  // Quando estrutura muda (criação/edição/deleção): atualizar estrutura + status
  const previousDateRef = useRef<string>(date)
  const previousStructureRef = useRef<string>('')
  const habitsStructureRef = useRef<Habit[]>(habitsStructure)
  
  // Manter ref sincronizado com estado
  useEffect(() => {
    habitsStructureRef.current = habitsStructure
  }, [habitsStructure])
  
  useEffect(() => {
    // Extrair estrutura dos initialHabits
    const newStructure = initialHabits.map(({ completed, achieved_value, achieved_unit, ...rest }) => rest as Habit)
    const newStructureString = JSON.stringify(newStructure.map(h => h.id).sort())
    const dateChanged = date !== previousDateRef.current
    const structureChanged = newStructureString !== previousStructureRef.current
    
    // Se a estrutura mudou (novo hábito, edição, deleção, ou filtro de data), atualizar cache
    if (structureChanged) {
      previousStructureRef.current = newStructureString
      // Atualizar estrutura de forma suave (mantém cards visíveis)
      setHabitsStructure(newStructure)
    }
    
    // Se a data mudou, buscar apenas o status (estrutura já foi atualizada acima se necessário)
    if (dateChanged) {
      previousDateRef.current = date
      // Buscar status do novo dia (mantém cards visíveis, apenas atualiza checks)
      loadHabitsStatus(date)
    } else if (structureChanged) {
      // Se apenas a estrutura mudou (sem mudança de data), sincronizar status dos initialHabits
      const newStatus: Record<string, { completed: boolean; achieved_value: number | null; achieved_unit: string | null }> = {}
      initialHabits.forEach(h => {
        newStatus[h.id] = {
          completed: h.completed ?? false,
          achieved_value: h.achieved_value ?? null,
          achieved_unit: h.achieved_unit ?? null,
        }
      })
      setHabitsStatus(newStatus)
    }
  }, [initialHabits, date]) // eslint-disable-line react-hooks/exhaustive-deps

  // AÇÃO 2: Buscar APENAS o status quando a data mudar (sem recarregar estrutura)
  async function loadHabitsStatus(dateString: string) {
    setStatusLoading(true)
    try {
      const result = await getHabitsStatus(dateString)
      // Usar ref para garantir que estamos usando a estrutura mais recente
      const currentStructure = habitsStructureRef.current
      
      if (result.success && result.data) {
        // Atualizar apenas o status, mantendo a estrutura intacta
        // Mesclar com status anterior para manter hábitos sem tracking com completed=false
        setHabitsStatus((prev) => {
          const newStatus: Record<string, { completed: boolean; achieved_value: number | null; achieved_unit: string | null }> = {}
          // Para cada hábito na estrutura atual, usar o novo status se existir, senão resetar
          currentStructure.forEach(habit => {
            if (result.data![habit.id]) {
              // Há tracking para este hábito neste dia
              newStatus[habit.id] = result.data![habit.id]
            } else {
              // Não há tracking, resetar para false/null
              newStatus[habit.id] = {
                completed: false,
                achieved_value: null,
                achieved_unit: null,
              }
            }
          })
          return newStatus
        })
      } else {
        // Se não houver tracking, resetar todos os status para false/null
        setHabitsStatus((prev) => {
          const newStatus: Record<string, { completed: boolean; achieved_value: number | null; achieved_unit: string | null }> = {}
          currentStructure.forEach(habit => {
            newStatus[habit.id] = {
              completed: false,
              achieved_value: null,
              achieved_unit: null,
            }
          })
          return newStatus
        })
      }
    } catch (error) {
      console.error('Erro ao buscar status dos hábitos:', error)
    } finally {
      setStatusLoading(false)
    }
  }

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
    // Recarregar tudo (estrutura + status) - usado apenas em casos de erro
    const result = await getHabits(date)
    if (result.success && result.data) {
      const newStructure = result.data.map(({ completed, achieved_value, achieved_unit, ...rest }) => rest as Habit)
      const newStatus: Record<string, { completed: boolean; achieved_value: number | null; achieved_unit: string | null }> = {}
      result.data.forEach(h => {
        newStatus[h.id] = {
          completed: h.completed ?? false,
          achieved_value: h.achieved_value ?? null,
          achieved_unit: h.achieved_unit ?? null,
        }
      })
      setHabitsStructure(newStructure)
      setHabitsStatus(newStatus)
    }
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
    
    const optimisticHabit: Habit = {
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
    }

    // Adicionar estrutura ao topo da lista
    setHabitsStructure((prev) => [optimisticHabit, ...prev])
    
    // Adicionar status inicial (vazio)
    setHabitsStatus((prev) => ({
      ...prev,
      [tempId]: {
        completed: false,
        achieved_value: 0,
        achieved_unit: null,
      }
    }))
    
    // Retornar o tempId para troca posterior
    return tempId
  }

  // Função para troca silenciosa de ID (tempId -> realId)
  function handleReplaceHabit(tempId: string, realHabit: Habit) {
    // Substituir na estrutura
    setHabitsStructure((prev) =>
      prev.map((habit) => (habit.id === tempId ? realHabit : habit))
    )
    
    // Manter o status existente (se houver)
    setHabitsStatus((prev) => {
      const existingStatus = prev[tempId]
      if (existingStatus) {
        const newStatus = { ...prev }
        delete newStatus[tempId]
        newStatus[realHabit.id] = existingStatus
        return newStatus
      }
      return prev
    })
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
      // Tocar som de sucesso ao concluir
      if (newStatus) {
        playSuccessSound()
      }
      
      // 1. Atualização Local Imediata (Optimistic UI) - Apenas status
      setHabitsStatus((prev) => ({
        ...prev,
        [habitId]: {
          ...prev[habitId],
          completed: newStatus,
        }
      }))

      // 2. Envio em Background (Fire-and-Forget)
      // Usa a prop `date` (string YYYY-MM-DD da URL), não "hoje"
      toggleHabit(habitId, date, undefined, undefined, newStatus).catch((error) => {
        console.error('Erro ao atualizar hábito:', error)
        // Reverter em caso de erro
        loadHabitsStatus(date)
        })
      return
    }

    // Se for tipo 'time'
    if (habitData.goal_type === 'time') {
      // Se já está feito, desmarca direto (com auto-reset)
      if (currentCompleted) {
        // 1. Atualização Local Imediata (Optimistic UI) - Apenas status
        setHabitsStatus((prev) => ({
          ...prev,
          [habitId]: {
            completed: false,
            achieved_value: 0,
            achieved_unit: null,
          }
        }))

        // 2. Envio em Background (Fire-and-Forget)
        // Se newValue for 0, enviamos explicitamente para o banco limpar
        // Usa a prop `date` (string YYYY-MM-DD da URL), não "hoje"
        toggleHabit(habitId, date, 0, undefined, false).catch((error) => {
          console.error('Erro ao desmarcar hábito:', error)
          // Reverter em caso de erro
          loadHabitsStatus(date)
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

    // ===== PASSO 1: CAPTURAR O VALOR DO INPUT (Imediato) =====
    const numericValue = parseFloat(timeValue)
    if (isNaN(numericValue) || numericValue <= 0) return

    // Guardar referências necessárias antes de qualquer atualização
    const habitId = selectedHabit.id
    const currentValue = selectedHabit.achieved_value || 0
    const currentUnit = selectedHabit.achieved_unit || selectedHabit.target_unit || 'minutos'
    const targetUnit = selectedHabit.target_unit || 'minutos'
    const targetValue = selectedHabit.target_value || 1
    
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
    let finalValue: number
    let finalUnit: string
    
    if (timeUnit !== targetUnit) {
      finalValue = timeUnit === 'horas' ? totalInMinutes / 60 : totalInMinutes
      finalUnit = timeUnit
    } else {
      finalValue = targetUnit === 'horas' ? totalInMinutes / 60 : totalInMinutes
      finalUnit = targetUnit
    }

    // Verificar se completou
    let comparisonTarget = targetValue
    if (targetUnit === 'horas') {
      comparisonTarget = targetValue * 60
    }
    const isCompleted = totalInMinutes >= comparisonTarget

    // ===== PASSO 2: ATUALIZAÇÃO IMEDIATA DO ESTADO (CRÍTICO - ANTES DE QUALQUER OUTRA OPERAÇÃO) =====
    // FORÇAR atualização do estado LOCAL primeiro para que a UI atualize instantaneamente (0ms)
    // Esta é a ÚNICA atualização que importa para a experiência visual do usuário
    setHabitsStatus((prev) => {
      const newStatus = {
        ...prev,
        [habitId]: {
          completed: isCompleted,
          achieved_value: finalValue,
          achieved_unit: finalUnit,
        }
      }
      // Forçar re-render imediato
      return newStatus
    })

    // Tocar som de sucesso se completou o hábito
    if (isCompleted) {
      playSuccessSound()
    }

    // ===== PASSO 3: FECHAR O MODAL (Visual) =====
    setSelectedHabit(null)
    setTimeValue('')

    // ===== PASSO 4: ENVIO EM BACKGROUND (Só depois da atualização visual) =====
    // PROIBIDO: Não usar router.refresh() ou window.location.reload() aqui
    // Fire-and-Forget: Enviar para o servidor em background (não bloqueia a UI)
    toggleHabit(habitId, date, finalValue, finalUnit).catch((error) => {
      console.error('Erro ao salvar progresso:', error)
      // Reverter em caso de erro (rollback do estado otimista)
      loadHabitsStatus(date)
    })
  }

  // AÇÃO 2: Botão de Restart (Zerar)
  function handleTimeRestart() {
    if (!selectedHabit) return

    // Usar a target_unit do hábito para manter consistência
    const targetUnit = selectedHabit.target_unit || 'minutos'

    // 1. Atualização Local Imediata (Optimistic UI) - Barra de progresso atualiza instantaneamente
    setHabitsStatus((prev) => ({
      ...prev,
      [selectedHabit.id]: {
        completed: false,
        achieved_value: 0,
        achieved_unit: null,
      }
    }))

    // 2. Fechar dialog após atualizar estado (garante que a barra já está atualizada)
    setSelectedHabit(null)
    setTimeValue('')

    // 3. Envio em Background (Fire-and-Forget) - Sem reload
    // Zerar o valor e marcar como não completado
    // Passamos 0 com a unidade do hábito para manter consistência no banco
    toggleHabit(selectedHabit.id, date, 0, targetUnit, false).catch((error) => {
      console.error('Erro ao reiniciar hábito:', error)
      // Reverter em caso de erro (rollback do estado otimista)
      loadHabitsStatus(date)
    })
  }

  async function handleHabitCreated() {
    // AÇÃO 1: Recarregar hábitos imediatamente após criação
    // Isso garante que o hábito apareça na lista mesmo se o filtro de dias mudar
    const result = await getHabits(date)
    if (result.success && result.data) {
      const newStructure = result.data.map(({ completed, achieved_value, achieved_unit, ...rest }) => rest as Habit)
      const newStatus: Record<string, { completed: boolean; achieved_value: number | null; achieved_unit: string | null }> = {}
      result.data.forEach(h => {
        newStatus[h.id] = {
          completed: h.completed ?? false,
          achieved_value: h.achieved_value ?? null,
          achieved_unit: h.achieved_unit ?? null,
        }
      })
      setHabitsStructure(newStructure)
      setHabitsStatus(newStatus)
    }
  }

  // AÇÃO 3: Estabilizar funções com useCallback para componente memoizado
  // Essas funções são estáveis e não mudam entre renders
  const handleEditStable = useCallback((habit: Habit) => {
    setEditingHabit(habit)
    setDialogOpen(true)
  }, [])

  const handleDeleteStable = useCallback((habitId: string, habitTitle: string) => {
    // 1. Atualização Visual Imediata (Optimistic UI) - Remover da estrutura
    setHabitsStructure((prev) => prev.filter((h) => h.id !== habitId))
    setHabitsStatus((prev) => {
      const newStatus = { ...prev }
      delete newStatus[habitId]
      return newStatus
    })

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
      setHabitsStatus((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          completed: newStatus,
        }
      }))
      toggleHabit(id, date, undefined, undefined, newStatus).catch((error) => {
        console.error('Erro ao atualizar hábito:', error)
        loadHabitsStatus(date)
      })
      return
    }

    if (habitData.goal_type === 'time') {
      if (completed) {
        setHabitsStatus((prev) => ({
          ...prev,
          [id]: {
            completed: false,
            achieved_value: 0,
            achieved_unit: null,
          }
        }))
        toggleHabit(id, date, 0, undefined, false).catch((error) => {
          console.error('Erro ao desmarcar hábito:', error)
          loadHabitsStatus(date)
        })
        return
      }
      setSelectedHabit(habitData)
      setTimeValue('')
      setTimeUnit(habitData.target_unit === 'horas' ? 'horas' : 'minutos')
    }
  }, [date, localHabits]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleDeleteHabit(habitId: string, habitTitle: string) {
    // 1. Atualização Visual Imediata (Optimistic UI) - Remover da estrutura
    setHabitsStructure((prev) => prev.filter((h) => h.id !== habitId))
    setHabitsStatus((prev) => {
      const newStatus = { ...prev }
      delete newStatus[habitId]
      return newStatus
    })

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

  return (
    <div className="space-y-6">
      {/* Cabeçalho com Botões de Ação */}
      <div className="flex justify-center gap-3 mb-10">
        {/* Transplante: botão do Planner (mesmo JSX/classes), ligado ao modal de hábito */}
        <button
          onClick={() => {
            setEditingHabit(null)
            setDialogOpen(true)
          }}
          className="px-6 py-5 bg-[#d4af37] text-black font-heading uppercase tracking-widest text-lg hover:bg-[#d4af37]/90 rounded-lg shadow-[0_0_20px_rgba(212,175,55,0.3)]"
        >
          + NOVO HÁBITO
        </button>
        <button
          onClick={() => {
            // AÇÃO 2: Zero Fetch — usar o estado local já carregado
            // Abrir organizador instantaneamente (apenas troca de boolean)
            setAllHabitsForReorder(localHabits)
            setIsReorderOpen(true)
          }}
          className={cn(
            'w-14 py-5 inline-flex items-center justify-center',
            'bg-white/5 border border-white/10 hover:border-[#d4af37]/50 text-white',
            'rounded-lg',
            'touch-manipulation cursor-pointer'
          )}
          title="Organizar"
        >
          <ArrowUpDown className="w-6 h-6" />
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
                      'px-4 py-2 h-10 border font-heading uppercase tracking-widest text-xs touch-manipulation cursor-pointer',
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
                      'px-4 py-2 h-10 border font-heading uppercase tracking-widest text-xs touch-manipulation cursor-pointer',
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
                  className="px-4 py-2 h-10 text-white/60 md:hover:text-white/90 active:text-white/90 font-heading uppercase tracking-widest text-xs touch-manipulation cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleTimeConfirm}
                  className="px-4 py-2 h-10 bg-[#E5C06E] text-black font-bold md:hover:shadow-[0_0_20px_rgba(229,192,110,0.6)] font-heading uppercase tracking-widest text-xs touch-manipulation cursor-pointer"
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
      {/* AÇÃO 4: Loading sutil - Opacidade reduzida nos checks enquanto carrega status */}
      <div className={statusLoading ? 'opacity-60' : undefined}>
        <HabitsListMemoized
          habits={sortedHabits}
          onToggle={handleToggleStable}
          onEdit={handleEditStable}
          onDelete={handleDeleteStable}
        />
      </div>

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
          // Atualização Otimista Imediata (0ms) - Atualizar estrutura
          const newStructure = newOrderedList.map(({ completed, achieved_value, achieved_unit, ...rest }) => rest as Habit)
          setHabitsStructure(newStructure)
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
