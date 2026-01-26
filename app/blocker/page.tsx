'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { 
  Shield, 
  X, 
  Eye, 
  EyeOff, 
  Waves, 
  Play, 
  Clock,
  Camera,
  Video,
  MessageCircle,
  Youtube,
  CheckCircle2,
  Trophy,
  Pause
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { getHabits } from '@/app/actions/habits'
import { HABITS_CHANGED_EVENT } from '@/lib/habits-events'
import type { HabitWithStatus } from '@/types/hexis'
import { iconMap } from '@/components/habits/CreateHabitDialog'
import type { LucideIcon } from 'lucide-react'
import { getBrasiliaDate, formatBrasiliaDate } from '@/lib/date'
import { useWakeLock } from '@/hooks/useWakeLock'
import { useFocus } from '@/contexts/FocusContext'

// Lista mockada de apps/distrações
const apps = [
  { id: 'ig', name: 'Instagram', icon: Camera },
  { id: 'tk', name: 'TikTok', icon: Video },
  { id: 'x', name: 'X / Twitter', icon: MessageCircle },
  { id: 'yt', name: 'YouTube', icon: Youtube },
  { id: 'wa', name: 'WhatsApp', icon: MessageCircle },
]

// Duração padrão: 25 minutos em segundos
const DEFAULT_DURATION = 25 * 60 // 1500 segundos
const MAX_BACKGROUND_TIME = 15000 // 15 segundos em milissegundos

type FocusStatus = 'idle' | 'running' | 'failed' | 'completed'

// AÇÃO: Tipo para controle unificado de fase da sessão
type SessionPhase = 'IDLE' | 'RUNNING' | 'SUCCESS'

// Opções de tempo (5 a 60 minutos, intervalos de 5)
const TIME_OPTIONS = Array.from({ length: 12 }, (_, i) => (i + 1) * 5) // [5, 10, 15, ..., 60]

export default function BlockerPage() {
  // AÇÃO: Usar contexto global do timer
  const {
    phase,
    timeLeft,
    startTime,
    endTime,
    isPaused,
    startFocus,
    stopFocus,
    resetFocus,
    getProgress,
    togglePause,
  } = useFocus()
  
  // Estado para apps selecionados
  const [selectedApps, setSelectedApps] = useState<string[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  
  // Estados do Modo Hardcore (Máquina de Estados)
  const [status, setStatus] = useState<FocusStatus>('idle')
  const [lastBackgroundTime, setLastBackgroundTime] = useState<number | null>(null)
  const [isScreenOff, setIsScreenOff] = useState(false)
  const [isTimeSelectorOpen, setIsTimeSelectorOpen] = useState(false)
  const [isWarningDialogOpen, setIsWarningDialogOpen] = useState(false)
  const [showGiveUpModal, setShowGiveUpModal] = useState(false)
  const [selectedDuration, setSelectedDuration] = useState(25) // minutos
  const timeSelectorRef = useRef<HTMLDivElement | null>(null)
  
  // AÇÃO 2: Integrar WakeLock Hook
  const { requestLock, releaseLock } = useWakeLock()
  
  // Estados para hábitos (todos os hábitos do dia)
  const [allHabits, setAllHabits] = useState<HabitWithStatus[]>([])
  // AÇÃO 1: Removido loadingHabits - não precisamos de loading artificial
  // O foco é calculado instantaneamente baseado em allHabits

  // AÇÃO 2: Derivação Direta (Sem Efeitos) - Filtro de hábitos pendentes
  // O foco é calculado na hora, sem esperar nada
  const pendingMissions = useMemo(() => {
    if (!allHabits || allHabits.length === 0) return []
    // Filtro Inteligente: Apenas hábitos não concluídos para hoje
    // Pega os não feitos, respeitando a ordem visual
    return allHabits.filter(h => !h.completed)
  }, [allHabits]) // Só muda se a lista local mudar

  // Função para formatar tempo MM:SS
  // Formata tempo: H:MM:SS se h > 0, senão MM:SS (minutos e segundos com 2 dígitos)
  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    const pad = (n: number) => String(n).padStart(2, '0')

    if (h > 0) {
      return `${String(h).padStart(2, '0')}:${pad(m)}:${pad(s)}`
    }
    return `${pad(m)}:${pad(s)}`
  }

  // AÇÃO: Detectar quando o timer termina (SUCCESS) e liberar WakeLock
  useEffect(() => {
    if (phase === 'SUCCESS') {
      releaseLock()
      setIsScreenOff(false)
      setStatus('completed')
    }
  }, [phase, releaseLock])

  // Centralizar item selecionado no seletor de tempo ao abrir
  useEffect(() => {
    if (isTimeSelectorOpen && timeSelectorRef.current) {
      const selectedIndex = TIME_OPTIONS.indexOf(selectedDuration)
      if (selectedIndex >= 0) {
        setTimeout(() => {
          // Pula o padding superior (índice 0) e vai para o item (índice + 1)
          const item = timeSelectorRef.current?.children[selectedIndex + 1] as HTMLElement
          if (item) {
            item.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }, 200)
      }
    }
  }, [isTimeSelectorOpen, selectedDuration])

  // O "Juiz": Background Detection com Penalização
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (phase !== 'RUNNING') return

      if (document.hidden) {
        // Usuário saiu: Salva timestamp
        setLastBackgroundTime(Date.now())
      } else {
        // Usuário voltou: Calcula delta e penaliza
        if (lastBackgroundTime !== null && endTime) {
          const delta = Date.now() - lastBackgroundTime
          
          // Ajusta o endTime para descontar o tempo que ficou fora
          // Nota: Como endTime está no contexto, precisamos recalcular via startFocus
          // Mas como não temos acesso direto ao setEndTime, vamos usar stopFocus e reiniciar
          // Alternativamente, podemos apenas verificar se passou do limite e falhar
          
          // A Regra: Se ficou mais de 15 segundos fora -> FALHA
          if (delta > MAX_BACKGROUND_TIME) {
            setStatus('failed')
            stopFocus() // AÇÃO: Usar contexto global para parar
            releaseLock() // AÇÃO 2: Liberar WakeLock em caso de falha
            alert('Sessão abortada. Você abandonou o posto.')
          }
          
          setLastBackgroundTime(null)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [phase, lastBackgroundTime, endTime, releaseLock, stopFocus])

  // Funções de controle
  const handleOpenTimeSelector = () => {
    setIsTimeSelectorOpen(true)
  }

  const handleConfirmTime = () => {
    setIsTimeSelectorOpen(false)
    setIsWarningDialogOpen(true)
  }

  // 1-Click Setup: Iniciar foco a partir de um hábito
  // AÇÃO 1: Respeito Absoluto à Meta — AÇÃO 2: Fallback apenas se nulo
  const handleStartFromHabit = (habit: HabitWithStatus) => {
    // Rolagem automática para o topo: Timer e INICIAR no campo de visão
    window.scrollTo({ top: 0, behavior: 'smooth' })

    const hasTarget = habit.goal_type === 'time' && habit.target_value != null && habit.target_value > 0

    if (hasTarget && habit.target_unit) {
      // Conversão: target_value + target_unit → minutos (|| 0 para segurança de tipo)
      const value = habit.target_value || 0
      let durationInMinutes = value
      const unit = String(habit.target_unit).toLowerCase()
      if (unit === 'horas' || unit === 'hrs' || unit === 'hours') {
        durationInMinutes = value * 60
      }
      // Se 'minutos', 'min', etc.: usa value direto

      // Apenas arredondar para inteiro (evitar float); sem clamp
      durationInMinutes = Math.round(durationInMinutes)

      // Define a duração exata e abre o modal de aviso
      setSelectedDuration(durationInMinutes)
      setIsWarningDialogOpen(true)
    } else {
      // AÇÃO 2: Fallback: sem target_value (null ou 0) → abre seletor (valor padrão 25 min)
      setIsTimeSelectorOpen(true)
    }
  }

  const handleAcceptChallenge = async () => {
    setIsWarningDialogOpen(false)
    
    // AÇÃO 2: Ativar WakeLock quando o Foco INICIAR
    await requestLock()

    // Inicia o timer usando o contexto global
    const durationSeconds = selectedDuration * 60
    startFocus(durationSeconds) // AÇÃO: Usar contexto global
    setStatus('running')
    setLastBackgroundTime(null)
    setIsScreenOff(false)
  }

  const handleGiveUp = () => {
    setShowGiveUpModal(true) // AÇÃO 2: Abrir modal de confirmação ao invés de desistir imediatamente
  }

  const handleConfirmGiveUp = () => {
    setStatus('failed')
    stopFocus() // AÇÃO: Usar contexto global para parar
    releaseLock() // AÇÃO 2: Liberar WakeLock quando desistir
    setShowGiveUpModal(false) // Fechar modal após confirmar
  }

  const handleRetry = () => {
    setStatus('idle')
    resetFocus() // AÇÃO: Usar contexto global para resetar
    setLastBackgroundTime(null)
    setIsScreenOff(false)
    releaseLock() // AÇÃO 2: Garantir que WakeLock seja liberado ao resetar
  }

  // AÇÃO: Função para encerrar sessão e resetar estado (Instantânea, sem reload)
  const handleEndSession = () => {
    // Resetar todos os estados para fase IDLE usando contexto global
    resetFocus()
    setStatus('idle')
    setIsScreenOff(false)
    setLastBackgroundTime(null)
    // selectedDuration pode manter o valor atual (útil para próxima sessão)
  }

  const handleToggleScreen = () => {
    setIsScreenOff((prev) => !prev)
  }

  // Função para toggle de app
  const toggleApp = (appId: string) => {
    setSelectedApps((prev) =>
      prev.includes(appId)
        ? prev.filter((id) => id !== appId)
        : [...prev, appId]
    )
  }

  // Buscar hábitos do dia atual (Event-Driven Refresh)
  // AÇÃO: Sincronização Inteligente - Só recarrega quando há mudanças (create/delete)
  useEffect(() => {
    let isMounted = true // Flag para prevenir atualizações após desmontagem
    
    const loadHabits = async () => {
      if (!isMounted) return // Não executar se componente foi desmontado
      
      try {
        const todayBrasilia = getBrasiliaDate()
        const dateString = formatBrasiliaDate(todayBrasilia)
        const result = await getHabits(dateString)
        
        if (!isMounted) return // Verificar novamente após async
        
        if (result.success && result.data) {
          // CORREÇÃO: Só atualizar se os dados realmente mudaram
          // Comparar IDs para evitar re-renders desnecessários
          setAllHabits((prev) => {
            const prevIds = new Set(prev.map(h => h.id))
            const newIds = new Set(result.data!.map(h => h.id))
            
            // Se os IDs são iguais, não atualizar (evita re-render)
            if (prevIds.size === newIds.size && 
                [...prevIds].every(id => newIds.has(id))) {
              return prev
            }
            
            // Armazena TODOS os hábitos (o filtro é feito no useMemo)
            return result.data!
          })
        }
      } catch (error) {
        console.error('Erro ao carregar hábitos:', error)
      }
    }
    
    // Carregar imediatamente na montagem
    loadHabits()
    
    // AÇÃO: Escutar eventos de mudança de hábitos (Event-Driven)
    const handleHabitsChanged = () => {
      if (isMounted) {
        loadHabits()
      }
    }
    
    // Registrar listener para eventos de mudança
    window.addEventListener(HABITS_CHANGED_EVENT, handleHabitsChanged)
    
    return () => {
      isMounted = false // Marcar como desmontado
      window.removeEventListener(HABITS_CHANGED_EVENT, handleHabitsChanged)
    }
  }, []) // Array vazio: só executa no mount

  // Desabilitar scroll do body quando o seletor estiver aberto
  useEffect(() => {
    if (isTimeSelectorOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isTimeSelectorOpen])

  return (
    <div className="min-h-screen bg-black text-white pb-32 overflow-x-hidden">
      {/* Header */}
      <header className="flex justify-center items-center pt-10 pb-6 px-6">
        <h1 className="text-4xl font-heading uppercase tracking-widest text-[#d4af37]">
          FOCUS
        </h1>
      </header>

      {/* Seção Principal de Foco */}
      <section className="mt-8">
        <div
          className={cn(
            'rounded-2xl p-6 mx-6 transition-all duration-300',
            status === 'failed'
              ? 'bg-red-950/20 border-2 border-red-900/50 shadow-[0_0_30px_rgba(185,28,28,0.4)]'
              : phase === 'RUNNING'
              ? 'bg-[#0a0a0c] border border-[#d4af37]/20 shadow-[0_0_30px_rgba(212,175,55,0.05)]'
              : 'bg-white/5 border border-white/10'
          )}
        >
          {status === 'failed' ? (
            // Estado de FRACASSO
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <X className="w-16 h-16 text-red-600 mb-4 drop-shadow-[0_0_15px_rgba(185,28,28,0.6)]" strokeWidth={2} />
              <h3 className="text-2xl font-heading uppercase tracking-[0.15em] text-red-600 mb-4">
                FRACASSO PESSOAL
              </h3>
              <div className="mb-8 max-w-md space-y-4">
                <p className="text-2xl text-zinc-200 font-body leading-relaxed">
                  Você falhou em se comprometer com você mesmo. Não existe negociação. Busque melhorar.
                </p>
                <p className="text-red-200 text-base font-body italic leading-relaxed mt-4">
                  O sonho sem disciplina não passa de fantasia.
                </p>
              </div>
              <button
                onClick={handleRetry}
                className="px-8 py-3 bg-[#d4af37] text-black font-heading uppercase tracking-widest text-sm hover:bg-[#d4af37]/90 transition-colors duration-300 rounded-lg"
              >
                TENTAR NOVAMENTE
              </button>
            </div>
          ) : phase === 'IDLE' ? (
            // AÇÃO 1: Fase IDLE — Renderizar apenas se phase === 'IDLE'
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <button
                onClick={handleOpenTimeSelector}
                className="px-12 py-5 bg-[#d4af37] text-black font-heading uppercase tracking-widest text-lg hover:bg-[#d4af37]/90 transition-colors duration-300 rounded-lg shadow-[0_0_20px_rgba(212,175,55,0.3)]"
              >
                INICIAR FOCO
              </button>
            </div>
          ) : phase === 'RUNNING' ? (
            // AÇÃO 2: Fase RUNNING — Renderizar apenas se phase === 'RUNNING' (O Bloqueador)
            <div className="flex flex-col items-center justify-center py-6">
              <div className="relative mb-6">
                <Shield className="w-16 h-16 text-[#d4af37] drop-shadow-[0_0_15px_rgba(212,175,55,0.5)]" strokeWidth={2} />
                <div className="absolute inset-0 rounded-full bg-[#d4af37]/20" />
              </div>
              
              {/* Timer Gigante */}
              <p className={cn(
                "text-7xl font-mono font-bold text-[#d4af37] mb-4 drop-shadow-[0_0_25px_rgba(212,175,55,0.6)] font-heading",
                isScreenOff && "text-[#d4af37]/20"
              )}>
                {formatTime(timeLeft)}
              </p>
              
              {/* Botão de Pausar/Retomar */}
              <button
                onClick={togglePause}
                className={cn(
                  "w-20 h-20 rounded-full border border-[#d4af37] bg-transparent hover:bg-[#d4af37]/10 active:scale-95 transition-all duration-300 flex items-center justify-center mb-4",
                  isScreenOff && "opacity-50"
                )}
              >
                {isPaused ? (
                  <Play className="w-8 h-8 text-[#d4af37]" strokeWidth={2} fill="currentColor" />
                ) : (
                  <Pause className="w-8 h-8 text-[#d4af37]" strokeWidth={2} />
                )}
              </button>
              
              {/* Texto Pulsante */}
              {!isScreenOff && (
                <>
                  <p className="text-sm font-heading uppercase tracking-widest text-[#d4af37]/80 mb-1">
                    MANTENHA A TELA LIGADA
                  </p>
                  <p className="text-lg text-red-400/90 font-semibold mt-1 mb-6">
                    (Não feche o Hexis)
                  </p>
                  
                  {/* Barra de Progresso */}
                  <div className="w-full max-w-xs h-2 bg-white/10 rounded-full overflow-hidden mb-6">
                    <div
                      className="h-full bg-gradient-to-r from-[#d4af37] to-[#d4af37]/70 transition-all duration-1000 ease-linear"
                      style={{ width: `${getProgress()}%` }}
                    />
                  </div>
                </>
              )}
              
              {/* Botão Ativar Flow / Desistir */}
              <div className="flex items-center gap-4">
                <button
                  onClick={handleToggleScreen}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/70 font-heading uppercase tracking-widest text-xs transition-colors duration-300 rounded-lg border border-white/10 flex items-center gap-2"
                >
                  {isScreenOff ? <Eye className="w-4 h-4" /> : <Waves className="w-4 h-4" />}
                  {isScreenOff ? 'DESATIVAR FLOW' : 'ATIVAR FLOW'}
                </button>
                <button
                  onClick={handleGiveUp}
                  className="px-4 py-2 border border-red-900/30 bg-red-900/10 text-red-500 hover:bg-red-900/20 active:scale-95 transition-all font-heading uppercase tracking-widest text-xs rounded-lg"
                >
                  DESISTIR
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {/* Seção: Cabeçalho Simplificado — Título Centralizado */}
      <section className="mt-8">
        <div className="relative py-10">
          {/* Container Flex Coluna: Título Centralizado */}
          <div className="flex flex-col items-center">
            <h2 className="font-heading text-2xl md:text-3xl uppercase tracking-widest text-[#d4af37] text-center whitespace-nowrap drop-shadow-[0_0_15px_rgba(212,175,55,0.4)] font-bold">
              ATIVE O &quot;FOCUS&quot; EM<br />SEUS HÁBITOS
            </h2>
          </div>
        </div>
        
        {/* AÇÃO 1: Removido loadingHabits - renderização direta baseada em pendingMissions */}
        {pendingMissions.length > 0 ? (
          <div className="flex flex-col gap-3 px-6">
            {pendingMissions.map((habit) => {
              const Icon = habit.icon ? (iconMap[habit.icon] as LucideIcon) : null
              const hasTimeGoal = habit.goal_type === 'time' && habit.target_value && habit.target_value > 0
              const timeDisplay = hasTimeGoal 
                ? (habit.target_unit === 'horas' || habit.target_unit === 'hrs')
                  ? `${habit.target_value} hrs`
                  : `${habit.target_value} min`
                : null

              return (
                <button
                  key={habit.id}
                  onClick={() => handleStartFromHabit(habit)}
                  className={cn(
                    'bg-[#0a0a0c] border border-white/10 rounded-xl p-4',
                    'flex items-center justify-between',
                    'hover:border-[#d4af37]/30 transition-colors duration-300',
                    'cursor-pointer touch-manipulation text-left',
                    'active:scale-[0.98]'
                  )}
                >
                  {/* Esquerda: Ícone + Nome */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {Icon ? (
                      <div className="flex-shrink-0">
                        <Icon className="w-5 h-5 text-[#d4af37]" strokeWidth={2} />
                      </div>
                    ) : (
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[#d4af37]/20 border border-[#d4af37]/30" />
                    )}
                    <span className="text-white font-heading uppercase tracking-wider text-sm truncate">
                      {habit.title}
                    </span>
                  </div>
                  
                  {/* Direita: Badge de Tempo ou Ícone Play */}
                  <div className="flex-shrink-0">
                    {timeDisplay ? (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#d4af37]/10 border border-[#d4af37]/30 rounded-lg">
                        <Clock className="w-3.5 h-3.5 text-[#d4af37]" strokeWidth={2} />
                        <span className="text-[#d4af37] text-xs font-mono font-bold">
                          {timeDisplay}
                        </span>
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                        <Play className="w-4 h-4 text-white/40" strokeWidth={2} fill="currentColor" />
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="px-6 py-8 text-center">
            <p className="text-white/40 text-sm font-body">
              Nenhum foco pendente. Todas as tarefas de hoje foram concluídas.
            </p>
          </div>
        )}
      </section>

      {/* Modal de Seleção de Apps */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-[#0a0a0c] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-heading uppercase tracking-widest text-[#d4af37]">
              A Lista Negra
            </DialogTitle>
            <DialogDescription className="text-white/60 text-sm mt-2">
              Selecione os apps que serão bloqueados durante seu Pacto de Foco.
              <br />
              <div className="mt-3 p-3 bg-red-950/20 border border-red-900/30 rounded-lg">
                <p className="text-xs text-red-400 font-bold uppercase tracking-wider mb-1">
                  ⚠️ COMPROMISSO INVOLÁVEL
                </p>
                <p className="text-xs text-white/70 leading-relaxed">
                  Selecionar estes apps firma um compromisso. Se você sair do Hexis por mais de <span className="text-[#d4af37] font-bold">15 segundos</span>, a sessão falha automaticamente.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 space-y-3 max-h-[400px] overflow-y-auto pr-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {apps.map((app) => {
              const Icon = app.icon
              const isSelected = selectedApps.includes(app.id)

              return (
                <div
                  key={app.id}
                  className={cn(
                    'flex items-center justify-between p-4 rounded-xl border transition-all duration-300',
                    isSelected
                      ? 'bg-white/5 border-[#d4af37]/50'
                      : 'bg-white/5 border-white/10 hover:border-white/20'
                  )}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className={cn(
                      'p-2 rounded-lg',
                      isSelected ? 'bg-[#d4af37]/20' : 'bg-white/5'
                    )}>
                      <Icon 
                        className={cn(
                          'w-5 h-5',
                          isSelected ? 'text-[#d4af37]' : 'text-white/60'
                        )} 
                        strokeWidth={2}
                      />
                    </div>
                    <span className={cn(
                      'font-body text-base',
                      isSelected ? 'text-white' : 'text-white/70'
                    )}>
                      {app.name}
                    </span>
                  </div>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleApp(app.id)}
                    className={cn(
                      'border-white/30 data-[state=checked]:bg-[#d4af37] data-[state=checked]:border-[#d4af37]',
                      'h-5 w-5'
                    )}
                  />
                </div>
              )
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 flex justify-end">
            <button
              onClick={() => setIsDialogOpen(false)}
              className="px-6 py-2 bg-[#d4af37] text-black font-heading uppercase tracking-widest text-sm hover:bg-[#d4af37]/90 transition-colors duration-300 rounded-lg"
            >
              Confirmar
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Seletor de Tempo (Modal Centralizado) */}
      {isTimeSelectorOpen && (
        <div 
          className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-sm flex items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsTimeSelectorOpen(false)
            }
          }}
        >
          <div className="w-[90%] max-w-sm bg-[#0a0a0c] border border-[#d4af37]/30 rounded-2xl p-6 relative shadow-2xl overflow-hidden">
            {/* Título */}
            <h2 className="text-xl font-heading uppercase tracking-widest text-[#d4af37] text-center mb-6">
              SELECIONE A DURAÇÃO
            </h2>

            {/* Container do Wheel com Destaque Central */}
            <div className="relative h-64 overflow-hidden">
              {/* Destaque Central (A Lente) - Altura Fixa Igual ao Item */}
              <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-16 border-y border-[#d4af37]/30 bg-[#d4af37]/5 pointer-events-none z-10" />

              {/* Janela de Scroll (The Wheel) - Travamento Horizontal */}
              <div
                ref={timeSelectorRef}
                className="h-full overflow-y-auto overflow-x-hidden snap-y snap-mandatory w-full flex flex-col items-center [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] relative"
                onScroll={(e) => {
                  // Detecta qual item está no centro e atualiza seleção
                  const container = e.currentTarget
                  const centerY = container.scrollTop + container.clientHeight / 2
                  
                  // Itera pelos itens (pula padding superior no índice 0)
                  Array.from(container.children).forEach((child, index) => {
                    if (index === 0 || index === container.children.length - 1) return // Pula paddings
                    
                    const element = child as HTMLElement
                    const elementTop = element.offsetTop
                    const elementHeight = element.offsetHeight
                    const elementCenter = elementTop + elementHeight / 2
                    
                    // Verifica se o elemento está no centro (dentro da lente)
                    if (Math.abs(centerY - elementCenter) < elementHeight / 2) {
                      const itemIndex = index - 1 // Ajusta índice (menos 1 para pular padding superior)
                      if (itemIndex >= 0 && itemIndex < TIME_OPTIONS.length) {
                        setSelectedDuration(TIME_OPTIONS[itemIndex])
                      }
                    }
                  })
                }}
              >
                {/* Padding Superior Calculado (para primeiro item chegar ao centro) */}
                <div className="h-[calc(50%-32px)] flex-shrink-0" />
                
                {/* Lista de Tempos - Largura Total e Alinhamento Central */}
                {TIME_OPTIONS.map((minutes, index) => {
                  return (
                    <div
                      key={minutes}
                      className={cn(
                        'h-16 w-full flex justify-center items-center snap-center text-3xl font-heading transition-all duration-300 cursor-pointer flex-shrink-0',
                        minutes === selectedDuration
                          ? 'text-[#d4af37] scale-110'
                          : 'text-stone-700 blur-[1px]'
                      )}
                      onClick={() => {
                        setSelectedDuration(minutes)
                        // Scroll para o item selecionado
                        if (timeSelectorRef.current) {
                          // Pula o padding superior (índice 0), então o item está em index + 1
                          const item = timeSelectorRef.current.children[index + 1] as HTMLElement
                          item?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                        }
                      }}
                    >
                      {minutes} min
                    </div>
                  )
                })}
                
                {/* Padding Inferior Calculado (para último item chegar ao centro) */}
                <div className="h-[calc(50%-32px)] flex-shrink-0" />
              </div>
            </div>

            {/* Botão Confirmar (Fixo) */}
            <div className="mt-6 pt-4 border-t border-white/10">
              <button
                onClick={handleConfirmTime}
                className="w-full px-6 py-3 bg-[#d4af37] text-black font-heading uppercase tracking-widest text-sm hover:bg-[#d4af37]/90 transition-colors duration-300 rounded-lg"
              >
                CONFIRMAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog de Aviso (Contrato de Foco) */}
      <Dialog open={isWarningDialogOpen} onOpenChange={setIsWarningDialogOpen}>
        <DialogContent className="bg-[#0a0a0c] border border-[#d4af37]/30 text-white max-w-md p-8">
          <DialogHeader>
            <DialogTitle className="text-3xl font-heading tracking-[0.1em] text-[#d4af37] uppercase text-center mb-6">
              FOCUS MODE
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 text-center">
            <p className="text-[1.15rem] text-zinc-300 font-body font-medium leading-relaxed">
              Ao iniciar, você firma um compromisso. Se sair desta tela por mais de <span className="text-white font-bold">15 segundos</span>, a sessão falhará.
            </p>
            <p className="text-[1.15rem] text-zinc-300 font-body font-medium leading-relaxed">
              Para economizar bateria, use o botão <span className="text-white font-bold">'Ativar Flow'</span> do app. Não bloqueie o celular.
            </p>
          </div>

          <div className="mt-8">
            <button
              onClick={handleAcceptChallenge}
              className="w-full py-4 bg-[#d4af37] hover:bg-[#b5952f] text-black font-bold text-lg tracking-wider rounded-xl transition-transform active:scale-95"
            >
              INICIAR FOCO
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Desistência (Barreira Psicológica - Tema Alerta Vermelho) */}
      <Dialog open={showGiveUpModal} onOpenChange={setShowGiveUpModal}>
        <DialogContent className="bg-[#0a0a0c] border-2 border-red-900/50 text-white max-w-md p-8 shadow-[0_0_20px_rgba(220,38,38,0.2)]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-heading uppercase tracking-widest text-red-600 text-center mb-6">
              DESISTIR AGORA?
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 text-center">
            <p className="text-xl text-zinc-300 font-body leading-relaxed whitespace-pre-line">
              Você não está abandonando apenas uma tarefa.{'\n'}Está abandonando o seu <span className="font-bold">EU</span> do futuro.{'\n\n'}Vai realmente aceitar isso?
            </p>
          </div>

          <div className="mt-8 space-y-3">
            {/* Botão Primário (Herói) - VOLTAR AO FOCO */}
            <button
              onClick={() => setShowGiveUpModal(false)}
              className="w-full py-4 bg-[#d4af37] hover:bg-[#b5952f] text-black font-heading uppercase tracking-widest text-lg font-bold rounded-xl transition-transform active:scale-95"
            >
              VOLTAR AO FOCO
            </button>
            
            {/* Botão Secundário (Vilão) - Sim, eu quero Desistir */}
            <button
              onClick={handleConfirmGiveUp}
              className="w-full h-12 text-lg text-red-500 hover:text-red-400 hover:bg-red-950/30 font-medium transition-colors rounded-lg border border-red-900/30"
            >
              Sim, eu quero Desistir
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* AÇÃO 1: Solução Nuclear — Renderização de Sucesso com CSS Supremo (div nativa) */}
      {phase === 'SUCCESS' && (
        <div className="fixed inset-0 z-[99999] w-screen h-screen bg-[#0a0a0c] flex items-center justify-center">
          <div className="flex flex-col items-center justify-center text-center space-y-8 py-8 px-6 max-w-2xl">
            {/* AÇÃO 1: Ícone Check Animado — Energia Dourada Pulsante */}
            <div className="relative">
              <CheckCircle2 className="w-24 h-24 text-[#d4af37] drop-shadow-[0_0_20px_rgba(212,175,55,0.6)] animate-pulse" strokeWidth={2} />
            </div>
            
            {/* Título: EXECUÇÃO CONCLUÍDA (Fonte Cinzel, Dourado) */}
            <h2 className="text-3xl font-heading text-[#d4af37] tracking-widest uppercase">
              EXECUÇÃO CONCLUÍDA
            </h2>
            
            {/* AÇÃO 2: Texto — Removido itálico, aumentado tamanho, clareado cor */}
            <p className="text-3xl text-white font-body leading-relaxed font-medium">
              Você está 1% mais próximo de se tornar o seu alter-ego, continue construindo
            </p>
            
            {/* AÇÃO 3: Assinatura — Aumentado tamanho, mantido espaçamento e cor */}
            <p className="text-xl tracking-widest text-[#d4af37]/70 font-heading uppercase">
              Brick by Brick 🧱
            </p>
            
            {/* AÇÃO: Botão de Reset Instantâneo (Sem Reload) */}
            <button
              onClick={handleEndSession}
              className="w-full px-8 py-4 bg-[#d4af37] text-black font-heading uppercase tracking-widest text-sm hover:bg-[#b5952f] transition-all duration-300 rounded-lg font-bold mt-4"
            >
              ENCERRAR SESSÃO
            </button>
          </div>
        </div>
      )}

      {/* AÇÃO 2: Fase RUNNING — Overlay Escuro/Timer apenas se phase === 'RUNNING' */}
      {phase === 'RUNNING' && isScreenOff && timeLeft > 0 && (
        <div 
          className="fixed inset-0 bg-black z-[9999] flex items-center justify-center pointer-events-auto"
          onClick={handleToggleScreen}
        >
          <p className="text-[#d4af37]/20 text-6xl font-mono font-bold font-heading">
            {formatTime(timeLeft)}
          </p>
        </div>
      )}
    </div>
  )
}
