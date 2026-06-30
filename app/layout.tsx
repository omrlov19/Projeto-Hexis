import type { Metadata } from 'next'
import { Cinzel, Cormorant_Garamond } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'
import { BottomNav } from '@/components/layout/BottomNav'
import { FocusProvider } from '@/contexts/FocusContext'
import { FloatingTimer } from '@/components/FloatingTimer'

const cinzel = Cinzel({
  subsets: ['latin'],
  variable: '--font-heading',
})

const cormorantGaramond = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-body',
})

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export const metadata: Metadata = {
  title: 'Hexis - High Performance',
  description: 'Hexis - High Performance. Habit tracker e produtividade.',
  icons: {
    icon: '/hexis-logo.png',
    apple: '/hexis-logo.png',
  },
  appleWebApp: {
    capable: true,
    title: 'Hexis',
    statusBarStyle: 'black-translucent',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <body className={`${cinzel.variable} ${cormorantGaramond.variable} font-body bg-black text-white`} suppressHydrationWarning>
        <FocusProvider>
          {/* Main App Container */}
          <main className="w-full min-h-screen bg-black transition-all duration-300">
            {children}
            <FloatingTimer />
          </main>
          
          {/* Menu de navegação responsivo (Bottom no mobile, Sidebar no desktop) */}
          <BottomNav />
          
          <Toaster theme="dark" richColors position="top-center" />
        </FocusProvider>
      </body>
    </html>
  )
}
