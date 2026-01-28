import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getHabits } from '@/app/actions/habits'
import { HabitTracker } from '@/components/habits/HabitTracker'
import { getBrasiliaDate, formatBrasiliaDate, parseBrasiliaDate } from '@/lib/date'
import HabitTrackerClient from './HabitTrackerClient'

export default async function HabitTrackerContent({
  searchParams,
}: {
  searchParams?: Promise<{ date?: string }> | { date?: string }
}) {
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
    <HabitTrackerClient
      initialHabits={initialHabits}
      date={dateString}
      currentDate={selectedDate}
    />
  )
}
