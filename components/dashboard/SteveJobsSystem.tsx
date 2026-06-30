'use client'

import { useState } from 'react'

type SteveJobsSystemProps = {
  onOpenModal: () => void
}

export function SteveJobsSystem({ onOpenModal }: SteveJobsSystemProps) {
  const [imgError, setImgError] = useState(false)

  return (
    <button
      type="button"
      onClick={onOpenModal}
      className="flex flex-col items-center justify-center rounded-3xl bg-zinc-900 border-2 border-[#D4AF37] p-6 min-h-[160px] w-full h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/50 hover:shadow-[0_0_20px_rgba(212,175,55,0.25)] transition-colors"
      aria-label="Abrir Sistema Steve Jobs"
    >
      <div className="w-20 h-20 rounded-full border-2 border-[#D4AF37]/50 overflow-hidden flex items-center justify-center mb-3 flex-shrink-0 bg-zinc-800">
        {!imgError ? (
          <img
            src="/steve-jobs.png"
            alt="Sistema Steve Jobs"
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="text-2xl font-heading font-bold text-[#D4AF37]/80">
            SJ
          </span>
        )}
      </div>
      <span className="text-xs font-heading uppercase tracking-[0.2em] text-zinc-400 text-center">
        SISTEMA PRODUTIVO
      </span>
      <span className="text-xl sm:text-2xl font-heading font-black text-white text-center mt-0.5">
        STEVE JOBS
      </span>
      <span className="text-sm italic text-[#D4AF37] text-center mt-0.5">
        (Frequency x Noise)
      </span>
      <span className="text-xs text-[#D4AF37]/90 mt-2 font-medium uppercase tracking-wider">
        Abrir
      </span>
    </button>
  )
}
