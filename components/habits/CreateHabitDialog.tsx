'use client'

import { useState, useEffect } from 'react'
import { createHabit, updateHabit } from '@/app/actions/habits'
import { emitHabitsChanged } from '@/lib/habits-events'
import type { Habit } from '@/types/hexis'
import { getBrasiliaDate } from '@/lib/date'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Apple,
  Activity,
  Dumbbell,
  Brain,
  BookOpen,
  PenTool,
  Scroll,
  Snowflake,
  Briefcase,
  Sun,
  Sunset,
  GraduationCap,
  Moon,
  Lightbulb,
  Users,
  Clock,
  Check,
  Bell,
  Droplet,
  Languages,
  Feather,
  Heart,
  Stars,
  Plus,
  ArrowLeft,
  X,
  Loader2,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// AÇÃO 1: IconMap mantido para compatibilidade com HabitTracker (usado em HabitTracker.tsx)
export const iconMap: Record<string, LucideIcon> = {
  apple: Apple,
  activity: Activity,
  dumbbell: Dumbbell,
  brain: Brain,
  bookopen: BookOpen,
  'book-open': BookOpen,
  pentool: PenTool,
  'pen-tool': PenTool,
  scroll: Scroll,
  snowflake: Snowflake,
  briefcase: Briefcase,
  sun: Sun,
  graduationcap: GraduationCap,
  moon: Moon,
  lightbulb: Lightbulb,
  users: Users,
  clock: Clock,
  droplet: Droplet,
  languages: Languages,
  feather: Feather,
  heart: Heart,
  sparkles: Stars, // Usando Stars como substituto para sparkles
  stars: Stars,
}

interface CreateHabitDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  habitToEdit?: Habit | null
  onOptimisticCreate?: (habitData: {
    title: string
    icon?: string
    color?: string
    category?: string
    period?: string
    target_value?: number
    target_unit?: string
    goal_type?: 'check' | 'time'
    frequency_days?: string[]
  }) => string // Retorna o tempId
  onReplaceHabit?: (tempId: string, realHabit: Habit) => void
}

// AÇÃO 1: Definição dos Moldes (Templates)
const templates = [
  { name: 'Beber Água', icon: 'droplet' },
  { name: 'Cardio', icon: 'activity' },
  { name: 'Treinar', icon: 'dumbbell' },
  { name: 'Leitura', icon: 'book-open' },
  { name: 'Sono', icon: 'moon' },
  { name: 'Meditar', icon: 'sun' },
  { name: 'Journaling', icon: 'pen-tool' },
  { name: 'Inglês', icon: 'languages' },
  { name: 'Business', icon: 'briefcase' },
  { name: 'Banho Gelado', icon: 'snowflake' },
  { name: 'Escrita', icon: 'feather' },
  { name: 'Aprender', icon: 'lightbulb' },
  { name: 'Família', icon: 'heart' },
]

export function CreateHabitDialog({
  open,
  onOpenChange,
  onSuccess,
  habitToEdit,
  onOptimisticCreate,
  onReplaceHabit,
}: CreateHabitDialogProps) {
  // AÇÃO 1: Controle de Estado (Steps)
  const [step, setStep] = useState<'selection' | 'config'>('selection')
  // AÇÃO 2: Estado do ícone restaurado
  const [icon, setIcon] = useState('sparkles')
  const [title, setTitle] = useState('')
  // AÇÃO 3: Meta de Tempo Opcional
  const [hasTimeGoal, setHasTimeGoal] = useState(false)
  const [timeMinutes, setTimeMinutes] = useState<string>('30')
  const [timeUnit, setTimeUnit] = useState<'minutos' | 'horas'>('minutos')
  // AÇÃO 2: Estado de Lembrete
  const [reminderEnabled, setReminderEnabled] = useState(false)
  const [reminder, setReminder] = useState<string>('09:00')
  // AÇÃO 1: Estado de Frequência
  const [frequency, setFrequency] = useState<string[]>(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'])
  const [creating, setCreating] = useState(false)

  // Preencher formulário quando habitToEdit mudar ou quando o modal abrir
  useEffect(() => {
    if (open) {
      if (habitToEdit) {
        // AÇÃO 1: Lógica de Edição - Pular direto para config
        setStep('config')
        setTitle(habitToEdit.title || '')
        setIcon(habitToEdit.icon || 'sparkles')
        
        // AÇÃO 1: Carregar frequência do hábito editado
        if (habitToEdit.frequency_days && habitToEdit.frequency_days.length > 0) {
          setFrequency(habitToEdit.frequency_days)
        } else {
          setFrequency(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'])
        }
        
        // AÇÃO 3: Se for tipo "time", ativar meta de tempo
        if (habitToEdit.goal_type === 'time' && habitToEdit.target_value) {
          setHasTimeGoal(true)
          const value = habitToEdit.target_value
          const unit = habitToEdit.target_unit || 'minutos'
          
          if (unit === 'horas') {
            setTimeMinutes(value.toString())
            setTimeUnit('horas')
          } else {
            setTimeMinutes(value.toString())
            setTimeUnit('minutos')
          }
        } else {
          setHasTimeGoal(false)
        }
        
        // Carregar lembrete se existir
        if (habitToEdit.notification_time) {
          setReminderEnabled(true)
          setReminder(habitToEdit.notification_time)
        } else {
          setReminderEnabled(false)
          setReminder('09:00')
        }
      } else {
        // Reset ao abrir modal de criação
        resetForm()
        setStep('selection')
      }
    }
  }, [habitToEdit, open])


  const handleCreate = async () => {
    if (!title.trim()) return

    // Prevenir múltiplos cliques
    if (creating) return

    // AÇÃO 1: Estado Local - Feedback Imediato (<50ms)
    // Setar loading ANTES de qualquer operação assíncrona
    setCreating(true)

    try {
      // AÇÃO 3: Meta de Tempo Opcional
      const finalTargetValue = hasTimeGoal 
        ? parseInt(timeMinutes) 
        : undefined

      const finalTargetUnit = hasTimeGoal 
        ? timeUnit 
        : undefined

      const finalGoalType = hasTimeGoal ? 'time' : 'check'

      // CORREÇÃO CRÍTICA: Sanitização de Frequência (TypeScript)
      // Garantir que o array seja estritamente números inteiros antes de salvar
      
      // 1. Criar variável para o dia de hoje
      const todayBrasilia = getBrasiliaDate()
      const todayIndex = Number(todayBrasilia.getDay()) // 0-6 (número inteiro)
      
      // 2. Mapa de conversão string -> número
      const dayMap: Record<string, number> = {
        'sun': 0,
        'mon': 1,
        'tue': 2,
        'wed': 3,
        'thu': 4,
        'fri': 5,
        'sat': 6
      }
      
      // 3. Criar variável finalFrequency
      let finalFrequency: number[] = []
      
      // 4. Se o usuário não selecionou dias (array vazio), usar apenas o dia de hoje
      if (frequency.length === 0) {
        finalFrequency = [todayIndex]
      } else {
        // 5. Se o usuário selecionou dias, percorrer e forçar conversão para Number()
        finalFrequency = frequency.map(d => {
          // Se já for número, garantir que seja inteiro
          if (typeof d === 'number') {
            return Number(Math.floor(d)) // Garantir inteiro
          }
          // Se for string, converter usando o mapa
          const dayStr = String(d).toLowerCase()
          const num = dayMap[dayStr]
          // Se não encontrar no mapa, tentar converter diretamente para número
          if (num !== undefined) {
            return Number(num)
          }
          // Último recurso: tentar Number() direto (caso seja "0", "1", etc)
          const parsed = Number(d)
          return isNaN(parsed) ? todayIndex : Number(Math.floor(parsed))
        })
        
        // Garantir que o dia atual esteja sempre incluído
        if (!finalFrequency.includes(todayIndex)) {
          finalFrequency.push(todayIndex)
        }
      }
      
      // 6. Garantir que o array não esteja vazio (fallback de segurança)
      if (finalFrequency.length === 0) {
        finalFrequency = [todayIndex]
      }
      
      // 7. Remover duplicatas, garantir inteiros e ordenar
      finalFrequency = [...new Set(finalFrequency)]
        .map(d => Number(Math.floor(d))) // Forçar inteiros
        .filter(d => d >= 0 && d <= 6) // Validar range 0-6
        .sort((a, b) => a - b)
      
      // Usar finalFrequency no payload
      const payloadFrequency = finalFrequency

      // AÇÃO 4: Envio (Salvar) - Usar estado icon atual
      // AÇÃO 2: Incluir notification_time se lembrete estiver ativado
      // CORREÇÃO CRÍTICA: Converter frequency_days para string[] para compatibilidade
      const habitData = {
        title: title.trim(),
        icon: icon || 'sparkles', // AÇÃO 4: Se não escolheu template, usa 'sparkles' como padrão
        color: '#d4af37', // Ouro Veneziano
        target_value: finalTargetValue,
        target_unit: finalTargetUnit,
        goal_type: finalGoalType as "check" | "time",
        frequency_days: payloadFrequency.map(String), // Converter números para strings
        notification_time: reminderEnabled ? reminder : undefined, // AÇÃO 2: Lembrete
      }

      if (habitToEdit) {
        // Modo Edição (não usa optimistic create)
        const result = await updateHabit(habitToEdit.id, habitData)

        if (result.success) {
          resetForm()
          onOpenChange(false)
          emitHabitsChanged('update') // AÇÃO: Broadcast de mudança
          onSuccess()
        } else {
          console.error('Erro ao atualizar hábito:', result.error)
          // TODO: Mostrar toast de erro
        }
      } else {
        // Modo Criação - Optimistic Create com Silent ID Swap
        
        // 1. Otimismo (Aparece na hora)
        let tempId: string | undefined
        if (onOptimisticCreate) {
          // habitData já tem frequency_days como string[], então pode passar direto
          tempId = onOptimisticCreate(habitData)
        }

        // 2. Fecha o modal IMEDIATAMENTE (Aparece que acabou)
        resetForm()
        onOpenChange(false)

        // 3. AÇÃO 3: Refresh Seguro - Aguardar o insert antes de recarregar
        // Isso evita que o hábito apareça e desapareça (flash)
        const result = await createHabit(habitData)
        
        if (result.success && result.data && tempId && onReplaceHabit) {
          // 4. A Troca Silenciosa (O ID falso vira real)
          onReplaceHabit(tempId, result.data)
          // AÇÃO 3: Aguardar um pequeno delay para garantir que o banco processou
          // Isso evita race conditions entre insert e select
          await new Promise(resolve => setTimeout(resolve, 100))
          // AÇÃO: Broadcast de mudança (Event-Driven Refresh)
          emitHabitsChanged('create')
          // AÇÃO 1: Sempre chamar onSuccess para recarregar a lista completa
          // Isso garante que o hábito apareça mesmo se o filtro de dias mudar
          onSuccess()
        } else if (result.success) {
          // Fallback: se não tiver onReplaceHabit, aguardar e recarregar
          await new Promise(resolve => setTimeout(resolve, 100))
          // AÇÃO: Broadcast de mudança (Event-Driven Refresh)
          emitHabitsChanged('create')
          onSuccess()
        } else {
          // Erro - poderia reverter o estado otimista aqui
          console.error('Erro ao criar hábito:', result.error)
          // TODO: Reverter estado otimista em caso de erro
        }
      }
    } catch (error) {
      console.error('Erro inesperado ao processar hábito:', error)
      // TODO: Mostrar toast de erro
    } finally {
      // AÇÃO 2: Lógica de Bloqueio - Sempre desbloquear no finally
      // Isso garante que o botão destrave mesmo se der erro
      setCreating(false)
    }
  }

  const resetForm = () => {
    setTitle('')
    setIcon('sparkles')
    setHasTimeGoal(false)
    setTimeMinutes('30')
    setTimeUnit('minutos')
    setReminderEnabled(false)
    setReminder('09:00')
    setFrequency(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'])
    setStep('selection')
  }

  // Função para aplicar template
  const handleTemplateSelect = (template: { name: string; icon: string }) => {
    // AÇÃO 2: Comportamento do Clique - Avançar para config
    setTitle(template.name)
    setIcon(template.icon)
    setStep('config')
  }

  // AÇÃO 3: Função para criar do zero
  const handleCreateFromZero = () => {
    // AÇÃO 2: Comportamento do Clique - Avançar para config
    setTitle('')
    setIcon('sparkles')
    setHasTimeGoal(false)
    setTimeMinutes('30')
    setTimeUnit('minutos')
    setReminderEnabled(false)
    setReminder('09:00')
    setFrequency(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'])
    setStep('config')
  }

  const handleClose = (open: boolean) => {
    if (!open) {
      // AÇÃO 1: Lógica de Reset - Resetar step quando fechar
      resetForm()
      setStep('selection')
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent 
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="fixed z-[9999] gap-0 p-0 shadow-lg bg-[#0a0a0c] border-none w-[100vw] h-[100dvh] max-w-none !top-0 !left-0 !translate-x-0 !translate-y-0 !m-0 data-[state=open]:!slide-in-from-bottom-full duration-200 sm:!top-[50%] sm:!left-[50%] sm:!translate-x-[-50%] sm:!translate-y-[-50%] sm:w-full sm:max-w-lg sm:h-auto sm:rounded-xl sm:border sm:border-white/10 flex flex-col [&>button]:hidden"
      >
        {/* Acessibilidade: Título Obrigatório (Invisível) */}
        <DialogTitle className="sr-only">Criar Novo Hábito</DialogTitle>

        {/* Container Principal: Estrutura Flex */}
        <div className="flex flex-col h-full w-full bg-[#0a0a0c]">
          {/* 1. HEADER (Botão Fechar) */}
          <div className="flex items-center justify-end p-6 shrink-0 relative z-[110]">
            <DialogClose className="p-2 rounded-full bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </DialogClose>
          </div>

          {/* 2. CORPO (Scroll) */}
          {/* PROBLEMA 2: Adicionar padding bottom extra para garantir que o botão não fique sobreposto pela nav */}
          <div className="flex-1 overflow-y-auto px-6 pb-32 mb-20 overscroll-contain">
            {/* Título Visual */}
            {step === 'selection' && (
              <h2 className="text-3xl font-heading text-[#d4af37] text-center mt-4 mb-8">
                QUAL O FOCO DE HOJE?
              </h2>
            )}

            {/* RENDERIZAÇÃO DIRETA (Sem placeholders) */}
            {step === 'selection' ? (
              /* --- Grid de Templates --- */
              <div className="grid grid-cols-2 gap-4 pb-8">
                {/* Botão Criar do Zero */}
                <button
                  type="button"
                  onClick={handleCreateFromZero}
                  className="h-32 w-full flex flex-col items-center justify-center gap-3 bg-white/5 border border-dashed border-[#d4af37]/30 rounded-lg hover:bg-[#d4af37]/10 hover:border-[#d4af37] transition-all group"
                >
                  <Plus className="w-8 h-8 text-[#d4af37]/50 group-hover:text-[#d4af37]" strokeWidth={2} />
                  <span className="text-sm font-bold tracking-wide text-white/50 group-hover:text-white">DO ZERO</span>
                </button>

                {/* Lista de Templates */}
                {templates.map((template) => {
                  const TemplateIcon = iconMap[template.icon] || Stars
                  return (
                    <button
                      key={template.name}
                      type="button"
                      onClick={() => handleTemplateSelect(template)}
                      className="h-32 w-full flex flex-col items-center justify-center gap-3 bg-white/5 border border-[#d4af37]/10 rounded-lg hover:bg-[#d4af37]/10 hover:border-[#d4af37] transition-all group"
                    >
                      <TemplateIcon className="w-8 h-8 text-[#d4af37]" strokeWidth={2} />
                      <span className="text-sm font-bold tracking-wide text-white group-hover:text-white">
                        {template.name.toUpperCase()}
                      </span>
                    </button>
                  )
                })}
              </div>
            ) : (
              /* --- Inputs de Configuração --- */
              <div className="space-y-8">
                {/* Botão Voltar */}
                {!habitToEdit && (
                  <button
                    type="button"
                    onClick={() => setStep('selection')}
                    className="flex items-center gap-2 text-white/60 hover:text-white/90 transition-colors mb-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="text-sm font-heading uppercase tracking-wide">Voltar</span>
                  </button>
                )}

                {/* Input Nome */}
                <div className="flex items-center gap-3">
                  {(() => {
                    const IconComponent = iconMap[icon]
                    return IconComponent ? (
                      <div className="text-[#d4af37] shrink-0">
                        <IconComponent className="w-6 h-6" strokeWidth={2} />
                      </div>
                    ) : null
                  })()}
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="NOME DO HÁBITO"
                    className="h-16 text-2xl font-heading bg-transparent border-b border-white/10 rounded-none px-0 text-white placeholder:text-white/20 focus-visible:ring-0 focus-visible:outline-none focus:border-[#d4af37] flex-1"
                    autoFocus={step === 'config' && !habitToEdit}
                  />
                </div>
                {/* Meta de Tempo */}
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <Label className="text-lg font-heading tracking-widest text-[#d4af37]">META DE TEMPO?</Label>
                    <button
                      type="button"
                      onClick={() => setHasTimeGoal(!hasTimeGoal)}
                      className={cn(
                        'relative w-12 h-6 rounded-full transition-all duration-300',
                        hasTimeGoal ? 'bg-[#d4af37]' : 'bg-white/10'
                      )}
                    >
                      <div
                        className={cn(
                          'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-all duration-300',
                          hasTimeGoal ? 'translate-x-6' : 'translate-x-0'
                        )}
                      />
                    </button>
                  </div>
                  {hasTimeGoal && (
                    <div className="flex gap-4">
                      <Input
                        type="number"
                        value={timeMinutes || ''}
                        onChange={(e) => setTimeMinutes(e.target.value)}
                        placeholder="00"
                        className="h-14 text-center text-2xl bg-white/5 border-none text-white placeholder:text-white/50 flex-1 focus-visible:ring-0 focus-visible:outline-none"
                      />
                      <div className="flex gap-2 flex-1">
                        <button
                          type="button"
                          onClick={() => setTimeUnit('minutos')}
                          className={cn(
                            'flex-1 h-14 border transition-all duration-300 font-heading uppercase tracking-wide text-xs touch-manipulation cursor-pointer rounded-md',
                            timeUnit === 'minutos'
                              ? 'border-[#d4af37] bg-[#d4af37] text-black font-bold'
                              : 'border-[#d4af37]/30 bg-white/5 text-white hover:border-[#d4af37]/50'
                          )}
                        >
                          MIN
                        </button>
                        <button
                          type="button"
                          onClick={() => setTimeUnit('horas')}
                          className={cn(
                            'flex-1 h-14 border transition-all duration-300 font-heading uppercase tracking-wide text-xs touch-manipulation cursor-pointer rounded-md',
                            timeUnit === 'horas'
                              ? 'border-[#d4af37] bg-[#d4af37] text-black font-bold'
                              : 'border-[#d4af37]/30 bg-white/5 text-white hover:border-[#d4af37]/50'
                          )}
                        >
                          HRS
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Lembrete */}
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <Label className="text-lg font-heading tracking-widest text-[#d4af37]">LEMBRETE</Label>
                    <button
                      type="button"
                      onClick={() => setReminderEnabled(!reminderEnabled)}
                      className={cn(
                        'relative w-12 h-6 rounded-full transition-all duration-300',
                        reminderEnabled ? 'bg-[#d4af37]' : 'bg-white/10'
                      )}
                    >
                      <div
                        className={cn(
                          'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-all duration-300',
                          reminderEnabled ? 'translate-x-6' : 'translate-x-0'
                        )}
                      />
                    </button>
                  </div>
                  {reminderEnabled && (
                    <Input
                      type="time"
                      value={reminder}
                      onChange={(e) => setReminder(e.target.value)}
                      className="h-14 bg-white/5 border-none text-white text-lg font-heading focus-visible:ring-0 focus-visible:outline-none"
                    />
                  )}
                </div>

                {/* Frequência */}
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <Label className="text-lg font-heading tracking-widest text-[#d4af37]">FREQUÊNCIA</Label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setFrequency(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'])}
                      className="px-5 py-3 rounded-full border border-[#d4af37]/30 text-xs font-bold text-white hover:bg-[#d4af37]/10 transition-all"
                    >
                      TODOS
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const today = new Date().getDay()
                        const dayMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
                        setFrequency([dayMap[today]])
                      }}
                      className="px-5 py-3 rounded-full border border-[#d4af37]/30 text-xs font-bold text-white hover:bg-[#d4af37]/10 transition-all"
                    >
                      HOJE
                    </button>
                  </div>
                  {/* Dias (Bolinhas) */}
                  <div className="flex justify-between gap-1 mt-4">
                    {[
                      { id: 'sun', l: 'D' },
                      { id: 'mon', l: 'S' },
                      { id: 'tue', l: 'T' },
                      { id: 'wed', l: 'Q' },
                      { id: 'thu', l: 'Q' },
                      { id: 'fri', l: 'S' },
                      { id: 'sat', l: 'S' },
                    ].map((d) => {
                      const isActive = frequency.includes(d.id)
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => {
                            if (isActive) {
                              const newFrequency = frequency.filter((x) => x !== d.id)
                              if (newFrequency.length === 0) {
                                alert('Um hábito precisa de pelo menos um dia para existir.')
                                return
                              }
                              setFrequency(newFrequency)
                            } else {
                              setFrequency([...frequency, d.id])
                            }
                          }}
                          className={cn(
                            'w-11 h-11 rounded-full flex items-center justify-center text-lg font-bold transition-all',
                            isActive
                              ? 'bg-[#d4af37] text-black'
                              : 'border border-[#d4af37]/20 text-white/70 hover:border-[#d4af37]/40'
                          )}
                        >
                          {d.l}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. RODAPÉ (Botão Criar) */}
          {step === 'config' && (
            <div className="p-6 mt-auto border-t border-white/5 bg-[#0a0a0c] relative z-[110] shrink-0 safe-area-inset-bottom">
              <Button
                onClick={handleCreate}
                disabled={creating || !title.trim()}
                type="button"
                className={cn(
                  "w-full bg-[#d4af37] text-black font-bold hover:bg-[#E5C06E]",
                  "h-14 text-xl disabled:opacity-70 disabled:cursor-not-allowed",
                  "transition-all duration-200 flex items-center justify-center gap-2",
                  "touch-manipulation active:scale-[0.98]"
                )}
              >
                {creating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{habitToEdit ? 'Salvando...' : 'Criando...'}</span>
                  </>
                ) : (
                  <span>{habitToEdit ? 'SALVAR' : 'CRIAR'}</span>
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
