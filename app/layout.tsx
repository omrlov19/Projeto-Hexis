import type { Metadata } from 'next'
import { Cinzel, Cormorant_Garamond } from 'next/font/google'
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

export const metadata: Metadata = {
  title: 'Hexis',
  description: 'Habit tracker',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={`${cinzel.variable} ${cormorantGaramond.variable} font-body`}>
        <FocusProvider>
          {children}
          <FloatingTimer />
          <BottomNav />
        </FocusProvider>
      </body>
    </html>
  )
}
