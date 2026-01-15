/**
 * Utilitário para trabalhar com datas no fuso horário de Brasília (America/Sao_Paulo)
 * Resolve problemas de diferença de dia quando o servidor roda em UTC
 */

export function getBrasiliaDate(): Date {
  const now = new Date()
  
  // Força a conversão para o fuso de SP
  // Extrai os componentes da data no fuso horário de Brasília
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  
  const parts = formatter.formatToParts(now)
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '0')
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '0') - 1 // Month é 0-indexed
  const day = parseInt(parts.find(p => p.type === 'day')?.value || '0')
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0')
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0')
  const second = parseInt(parts.find(p => p.type === 'second')?.value || '0')
  
  // Cria um novo Date localmente com os componentes de Brasília
  // Isso garante que a data (ano, mês, dia) seja correta, independente do fuso do servidor
  return new Date(year, month, day, hour, minute, second)
}

/**
 * Formata uma data para o formato YYYY-MM-DD no fuso horário de Brasília
 */
export function formatBrasiliaDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Cria uma data a partir de uma string YYYY-MM-DD no fuso horário de Brasília
 */
export function parseBrasiliaDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number)
  // Cria a data no fuso local (que deve ser Brasília no cliente ou UTC no servidor)
  // Mas vamos garantir que seja interpretada corretamente
  const date = new Date(year, month - 1, day)
  // Normalizar para meia-noite
  date.setHours(0, 0, 0, 0)
  return date
}
