'use client'

import DashboardContent from '@/components/dashboard/DashboardContent'
import { ConsistencySection } from '@/components/dashboard/ConsistencySection'

type Props = {
  /** Primeiro nome vindo do servidor (zero flicker). */
  initialUserName?: string
}

export default function DashboardClientLoader({ initialUserName = '' }: Props) {
  return (
    <DashboardContent
      userName={initialUserName}
      consistencySection={<ConsistencySection />}
    />
  )
}
