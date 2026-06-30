'use client'

import { useRouter } from 'next/navigation'
import { BookOpen } from 'lucide-react'

type JournalingStatusProps = {
  hasJournaledToday: boolean
}

export function JournalingStatus({ hasJournaledToday }: JournalingStatusProps) {
  const router = useRouter()
  const isDone = hasJournaledToday

  return (
    <button
      type="button"
      onClick={() => !isDone && router.push('/journal')}
      className="flex flex-col items-center justify-center rounded-3xl bg-zinc-900 border-2 border-zinc-700 p-6 min-h-[160px] w-full h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/50 hover:border-zinc-600 transition-colors cursor-pointer"
      aria-label={isDone ? 'Journaling do dia concluído' : 'Abrir Journaling'}
      title={isDone ? 'Journaling do dia concluído' : 'Fazer journaling do dia'}
    >
      {isDone ? (
        <BookOpen
          className="w-14 h-14 flex-shrink-0 text-[#E5C06E] drop-shadow-[0_0_12px_rgba(229,192,110,0.6)]"
          strokeWidth={1.5}
        />
      ) : (
        <>
          <BookOpen
            className="w-14 h-14 flex-shrink-0 text-zinc-500 animate-pulse"
            strokeWidth={1.5}
          />
          <span className="text-base font-heading font-semibold text-zinc-300 uppercase tracking-wide mt-2 text-center">
            Journaling (pendente)
          </span>
          <span className="text-sm font-heading font-semibold text-[#D4AF37] uppercase tracking-wider mt-2">
            PREENCHER AGORA
          </span>
        </>
      )}
    </button>
  )
}
