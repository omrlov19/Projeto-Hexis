'use client'

import React, { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface IconPickerPopoverProps {
  iconMap: Record<string, LucideIcon>
  selectedIcon: string
  onSelect: (icon: string) => void
  className?: string
}

export function IconPickerPopover({ iconMap, selectedIcon, onSelect, className }: IconPickerPopoverProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [openUpwards, setOpenUpwards] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleToggle = () => {
    if (!isOpen) {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const spaceBelow = window.innerHeight - rect.bottom
        if (spaceBelow < 250 && rect.top > 250) {
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

  const CurrentIcon = iconMap[selectedIcon] || iconMap['sparkles']

  // Remove duplicate icons (some point to the same LucideIcon, e.g. 'bookopen' and 'book-open')
  const seenIcons = new Set()
  const uniqueKeys = Object.keys(iconMap).filter(key => {
    const icon = iconMap[key]
    if (!icon || seenIcons.has(icon)) return false
    seenIcons.add(icon)
    return true
  })

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <button
        type="button"
        onClick={handleToggle}
        className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#d4af37] hover:border-[#d4af37]/50 hover:bg-[#d4af37]/10 transition-all focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
      >
        {CurrentIcon && <CurrentIcon className="w-8 h-8" strokeWidth={2} />}
      </button>

      {isOpen && (
        <div 
          className={cn(
            "absolute z-[60] left-0 w-[280px] bg-[#0c0c0e] border border-white/10 rounded-[28px] p-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200",
            openUpwards ? "bottom-[70px]" : "top-[70px]"
          )}
        >
          <div className="flex flex-col">
            <span className="text-zinc-500 font-heading uppercase tracking-[0.2em] text-[10px] font-bold mb-4 text-center">
              ÍCONE
            </span>
            <div className="grid grid-cols-5 gap-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-2 pb-2">
              {uniqueKeys.map((key) => {
                const Icon = iconMap[key]
                if (!Icon) return null
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      onSelect(key)
                      setIsOpen(false)
                    }}
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                      selectedIcon === key
                        ? "bg-[#d4af37]/20 text-[#d4af37]"
                        : "bg-transparent text-zinc-500 hover:text-white hover:bg-white/10"
                    )}
                  >
                    <Icon className="w-5 h-5" strokeWidth={2} />
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
