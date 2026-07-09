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
import { IconHotbar } from './IconHotbar'
import { TimePickerHotbar } from '@/components/ui/TimePickerHotbar'
import { DurationPickerHotbar } from '@/components/ui/DurationPickerHotbar'
import { IconPickerPopover } from '@/components/ui/IconPickerPopover'
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
  ChevronUp,
  ChevronDown,
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

// Dias válidos para frequência (evita lixo do banco: text//text..., objetos, etc.)
const VALID_DAY_IDS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
const VALID_DAY_NUMS = ['0', '1', '2', '3', '4', '5', '6'] as const

function sanitizeFrequencyDays(raw: unknown): string[] {
  if (!Array.isArray(raw) || raw.length === 0) return [...VALID_DAY_IDS]
  const out: string[] = []
  for (const item of raw.slice(0, 7)) {
    const s = typeof item === 'string' ? item.trim().toLowerCase() : String(item ?? '').trim().toLowerCase()
    if (!s) continue
    if (VALID_DAY_IDS.includes(s as typeof VALID_DAY_IDS[number])) {
      out.push(s)
    } else if (VALID_DAY_NUMS.includes(s as typeof VALID_DAY_NUMS[number])) {
      out.push(VALID_DAY_IDS[Number(s)])
    }
  }
  return out.length > 0 ? [...new Set(out)] : [...VALID_DAY_IDS]
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
  // AÇÃO 2: Estado de Agenda (Planner)
  const [agendaEnabled, setAgendaEnabled] = useState(false)
  const [agendaStart, setAgendaStart] = useState<string>('09:00')
  const [agendaEnd, setAgendaEnd] = useState<string>('10:00')
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
        
        // AÇÃO 1: Carregar frequência do hábito editado (sanitizar para evitar lixo do banco)
        setFrequency(sanitizeFrequencyDays(habitToEdit.frequency_days))
        
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
        
        // Carregar agenda se existir
        if (habitToEdit.notification_time) {
          setAgendaEnabled(true)
          if (habitToEdit.notification_time.includes(' - ')) {
            const [start, end] = habitToEdit.notification_time.split(' - ')
            setAgendaStart(start || '09:00')
            setAgendaEnd(end || '10:00')
          } else {
            // Compatibilidade com lembrete antigo
            setAgendaStart(habitToEdit.notification_time)
            setAgendaEnd(habitToEdit.notification_time)
          }
        } else {
          setAgendaEnabled(false)
          setAgendaStart('09:00')
          setAgendaEnd('10:00')
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
      
      // 4. Se o usuário não selecionou dias (array vazio), a frequência será enviada como vazio 
      // Isso indica para o backend que o hábito é diário.
      // Se tiver selecionado dias, mapeamos e validamos.
      if (frequency.length > 0) {
        const sanitized = sanitizeFrequencyDays(frequency)
        finalFrequency = sanitized.map(d => {
          const dayStr = String(d).toLowerCase()
          const num = dayMap[dayStr]
          if (num !== undefined) return num
          const parsed = Number(d)
          // Usamos -1 para valores inválidos e os filtramos fora
          return (isNaN(parsed) || parsed < 0 || parsed > 6) ? -1 : Math.floor(parsed)
        }).filter(num => num !== -1)
      } else {
        finalFrequency = [] // Enviar vazio para ser diário
      }
      
      // 5. Remover duplicatas, garantir inteiros e ordenar (se houver dias selecionados)
      if (finalFrequency.length > 0) {
        finalFrequency = [...new Set(finalFrequency)]
          .map(d => Number(Math.floor(d))) // Forçar inteiros
          .filter(d => d >= 0 && d <= 6) // Validar range 0-6
          .sort((a, b) => a - b)
      }
      
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
        notification_time: agendaEnabled ? `${agendaStart} - ${agendaEnd}` : undefined, // AÇÃO 2: Agenda (Planner)
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
    setAgendaEnabled(false)
    setAgendaStart('09:00')
    setAgendaEnd('10:00')
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
    setAgendaEnabled(false)
    setAgendaStart('09:00')
    setAgendaEnd('10:00')
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
        className="fixed z-[9999] gap-0 p-0 shadow-lg bg-[#0a0a0c] border-none w-[100vw] h-[100dvh] max-w-none !top-0 !left-0 !translate-x-0 !translate-y-0 !m-0 data-[state=open]:!slide-in-from-bottom-full duration-200 sm:!top-[50%] sm:!left-[50%] sm:!translate-x-[-50%] sm:!translate-y-[-50%] sm:w-full sm:max-w-2xl sm:h-auto sm:max-h-[85vh] sm:rounded-xl sm:border sm:border-white/10 flex flex-col [&>button]:hidden overflow-hidden"
      >
        {/* Acessibilidade: Título Obrigatório (Invisível) */}
        <DialogTitle className="sr-only">Criar Novo Hábito</DialogTitle>

        {/* Container Principal: Estrutura Flex */}
        <div className="flex flex-col h-full w-full bg-[#0a0a0c] overflow-hidden">
          {/* 1. HEADER (Botão Fechar) */}
          <div className="flex items-center justify-end p-6 shrink-0 relative z-[110]">
            <DialogClose className="p-2 rounded-full bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </DialogClose>
          </div>

          {/* 2. CORPO (Scroll) */}
          <div className="flex-1 overflow-y-auto px-6 pb-8 overscroll-contain custom-scrollbar">
            {/* Título Visual */}
            {step === 'selection' && (
              <h2 className="text-3xl font-heading text-[#d4af37] text-center mt-4 mb-8">
                QUAL O FOCO DE HOJE?
              </h2>
            )}

            {/* RENDERIZAÇÃO DIRETA (Sem placeholders) */}
            {step === 'selection' ? (
              /* --- Grid de Templates --- */
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pb-8">
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
                <div className="flex items-center gap-3 w-full">
                  <IconPickerPopover 
                    iconMap={iconMap}
                    selectedIcon={icon}
                    onSelect={setIcon}
                    className="shrink-0"
                  />
                  <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl flex items-center px-4 h-16 focus-within:border-[#d4af37] focus-within:ring-1 focus-within:ring-[#d4af37] transition-all">
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="NOME DO HÁBITO"
                      className="text-xl sm:text-2xl font-heading bg-transparent border-none rounded-none px-0 text-white placeholder:text-white/20 focus-visible:ring-0 focus-visible:outline-none flex-1"
                      autoFocus={step === 'config' && !habitToEdit}
                    />
                  </div>
                </div>
                {/* Meta de Tempo */}
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <Label className="text-lg font-heading tracking-widest text-[#d4af37]">META DE TEMPO</Label>
                    <button
                      type="button"
                      onClick={() => setHasTimeGoal(!hasTimeGoal)}
                      className={cn(
                        'w-7 h-7 flex items-center justify-center rounded-md border-2 transition-all duration-300',
                        hasTimeGoal
                          ? 'bg-[#d4af37] border-[#d4af37]'
                          : 'bg-transparent border-white/20 hover:border-white/40'
                      )}
                    >
                      {hasTimeGoal && <Check className="w-4 h-4 text-black" strokeWidth={3} />}
                    </button>
                  </div>
                  {hasTimeGoal && (
                    <div className="flex w-full mt-2 animate-in slide-in-from-top-2 fade-in duration-200">
                      <DurationPickerHotbar
                        value={Number(timeMinutes || 0)}
                        unit={timeUnit}
                        onChange={(val, newUnit) => {
                          setTimeMinutes(String(val))
                          setTimeUnit(newUnit)
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Agenda */}
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <Label className="text-lg font-heading tracking-widest text-[#d4af37]">AGENDA (PLANNER)</Label>
                    <button
                      type="button"
                      onClick={() => setAgendaEnabled(!agendaEnabled)}
                      className={cn(
                        'w-7 h-7 flex items-center justify-center rounded-md border-2 transition-all duration-300',
                        agendaEnabled
                          ? 'bg-[#d4af37] border-[#d4af37]'
                          : 'bg-transparent border-white/20 hover:border-white/40'
                      )}
                    >
                      {agendaEnabled && <Check className="w-4 h-4 text-black" strokeWidth={3} />}
                    </button>
                  </div>
                  {agendaEnabled && (
                    <div className="flex gap-4 items-center">
                      <div className="flex-1">
                        <Label className="text-xs text-zinc-400 mb-1 block">Início</Label>
                        <TimePickerHotbar
                          value={agendaStart}
                          onChange={setAgendaStart}
                          className="bg-white/5 border-none"
                        />
                      </div>
                      <div className="flex-1">
                        <Label className="text-xs text-zinc-400 mb-1 block">Fim</Label>
                        <TimePickerHotbar
                          value={agendaEnd}
                          onChange={setAgendaEnd}
                          className="bg-white/5 border-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Frequência */}
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <Label className="text-lg font-heading tracking-widest text-[#d4af37]">FREQUÊNCIA</Label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setFrequency([...VALID_DAY_IDS])}
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
