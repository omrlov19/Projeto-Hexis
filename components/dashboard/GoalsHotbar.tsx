'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Play, Pencil } from 'lucide-react'
import confetti from 'canvas-confetti'
import { toast } from 'sonner'
import { Checkbox } from '@/components/ui/checkbox'
import type { UserGoals } from '@/app/actions/dashboard'
import { toggleGoalStatus } from '@/app/actions/goals'

type GoalsHotbarProps = {
  goals: UserGoals | null
  onEdit?: () => void
  onOptimisticToggle?: (index: number, done: boolean) => void
}

const WEEKLY_SLOTS = 5

type ParsedGoal = { text: string; done: boolean }

function parseGoal(goal: unknown): ParsedGoal {
  if (goal != null && typeof goal === 'object' && 'text' in goal) {
    return {
      text: String((goal as { text?: unknown }).text ?? '').trim(),
      done: Boolean((goal as { done?: unknown }).done),
    }
  }
  if (typeof goal === 'string') {
    const trimmed = goal.trim()
    if (!trimmed) return { text: '', done: false }
    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed) as unknown
        if (parsed && typeof parsed === 'object' && 'text' in parsed)
          return {
            text: String((parsed as { text?: unknown }).text ?? '').trim(),
            done: Boolean((parsed as { done?: unknown }).done),
          }
      } catch {
        // fallback: tratar como texto simples
      }
    }
    return { text: trimmed, done: false }
  }
  return { text: '', done: false }
}

function runConfetti() {
  const count = 120
  const defaults = { origin: { y: 0.7 }, colors: ['#D4AF37', '#E5C06E', '#fff', '#18181b'] }
  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({ ...defaults, ...opts, particleCount: Math.floor(count * particleRatio) })
  }
  fire(0.25, { spread: 26, startVelocity: 55 })
  fire(0.2, { spread: 60 })
  fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 })
  fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 })
  fire(0.1, { spread: 120, startVelocity: 45 })
}

export function GoalsHotbar({ goals, onEdit, onOptimisticToggle }: GoalsHotbarProps) {
  const router = useRouter()
  const previousAllDone = useRef(false)

  const rawPriorities = goals?.weeklyPriorities ?? []

  // Normalizar: rawPriorities pode ser WeeklyGoalItem[], string[], ou uma string JSON.
  // Após a API retornar objetos {text, done}, basta usar parseGoal() em cada item.
  let rawList: unknown[] = Array.isArray(rawPriorities) ? rawPriorities : []
  if (typeof rawPriorities === 'string') {
    try {
      const parsed = JSON.parse(rawPriorities) as unknown
      rawList = Array.isArray(parsed) ? parsed : []
    } catch {
      rawList = []
    }
  }

  const parsedGoals = rawList.slice(0, WEEKLY_SLOTS).map((goal) => parseGoal(goal))
  const padded: ParsedGoal[] = [...parsedGoals]
  while (padded.length < WEEKLY_SLOTS) padded.push({ text: '', done: false })
  const hasAnyGoal = padded.some((p) => p.text.length > 0)
  const allDone = padded.length === 5 && padded.every((p) => p.done)

  useEffect(() => {
    if (allDone && !previousAllDone.current) {
      runConfetti()
      toast('SEMANA DOMINADA 🏆', {
        description: 'Parabéns, Soberano. Você concluiu sua frequência semanal.',
        style: {
          background: '#18181b',
          border: '1px solid #d4af37',
          color: '#fff',
        },
      })
    }
    previousAllDone.current = allDone
  }, [allDone])

  async function handleToggle(index: number, checked: boolean) {
    onOptimisticToggle?.(index, checked)
    await toggleGoalStatus(index, checked)
  }

  const handlePlay = (taskName: string) => {
    const params = new URLSearchParams()
    params.set('autoStart', 'true')
    if (taskName.trim()) params.set('taskName', taskName.trim())
    router.push(`/blocker?${params.toString()}`)
  }

  return (
    <div className="rounded-3xl bg-zinc-900 border-2 border-zinc-700 p-4 min-h-[160px] flex flex-col">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="text-sm font-medium text-[#D4AF37] uppercase tracking-wide">
          FREQUÊNCIA DA SEMANA
        </h2>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="p-1 rounded text-zinc-400 hover:text-amber-500 cursor-pointer transition-colors"
            aria-label="Editar metas"
          >
            <Pencil className="w-4 h-4" strokeWidth={2} />
          </button>
        )}
      </div>
      {!hasAnyGoal ? (
        <p className="text-sm text-zinc-500 flex-1 flex items-center justify-center py-4 text-center">
          Nenhuma frequência definida
        </p>
      ) : (
        <ul className="flex flex-col gap-2 flex-1 overflow-auto min-h-0">
          {padded.map((parsedGoal, i) => (
            <li key={i} className="flex items-center gap-2 min-w-0">
              <Checkbox
                checked={parsedGoal.done}
                onCheckedChange={(checked) => handleToggle(i, checked === true)}
                className="flex-shrink-0 border-[#D4AF37] data-[state=checked]:bg-[#D4AF37] data-[state=checked]:border-[#D4AF37] data-[state=checked]:text-black h-5 w-5 rounded"
              />
              <span
                className={`text-sm font-medium truncate flex-1 min-w-0 ${
                  parsedGoal.done ? 'text-zinc-500 line-through' : 'text-white'
                }`}
              >
                {parsedGoal.text || '—'}
              </span>
              <button
                type="button"
                onClick={() => handlePlay(parsedGoal.text)}
                className="flex-shrink-0 w-9 h-9 rounded-full bg-[#D4AF37] text-black flex items-center justify-center hover:bg-[#D4AF37]/90 active:scale-95 transition-colors"
                aria-label={`Iniciar foco: ${parsedGoal.text || 'meta ' + (i + 1)}`}
              >
                <Play className="w-4 h-4 ml-0.5" strokeWidth={2.5} fill="currentColor" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
