'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Habit, HabitWithStatus } from '@/types/hexis'

export async function getHabits(dateString: string): Promise<{
  success: boolean
  data?: HabitWithStatus[]
  error?: string
}> {
  try {
    const supabase = await createClient()

    // Validar usuário autenticado
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: true, data: [] }
    }

    // ============================================
    // PASSO 1: Descobrir o Dia da Semana
    // ============================================
    // Usar split para evitar problemas de timezone com new Date()
    // dateString está no formato YYYY-MM-DD
    const [year, month, day] = dateString.split('-').map(Number)
    const contextDate = new Date(year, month - 1, day) // month é 0-indexed
    const todayIndex = contextDate.getDay() // 0 = domingo, 1 = segunda, etc. (0-6)
    // Converter para string para comparação segura
    const todayStr = String(todayIndex) // "0", "1", "2", etc.
    // Mapa: 0=sun, 1=mon, 2=tue, 3=wed, 4=thu, 5=fri, 6=sat (mantido para compatibilidade)
    const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
    const currentDayName = dayNames[todayIndex]

    // ============================================
    // PASSO 2A: Buscar TODOS os Hábitos do Usuário
    // ============================================
    const { data: allHabits, error: habitsError } = await supabase
      .from('hexis_habits')
      .select('*')
      .eq('user_id', user.id)

    if (habitsError || !allHabits || allHabits.length === 0) {
      return { success: true, data: [] }
    }

    // ============================================
    // PASSO 2B: Buscar Tracking Apenas para a Data Solicitada
    // ============================================
    const habitIds = allHabits.map((h) => h.id)
    const { data: trackingRecords, error: trackingError } = await supabase
      .from('hexis_daily_tracking')
      .select('habit_id, completed, achieved_value, achieved_unit')
      .eq('user_id', user.id)
      .eq('date', dateString) // Filtro estrito: apenas tracking da data solicitada
      .in('habit_id', habitIds)

    // Criar mapa de tracking (habit_id -> tracking data)
    const trackingMap = new Map()
    if (!trackingError && trackingRecords) {
      trackingRecords.forEach((tracking) => {
        trackingMap.set(tracking.habit_id, {
          completed: tracking.completed || false,
          achieved_value: tracking.achieved_value || null,
          achieved_unit: tracking.achieved_unit || null,
        })
      })
    }

    // ============================================
    // PASSO 3: Filtragem e Fusão (O Cérebro)
    // ============================================
    const habitsWithStatus: HabitWithStatus[] = []

    for (const habit of allHabits) {
      const frequencyDays = habit.frequency_days as number[] | string[] | null | undefined
      
      // Extrair data de criação do hábito (para rede de segurança)
      const habitCreatedAtISO = habit.created_at
      const habitCreatedDate = habitCreatedAtISO.split('T')[0] // Extrair YYYY-MM-DD

      // REGRA 1: Recorrência (Filtro de Dias da Semana)
      // CORREÇÃO CRÍTICA: Normalização robusta de tipos
      let shouldShow = false
      
      // Fallback de Nulo: Se frequency_days for null ou array vazio -> MOSTRAR (Hábito diário)
      if (frequencyDays === null || !Array.isArray(frequencyDays) || frequencyDays.length === 0) {
        shouldShow = true
      } else {
        // Normalize a comparação: Converter tudo para String
        // Lógica equivalente a: habit.frequency_days?.map(String).includes(String(dayOfWeek))
        const frequencyDaysAsStrings = frequencyDays.map(d => {
          // Se for número, converter para string
          if (typeof d === 'number') {
            return String(d)
          }
          // Se for string, verificar se é nome do dia ('sun', 'mon', etc) ou número ("0", "1", etc)
          const dayMap: Record<string, string> = {
            'sun': '0', 'mon': '1', 'tue': '2', 'wed': '3', 'thu': '4', 'fri': '5', 'sat': '6'
          }
          const dayLower = String(d).toLowerCase()
          // Se for nome do dia, converter para número string
          if (dayMap[dayLower] !== undefined) {
            return dayMap[dayLower]
          }
          // Se já for número string ("0", "1", etc), usar diretamente
          return String(d)
        })
        
        // Comparação normalizada: todayStr já é string ("0"-"6"), frequencyDaysAsStrings também
        const dayOfWeekStr = String(todayIndex) // Garantir que é string
        shouldShow = frequencyDaysAsStrings.includes(dayOfWeekStr)
      }

      // Rede de Segurança (Vital): Se created_at === dateString -> MOSTRAR SEMPRE
      // Isso impede que um hábito recém-criado desapareça imediatamente
      if (!shouldShow && habitCreatedDate === dateString) {
        shouldShow = true
      }

      if (!shouldShow) {
        continue // Descarta este hábito
      }

      // REGRA 2: História
      // created_at do hábito deve ser <= dateString
      // (Nota: habitCreatedDate já foi extraído acima na linha 84)
      if (habitCreatedDate > dateString) {
        continue // Hábito criado no futuro em relação à data solicitada
      }

      // REGRA 3: Status do Dia (O Reset)
      // Procura no array do Passo B se existe registro para este habit_id
      const tracking = trackingMap.get(habit.id)
      
      // Se achou: completed = true (ou o valor do banco)
      // Se NÃO achou: completed = false (Aqui acontece o "Reset Automático")
      habitsWithStatus.push({
        ...habit,
        completed: tracking?.completed ?? false,
        achieved_value: tracking?.achieved_value ?? null,
        achieved_unit: tracking?.achieved_unit ?? null,
      })
    }

    // ============================================
    // PASSO 4: Ordenação
    // ============================================
    // Ordenar por position ASC, depois created_at ASC
    habitsWithStatus.sort((a, b) => {
      const positionA = a.position ?? 999999
      const positionB = b.position ?? 999999
      
      if (positionA !== positionB) {
        return positionA - positionB
      }
      
      // Desempate: created_at ASC
      const createdAtA = new Date(a.created_at).getTime()
      const createdAtB = new Date(b.created_at).getTime()
      return createdAtA - createdAtB
    })

    return { success: true, data: habitsWithStatus }
  } catch (error: any) {
    console.error('❌ ERRO CRÍTICO: Exceção ao buscar hábitos', error?.message, error)
    return { success: true, data: [] }
  }
}

export async function toggleHabit(
  habitId: string,
  dateString: string,
  value?: number,
  unit?: string,
  forceStatus?: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('❌ ERRO: Usuário não logado', { authError })
      return { success: false, error: 'Usuário não autenticado' }
    }

    // Verificar se o hábito pertence ao usuário
    const { data: habit, error: habitError } = await supabase
      .from('hexis_habits')
      .select('id, user_id, target_value, target_unit')
      .eq('id', habitId)
      .eq('user_id', user.id)
      .single()

    if (habitError || !habit) {
      console.error('❌ ERRO: Hábito não encontrado', { habitError, habitId, userId: user.id })
      return { success: false, error: 'Hábito não encontrado' }
    }

    // Normalizar data para YYYY-MM-DD
    const normalizedDate = dateString.split('T')[0].split(' ')[0]
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
      console.error('❌ ERRO: Formato de data inválido', { dateString, normalizedDate })
      return { success: false, error: 'Formato de data inválido. Esperado: YYYY-MM-DD' }
    }

    // Preparar dados
    const updates: {
      habit_id: string
      date: string
      user_id: string
      updated_at: string
      completed?: boolean
      achieved_value?: number
      achieved_unit?: string
    } = {
      habit_id: habitId,
      date: normalizedDate,
      user_id: user.id,
      updated_at: new Date().toISOString(),
    }

    // Lógica de Tempo vs Check
    // AÇÃO 2: Se value for enviado (mesmo que seja 0), atualiza achieved_value
    // Em JavaScript, 0 !== undefined é true, então value === 0 é tratado corretamente
    if (value !== undefined) {
      // Sempre atualiza achieved_value quando value é fornecido (incluindo 0)
      updates.achieved_value = value
      
      // Buscar meta para calcular completude
      const target = habit.target_value || 1
      const targetUnit = habit.target_unit || 'minutos'
      
      // Converter para minutos para comparação
      let comparisonValue = value
      if (unit === 'horas') {
        comparisonValue = value * 60
      }
      
      let comparisonTarget = target
      if (targetUnit === 'horas') {
        comparisonTarget = target * 60
      }

      // Calcular se completou
      // Se value === 0, completed sempre será false
      updates.completed = comparisonTarget > 0 ? comparisonValue >= comparisonTarget : false
      
      // Se value é 0 (reset), zera também a unidade. Caso contrário, usa a unidade fornecida ou mantém a do hábito
      if (value === 0) {
        updates.achieved_unit = null as any
      } else {
        updates.achieved_unit = unit || habit.target_unit || (null as any)
      }
    } else {
      // Para checks simples (quando value não é fornecido)
      updates.completed = forceStatus !== undefined ? forceStatus : true
    }

    // Executar UPSERT
    const { data: upsertData, error: upsertError } = await supabase
      .from('hexis_daily_tracking')
      .upsert(updates, { onConflict: 'habit_id, date' })
      .select()

    if (upsertError) {
      console.error('❌ ERRO CRÍTICO SUPABASE:', upsertError.message, upsertError.details)
      return { success: false, error: upsertError.message || 'Falha ao salvar hábito' }
    } else {
      console.log('✅ SUCESSO: Hábito salvo no banco.', { upsertData })
    }

    revalidatePath('/home')
    revalidatePath('/')

    return { success: true }
  } catch (error: any) {
    console.error('❌ ERRO CRÍTICO: Exceção não tratada', error?.message, error)
    return { success: false, error: error?.message || 'Erro ao alternar hábito' }
  }
}

export async function deleteHabit(
  habitId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    // Validar usuário autenticado
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Usuário não autenticado' }
    }

    // Verificar se o hábito pertence ao usuário
    const { data: habit, error: habitError } = await supabase
      .from('hexis_habits')
      .select('id, user_id')
      .eq('id', habitId)
      .eq('user_id', user.id)
      .single()

    if (habitError || !habit) {
      return { success: false, error: 'Hábito não encontrado ou não pertence ao usuário' }
    }

    // Tentar deletar os tracking primeiro (caso CASCADE não esteja configurado)
    const { error: trackingDeleteError } = await supabase
      .from('hexis_daily_tracking')
      .delete()
      .eq('habit_id', habitId)

    // Se houver erro ao deletar tracking e não for porque não existe, logar mas continuar
    if (trackingDeleteError && trackingDeleteError.code !== 'PGRST116') {
      console.warn('⚠️ Aviso: Erro ao deletar tracking (pode ser CASCADE):', trackingDeleteError.message)
    }

    // Deletar o hábito
        const { error: deleteError } = await supabase
      .from('hexis_habits')
          .delete()
      .eq('id', habitId)
      .eq('user_id', user.id)

        if (deleteError) {
      console.error('❌ ERRO: Falha ao deletar hábito', { deleteError, habitId, userId: user.id })
      return { success: false, error: deleteError.message || 'Falha ao deletar hábito' }
    }

    // Revalidar o path
    revalidatePath('/home')
    revalidatePath('/')

    return { success: true }
  } catch (error: any) {
    console.error('❌ ERRO CRÍTICO: Exceção ao deletar hábito', error?.message, error)
    return { success: false, error: error?.message || 'Erro ao deletar hábito' }
  }
}

export async function createHabit(data: {
  title: string
  icon?: string
  color?: string
  category?: string
  period?: string
  target_value?: number
  target_unit?: string
  goal_type?: string
  frequency_days?: number[] | string[] // Aceita números (0-6) ou strings ('sun', 'mon')
  notification_time?: string
}): Promise<{
  success: boolean
  data?: Habit
  error?: string
}> {
  try {
    const supabase = await createClient()

    // Validar usuário autenticado
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Usuário não autenticado' }
    }

    // Validar título
    if (!data.title || data.title.trim().length === 0) {
      return { success: false, error: 'Título do hábito é obrigatório' }
    }

    // AÇÃO 3: Criar hábito com retorno dos dados criados
    // notification_time será salvo se o banco tiver a coluna, caso contrário será ignorado
    const insertData: any = {
      user_id: user.id,
      title: data.title.trim(),
      goal_value: data.target_value || 1,
      icon: data.icon || null,
      color: data.color || null,
      category: data.category || null,
      period: data.period || null,
      target_value: data.target_value || null,
      target_unit: data.target_unit || null,
      goal_type: data.goal_type || null,
      // CORREÇÃO DE BUILD: Converter para string[] para compatibilidade com banco
      frequency_days: data.frequency_days && data.frequency_days.length > 0 
        ? data.frequency_days.map(String) // Converter number[] ou string[] para string[]
        : null,
    }
    
    // AÇÃO 3: Adicionar notification_time se fornecido (pode não existir no banco ainda)
    if (data.notification_time) {
      insertData.notification_time = data.notification_time
    }
    
    // AÇÃO 1: Debug - Log detalhado antes do insert
    console.log('🔵 [createHabit] TENTANDO CRIAR HÁBITO:', {
      title: insertData.title,
      frequency_days: insertData.frequency_days,
      frequency_days_type: typeof insertData.frequency_days?.[0],
      frequency_days_length: insertData.frequency_days?.length,
      user_id: insertData.user_id,
      full_data: JSON.stringify(insertData, null, 2)
    })
    
    const { data: createdHabit, error: insertError } = await supabase
      .from('hexis_habits')
      .insert(insertData)
      .select()
      .single()

    // AÇÃO 1: Debug - Log após o insert
    if (insertError) {
      console.error('❌ [createHabit] ERRO AO CRIAR HÁBITO:', {
        error: insertError,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code,
        insertData: JSON.stringify(insertData, null, 2)
      })
      return { success: false, error: insertError?.message || 'Falha ao criar hábito' }
    }
    
    if (!createdHabit) {
      console.error('❌ [createHabit] HÁBITO NÃO FOI CRIADO (sem erro, mas sem dados):', {
        insertData: JSON.stringify(insertData, null, 2)
      })
      return { success: false, error: 'Falha ao criar hábito' }
    }
    
    // AÇÃO 1: Debug - Log de sucesso
    console.log('✅ [createHabit] HÁBITO CRIADO COM SUCESSO:', {
      id: createdHabit.id,
      title: createdHabit.title,
      frequency_days: createdHabit.frequency_days,
      frequency_days_type: typeof createdHabit.frequency_days?.[0],
      created_at: createdHabit.created_at,
      full_habit: JSON.stringify(createdHabit, null, 2)
    })

    // Revalidar as rotas (secundário, pois o retorno dos dados é prioritário)
    revalidatePath('/home')
    revalidatePath('/')

    // Retornar o hábito criado
    return { success: true, data: createdHabit as Habit }
  } catch (error: any) {
    return { success: false, error: error?.message || 'Erro ao criar hábito' }
  }
}

export async function updateHabit(
  id: string,
  data: {
    title?: string
    icon?: string
    color?: string
    category?: string
    period?: string
    target_value?: number
    target_unit?: string
    goal_type?: string
    frequency_days?: number[] | string[] // Aceita números (0-6) ou strings ('sun', 'mon')
    notification_time?: string
  }
): Promise<{
  success: boolean
  data?: Habit
  error?: string
}> {
  try {
    const supabase = await createClient()

    // Validar usuário autenticado
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Usuário não autenticado' }
    }

    // Verificar se o hábito existe e pertence ao usuário
    const { data: existingHabit, error: habitError } = await supabase
      .from('hexis_habits')
      .select('id, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (habitError || !existingHabit) {
      return { success: false, error: 'Hábito não encontrado ou não pertence ao usuário' }
    }

    // Validar título se fornecido
    if (data.title !== undefined && (!data.title || data.title.trim().length === 0)) {
      return { success: false, error: 'Título do hábito não pode ser vazio' }
    }

    // Preparar objeto de atualização (apenas campos fornecidos)
    const updates: {
      title?: string
      icon?: string | null
      color?: string | null
      category?: string | null
      period?: string | null
      target_value?: number | null
      goal_value?: number
      target_unit?: string | null
      goal_type?: string | null
      frequency_days?: string[] | null
      notification_time?: string | null
    } = {}

    if (data.title !== undefined) {
      updates.title = data.title.trim()
    }
    if (data.icon !== undefined) {
      updates.icon = data.icon || null
    }
    if (data.color !== undefined) {
      updates.color = data.color || null
    }
    if (data.category !== undefined) {
      updates.category = data.category || null
    }
    if (data.period !== undefined) {
      updates.period = data.period || null
    }
    if (data.target_value !== undefined) {
      updates.target_value = data.target_value || null
      updates.goal_value = data.target_value || 1
    }
    if (data.target_unit !== undefined) {
      updates.target_unit = data.target_unit || null
    }
    if (data.goal_type !== undefined) {
      updates.goal_type = data.goal_type || null
    }
    if (data.frequency_days !== undefined) {
      // CORREÇÃO DE BUILD: Converter para string[] para compatibilidade com tipo esperado
      updates.frequency_days =
        data.frequency_days && data.frequency_days.length > 0 
          ? data.frequency_days.map(String) // Converter number[] ou string[] para string[]
          : null
    }
    // AÇÃO 3: Adicionar notification_time se fornecido
    if (data.notification_time !== undefined) {
      updates.notification_time = data.notification_time || null
    }

    // Verificar se há algo para atualizar
    if (Object.keys(updates).length === 0) {
      return { success: false, error: 'Nenhum campo fornecido para atualização' }
    }

    // Atualizar hábito
    const { data: updatedHabit, error: updateError } = await supabase
      .from('hexis_habits')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id) // Garantir segurança adicional
      .select()
      .single()

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    // Revalidar as rotas para forçar atualização do cache
    revalidatePath('/home')
    revalidatePath('/')

    return { success: true, data: updatedHabit as Habit }
  } catch (error: any) {
    return { success: false, error: error?.message || 'Erro ao atualizar hábito' }
  }
}

export async function getAllHabits(): Promise<{
  success: boolean
  data?: Habit[]
  error?: string
}> {
  try {
    const supabase = await createClient()

    // Validar usuário autenticado
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: true, data: [] }
    }

    // Buscar TODOS os hábitos do usuário (sem filtro de data ou frequency_days)
    const { data: allHabits, error: habitsError } = await supabase
      .from('hexis_habits')
      .select('*')
      .eq('user_id', user.id)
      .order('position', { ascending: true })

    if (habitsError) {
      console.error('Erro ao buscar hábitos:', habitsError)
      return { success: false, error: habitsError.message }
    }

    return { success: true, data: allHabits || [] }
  } catch (error: any) {
    console.error('❌ ERRO CRÍTICO: Exceção ao buscar todos os hábitos', error?.message, error)
    return { success: false, error: error?.message || 'Erro ao buscar hábitos' }
  }
}

export async function reorderHabits(
  items: { id: string; position: number }[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    // Validar usuário autenticado
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Usuário não autenticado' }
    }

    // Validar entrada
    if (!items || items.length === 0) {
      return { success: false, error: 'Lista de hábitos vazia' }
    }

    // Verificar se todos os hábitos pertencem ao usuário
    const habitIds = items.map((item) => item.id)
    const { data: habits, error: habitsError } = await supabase
      .from('hexis_habits')
      .select('id, user_id')
      .in('id', habitIds)
      .eq('user_id', user.id)

    if (habitsError) {
      return { success: false, error: habitsError.message || 'Erro ao verificar hábitos' }
    }

    // Verificar se todos os IDs fornecidos pertencem ao usuário
    const userHabitIds = new Set(habits?.map((h) => h.id) || [])
    const invalidIds = habitIds.filter((id) => !userHabitIds.has(id))

    if (invalidIds.length > 0) {
      return {
        success: false,
        error: `Alguns hábitos não pertencem ao usuário: ${invalidIds.join(', ')}`,
      }
    }

    // Atualizar posições usando Promise.all para performance
    const updatePromises = items.map((item) =>
      supabase
        .from('hexis_habits')
        .update({ position: item.position })
        .eq('id', item.id)
        .eq('user_id', user.id) // Garantir segurança adicional
    )

    const results = await Promise.all(updatePromises)

    // Verificar se algum update falhou
    const failedUpdates = results.filter((result) => result.error)
    if (failedUpdates.length > 0) {
      const errors = failedUpdates.map((r) => r.error?.message).filter(Boolean)
      console.error('❌ ERRO: Falha ao atualizar algumas posições', { errors })
      return {
        success: false,
        error: `Falha ao atualizar posições: ${errors.join(', ')}`,
      }
    }

    // Revalidar o path
    revalidatePath('/home')
    revalidatePath('/')

    return { success: true }
  } catch (error: any) {
    console.error('❌ ERRO CRÍTICO: Exceção ao reordenar hábitos', error?.message, error)
    return { success: false, error: error?.message || 'Erro ao reordenar hábitos' }
  }
}
