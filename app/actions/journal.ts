'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function saveJournalEntry(
  dateString: string,
  content: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Usuário não autenticado' }
    }

    const { data: existingEntry } = await supabase
      .from('hexis_journal_entries')
      .select('id')
      .eq('user_id', user.id)
      .eq('date', dateString)
      .maybeSingle()

    let error

    if (existingEntry) {
      const result = await supabase
        .from('hexis_journal_entries')
        .update({ content })
        .eq('id', existingEntry.id)
      error = result.error
    } else {
      const result = await supabase
        .from('hexis_journal_entries')
        .insert({
          user_id: user.id,
          date: dateString,
          content,
        })
      error = result.error
    }

    if (error) {
      console.error('❌ ERRO ao salvar journal:', error)
      return { success: false, error: error.message || 'Falha ao salvar journal' }
    }

    // Revalida a dashboard para atualizar o status do journal
    revalidatePath('/home')

    return { success: true }
  } catch (error: any) {
    console.error('❌ ERRO CRÍTICO ao salvar journal:', error)
    return { success: false, error: error?.message || 'Erro ao salvar journal' }
  }
}

export async function getJournalEntries(): Promise<{
  success: boolean
  data?: any[]
  error?: string
}> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Usuário não autenticado' }
    }

    const { data, error } = await supabase
      .from('hexis_journal_entries')
      .select('date, content')
      .eq('user_id', user.id)

    if (error) {
      console.error('❌ ERRO ao carregar journal:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data || [] }
  } catch (error: any) {
    console.error('❌ ERRO CRÍTICO ao carregar journal:', error)
    return { success: false, error: error?.message || 'Erro ao carregar journal' }
  }
}

export async function deleteJournalEntry(
  dateString: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Usuário não autenticado' }
    }

    const { error } = await supabase
      .from('hexis_journal_entries')
      .delete()
      .eq('user_id', user.id)
      .eq('date', dateString)

    if (error) {
      console.error('❌ ERRO ao deletar journal:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/home')

    return { success: true }
  } catch (error: any) {
    console.error('❌ ERRO CRÍTICO ao deletar journal:', error)
    return { success: false, error: error?.message || 'Erro ao deletar journal' }
  }
}
