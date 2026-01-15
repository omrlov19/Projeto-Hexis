'use client'

import { useState, useEffect } from 'react'
import { createHabit, updateHabit } from '@/app/actions/habits'
import type { Habit } from '@/types/hexis'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  // AÇÃO 2: Estado do ícone restaurado
  const [icon, setIcon] = useState('sparkles')
  const [title, setTitle] = useState('')
  const [goalType, setGoalType] = useState<'check' | 'time'>('check')
  const [timeMinutes, setTimeMinutes] = useState<string>('30')
  const [timeUnit, setTimeUnit] = useState<'minutos' | 'horas'>('minutos')
  // AÇÃO 2: Estado de Lembrete
  const [reminderEnabled, setReminderEnabled] = useState(false)
  const [reminder, setReminder] = useState<string>('09:00')
  const [creating, setCreating] = useState(false)

  // Preencher formulário quando habitToEdit mudar
  useEffect(() => {
    if (habitToEdit) {
      setTitle(habitToEdit.title || '')
      setIcon(habitToEdit.icon || 'sparkles')
      setGoalType(habitToEdit.goal_type || 'check')
      
      // Se for tipo "time", preencher com target_value e target_unit
      if (habitToEdit.goal_type === 'time' && habitToEdit.target_value) {
        const value = habitToEdit.target_value
        const unit = habitToEdit.target_unit || 'minutos'
        
        if (unit === 'horas') {
          setTimeMinutes(value.toString())
          setTimeUnit('horas')
        } else {
          setTimeMinutes(value.toString())
          setTimeUnit('minutos')
        }
      }
    } else {
      // Reset ao abrir modal de criação
      setIcon('sparkles')
    }
  }, [habitToEdit, open])


  const handleCreate = async () => {
    if (!title.trim()) return

    // AÇÃO 1: Forçar ícone padrão e todos os dias
    // AÇÃO 2: Incluir lembrete se ativado
    const finalTargetValue = goalType === 'time' 
      ? parseInt(timeMinutes) 
      : undefined

    const finalTargetUnit = goalType === 'time' 
      ? timeUnit 
      : undefined

    // AÇÃO 4: Envio (Salvar) - Usar estado icon atual
    // AÇÃO 2: Incluir notification_time se lembrete estiver ativado
    const habitData = {
      title: title.trim(),
      icon: icon || 'sparkles', // AÇÃO 4: Se não escolheu template, usa 'sparkles' como padrão
      color: '#d4af37', // Ouro Veneziano
      target_value: finalTargetValue,
      target_unit: finalTargetUnit,
      goal_type: goalType,
      frequency_days: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'], // Todos os dias
      notification_time: reminderEnabled ? reminder : undefined, // AÇÃO 2: Lembrete
    }

    if (habitToEdit) {
      // Modo Edição (não usa optimistic create)
      setCreating(true)
      const result = await updateHabit(habitToEdit.id, habitData)
      setCreating(false)

      if (result.success) {
        resetForm()
        onOpenChange(false)
        onSuccess()
      }
    } else {
      // Modo Criação - Optimistic Create com Silent ID Swap
      
      // 1. Otimismo (Aparece na hora)
      let tempId: string | undefined
      if (onOptimisticCreate) {
        tempId = onOptimisticCreate(habitData)
      }

      // 2. Fecha o modal IMEDIATAMENTE (Aparece que acabou)
      resetForm()
      onOpenChange(false)

      // 3. Background (O usuário não sente mais o peso)
      // NÃO use 'await' bloqueante para fechar o modal. Deixe rodar.
      setCreating(true)
      createHabit(habitData)
        .then((result) => {
          if (result.success && result.data && tempId && onReplaceHabit) {
            // 4. A Troca Silenciosa (O ID falso vira real)
            onReplaceHabit(tempId, result.data)
          } else if (result.success) {
            // Fallback: se não tiver onReplaceHabit, usa onSuccess (recarrega)
            onSuccess()
          } else {
            // Erro - poderia reverter o estado otimista aqui
            console.error('Erro ao criar hábito:', result.error)
            // TODO: Reverter estado otimista em caso de erro
          }
        })
        .catch((error) => {
          console.error('Erro ao criar hábito:', error)
          // TODO: Reverter estado otimista em caso de erro
        })
        .finally(() => {
          setCreating(false)
        })
    }
  }

  const resetForm = () => {
    setTitle('')
    setIcon('sparkles')
    setGoalType('check')
    setTimeMinutes('30')
    setTimeUnit('minutos')
    setReminderEnabled(false)
    setReminder('09:00')
  }

  // Função para aplicar template
  const handleTemplateSelect = (template: { name: string; icon: string }) => {
    setTitle(template.name)
    setIcon(template.icon) // AÇÃO 3: Atualiza o estado icon com o ícone do template
  }

  const handleClose = (open: boolean) => {
    if (!open) {
      resetForm()
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      {/* AÇÃO 1: Estética do Dialog (Container) */}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0a0a0c]/95 backdrop-blur-xl border border-[#d4af37]/20 shadow-[0_0_50px_-10px_rgba(0,0,0,0.8)] text-foreground">
        <DialogHeader>
          {/* AÇÃO 4: Título - "NOVO RITUAL" */}
          <DialogTitle className="text-[#d4af37] font-heading uppercase tracking-widest text-xl text-center">
            {habitToEdit ? 'EDITAR RITUAL' : 'NOVO RITUAL'}
          </DialogTitle>
        </DialogHeader>

        {/* AÇÃO 4: Formulário Simplificado */}
        <div className="space-y-6 py-4">
            {/* AÇÃO 3: UI da Galeria (Grid Dourado) - Logo ABAIXO do título e ACIMA do input */}
            {!habitToEdit && (
              <div className="space-y-2">
                <div className="flex overflow-x-auto gap-2 pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {templates.map((template) => {
                    const IconComponent = iconMap[template.icon] || Stars
                    const isSelected = icon === template.icon && title === template.name
                    return (
                      <button
                        key={template.name}
                        type="button"
                        onClick={() => handleTemplateSelect(template)}
                        className={cn(
                          // AÇÃO 5: Design System Onyx/Gold
                          'flex flex-col items-center justify-center gap-1 p-3 border transition-all duration-300 cursor-pointer flex-shrink-0 min-w-[80px]',
                          // AÇÃO 3: Estilo do Card do Template
                          'bg-white/5 border-[#d4af37]/20 hover:bg-[#d4af37]/20 hover:border-[#d4af37]',
                          isSelected && 'bg-[#d4af37]/20 border-[#d4af37]'
                        )}
                      >
                        {/* AÇÃO 5: Ícones sempre #d4af37 */}
                        <IconComponent 
                          className="w-5 h-5 text-[#d4af37] transition-colors" 
                          strokeWidth={2}
                        />
                        {/* AÇÃO 3: Nome (Pequeno, Branco) */}
                        <span className="text-xs font-heading uppercase tracking-wide text-center text-white/90">
                          {template.name}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* AÇÃO 2: Título - Inputs (Inscrições) */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-white/90 font-heading uppercase tracking-wide text-sm">Nome do Hábito</Label>
              <div className="flex items-center gap-3">
                {/* AÇÃO 5: Preview do ícone sempre dourado */}
                {iconMap[icon] && (
                  <div className="text-[#d4af37]">
                    {(() => {
                      const IconComponent = iconMap[icon]
                      return <IconComponent className="w-5 h-5" strokeWidth={2} />
                    })()}
                  </div>
                )}
                <Input
                  id="title"
                  placeholder="Ex: Beber água"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  autoFocus
                  className="flex-1 bg-transparent border-0 border-b border-white/10 focus:border-b focus:border-[#d4af37] rounded-none text-white/90 text-lg placeholder:text-white/20 font-body focus-visible:ring-0 focus-visible:outline-none"
                />
              </div>
            </div>

            {/* Tipo de Meta - Estética Dourada */}
            <div className="space-y-2">
              <Label className="text-white/90 font-heading uppercase tracking-wide text-sm">Tipo de Meta</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setGoalType('check')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 p-3 border transition-all duration-300 font-heading uppercase tracking-wide text-sm',
                    goalType === 'check'
                      ? 'border-[#d4af37] bg-[#d4af37] text-black font-bold'
                      : 'border-[#d4af37]/30 bg-transparent text-white/60 hover:border-[#d4af37]/50 hover:text-white/90'
                  )}
                >
                  <Check className="w-4 h-4" />
                  <span>Check</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGoalType('time')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 p-3 border transition-all duration-300 font-heading uppercase tracking-wide text-sm',
                    goalType === 'time'
                      ? 'border-[#d4af37] bg-[#d4af37] text-black font-bold'
                      : 'border-[#d4af37]/30 bg-transparent text-white/60 hover:border-[#d4af37]/50 hover:text-white/90'
                  )}
                >
                  <Clock className="w-4 h-4" />
                  <span>Tempo</span>
                </button>
              </div>
            </div>

            {/* Meta Diária ou Tempo */}
            {goalType === 'time' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="timeMinutes" className="text-white/90 font-heading uppercase tracking-wide text-sm">Tempo</Label>
                  <Input
                    id="timeMinutes"
                    type="number"
                    min="1"
                    placeholder="30"
                    value={timeMinutes}
                    onChange={(e) => setTimeMinutes(e.target.value)}
                    className="bg-transparent border-0 border-b border-white/10 focus:border-b focus:border-[#d4af37] rounded-none text-white/90 text-lg placeholder:text-white/20 font-body focus-visible:ring-0 focus-visible:outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/90 font-heading uppercase tracking-wide text-sm">Unidade</Label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setTimeUnit('minutos')}
                      className={cn(
                        'flex-1 p-3 border transition-all duration-300 font-heading uppercase tracking-wide text-sm',
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
                        'flex-1 p-3 border transition-all duration-300 font-heading uppercase tracking-wide text-sm',
                        timeUnit === 'horas'
                          ? 'border-[#d4af37] bg-[#d4af37] text-black font-bold'
                          : 'border-[#d4af37]/30 bg-transparent text-white/60 hover:border-[#d4af37]/50 hover:text-white/90'
                      )}
                    >
                      HORAS
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* AÇÃO 2: Lembrete */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
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
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-[#d4af37]" strokeWidth={2} />
                  <Label className="text-white/90 font-heading uppercase tracking-wide text-sm cursor-pointer">
                    Ativar Lembrete
                  </Label>
                </div>
              </div>
              
              {reminderEnabled && (
                <div className="pl-16">
                  <Input
                    type="time"
                    value={reminder}
                    onChange={(e) => setReminder(e.target.value)}
                    className="bg-transparent border-0 border-b border-[#d4af37]/30 text-[#d4af37] text-2xl font-heading focus:border-[#d4af37] rounded-none focus-visible:ring-0 focus-visible:outline-none"
                  />
                </div>
              )}
            </div>
          </div>

        {/* AÇÃO 4: Botões - Simplificados */}
        <DialogFooter className="border-t border-white/10">
          <button
            onClick={() => handleClose(false)}
            disabled={creating}
            className="px-6 py-2 text-white/60 hover:text-white/90 transition-all duration-300 font-heading uppercase tracking-widest text-sm disabled:opacity-30"
          >
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            disabled={creating || !title.trim()}
            className="px-6 py-2 bg-[#d4af37] text-black font-bold hover:shadow-[0_0_20px_rgba(212,175,55,0.6)] transition-all duration-300 font-heading uppercase tracking-widest text-sm disabled:opacity-30"
          >
            {creating 
              ? (habitToEdit ? 'Salvando...' : 'Criando...') 
              : (habitToEdit ? 'Salvar Alterações' : 'ASSINAR')}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
