'use client'

import Image from 'next/image'
import { UserProfileModal } from '@/components/dashboard/UserProfileModal'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const GOLD = '#E5C06E'

interface DashboardHeaderProps {
  userProfile?: {
    fullName?: string | null
    email?: string | null
    phone?: string | null
    avatarUrl?: string | null
  } | null
}

export default function DashboardHeader({ userProfile }: DashboardHeaderProps) {
  const displayName = (userProfile?.fullName ?? '').trim().split(' ')[0] ?? ''
  const formattedDate = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })
  const dateCapitalized = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1)

  return (
    <header className="flex items-center justify-between w-full mb-6 relative">
      {/* Esquerda: Logo */}
      <div className="flex items-center gap-0 z-10">
        <Image
          src="/hexis-logo.png"
          alt="H"
          width={64}
          height={64}
          className="object-contain h-14 w-14 sm:h-16 sm:w-16 flex-shrink-0"
        />
        <span
          className="text-3xl sm:text-4xl font-black uppercase tracking-wide flex-shrink-0 -ml-2 sm:-ml-3 mt-1"
          style={{ color: GOLD }}
        >
          EXIS
        </span>
      </div>

      {/* Centro: Saudação e Data */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-heading font-bold text-white tracking-wide uppercase">
          Olá, {displayName || 'Soberano'}
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 mt-1">
          {dateCapitalized}
        </p>
      </div>

      {/* Direita: Avatar */}
      <div className="z-10">
        <UserProfileModal 
          fullName={userProfile?.fullName} 
          email={userProfile?.email} 
          phone={userProfile?.phone} 
          avatarUrl={userProfile?.avatarUrl}
        />
      </div>
    </header>
  )
}
