import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getHabits } from '@/app/actions/habits'
import { HabitTracker } from '@/components/habits/HabitTracker'
import { getBrasiliaDate, formatBrasiliaDate } from '@/lib/date'

// Força renderização dinâmica (evita cache estático)
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Sempre usar a data de hoje (Brasília)
  const todayBrasilia = getBrasiliaDate()
  const dateString = formatBrasiliaDate(todayBrasilia)
  const selectedDate = todayBrasilia

  // Buscar hábitos do dia de hoje
  const habitsResult = await getHabits(dateString)
  const initialHabits = habitsResult.success && habitsResult.data ? habitsResult.data : []

  return (
    <div className="min-h-screen relative">
      {/* Container principal */}
      <div className="max-w-2xl mx-auto px-8 pt-4 pb-28">
        {/* HabitTracker (inclui Header e lista de hábitos) */}
        <HabitTracker initialHabits={initialHabits} date={dateString} currentDate={selectedDate} />
      </div>
    </div>
  )
}
