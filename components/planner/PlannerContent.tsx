import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getHabits } from '@/app/actions/habits'
import PlannerClient from '@/components/planner/PlannerClient'
import { getBrasiliaDate, formatBrasiliaDate } from '@/lib/date'

export default async function PlannerContent() {
  // Verificar autenticação dentro do Suspense (não bloqueia renderização inicial)
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

  // Buscar hábitos no servidor
  const habitsResult = await getHabits(dateString)
  const initialHabits = habitsResult.success && habitsResult.data ? habitsResult.data : []

  return (
    <PlannerClient initialHabits={initialHabits} />
  )
}
