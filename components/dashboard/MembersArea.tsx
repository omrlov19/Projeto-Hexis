'use client'

import { GraduationCap } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export function MembersArea() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex flex-col items-center justify-center rounded-3xl bg-zinc-900 border-2 border-zinc-700 p-6 min-h-[160px] w-full h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/50 hover:border-[#D4AF37]/40 transition-colors cursor-pointer"
          aria-label="Abrir Área de Membros"
        >
          <div className="w-20 h-20 rounded-full border-2 border-[#D4AF37]/50 flex items-center justify-center mb-3 flex-shrink-0 bg-zinc-800">
            <GraduationCap className="w-10 h-10 text-[#D4AF37]" strokeWidth={1.5} />
          </div>
          <span className="text-base font-heading font-semibold text-white uppercase tracking-wide text-center leading-tight">
            ÁREA DE MEMBROS
          </span>
          <span className="text-sm text-zinc-400 mt-0.5 text-center">
            Aprenda a usar o Hexis
          </span>
        </button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border border-zinc-700 text-white max-w-md">
        <DialogHeader className="text-center sm:text-center">
          <DialogTitle className="text-xl font-heading uppercase tracking-widest text-[#D4AF37]">
            🚧 EM CONSTRUÇÃO...
          </DialogTitle>
          <DialogDescription className="text-zinc-300 text-center mt-2 leading-relaxed">
            Em breve você terá acesso ao conhecimento para maximizar sua produtividade e resultados com o Hexis.
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}
