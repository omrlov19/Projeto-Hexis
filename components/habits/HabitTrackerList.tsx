import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getHabits } from '@/app/actions/habits'
import { getBrasiliaDate, formatBrasiliaDate, parseBrasiliaDate } from '@/lib/date'
import HabitTrackerWrapper from './HabitTrackerWrapper'

interface HabitTrackerListProps {
  searchParams?: Promise<{ date?: string }> | { date?: string }
}

export default async function HabitTrackerList({ searchParams }: HabitTrackerListProps) {
  // Verificar autenticação dentro do Suspense (não bloqueia renderização inicial)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Resolver searchParams se for Promise (Next.js 15+) ou usar diretamente
  const resolvedSearchParams = searchParams instanceof Promise ? await searchParams : searchParams

  // Obter data da URL ou usar hoje
  const todayBrasilia = getBrasiliaDate()
  const dateParam = resolvedSearchParams?.date
  const dateString = dateParam || formatBrasiliaDate(todayBrasilia)
  const selectedDate = dateParam ? parseBrasiliaDate(dateParam) : todayBrasilia

  // Buscar hábitos do dia selecionado
  const habitsResult = await getHabits(dateString)
  const initialHabits = habitsResult.success && habitsResult.data ? habitsResult.data : []

  return (
    <HabitTrackerWrapper
      initialHabits={initialHabits}
      date={dateString}
      currentDate={selectedDate}
    />
  )
}
