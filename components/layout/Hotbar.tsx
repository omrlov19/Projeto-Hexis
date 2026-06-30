'use client'

import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowUpDown, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HotbarProps {
  onCreateHabit: () => void
  onToggleReorder: () => void
  isReordering: boolean
}

export function Hotbar({ onCreateHabit, onToggleReorder, isReordering }: HotbarProps) {
  const pathname = usePathname()

  // Só renderizar em rotas internas; ocultar no login/cadastro
  if (pathname === '/login' || pathname === '/signup' || pathname.startsWith('/login') || pathname.startsWith('/signup')) {
    return null
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-center p-2 sm:p-4 pointer-events-none">
      <div className="flex items-center gap-2 sm:gap-3 bg-card/95 backdrop-blur-md border border-border/50 rounded-full px-4 sm:px-6 py-2 sm:py-3 shadow-lg pointer-events-auto">
        {/* Botão Novo Hábito (Primary) */}
        <Button
          onClick={onCreateHabit}
          className="px-4 sm:px-6 py-2 sm:py-2.5 font-heading uppercase tracking-widest text-xs sm:text-sm border border-primary bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300"
        >
          <Plus className="w-4 h-4" />
          Novo Hábito
        </Button>

        {/* Botão Organizar (Toggle) */}
        <Button
          onClick={onToggleReorder}
          variant={isReordering ? 'default' : 'outline'}
          className={cn(
            'px-4 sm:px-6 py-2 sm:py-2.5 font-heading uppercase tracking-widest text-xs sm:text-sm transition-all duration-300',
            isReordering
              ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90'
              : 'border-border bg-transparent text-foreground hover:bg-muted/50'
          )}
        >
          <ArrowUpDown className="w-4 h-4" />
          Organizar
        </Button>
      </div>
    </div>
  )
}
