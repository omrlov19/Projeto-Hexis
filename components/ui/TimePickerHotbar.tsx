'use client'

import React, { useState, useRef, useEffect } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TimePickerHotbarProps {
  value: string // Formato "HH:MM"
  onChange: (value: string) => void
  className?: string
}

export function TimePickerHotbar({ value, onChange, className }: TimePickerHotbarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [openUpwards, setOpenUpwards] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Parse value ou fallback para "09:00"
  const [hStr, mStr] = (value || '09:00').split(':')
  const hours = parseInt(hStr, 10) || 0
  const minutes = parseInt(mStr, 10) || 0

  const updateTime = (newH: number, newM: number) => {
    const format = (n: number) => String(n).padStart(2, '0')
    onChange(`${format(newH)}:${format(newM)}`)
  }

  const changeHour = (delta: number) => {
    let newH = (hours + delta) % 24
    if (newH < 0) newH += 24
    updateTime(newH, minutes)
  }

  const changeMinute = (delta: number) => {
    let newM = (minutes + delta) % 60
    if (newM < 0) newM += 60
    updateTime(hours, newM)
  }

  const setFixedMinute = (m: number) => {
    updateTime(hours, m)
  }

  const handleToggle = () => {
    if (!isOpen) {
      // Calcular a direção antes de abrir
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const spaceBelow = window.innerHeight - rect.bottom
        // O popover tem ~280px de altura
        if (spaceBelow < 280 && rect.top > 280) {
          setOpenUpwards(true)
        } else {
          setOpenUpwards(false)
        }
      }
    }
    setIsOpen(!isOpen)
  }

  // Click outside to close
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

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      {/* Botão Trigger (Estilo Input) */}
      <button
        type="button"
        onClick={handleToggle}
        className="w-full h-[52px] bg-zinc-900 border border-zinc-700 rounded-lg px-4 flex items-center justify-center text-xl font-heading tracking-widest text-white hover:border-[#d4af37]/50 transition-colors focus:outline-none"
      >
        {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}
      </button>

      {/* Popover */}
      {isOpen && (
        <div 
          className={cn(
            "absolute z-[60] left-1/2 -translate-x-1/2 w-[200px] bg-[#0c0c0e] border border-white/10 rounded-[28px] p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200",
            openUpwards ? "bottom-[60px]" : "top-[60px]"
          )}
        >
          <div className="flex flex-col items-center">
            <span className="text-zinc-500 font-heading uppercase tracking-[0.2em] text-[10px] font-bold mb-6">
              HORA
            </span>

            {/* Controles de Hora e Minuto */}
            <div className="flex items-center gap-5 mb-6">
              {/* Horas */}
              <div className="flex flex-col items-center gap-3">
                <button 
                  type="button" 
                  onClick={() => changeHour(1)} 
                  className="text-zinc-600 hover:text-white transition-colors p-1"
                >
                  <ChevronUp strokeWidth={2.5} className="w-5 h-5" />
                </button>
                <span className="text-[32px] leading-none font-heading font-black text-white">
                  {String(hours).padStart(2, '0')}
                </span>
                <button 
                  type="button" 
                  onClick={() => changeHour(-1)} 
                  className="text-zinc-600 hover:text-white transition-colors p-1"
                >
                  <ChevronDown strokeWidth={2.5} className="w-5 h-5" />
                </button>
              </div>

              {/* Dois Pontos */}
              <span className="text-xl font-bold text-zinc-700 -mt-1">:</span>

              {/* Minutos */}
              <div className="flex flex-col items-center gap-3">
                <button 
                  type="button" 
                  onClick={() => changeMinute(1)} 
                  className="text-zinc-600 hover:text-white transition-colors p-1"
                >
                  <ChevronUp strokeWidth={2.5} className="w-5 h-5" />
                </button>
                <span className="text-[32px] leading-none font-heading font-black text-white">
                  {String(minutes).padStart(2, '0')}
                </span>
                <button 
                  type="button" 
                  onClick={() => changeMinute(-1)} 
                  className="text-zinc-600 hover:text-white transition-colors p-1"
                >
                  <ChevronDown strokeWidth={2.5} className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Botões Rápidos */}
            <div className="grid grid-cols-2 gap-2 w-full">
              {[0, 15, 30, 45].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setFixedMinute(m)}
                  className={cn(
                    "h-10 rounded-xl flex items-center justify-center text-base font-heading font-bold transition-all",
                    minutes === m
                      ? "bg-[#d4af37]/20 text-[#d4af37]" // Cor Hexis Gold
                      : "bg-transparent text-zinc-600 hover:text-zinc-300 hover:bg-white/5"
                  )}
                >
                  :{String(m).padStart(2, '0')}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
