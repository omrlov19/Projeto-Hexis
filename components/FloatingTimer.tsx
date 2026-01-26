'use client'

import { useRef, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { Lock } from 'lucide-react'
import { useFocus } from '@/contexts/FocusContext'
import Link from 'next/link'

// Formata segundos em MM:SS
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(m)}:${pad(s)}`
}

export function FloatingTimer() {
  const pathname = usePathname()
  const { isActive, timeLeft } = useFocus()
  const constraintsRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  // Só exibir se o timer está ativo E o usuário NÃO está na tela de Focus
  const shouldShow = isActive && pathname !== '/blocker'

  if (!shouldShow || !mounted) return null

  return (
    <>
      {/* Área invisível que define os limites do arrasto (viewport) */}
      <div
        ref={constraintsRef}
        className="fixed inset-0 pointer-events-none z-[49]"
        aria-hidden
      />
      <motion.div
        drag
        dragConstraints={constraintsRef}
        dragElastic={0}
        dragMomentum={false}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed z-[50] top-20 left-6 cursor-grab active:cursor-grabbing touch-none select-none w-fit"
        style={{ willChange: 'transform' }}
      >
        <Link
          href="/blocker"
          className="flex flex-col items-center gap-0.5 px-4 py-2.5 bg-black border border-[#d4af37]/50 rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.5)] hover:border-[#d4af37]/70 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-[10px] uppercase tracking-widest text-[#d4af37]/80 font-medium leading-none">
            FOCUS TIME
          </span>
          <span className="text-[#d4af37] font-mono font-bold text-sm tabular-nums leading-tight">
            {formatTime(timeLeft)}
          </span>
        </Link>
      </motion.div>
    </>
  )
}
