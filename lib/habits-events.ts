/**
 * Sistema de Eventos para Sincronização de Hábitos
 * 
 * Dispara eventos customizados quando hábitos são criados, atualizados ou deletados,
 * permitindo que componentes (como Focus Mode) atualizem seus dados automaticamente.
 */

export const HABITS_CHANGED_EVENT = 'habits-changed'

/**
 * Dispara um evento customizado indicando que os hábitos foram modificados
 * @param action - Tipo de ação: 'create' | 'update' | 'delete'
 */
export function emitHabitsChanged(action: 'create' | 'update' | 'delete') {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent(HABITS_CHANGED_EVENT, {
      detail: { action, timestamp: Date.now() }
    })
    window.dispatchEvent(event)
  }
}
