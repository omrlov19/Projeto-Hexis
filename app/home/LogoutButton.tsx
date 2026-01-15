'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function LogoutButton() {
  const router = useRouter()

  const handleLogout = async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/login')
      router.refresh()
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  return (
    <button
      onClick={handleLogout}
      className="px-3 py-1.5 border border-border text-muted-foreground hover:text-foreground hover:border-primary transition-all duration-300 font-heading uppercase tracking-widest text-xs"
    >
      Sair
    </button>
  )
}

