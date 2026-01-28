'use client'

import { Target, PenTool } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface JournalTemplateSelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectTemplate?: (type: 'tactical' | 'free') => void
}

export function JournalTemplateSelector({
  open,
  onOpenChange,
  onSelectTemplate,
}: JournalTemplateSelectorProps) {
  const handleSelectTemplate = (templateType: 'tactical' | 'free') => {
    console.log(`Selecionado: ${templateType === 'tactical' ? 'Tático' : 'Livre'}`)
    onSelectTemplate?.(templateType)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0a0a0c] border-[#d4af37]/30 text-white max-w-md p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-2xl font-heading uppercase tracking-widest text-[#d4af37] text-center">
            Escolha seu Template
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-4">
          {/* Opção A: Análise Tática */}
          <button
            onClick={() => handleSelectTemplate('tactical')}
            className={cn(
              'w-full p-6 rounded-xl border-2 border-[#d4af37] bg-zinc-900/50',
              'hover:bg-zinc-900/70 hover:border-[#d4af37]/80',
              'active:scale-[0.98] transition-all duration-300',
              'text-left flex flex-col gap-4'
            )}
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-[#d4af37]/20 border border-[#d4af37]/30">
                <Target className="w-6 h-6 text-[#d4af37]" strokeWidth={2} />
              </div>
              <h3 className="text-xl font-heading uppercase tracking-wider text-[#d4af37]">
                ANÁLISE TÁTICA
              </h3>
            </div>
            <p className="text-zinc-300 text-base font-body leading-relaxed">
              Estrutura guiada: Vitórias, Derrotas e Ajustes. Para otimização rápida.
            </p>
          </button>

          {/* Opção B: Fluxo Livre */}
          <button
            onClick={() => handleSelectTemplate('free')}
            className={cn(
              'w-full p-6 rounded-xl border-2 border-dashed border-[#d4af37]/50 bg-zinc-900/30',
              'hover:bg-zinc-900/50 hover:border-[#d4af37]/70',
              'active:scale-[0.98] transition-all duration-300',
              'text-left flex flex-col gap-4'
            )}
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-[#d4af37]/10 border border-dashed border-[#d4af37]/30">
                <PenTool className="w-6 h-6 text-[#d4af37]/80" strokeWidth={2} />
              </div>
              <h3 className="text-xl font-heading uppercase tracking-wider text-[#d4af37]/80">
                FLUXO LIVRE
              </h3>
            </div>
            <p className="text-zinc-300 text-base font-body leading-relaxed">
              Espaço aberto para reflexão profunda e descompressão mental.
            </p>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
