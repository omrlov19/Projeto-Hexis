'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export type LoginState = { error?: string }
export type SignupState = { error?: string }

/**
 * Login com email/senha. Redireciona para /dashboard em sucesso.
 */
export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!email || !password) {
    return { error: 'Preencha e-mail e senha.' }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: error.message }
  }

  redirect('/dashboard')
}

/**
 * Cadastro com full_name, email, phone, password.
 * Dados extras em options.data para o Trigger preencher public.profiles.
 */
export async function signup(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const full_name = String(formData.get('full_name') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  const phone = String(formData.get('phone') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!full_name || !email || !password) {
    return { error: 'Preencha nome, e-mail e senha.' }
  }

  const supabase = await createClient()

  const { data: authData, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name,
        phone: phone || undefined,
      },
    },
  })

  if (error) {
    return { error: error.message }
  }

  // Salvar na tabela hexis_profiles
  if (authData?.user) {
    try {
      await supabase.from('hexis_profiles').insert({
        user_id: authData.user.id,
        full_name,
        phone_number: phone || null,
      })
    } catch (err) {
      console.error('Erro ao salvar hexis_profile no signup:', err)
    }
  }

  redirect('/dashboard')
}
