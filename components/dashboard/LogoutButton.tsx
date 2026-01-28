'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function LogoutButton() {
  const router = useRouter()

  const handleLogout = async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/login')
      router.refresh()
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
    }
  }

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 font-heading uppercase tracking-wider text-xs"
      style={{
        color: '#ffffff',
        border: '1px solid #666666',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = '#ff4444'
        e.currentTarget.style.borderColor = '#ff4444'
        e.currentTarget.style.backgroundColor = 'rgba(255, 68, 68, 0.1)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = '#ffffff'
        e.currentTarget.style.borderColor = '#666666'
        e.currentTarget.style.backgroundColor = 'transparent'
      }}
      title="Sair"
    >
      <LogOut className="w-4 h-4" strokeWidth={2} />
      SAIR
    </button>
  )
}
