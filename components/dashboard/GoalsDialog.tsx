'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { UserGoals } from '@/app/actions/dashboard'
import type { UpdateUserGoalsInput } from '@/app/actions/goals'

export type GoalsFormState = {
  dailyFocusGoal: number
  dailyHabitGoal: number
  weeklyPriorities: string[]
}

type GoalsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  goals: UserGoals | null
  form: GoalsFormState
  onFormChange: (updates: Partial<GoalsFormState>) => void
  onSave: () => Promise<void>
  saving: boolean
}

const DEFAULT_WEEKLY_PRIORITIES: string[] = ['', '', '', '', '']

const HOUR_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const

function minutesToSelectedHour(minutes: number | null | undefined): number {
  if (minutes == null || minutes <= 0) return 1
  const hours = Math.round(minutes / 60)
  return Math.min(12, Math.max(1, hours))
}

export function GoalsDialog({
  open,
  onOpenChange,
  goals,
  form,
  onFormChange,
  onSave,
  saving,
}: GoalsDialogProps) {
  const weeklyPriorities = (form.weeklyPriorities ?? DEFAULT_WEEKLY_PRIORITIES).slice(0, 5)
  while (weeklyPriorities.length < 5) weeklyPriorities.push('')

  const selectedHour = minutesToSelectedHour(form.dailyFocusGoal)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border border-zinc-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-heading uppercase tracking-widest text-[#D4AF37]">
            Sistema Steve Jobs (Frequency x Noise)
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 pt-2">
          <div>
            <label className="block text-lg font-bold text-[#D4AF37] uppercase tracking-wide mb-2">
              META DIÁRIA DE FOCO
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {HOUR_OPTIONS.map((hour) => {
                const isSelected = selectedHour === hour
                const minutes = hour * 60
                return (
                  <button
                    key={hour}
                    type="button"
                    onClick={() => onFormChange({ dailyFocusGoal: minutes })}
                    className={`
                      py-2.5 rounded-lg font-heading font-semibold text-sm uppercase tracking-wide
                      transition-colors
                      ${isSelected
                        ? 'bg-[#D4AF37] text-black ring-2 ring-[#D4AF37]/50'
                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-600'
                      }
                    `}
                  >
                    {hour}h
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <p className="text-lg font-bold text-[#D4AF37] uppercase tracking-wide mb-3">
              5 PRINCIPAIS METAS DA SEMANA (FREQUÊNCIA)
            </p>
            <div className="space-y-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <Input
                  key={i}
                  type="text"
                  placeholder={`Meta ${i + 1}`}
                  value={weeklyPriorities[i] ?? ''}
                  onChange={(e) => {
                    const next = [...weeklyPriorities]
                    next[i] = e.target.value
                    onFormChange({ weeklyPriorities: next })
                  }}
                  className="bg-zinc-800 border-zinc-600 text-white placeholder:text-zinc-500 text-base h-11"
                />
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="w-full py-3.5 bg-[#D4AF37] text-black font-heading uppercase tracking-widest text-sm font-bold rounded-xl hover:bg-[#D4AF37]/90 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Salvando…' : 'SALVAR FREQUÊNCIA'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
