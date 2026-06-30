'use client'

import { Suspense } from 'react'
import PlannerHeader from '@/components/planner/PlannerHeader'
import PlannerClientLoader from '@/components/planner/PlannerClientLoader'

/** Mesmo padrão do Journal: página 100% client, shell imediato, dados em segundo plano (useEffect no loader). */
export default function PlannerPage() {
  return (
    <div className="min-h-screen bg-black text-white pt-12 pb-24 px-6">
      <PlannerHeader />
      <Suspense fallback={null}>
        <PlannerClientLoader />
      </Suspense>
    </div>
  )
}
