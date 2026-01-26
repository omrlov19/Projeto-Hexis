'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  DndContext,
  closestCorners,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { reorderHabits } from '@/app/actions/habits'
import type { HabitWithStatus } from '@/types/hexis'

interface HabitReorderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  habits: HabitWithStatus[]
  onReorder?: (newHabits: HabitWithStatus[]) => void
}

// Componente Sortable para cada item no Dialog
function SortableReorderItem({
  habit,
}: {
  habit: HabitWithStatus
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: habit.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transform ? 'transform 0.2s ease-out' : transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        // AÇÃO 3: Itens da Lista - Mobile Compact
        'flex items-center gap-3 py-2 px-3 bg-white/5 transition-all duration-300 rounded-sm',
        isDragging && 'scale-105 shadow-lg z-50 bg-white/10'
      )}
    >
      {/* AÇÃO 3: Grip Handle - Dourado */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1.5 touch-none select-none flex-shrink-0"
      >
        <GripVertical className="w-4 h-4 text-[#d4af37] transition-colors" />
      </div>

      {/* AÇÃO 3: Nome do Hábito - Mobile Compact */}
      <h3 className="text-sm font-heading uppercase tracking-wide text-white flex-1">
        {habit.title}
      </h3>
    </div>
  )
}

export function HabitReorderDialog({
  open,
  onOpenChange,
  habits,
  onReorder,
}: HabitReorderDialogProps) {
  const router = useRouter()
  // Estado local soberano (fonte da verdade para a UI)
  const [items, setItems] = useState<HabitWithStatus[]>(habits)
  const prevOpenRef = useRef(false)

  // Sensores para drag-and-drop
  const sensors = useSensors(
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200, // Long press de 200ms
        tolerance: 5, // Tolerância de movimento
      },
    }),
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Movimento de 8px ativa o drag
      },
    })
  )

  // AÇÃO 1: Inicialização do Estado - Ordenar ESTRITAMENTE por position
  // IGNORA se completed é true ou false. O organizador mostra a lista "original".
  useEffect(() => {
    if (open) {
      // Clona e ordena por posição pura (ascendente)
      const rawOrder = [...habits].sort((a, b) => (a.position || 0) - (b.position || 0))
      setItems(rawOrder)
    }
  }, [open, habits])

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    // 1. Atualização Local (Permitido ser síncrono para fluidez)
    setItems((items) => {
      const oldIndex = items.findIndex((i) => i.id === active.id)
      const newIndex = items.findIndex((i) => i.id === over.id)
      const newOrder = arrayMove(items, oldIndex, newIndex)

      // 2. Avisar o Pai (ASSÍNCRONO OBRIGATÓRIO)
      // O setTimeout(..., 0) joga a execução para o final da fila, resolvendo o erro do React.
      if (onReorder) {
        setTimeout(() => {
          const optimizedOrder = newOrder.map((item, index) => ({
            ...item,
            position: index,
          }))
          onReorder(optimizedOrder)
        }, 0)
      }

      // 3. Salvar no Banco
      const orderMap = newOrder.map((h, index) => ({ id: h.id, position: index }))
      reorderHabits(orderMap)

      return newOrder
    })
  }

  function handleClose() {
    onOpenChange(false)
  }

  // Handler para detectar quando o dialog está fechando e atualizar a tela principal
  function handleOpenChange(newOpen: boolean) {
    // Se está fechando (indo de true para false)
    if (!newOpen && open) {
      // Força o Next.js a re-buscar os dados no servidor
      router.refresh()
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* AÇÃO 1: Container Principal - Aumentado para melhor usabilidade */}
      <DialogContent className="w-[95%] max-w-[450px] max-h-[85vh] rounded-xl p-4 bg-[#0a0a0c]/95 backdrop-blur-xl border border-[#d4af37]/20 shadow-[0_0_50px_-10px_rgba(0,0,0,0.8)] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-[#d4af37] font-heading uppercase tracking-widest text-lg text-center">
            Organizar Hábitos
          </DialogTitle>
        </DialogHeader>

        {/* AÇÃO 2: Controle de Altura da Lista - Scroll com limite expandido */}
        <div className="flex-1 overflow-y-auto pr-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] min-h-0">
          {items.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-white/60 text-center font-body">
                Nenhum hábito para organizar.
              </p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={items.map((h) => h.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-1.5">
                  {items.map((habit) => (
                    <SortableReorderItem key={habit.id} habit={habit} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        <DialogFooter className="pt-4">
          {/* AÇÃO 3: Botão Concluir - Mobile Compact */}
          <Button
            onClick={handleClose}
            className="w-full h-10 px-4 py-2 bg-[#d4af37] text-black font-bold hover:shadow-[0_0_20px_rgba(212,175,55,0.6)] transition-all duration-300 font-heading uppercase tracking-widest text-xs"
          >
            Concluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
