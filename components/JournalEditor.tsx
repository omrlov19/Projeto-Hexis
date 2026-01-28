'use client'

import { useState, useEffect } from 'react'
import type React from 'react'
import { ArrowLeft, Trash2 } from 'lucide-react'

// Meses em português
const MONTHS = [
  'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
  'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
]

// Tipo para os dados de uma entrada do journal
type JournalEntryData = {
  type: 'tactical' | 'free'
  content: {
    victories?: string
    defeats?: string
    adjustments?: string
    freeText?: string
  }
}

interface JournalEditorProps {
  type: 'tactical' | 'free'
  date: Date
  initialData?: JournalEntryData | null
  onSave: (data: JournalEntryData) => void
  onDelete?: () => void
  onClose: () => void
}

export function JournalEditor({ type, date, initialData, onSave, onDelete, onClose }: JournalEditorProps) {
  const day = date.getDate()
  const month = MONTHS[date.getMonth()]

  // Estados para os campos do template tático
  const [victories, setVictories] = useState('')
  const [defeats, setDefeats] = useState('')
  const [adjustments, setAdjustments] = useState('')

  // Estado para o template livre
  const [freeText, setFreeText] = useState('')

  // Preencher campos com initialData se existir
  useEffect(() => {
    if (initialData && initialData.type === type) {
      if (type === 'tactical') {
        setVictories(initialData.content.victories || '')
        setDefeats(initialData.content.defeats || '')
        setAdjustments(initialData.content.adjustments || '')
      } else {
        setFreeText(initialData.content.freeText || '')
      }
    } else {
      // Limpar campos se não houver initialData ou tipo diferente
      setVictories('')
      setDefeats('')
      setAdjustments('')
      setFreeText('')
    }
  }, [initialData, type])

  const handleSave = (e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.preventDefault()
    e?.stopPropagation()
    
    const data: JournalEntryData = {
      type,
      content: type === 'tactical' 
        ? {
            victories,
            defeats,
            adjustments,
          }
        : {
            freeText,
          }
    }
    
    // Chamar o callback de salvamento
    if (onSave) {
      onSave(data)
    }
  }

  const handleDelete = (e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.preventDefault()
    e?.stopPropagation()
    
    if (window.confirm('Deseja apagar este registro?')) {
      if (onDelete) {
        onDelete()
      }
    }
  }

  const handleClose = (e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.preventDefault()
    e?.stopPropagation()
    
    if (onClose) {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 shrink-0">
        {/* Botão Voltar */}
        <button
          onClick={handleClose}
          type="button"
          className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white"
        >
          <ArrowLeft className="w-6 h-6" strokeWidth={2} />
        </button>

        {/* Título Central */}
        <h2 className="text-2xl font-heading uppercase tracking-widest text-[#d4af37]">
          {day} DE {month}
        </h2>

        {/* Botões de Ação (Delete e Salvar) */}
        <div className="flex items-center gap-3">
          {/* Botão Delete - só aparece se houver initialData (registro existente) */}
          {initialData && onDelete && (
            <button
              onClick={handleDelete}
              type="button"
              className="p-2 rounded-lg hover:bg-red-500/20 transition-colors text-red-500/80 hover:text-red-500"
              title="Apagar registro"
            >
              <Trash2 className="w-5 h-5" strokeWidth={2} />
            </button>
          )}
          
          {/* Botão Salvar */}
          <button
            onClick={handleSave}
            type="button"
            className="px-6 py-2 bg-[#d4af37] text-black font-heading uppercase tracking-widest text-lg font-bold hover:bg-[#d4af37]/90 transition-colors duration-300 rounded-lg shadow-[0_0_20px_rgba(212,175,55,0.3)]"
          >
            SALVAR
          </button>
        </div>
      </header>

      {/* Corpo */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {type === 'tactical' ? (
          /* Template Tático: 3 Textareas */
          <div className="space-y-6 max-w-3xl mx-auto">
            {/* 1. Vitórias */}
            <div className="space-y-3">
              <label className="block text-[#d4af37] font-heading uppercase tracking-wide text-xl">
                1. VITÓRIAS (O que funcionou?)
              </label>
              <textarea
                value={victories}
                onChange={(e) => setVictories(e.target.value)}
                placeholder="Descreva suas conquistas e o que deu certo hoje..."
                className="w-full min-h-[120px] p-4 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#d4af37]/50 transition-colors resize-none font-body text-base"
              />
            </div>

            {/* 2. Derrotas */}
            <div className="space-y-3">
              <label className="block text-[#d4af37] font-heading uppercase tracking-wide text-xl">
                2. DERROTAS (O que falhou?)
              </label>
              <textarea
                value={defeats}
                onChange={(e) => setDefeats(e.target.value)}
                placeholder="Identifique os pontos de melhoria e obstáculos encontrados..."
                className="w-full min-h-[120px] p-4 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#d4af37]/50 transition-colors resize-none font-body text-base"
              />
            </div>

            {/* 3. Ajustes */}
            <div className="space-y-3">
              <label className="block text-[#d4af37] font-heading uppercase tracking-wide text-xl">
                3. AJUSTE (O QUE MELHORAR AMANHÃ)
              </label>
              <textarea
                value={adjustments}
                onChange={(e) => setAdjustments(e.target.value)}
                placeholder="Defina a ação específica que você tomará amanhã para melhorar..."
                className="w-full min-h-[120px] p-4 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#d4af37]/50 transition-colors resize-none font-body text-base"
              />
            </div>
          </div>
        ) : (
          /* Template Livre: Textarea Gigante */
          <div className="h-full max-w-4xl mx-auto">
            <textarea
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder="Descarregue sua mente..."
              className="w-full h-full min-h-[calc(100vh-200px)] p-6 bg-transparent border-none text-white placeholder:text-zinc-500 focus:outline-none resize-none font-body text-lg leading-relaxed"
            />
          </div>
        )}
      </div>
    </div>
  )
}
