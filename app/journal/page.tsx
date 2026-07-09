'use client'

import { useState, useMemo, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { JournalTemplateSelector } from '@/components/JournalTemplateSelector'
import { JournalEditor } from '@/components/JournalEditor'
import { getBrasiliaDate, formatBrasiliaDate } from '@/lib/date'
import { cn } from '@/lib/utils'
import { saveJournalEntry, getJournalEntries, deleteJournalEntry } from '@/app/actions/journal'

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

// Tipo para o mapa de entradas (chave: YYYY-MM-DD)
type JournalEntries = {
  [dateKey: string]: JournalEntryData
}

// Meses em português
const MONTHS = [
  'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
  'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
]

// Dias da semana
const WEEKDAYS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB']

// Função auxiliar para criar chave de data (YYYY-MM-DD)
function getDateKey(date: Date): string {
  return formatBrasiliaDate(date)
}

// Função auxiliar para verificar se duas datas são o mesmo dia
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

export default function JournalPage() {
  const [isTemplateSelectorOpen, setIsTemplateSelectorOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [writingMode, setWritingMode] = useState<'tactical' | 'free' | null>(null)
  const [editorDate, setEditorDate] = useState<Date | null>(null)
  const [initialEditorData, setInitialEditorData] = useState<JournalEntryData | null>(null)
  
  // Estado para armazenar todas as entradas do journal
  const [journalEntries, setJournalEntries] = useState<JournalEntries>({})
  
  // Carregar do Supabase ao montar o componente
  useEffect(() => {
    let mounted = true
    getJournalEntries().then((res) => {
      if (mounted && res.success && res.data) {
        const loaded: JournalEntries = {}
        res.data.forEach((entry) => {
          loaded[entry.date] = entry.content
        })
        setJournalEntries(loaded)
      }
    })
    return () => { mounted = false }
  }, [])
  
  const today = useMemo(() => getBrasiliaDate(), [])
  
  // Estado para controlar o mês/ano visualizado no calendário
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [viewYear, setViewYear] = useState(today.getFullYear())
  
  const currentMonth = viewMonth
  const currentYear = viewYear
  const currentDay = today.getDate()

  // Lista de dias com registros (formato YYYY-MM-DD) - baseado nos dados reais
  const daysWithEntries = useMemo(() => {
    return Object.keys(journalEntries)
  }, [journalEntries])

  // Função para salvar uma entrada
  const handleSaveEntry = async (date: Date, data: JournalEntryData) => {
    try {
      const dateKey = getDateKey(date)
      const updatedEntries = {
        ...journalEntries,
        [dateKey]: data
      }
      
      // Atualizar estado local otimista
      setJournalEntries(updatedEntries)
      
      // Salvar no Supabase
      await saveJournalEntry(dateKey, data)
      
      // Fechar o editor COMPLETAMENTE - voltar para a tela principal
      setWritingMode(null)
      setEditorDate(null)
      setInitialEditorData(null)
      setSelectedDate(null) // Limpar seleção para não mostrar o editor novamente
    } catch (error) {
      console.error('Erro ao salvar entrada do journal:', error)
    }
  }

  // Função para deletar uma entrada
  const handleDeleteEntry = async (date: Date) => {
    try {
      const dateKey = getDateKey(date)
      const updatedEntries = { ...journalEntries }
      delete updatedEntries[dateKey]
      
      // Atualizar estado local otimista
      setJournalEntries(updatedEntries)
      
      // Deletar no Supabase
      await deleteJournalEntry(dateKey)
      
      // Fechar o editor e limpar seleção
      setWritingMode(null)
      setEditorDate(null)
      setInitialEditorData(null)
      setSelectedDate(null)
    } catch (error) {
      console.error('Erro ao deletar entrada do journal:', error)
    }
  }

  // Handler para clicar em uma data no calendário
  const handleDayClick = (day: number) => {
    const clickedDate = new Date(viewYear, viewMonth, day)
    setSelectedDate(clickedDate)
    
    // Verificar se existe entrada para essa data
    const dateKey = getDateKey(clickedDate)
    const existingEntry = journalEntries[dateKey]
    
    if (existingEntry) {
      // Se existe, abrir editor em modo visualização/edição
      setEditorDate(clickedDate)
      setInitialEditorData(existingEntry)
      setWritingMode(existingEntry.type)
    } else {
      // Se não existe, apenas selecionar a data (usuário pode clicar em "NOVO REGISTRO")
      setEditorDate(null)
      setInitialEditorData(null)
      setWritingMode(null)
    }
  }

  // Handler para abrir o editor (novo registro ou edição)
  const handleOpenEditor = (type: 'tactical' | 'free', date?: Date) => {
    const targetDate = date || selectedDate || today
    const dateKey = getDateKey(targetDate)
    const existingEntry = journalEntries[dateKey]
    
    setEditorDate(targetDate)
    setWritingMode(type)
    
    // Se existe entrada do mesmo tipo, carregar dados
    if (existingEntry && existingEntry.type === type) {
      setInitialEditorData(existingEntry)
    } else {
      setInitialEditorData(null)
    }
  }

  // Handler para fechar o editor
  const handleCloseEditor = () => {
    // Limpar TODOS os estados relacionados ao editor
    // Isso garante que o usuário volte para a tela principal (calendário + manifesto)
    setWritingMode(null)
    setEditorDate(null)
    setInitialEditorData(null)
    setSelectedDate(null) // Limpar seleção para não mostrar o editor novamente
  }

  // Handler para selecionar template
  const handleSelectTemplate = (type: 'tactical' | 'free') => {
    setIsTemplateSelectorOpen(false)
    // Abrir editor imediatamente após fechar o modal
    handleOpenEditor(type)
  }

  // Funções para navegar entre meses
  const handlePreviousMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(viewYear - 1)
    } else {
      setViewMonth(viewMonth - 1)
    }
  }

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(viewYear + 1)
    } else {
      setViewMonth(viewMonth + 1)
    }
  }

  // Calcular dias do mês
  const monthDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay()
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
    
    const days: (number | null)[] = []
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null)
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i)
    }
    return days
  }, [currentYear, currentMonth])

  // Verificar se um dia tem registro
  const hasEntry = (day: number | null): boolean => {
    if (day === null) return false
    const date = new Date(currentYear, currentMonth, day)
    const dateKey = getDateKey(date)
    return daysWithEntries.includes(dateKey)
  }

  // Verificar se um dia é hoje (considerando o mês visualizado)
  const isTodayDate = (day: number | null): boolean => {
    if (day === null) return false
    const date = new Date(currentYear, currentMonth, day)
    return isSameDay(date, today)
  }

  // Verificar se um dia está selecionado
  const isSelectedDate = (day: number | null): boolean => {
    if (day === null || !selectedDate) return false
    const date = new Date(currentYear, currentMonth, day)
    return isSameDay(date, selectedDate)
  }

  // Determinar data atual para exibição (selectedDate ou today)
  const displayDate = selectedDate || today
  const displayDateKey = getDateKey(displayDate)
  const currentEntry = journalEntries[displayDateKey]

  return (
    <div className="min-h-screen bg-black text-white pt-12 pb-24 px-6">
      {/* Título */}
      <header className="flex justify-center items-center mb-8">
        <h1 className="text-4xl font-heading uppercase tracking-[0.2em] text-[#d4af37]">
          JOURNALING
        </h1>
      </header>

      {/* Botão de Novo Registro (Padronizado com Planner e Focus) */}
      <div className="max-w-3xl mx-auto mb-8 w-full">
        <button
          onClick={() => setIsTemplateSelectorOpen(true)}
          className="w-full py-5 bg-[#d4af37] text-black font-heading uppercase tracking-widest text-lg hover:bg-[#d4af37]/90 transition-colors duration-300 rounded-lg shadow-[0_0_20px_rgba(212,175,55,0.3)]"
        >
          NOVO REGISTRO
        </button>
      </div>

      {/* Layout: Tudo Centralizado em Coluna */}
      <div className="flex flex-col items-center gap-8 max-w-3xl mx-auto w-full">
        {/* Calendário (Topo/Centro) */}
        <div className="w-full max-w-[700px] shrink-0">
          {/* Cabeçalho do Mês com Navegação */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={handlePreviousMonth}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white border border-zinc-700 hover:border-[#d4af37] hover:text-[#d4af37]"
              aria-label="Mês anterior"
            >
              <ChevronLeft className="w-6 h-6" strokeWidth={2} />
            </button>

            <h2 className="text-xl font-heading uppercase tracking-widest text-[#d4af37]">
              {MONTHS[currentMonth]} {currentYear}
            </h2>

            <button
              onClick={handleNextMonth}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white border border-zinc-700 hover:border-[#d4af37] hover:text-[#d4af37]"
              aria-label="Próximo mês"
            >
              <ChevronRight className="w-6 h-6" strokeWidth={2} />
            </button>
          </div>

          {/* Grid de Dias da Semana (Cabeçalho) */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-heading uppercase tracking-widest text-zinc-500 py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Grid de Dias do Mês */}
          <div className="grid grid-cols-7 gap-2">
            {monthDays.map((day, index) => {
              const isToday = isTodayDate(day)
              const isSelected = isSelectedDate(day)
              const hasEntryForDay = hasEntry(day)
              
              return (
                <button
                  key={index}
                  onClick={() => day !== null && handleDayClick(day)}
                  className={cn(
                    'aspect-square flex flex-col items-center justify-center rounded-lg transition-all relative',
                    day === null
                      ? 'opacity-0 pointer-events-none'
                      : isToday
                      ? 'bg-[#d4af37]/20 border-2 border-[#d4af37] text-[#d4af37] font-bold hover:bg-[#d4af37]/30'
                      : isSelected
                      ? 'bg-zinc-800 border-2 border-[#d4af37]/50 text-white hover:bg-zinc-700'
                      : 'text-zinc-300 hover:bg-white/10 cursor-pointer border border-transparent hover:border-[#d4af37]/30'
                  )}
                >
                  {day !== null && (
                    <>
                      <span className={cn('text-sm', (isToday || isSelected) && 'font-bold')}>
                        {day}
                      </span>
                      {/* Ponto dourado para dias com registro */}
                      {hasEntryForDay && (
                        <div className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-[#d4af37] shadow-[0_0_4px_rgba(212,175,55,0.6)]" />
                      )}
                    </>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Conteúdo (Direita/Centro) */}
        <div className="flex-1 w-full">
          {/* Só mostrar o editor se estiver em modo de escrita (writingMode ativo) */}
          {/* NÃO mostrar automaticamente após salvar - o usuário deve clicar na data para visualizar */}
          {writingMode && editorDate ? (
            <JournalEditor
              type={writingMode}
              date={editorDate}
              initialData={initialEditorData}
              onSave={(data) => handleSaveEntry(editorDate, data)}
              onDelete={initialEditorData ? () => handleDeleteEntry(editorDate) : undefined}
              onClose={handleCloseEditor}
            />
          ) : (
            // Estado Vazio: Mostrar Manifesto (sempre que não estiver escrevendo)
            <div className="mt-4 px-6 text-center">
              <p className="text-lg font-medium leading-relaxed text-white">
                O Journaling não é um diário, ele é um <span className="text-[#d4af37]">Sistema</span>!
                <br />
                Use para <span className="text-[#d4af37]">Descompressão Mental</span> e <span className="text-[#d4af37]">Ordem Diária</span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Seleção de Template */}
      <JournalTemplateSelector
        open={isTemplateSelectorOpen}
        onOpenChange={setIsTemplateSelectorOpen}
        onSelectTemplate={handleSelectTemplate}
      />
    </div>
  )
}
