'use client'

import { useState, useEffect, useMemo } from 'react'
import { getHabits, toggleHabit, deleteHabit } from '@/app/actions/habits'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreVertical, ArrowUpDown, RotateCcw, Edit2, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { HabitReorderDialog } from './HabitReorderDialog'
import { Header } from '@/components/layout/Header'

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
    gold: { class: 'text-jewel-gold', bg: 'bg-jewel-gold', border: 'border-jewel-gold', shadow: 'rgba(212,175,55,0.4)' },
  }
  const jewel = jewelConfig[jewelColor as keyof typeof jewelConfig] || jewelConfig.gold

  return (
    <div
      className={cn(
        // AÇÃO 1: A Borda de Luz (The Wire of Light)
        'group bg-card/80 backdrop-blur-sm border rounded-sm p-4',
        'shadow-[0_0_15px_-5px_rgba(212,175,55,0.1)]',
        // AÇÃO 3: A Interação (Tátil)
        'transition-all duration-300 active:scale-[0.98]',
        // AÇÃO 4: O Check (Óleo na Chama) - Quando completado
        isCompleted ? `${jewel.bg}/20 ${jewel.border}` : 'border-white/5'
      )}
      style={isCompleted ? {
        boxShadow: `0 0 20px ${jewel.shadow}`
      } : undefined}
    >
      {/* Linha principal: Checkbox + Título + Menu */}
      <div className="flex items-center gap-3">
        {/* AÇÃO 2: O Checkbox (A Partícula) - Círculo Renascentista */}
        <button
          type="button"
          onClick={() => onToggle(habit.id, isCompleted)}
          className={cn(
            'h-5 w-5 flex-shrink-0 rounded-full border-2 transition-all duration-300 relative overflow-hidden',
            'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-card',
            isCompleted 
              ? 'border-jewel-gold focus:ring-jewel-gold' 
              : 'border-jewel-gold/50 focus:ring-jewel-gold/50'
          )}
        >
          {/* Estado Inicial: Borda fina dourada */}
          {!isCompleted && (
            <div className="absolute inset-0 rounded-full border border-jewel-gold/30" />
          )}
          
          {/* AÇÃO 1: Estado Marcado - Preenchimento Dourado */}
          {isCompleted && (
            <>
              <div 
                className="absolute inset-0 rounded-full bg-[#d4af37] animate-pulse-flash"
              />
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#d4af37]/80 via-[#d4af37]/60 to-white/40" />
            </>
          )}
        </button>

        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* AÇÃO 1: Ícones Dourados - Forçar cor dourada sempre */}
          {Icon && (
            <div className="flex-shrink-0 drop-shadow-md">
              <Icon className="w-5 h-5 text-[#d4af37]" strokeWidth={2} />
            </div>
          )}
          {/* AÇÃO 1: Tipografia - Refinada */}
          <h3
            className={cn(
              'text-lg font-heading uppercase tracking-widest truncate text-white/90',
              isCompleted && `${jewel.class} text-white`
            )}
          >
            {habit.title}
          </h3>
        </div>

        {/* Menu de Opções - Discreto */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1.5 hover:bg-muted/50 rounded transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100">
              <MoreVertical className="w-4 h-4 text-muted-foreground" strokeWidth={2} />
            </button>
          </DropdownMenuTrigger>
          {/* AÇÃO 4: Menu de Opções - Estética Dourada */}
          <DropdownMenuContent align="end" className="bg-[#0a0a0c] border border-[#d4af37]/20">
            <DropdownMenuItem className="cursor-pointer text-white hover:bg-[#d4af37]/10" onClick={onEdit}>
              <Edit2 className="w-4 h-4 mr-2 text-[#d4af37]" strokeWidth={2} />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer text-white hover:bg-[#d4af37]/10"
              onClick={onDelete}
            >
              <Trash2 className="w-4 h-4 mr-2 text-[#d4af37]" strokeWidth={2} />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Barra de Progresso (apenas para hábitos de tempo) - Códice Vivo */}
      {habit.goal_type === 'time' && (
        <div className="mt-3 ml-9 space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className={cn(
              'font-body italic text-white/90',
              isCompleted && `${jewel.class} text-white`
            )}>
              {achieved} {achievedUnit} / {target} {targetUnit}
            </span>
            <span className={cn(
              'font-mono text-white/70',
              isCompleted && `${jewel.class} text-white`
            )}>
              {Math.round(progress)}%
            </span>
          </div>
          <div className="h-1 bg-secondary/10 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full transition-all duration-500',
                isCompleted ? jewel.bg : `${jewel.bg}/50`
              )}
              style={{
                width: `${progress}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export function HabitTracker({ initialHabits, date, currentDate }: HabitTrackerProps) {
  // Estado local otimista (fonte da verdade para a UI)
  const [localHabits, setLocalHabits] = useState<HabitWithStatus[]>(initialHabits)
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

  // Sincronizar localHabits quando initialHabits mudar
  // CRÍTICO: Quando a URL muda, o servidor manda `initialHabits` novos (dados do passado/futuro).
  // O estado local PRECISA resetar para refletir isso.
  useEffect(() => {
    // O servidor mandou uma lista nova (histórico)? O estado local obedece.
    setLocalHabits(initialHabits)
  }, [initialHabits])

  // AÇÃO 2: Lógica de Ordenação Visual (sortedHabits)
  // Mantém a regra de "Feitos no Final", mas usa a position para desempatar.
  const sortedHabits = useMemo(() => {
    return [...localHabits].sort((a, b) => {
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
    await loadHabits()
  }

  function handleDeleteHabit(habitId: string, habitTitle: string) {
    // 1. Atualização Visual Imediata (Optimistic UI)
    setLocalHabits((prev) => prev.filter((h) => h.id !== habitId))

    // 2. Persistência em Background (Fire-and-Forget)
    deleteHabit(habitId)
      .then((result) => {
        if (!result.success) {
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
      {/* Título da Data - Primeiro elemento visual */}
      <div className="text-center mb-4">
        <Header date={currentDate} habits={localHabits} />
      </div>

      {/* Cabeçalho com Botões de Ação */}
      <div className="flex justify-center gap-4 mb-12">
        <button
          onClick={() => {
            setEditingHabit(null)
            setDialogOpen(true)
          }}
          className="px-6 py-3 border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300 font-heading uppercase tracking-widest text-sm"
        >
          NOVO HÁBITO
        </button>
        <button
          onClick={() => setIsReorderOpen(true)}
          className="px-6 py-3 border border-border text-foreground hover:bg-muted/50 transition-all duration-300 font-heading uppercase tracking-widest text-sm flex items-center gap-2"
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

      {/* AÇÃO 2: Dialog de Entrada de Tempo - Estética Onyx/Glass */}
      {selectedHabit && (
        <Dialog open={!!selectedHabit} onOpenChange={(open) => !open && setSelectedHabit(null)}>
          <DialogContent className="max-w-md bg-[#0a0a0c]/95 backdrop-blur-xl border border-[#d4af37]/20 shadow-[0_0_50px_-10px_rgba(0,0,0,0.8)]">
            <DialogHeader>
              <DialogTitle className="text-[#d4af37] font-heading uppercase tracking-widest text-xl text-center">
                {selectedHabit.title}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-8 py-8">
              {/* AÇÃO 1: Mostrar Valor Acumulado Atual */}
              {selectedHabit.achieved_value && selectedHabit.achieved_value > 0 && (
                <div className="text-center">
                  <p className="text-sm text-white/60 font-body">
                    Acumulado: <span className="font-semibold text-white/90">{selectedHabit.achieved_value} {selectedHabit.achieved_unit || selectedHabit.target_unit || 'minutos'}</span>
                  </p>
                </div>
              )}

              {/* AÇÃO 2: Input Gigante - Estilo Códice */}
              <div className="flex flex-col items-center gap-4">
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="0"
                  value={timeValue}
                  onChange={(e) => setTimeValue(e.target.value)}
                  className="text-6xl font-heading text-center bg-transparent border-none focus:ring-0 focus-visible:ring-0 text-[#d4af37] placeholder:text-white/20 w-full"
                  autoFocus
                />
                {/* Seletor de Unidade - Estética Dourada */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTimeUnit('minutos')}
                    className={cn(
                      'px-6 py-2 border transition-all duration-300 font-heading uppercase tracking-widest text-sm',
                      timeUnit === 'minutos'
                        ? 'border-[#d4af37] bg-[#d4af37] text-black font-bold'
                        : 'border-[#d4af37]/30 bg-transparent text-white/60 hover:border-[#d4af37]/50 hover:text-white/90'
                    )}
                  >
                    MINUTOS
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeUnit('horas')}
                    className={cn(
                      'px-6 py-2 border transition-all duration-300 font-heading uppercase tracking-widest text-sm',
                      timeUnit === 'horas'
                        ? 'border-[#d4af37] bg-[#d4af37] text-black font-bold'
                        : 'border-[#d4af37]/30 bg-transparent text-white/60 hover:border-[#d4af37]/50 hover:text-white/90'
                    )}
                  >
                    HORAS
                  </button>
                </div>
              </div>

              {/* Botões */}
              <div className="flex justify-between items-center gap-3">
                {/* Botão de Restart */}
                <button
                  onClick={handleTimeRestart}
                  className="px-4 py-2 text-white/60 hover:text-white/90 transition-all duration-300 font-heading uppercase tracking-widest text-sm flex items-center gap-2"
                  title="Reiniciar (Zerar)"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reiniciar
                </button>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setSelectedHabit(null)}
                    className="px-6 py-2 text-white/60 hover:text-white/90 transition-all duration-300 font-heading uppercase tracking-widest text-sm"
                  >
                    Cancelar
                  </button>
                  {/* AÇÃO 2: Botão Confirmar - Estilo Lingote de Ouro */}
                  <button
                    onClick={handleTimeConfirm}
                    className="px-6 py-2 bg-[#d4af37] text-black font-bold hover:shadow-[0_0_20px_rgba(212,175,55,0.6)] transition-all duration-300 font-heading uppercase tracking-widest text-sm"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* As Tábuas - Lista de Hábitos (Estática) */}
      {sortedHabits.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-muted-foreground text-center font-body">
            Nenhum hábito registrado.
            <br />
            <span className="text-muted-foreground/60">Adicione um hábito para começar.</span>
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-w-xl mx-auto">
          {sortedHabits.map((habit) => (
            <HabitItem
                  key={habit.id}
              habit={habit}
              onToggle={(id, completed) => handleToggle(id, completed, habit)}
              onEdit={() => {
                setEditingHabit(habit)
                setDialogOpen(true)
              }}
              onDelete={() => handleDeleteHabit(habit.id, habit.title)}
            />
          ))}
        </div>
      )}

      {/* Dialog de Reordenação */}
      <HabitReorderDialog
        open={isReorderOpen}
        onOpenChange={setIsReorderOpen}
        habits={localHabits}
        onReorder={(newOrderedList) => {
          // Atualização Otimista Imediata (0ms)
          setLocalHabits(newOrderedList)
        }}
      />
    </div>
  )
}
