'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { UserGoals } from '@/app/actions/dashboard'
import { updateUserGoals } from '@/app/actions/goals'
import { Check, Clock, Trophy } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { GoalsDialog } from '@/components/dashboard/GoalsDialog'
import { SteveJobsSystem } from '@/components/dashboard/SteveJobsSystem'
import { GoalsHotbar } from '@/components/dashboard/GoalsHotbar'
import { JournalingStatus } from '@/components/journal/JournalingStatus'
import { MembersArea } from '@/components/dashboard/MembersArea'
import { Skeleton } from '@/components/ui/Skeleton'

type PopoverCard = 'habits' | 'focus' | 'productivity' | null

const CARD_EXPLANATIONS: Record<Exclude<PopoverCard, null>, string> = {
  habits: 'Total de hábitos executados hoje em relação à sua meta diária.',
  focus: 'Soma total do tempo dedicado a tarefas de foco ativo (exclui tempo de sono).',
  productivity:
    'Sua performance diária (0-100%) é uma média entre Consistência (hábitos) e Profundidade (foco). Fórmula: ( % Hábitos + % Foco ) / 2.',
}

const DEFAULT_GOALS: UserGoals = {
  dailyFocusGoal: 60,
  dailyHabitGoal: 5,
  weeklyPriorities: [
    { text: '', done: false },
    { text: '', done: false },
    { text: '', done: false },
    { text: '', done: false },
    { text: '', done: false },
  ],
}

type Props = {
  /** Primeiro nome do usuário (vindo do servidor para zero flicker). */
  userName?: string
  /** Seção de gráfico (carrega em background). */
  consistencySection?: React.ReactNode
}

export default function DashboardContent({ userName: initialUserName = '', consistencySection }: Props) {
  const router = useRouter()
  const [goals, setGoals] = useState<UserGoals | null>(DEFAULT_GOALS)
  const [todayStats, setTodayStats] = useState({
    completed: 0,
    total: 0,
    focusMinutes: 0,
    hasJournaledToday: false,
  })
  const [userName, setUserName] = useState(initialUserName)
  const [error, setError] = useState<string | null>(null)
  const [openPopover, setOpenPopover] = useState<PopoverCard>(null)
  const [isGoalsModalOpen, setIsGoalsModalOpen] = useState(false)
  const [goalsForm, setGoalsForm] = useState({
    dailyFocusGoal: 60,
    dailyHabitGoal: 5,
    weeklyPriorities: ['', '', '', '', ''] as string[],
  })
  const [goalsSaving, setGoalsSaving] = useState(false)
  const [optimisticGoals, setOptimisticGoals] = useState<UserGoals | null>(null)

  // Sincroniza se o nome mudar via Server Component (router.refresh)
  useEffect(() => {
    if (initialUserName) {
      setUserName(initialUserName)
    }
  }, [initialUserName])

  // Efeito 1 (Prioridade Máxima): Metas/Steve Jobs — <50ms
  useEffect(() => {
    let cancelled = false
    fetch('/api/dashboard?scope=goals')
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !data.success) return
        if (data.userName) setUserName(data.userName)
        setGoals(data.goals != null ? data.goals : DEFAULT_GOALS)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  // Efeito 2 (Secundário): Círculos de hoje
  useEffect(() => {
    let cancelled = false
    fetch('/api/dashboard?scope=todayStats')
      .then((res) => {
        if (res.status === 401) {
          router.push('/login')
          return null
        }
        return res.json()
      })
      .then((data) => {
        if (cancelled || !data) return
        if (data.success && data.todayStats) setTodayStats(data.todayStats)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [router])

  const completed = todayStats.completed
  const total = todayStats.total
  const focusMinutes = todayStats.focusMinutes
  const hasJournaledToday = todayStats.hasJournaledToday
  const displayGoals = optimisticGoals ?? goals ?? DEFAULT_GOALS

  const goalMinutes = displayGoals.dailyFocusGoal ?? 60
  /** Performance = Consistência (hábitos). Mesma fórmula do gráfico: (completed/total)*100 */
  const level = total > 0 ? Math.round((completed / total) * 100) : 0

  function handleOptimisticUpdate(newGoals: UserGoals) {
    setOptimisticGoals(newGoals)
  }

  // Sincronizar formulário de metas quando abrir o modal (textos das metas)
  useEffect(() => {
    if (!isGoalsModalOpen) return
    const prio = (goals?.weeklyPriorities ?? []).slice(0, 5).map((x) =>
      typeof x === 'string' ? String(x).trim() : String((x as { text?: unknown })?.text ?? '').trim()
    )
    while (prio.length < 5) prio.push('')
    setGoalsForm({
      dailyFocusGoal: goals?.dailyFocusGoal ?? 60,
      dailyHabitGoal: goals?.dailyHabitGoal ?? 5,
      weeklyPriorities: prio,
    })
  }, [isGoalsModalOpen, goals])

  async function handleSaveGoals() {
    const dailyFocusGoal = goalsForm.dailyFocusGoal ?? 0
    const rawTexts = (goalsForm.weeklyPriorities ?? []).slice(0, 5)
    const weeklyPriorities = rawTexts.map((s, i) => ({
      text: s != null && s !== undefined ? String(s).trim() : '',
      done: displayGoals?.weeklyPriorities?.[i]?.done ?? false,
    }))
    while (weeklyPriorities.length < 5) weeklyPriorities.push({ text: '', done: false })
    const hasPriorities = weeklyPriorities.some((p) => p.text.length > 0)

    if (dailyFocusGoal <= 0 || !hasPriorities) {
      alert('Preencha a meta de foco e as prioridades para salvar.')
      return
    }

    setGoalsSaving(true)
    try {
      const payload = {
        dailyFocusGoal,
        dailyHabitGoal: goalsForm.dailyHabitGoal ?? goals?.dailyHabitGoal ?? 5,
        weeklyPriorities,
      }
      const result = await updateUserGoals(payload)
      if (result.success) {
        handleOptimisticUpdate({
          dailyFocusGoal: payload.dailyFocusGoal,
          dailyHabitGoal: payload.dailyHabitGoal,
          weeklyPriorities: payload.weeklyPriorities,
        })
        setIsGoalsModalOpen(false)
        toast.success('Metas salvas com sucesso')
        router.refresh()
      } else {
        toast.error(result.error ?? 'Erro ao salvar metas')
        console.error('Erro ao salvar frequência:', result.error)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar metas'
      toast.error(msg)
      console.error('Exceção ao salvar frequência:', err)
    } finally {
      setGoalsSaving(false)
    }
  }

  const focusLabel =
    focusMinutes < 60 ? `${focusMinutes}m` : `${Math.floor(focusMinutes / 60)}h ${focusMinutes % 60}m`

  const habitProgress =
    total > 0 ? Math.min(100, Math.max(0, (completed / total) * 100)) : 0
  const focusProgress =
    goalMinutes > 0 ? Math.min((focusMinutes / goalMinutes) * 100, 100) : 0
  const GOLD_FILL = '#D4AF37'
  const SLATE_BG = '#1e293b'

  const formattedDate = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })
  const dateCapitalized = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1)

  /** Primeiro nome; vazio ou skeleton se não houver (nunca texto genérico). */
  const displayName = (userName ?? '').trim().split(' ')[0] ?? ''

  return (
    <div className="space-y-6 pb-8">
      {error && (
        <p className="text-center text-[#D4AF37] text-sm">{error}</p>
      )}

      {/* Grid de Métricas (Hero) — 2 colunas */}
      <div className="grid grid-cols-2 gap-4 relative">
        {openPopover && (
          <button
            type="button"
            aria-label="Fechar"
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setOpenPopover(null)}
          />
        )}

        {/* Card 1 — Contraste inteligente: duas camadas (fundo escuro+branco / frente dourada+preto) */}
        <div className="relative">
          <button
            type="button"
            className="relative w-full text-left rounded-3xl min-h-[160px] lg:min-h-[170px] focus:outline-none focus-visible:ring-2 focus-visible:ring-black/30 overflow-hidden"
            onClick={() => setOpenPopover(openPopover === 'habits' ? null : 'habits')}
          >
            {/* Camada 1 (Back): fundo escuro, texto branco — sempre visível */}
            <div className="absolute inset-0 w-full h-full rounded-3xl bg-slate-900 flex flex-col justify-between p-6 z-10">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-white uppercase tracking-wide">
                  Hábitos Concluídos
                </span>
                <Check className="w-6 h-6 text-white flex-shrink-0" strokeWidth={2.5} />
              </div>
              <p className="text-3xl sm:text-4xl font-heading font-black text-white mt-2">
                {completed}/{total}
              </p>
            </div>
            {/* Camada 2 (Front): dourado, w-full + clip-path — texto estático e alinhado ao fundo */}
            <div
              className="absolute inset-0 w-full h-full rounded-3xl bg-[#D4AF37] flex flex-col justify-between p-6 z-20"
              style={{
                clipPath: `inset(0 ${100 - habitProgress}% 0 0)`,
                transition: 'clip-path 0.5s ease-out',
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-slate-950 uppercase tracking-wide">
                  Hábitos Concluídos
                </span>
                <Check className="w-6 h-6 text-slate-950 flex-shrink-0" strokeWidth={2.5} />
              </div>
              <p className="text-3xl sm:text-4xl font-heading font-black text-slate-950 mt-2">
                {completed}/{total}
              </p>
            </div>
          </button>
          {openPopover === 'habits' && (
            <div
              className="absolute left-0 right-0 top-full z-50 mt-2 rounded-xl bg-zinc-900 border border-zinc-600 px-4 py-3 shadow-xl"
              role="tooltip"
            >
              <p className="text-sm text-zinc-200 leading-snug">
                {CARD_EXPLANATIONS.habits}
              </p>
            </div>
          )}
        </div>

        {/* Card 2 — Contraste inteligente: duas camadas (fundo escuro+branco / frente dourada+preto) */}
        <div className="relative">
          <button
            type="button"
            className="relative w-full text-left rounded-3xl min-h-[160px] lg:min-h-[170px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/50 overflow-hidden border border-zinc-700"
            onClick={() => setOpenPopover(openPopover === 'focus' ? null : 'focus')}
          >
            {/* Camada 1 (Back): fundo escuro, texto branco — sempre visível */}
            <div className="absolute inset-0 w-full h-full rounded-3xl bg-slate-900 flex flex-col justify-between p-6 z-10">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-white uppercase tracking-wide">
                  Tempo de Foco
                </span>
                <Clock className="w-6 h-6 text-white flex-shrink-0" strokeWidth={2} />
              </div>
              <p className="text-3xl sm:text-4xl font-heading font-black text-white mt-2">
                {focusLabel}
                {displayGoals?.dailyFocusGoal != null && displayGoals.dailyFocusGoal > 0 && (
                  <span className="block text-sm font-bold text-white/90 mt-1">
                    (Meta de foco {Math.round(displayGoals.dailyFocusGoal / 60)}h)
                  </span>
                )}
              </p>
            </div>
            {/* Camada 2 (Front): dourado, w-full + clip-path — texto estático e alinhado ao fundo */}
            <div
              className="absolute inset-0 w-full h-full rounded-3xl bg-[#D4AF37] flex flex-col justify-between p-6 z-20"
              style={{
                clipPath: `inset(0 ${100 - focusProgress}% 0 0)`,
                transition: 'clip-path 0.5s ease-out',
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-slate-950 uppercase tracking-wide">
                  Tempo de Foco
                </span>
                <Clock className="w-6 h-6 text-slate-950 flex-shrink-0" strokeWidth={2} />
              </div>
              <p className="text-3xl sm:text-4xl font-heading font-black text-slate-950 mt-2">
                {focusLabel}
                {displayGoals?.dailyFocusGoal != null && displayGoals.dailyFocusGoal > 0 && (
                  <span className="block text-sm font-bold text-slate-800 mt-1">
                    (Meta de foco {Math.round(displayGoals.dailyFocusGoal / 60)}h)
                  </span>
                )}
              </p>
            </div>
          </button>
          {openPopover === 'focus' && (
            <div
              className="absolute left-0 right-0 top-full z-50 mt-2 rounded-xl bg-zinc-900 border border-zinc-600 px-4 py-3 shadow-xl"
              role="tooltip"
            >
              <p className="text-sm text-zinc-200 leading-snug">
                {CARD_EXPLANATIONS.focus}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Middle Grid: Performance e Consistência */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        {/* Card de Produtividade */}
        <div className="relative">
          <button
            type="button"
            className="w-full h-full flex flex-col justify-between text-left rounded-3xl bg-zinc-900 border border-zinc-700 p-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/50"
            onClick={() =>
              setOpenPopover(openPopover === 'productivity' ? null : 'productivity')
            }
          >
            {/* Topo: Título */}
            <div className="flex items-center justify-between w-full">
              <span className="text-sm font-medium text-white uppercase tracking-wide flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                PERFORMANCE DE HOJE
              </span>
            </div>

            {/* Centro: Porcentagem Grande (Agora menor e à esquerda) */}
            <div className="flex-1 flex items-center justify-start py-8">
              <span className="text-5xl lg:text-6xl font-heading font-black text-[#D4AF37]">
                {level}%
              </span>
            </div>

            {/* Base: Barra de Progresso */}
            <div className="w-full">
              <div className="h-4 rounded-full bg-zinc-800 overflow-hidden mb-3">
                <div
                  className="h-full rounded-full bg-[#D4AF37] transition-all duration-1000 ease-out"
                  style={{ width: `${Math.min(100, level)}%` }}
                />
              </div>
              <p className="text-xs text-zinc-500 text-center uppercase tracking-widest font-heading">
                Taxa de Hábitos Concluídos
              </p>
            </div>
          </button>
          {openPopover === 'productivity' && (
            <div
              className="absolute left-0 right-0 top-full z-50 mt-2 rounded-xl bg-zinc-900 border border-zinc-600 px-4 py-3 shadow-xl max-w-sm"
              role="tooltip"
            >
              <h3 className="text-sm font-bold text-white uppercase tracking-wide mb-2">
                COMO SUA PERFORMANCE É CALCULADA?
              </h3>
              <div className="text-sm text-zinc-200 leading-snug space-y-2">
                <p>
                  Sua performance diária (0-100%) é a taxa de hábitos concluídos no dia.
                </p>
                <p>
                  <strong>Fórmula:</strong> (Concluídos ÷ Total) × 100
                </p>
                <p className="pt-1 border-t border-zinc-600 mt-2">
                  O valor é idêntico ao último ponto do gráfico de Consistência.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Gráfico de Consistência */}
        {consistencySection}
      </div>

      {/* Grid Inferior: 4 colunas no Desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
        <SteveJobsSystem onOpenModal={() => setIsGoalsModalOpen(true)} />
        <GoalsHotbar
          goals={displayGoals}
          onEdit={() => setIsGoalsModalOpen(true)}
          onOptimisticToggle={(index, done) => {
            if (!displayGoals) return
            const prio = [...(displayGoals.weeklyPriorities ?? [])]
            while (prio.length < 5) prio.push({ text: '', done: false })
            prio[index] = { ...prio[index], done }
            handleOptimisticUpdate({ ...displayGoals, weeklyPriorities: prio })
          }}
        />
        <JournalingStatus hasJournaledToday={hasJournaledToday} />
        <MembersArea />
      </div>

      <GoalsDialog
        open={isGoalsModalOpen}
        onOpenChange={setIsGoalsModalOpen}
        goals={goals}
        form={goalsForm}
        onFormChange={(updates) => setGoalsForm((prev) => ({ ...prev, ...updates }))}
        onSave={handleSaveGoals}
        saving={goalsSaving}
      />
    </div>
  )
}
