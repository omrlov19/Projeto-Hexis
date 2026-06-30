'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, CheckSquare, Eye, Calendar, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutGrid,
  },
  {
    label: 'Habit Tracker',
    href: '/home',
    icon: CheckSquare,
  },
  {
    label: 'Travador',
    href: '/blocker',
    icon: Eye,
  },
  {
    label: 'Calendário',
    href: '/planner',
    icon: Calendar,
  },
  {
    label: 'Journaling',
    href: '/journal',
    icon: BookOpen,
  },
]

export function BottomNav() {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Ocultar na tela de login e cadastro
  if (pathname === '/login' || pathname === '/signup' || pathname.startsWith('/login') || pathname.startsWith('/signup')) {
    return null
  }

  // Função para determinar se a rota está ativa
  const isRouteActive = (href: string) => {
    // Habit Tracker: /home (e / por redirect)
    if (href === '/home') {
      return pathname === '/' || pathname === '/home'
    }
    // Para outras rotas, usar startsWith para capturar sub-rotas
    return pathname.startsWith(href)
  }

  if (!mounted) return null

  return (
    <nav 
      className="fixed bottom-6 lg:bottom-8 left-0 right-0 mx-auto z-[999] w-[90%] max-w-[280px] lg:max-w-[500px] h-14 lg:h-16 rounded-2xl bg-[#0a0a0c] border border-[#d4af37] shadow-[0_4px_20px_rgba(212,175,55,0.4)]"
    >
      <div className="flex items-center justify-around lg:justify-center lg:gap-x-12 px-1 lg:px-4 h-full py-0">
        
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = isRouteActive(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              className={cn(
                'flex items-center transition-all duration-300 touch-manipulation cursor-pointer relative',
                'flex-col justify-center px-2 py-1 lg:px-2 lg:py-0 rounded-lg hover:scale-110 active:scale-95'
              )}
            >
              <Icon
                className={cn(
                  'transition-all duration-300',
                  item.href === '/blocker' 
                    ? 'w-8 h-8 lg:w-10 lg:h-10' // Ícone do olho maior no mobile e desktop
                    : 'w-6 h-6 lg:w-8 lg:h-8',  // Tamanho normal no mobile
                  isActive
                    ? 'text-[#d4af37] drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]'
                    : 'text-stone-600'
                )}
                strokeWidth={isActive ? 2.5 : 2}
              />

              {/* Ponto indicador para ícone ativo */}
              {isActive && (
                <div className="absolute -bottom-1 lg:-bottom-2 w-1.5 h-1.5 rounded-full bg-[#d4af37] shadow-[0_0_4px_rgba(212,175,55,0.6)]" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
