'use client'

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

  return (
    <nav 
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[40] w-[90%] max-w-[350px] lg:max-w-[500px] h-16 rounded-2xl bg-[#0a0a0c]/90 backdrop-blur-md border border-[#d4af37] shadow-[0_4px_20px_rgba(212,175,55,0.3)] pointer-events-none"
    >
      <div className="flex items-center justify-around lg:justify-center lg:gap-x-12 px-2 lg:px-4 h-full py-0">
        
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = isRouteActive(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              className={cn(
                'flex items-center transition-all duration-300 touch-manipulation cursor-pointer relative pointer-events-auto',
                'flex-col justify-center px-3 py-2 lg:px-2 lg:py-0 rounded-lg hover:scale-110 active:scale-95'
              )}
            >
              <Icon
                className={cn(
                  'transition-all duration-300',
                  item.href === '/blocker' 
                    ? 'w-7 h-7 lg:w-10 lg:h-10' // Ícone do olho maior no desktop
                    : 'w-7 h-7 lg:w-8 lg:h-8',  // Tamanho normal
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
