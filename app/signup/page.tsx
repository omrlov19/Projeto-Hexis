'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeft } from 'lucide-react'
import { signup } from '@/app/auth/actions'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const GOLD = '#E5C06E'

export default function SignUpPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const form = e.currentTarget
    const formData = new FormData(form)

    const result = await signup({}, formData)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
      return
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-[450px] rounded-2xl bg-[#121212] p-8 sm:p-10 relative">
        {/* Navegação: seta voltar para login */}
        <Link
          href="/login"
          className="absolute top-6 left-6 flex items-center justify-center w-10 h-10 rounded-full text-white hover:text-[#E5C06E] transition-colors duration-300"
          aria-label="Voltar para login"
        >
          <ChevronLeft className="w-7 h-7" strokeWidth={2.5} />
        </Link>

        {/* Header: Logo | HEXIS — alinhamento limpo, sem sobreposição */}
        <div className="flex items-center justify-center mb-8">
          <Image
            src="/hexis-logo.png"
            alt="HEXIS"
            width={96}
            height={96}
            className="object-contain w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0"
            priority
          />
          <div className="h-12 w-[1px] bg-white ml-0 mr-4 sm:ml-1 sm:mr-6 flex-shrink-0 sm:h-14" aria-hidden />
          <span className="text-[2.75rem] sm:text-[3.25rem] font-black uppercase tracking-wide flex-shrink-0" style={{ color: GOLD }}>
            HEXIS
          </span>
        </div>

        <h1
          className="text-3xl sm:text-4xl font-heading font-bold text-center mb-6 uppercase tracking-wide text-white"
          style={{
            textShadow: '0 0 1px rgba(229,192,110,1), 0 0 2px rgba(229,192,110,0.8), 1px 1px 0 rgba(229,192,110,0.6), -1px -1px 0 rgba(229,192,110,0.6), 1px -1px 0 rgba(229,192,110,0.6), -1px 1px 0 rgba(229,192,110,0.6)',
          }}
        >
          CRIAR CONTA
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div
              role="alert"
              className="px-4 py-3 rounded-xl bg-red-950/50 border border-red-800 text-red-300 text-sm"
            >
              {error}
            </div>
          )}

          <div>
            <label htmlFor="signup-full_name" className="block text-base font-semibold text-zinc-200 mb-2">
              Nome Completo
            </label>
            <Input
              id="signup-full_name"
              name="full_name"
              type="text"
              placeholder="Nome completo"
              required
              autoComplete="name"
              className="h-14 px-4 text-base rounded-xl bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-[#E5C06E]/50 focus-visible:border-[#E5C06E]"
            />
          </div>

          <div>
            <label htmlFor="signup-email" className="block text-base font-semibold text-zinc-200 mb-2">
              E-mail
            </label>
            <Input
              id="signup-email"
              name="email"
              type="email"
              placeholder="seu@email.com"
              required
              autoComplete="email"
              className="h-14 px-4 text-base rounded-xl bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-[#E5C06E]/50 focus-visible:border-[#E5C06E]"
            />
          </div>

          <div>
            <label htmlFor="signup-phone" className="block text-base font-semibold text-zinc-200 mb-2">
              Telefone
            </label>
            <Input
              id="signup-phone"
              name="phone"
              type="tel"
              placeholder="(00) 00000-0000"
              autoComplete="tel"
              className="h-14 px-4 text-base rounded-xl bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-[#E5C06E]/50 focus-visible:border-[#E5C06E]"
            />
          </div>

          <div>
            <label htmlFor="signup-password" className="block text-base font-semibold text-zinc-200 mb-2">
              Password
            </label>
            <Input
              id="signup-password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              autoComplete="new-password"
              minLength={6}
              className="h-14 px-4 text-base rounded-xl bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-[#E5C06E]/50 focus-visible:border-[#E5C06E]"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-14 rounded-full text-lg font-bold text-black disabled:opacity-60 hover:opacity-90 transition-all duration-300 shadow-[0_0_15px_rgba(229,192,110,0.6)] hover:shadow-[0_0_25px_rgba(229,192,110,0.8)]"
            style={{ backgroundColor: GOLD }}
          >
            {loading ? 'Criando conta...' : 'Cadastrar'}
          </Button>
        </form>

        <p className="text-center text-base text-zinc-400 mt-8">
          Já tem conta?{' '}
          <Link href="/login" className="font-bold hover:underline text-base" style={{ color: GOLD }}>
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
