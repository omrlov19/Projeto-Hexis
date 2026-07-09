'use client'

import React, { useState, useRef, useEffect } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DurationPickerHotbarProps {
  value: number
  unit: 'minutos' | 'horas'
  onChange: (value: number, unit: 'minutos' | 'horas') => void
  className?: string
}

export function DurationPickerHotbar({ value, unit, onChange, className }: DurationPickerHotbarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [openUpwards, setOpenUpwards] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const val = value || 0

  const changeValue = (delta: number) => {
    let newVal = val + delta
    if (newVal < 0) newVal = 0
    onChange(newVal, unit)
  }

  const handleToggle = () => {
    if (!isOpen) {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const spaceBelow = window.innerHeight - rect.bottom
        if (spaceBelow < 320 && rect.top > 320) {
          setOpenUpwards(true)
        } else {
          setOpenUpwards(false)
        }
      }
    }
    setIsOpen(!isOpen)
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const quickMinutes = [15, 30, 45, 60]
  const quickHours = [1, 2, 3, 4]
  const quickOptions = unit === 'minutos' ? quickMinutes : quickHours

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      <button
        type="button"
        onClick={handleToggle}
        className="w-full h-[52px] bg-zinc-900 border border-zinc-700 rounded-lg px-4 flex items-center justify-center text-xl font-heading tracking-widest text-white hover:border-[#d4af37]/50 transition-colors focus:outline-none uppercase"
      >
        {val} {unit === 'minutos' ? 'MIN' : 'HRS'}
      </button>

      {isOpen && (
        <div 
          className={cn(
            "absolute z-[60] left-1/2 -translate-x-1/2 w-[220px] bg-[#0c0c0e] border border-white/10 rounded-[28px] p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200",
            openUpwards ? "bottom-[60px]" : "top-[60px]"
          )}
        >
          <div className="flex flex-col items-center">
            <span className="text-zinc-500 font-heading uppercase tracking-[0.2em] text-[10px] font-bold mb-6">
              DURAÇÃO
            </span>

            {/* Controle de Valor */}
            <div className="flex flex-col items-center gap-3 mb-6">
              <button 
                type="button" 
                onClick={() => changeValue(unit === 'minutos' ? 5 : 1)} 
                className="text-zinc-600 hover:text-white transition-colors p-1"
              >
                <ChevronUp strokeWidth={2.5} className="w-5 h-5" />
              </button>
              <span className="text-[48px] leading-none font-heading font-black text-white">
                {String(val).padStart(2, '0')}
              </span>
              <button 
                type="button" 
                onClick={() => changeValue(unit === 'minutos' ? -5 : -1)} 
                className="text-zinc-600 hover:text-white transition-colors p-1"
              >
                <ChevronDown strokeWidth={2.5} className="w-5 h-5" />
              </button>
            </div>

            {/* Toggle de Unidade */}
            <div className="flex w-full bg-white/5 rounded-xl p-1 mb-6">
              <button
                type="button"
                onClick={() => onChange(val, 'minutos')}
                className={cn(
                  "flex-1 h-8 rounded-lg text-xs font-heading font-bold uppercase transition-colors",
                  unit === 'minutos' ? "bg-[#d4af37]/20 text-[#d4af37]" : "text-zinc-500 hover:text-white"
                )}
              >
                MIN
              </button>
              <button
                type="button"
                onClick={() => onChange(val, 'horas')}
                className={cn(
                  "flex-1 h-8 rounded-lg text-xs font-heading font-bold uppercase transition-colors",
                  unit === 'horas' ? "bg-[#d4af37]/20 text-[#d4af37]" : "text-zinc-500 hover:text-white"
                )}
              >
                HRS
              </button>
            </div>

            {/* Botões Rápidos */}
            <div className="grid grid-cols-2 gap-2 w-full">
              {quickOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onChange(opt, unit)}
                  className={cn(
                    "h-10 rounded-xl flex items-center justify-center text-sm font-heading font-bold transition-all",
                    val === opt
                      ? "bg-[#d4af37]/20 text-[#d4af37]"
                      : "bg-transparent text-zinc-600 hover:text-zinc-300 hover:bg-white/5"
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
