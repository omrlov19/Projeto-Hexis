import { redirect } from 'next/navigation'
import DashboardHeader from '@/components/dashboard/DashboardHeader'
import DashboardClientLoader from '@/components/dashboard/DashboardClientLoader'
import { getUserProfile } from '@/app/actions/dashboard'

/** Server Component: busca perfil no servidor e passa primeiro nome para o cliente (zero flicker). */
export default async function DashboardPage() {
  const profile = await getUserProfile()

  if (!profile.success) {
    redirect('/login')
  }

  const firstName = (profile.fullName ?? '').trim().split(' ')[0] ?? ''

  return (
    <div className="min-h-screen pt-12 pb-24 px-4 sm:px-6 lg:px-8 bg-black">
      <div className="w-full">
        <DashboardHeader userProfile={profile} />
        <DashboardClientLoader initialUserName={firstName} />
      </div>
    </div>
  )
}
