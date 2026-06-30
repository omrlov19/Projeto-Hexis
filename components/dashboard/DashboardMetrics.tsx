'use client'

import { useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { DashboardMetrics } from '@/app/actions/dashboard'

interface DashboardMetricsProps {
  metrics: DashboardMetrics
}

// Escala dos anéis (discretos: w-20 = 80px)
const RING_SIZE = 80
const RING_RADIUS = 38

// Componente de Círculo de Progresso (Anel SVG) - Escala reduzida para layout compacto
function ProgressRing({
  value,
  max,
  label,
  subtitle,
  strokeColor = '#d4af37',
}: {
  value: number
  max: number
  label: string
  subtitle: string
  strokeColor?: string
}) {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0
  const circumference = 2 * Math.PI * RING_RADIUS
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: RING_SIZE, height: RING_SIZE }}>
        <svg
          className="transform -rotate-90"
          width={RING_SIZE}
          height={RING_SIZE}
          viewBox="0 0 100 100"
        >
          <circle
            cx="50"
            cy="50"
            r={RING_RADIUS}
            fill="none"
            stroke="#333333"
            strokeWidth="6"
            strokeOpacity="1"
          />
          <circle
            cx="50"
            cy="50"
            r={RING_RADIUS}
            fill="none"
            stroke={strokeColor}
            strokeWidth="6"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            strokeOpacity="1"
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-heading font-bold leading-none" style={{ color: '#ffffff' }}>
            {value}
          </span>
          {max > 0 && (
            <span className="text-xs font-mono mt-0.5" style={{ color: '#ffffff' }}>
              /{max}
            </span>
          )}
        </div>
      </div>
      <div className="mt-2 text-center">
        <p className="text-xs font-serif uppercase tracking-wider" style={{ color: '#ffffff' }}>
          {label}
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: '#cccccc' }}>
          {subtitle}
        </p>
      </div>
    </div>
  )
}

// Função para formatar minutos em horas e minutos
function formatFocusTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

export default function DashboardMetrics({ metrics }: DashboardMetricsProps) {
  const { today, history } = metrics

  // Preparar dados do gráfico (últimos 7 dias para visualização)
  const chartData = useMemo(() => {
    const last7Days = history.slice(-7)
    return last7Days.map((item) => ({
      date: item.date,
      score: item.score,
    }))
  }, [history])

  // Cores HARDCODED para os círculos
  const habitStrokeColor = '#d4af37' // Ouro
  const focusStrokeColor = '#ffffff' // Branco
  const levelStrokeColor = '#ff4444' // Vermelho

  // Referência máxima para o anel de foco (8h = 480 min) para escala visual
  const focusMaxMinutes = 480
  const focusPercentage = Math.min(100, (today.focusMinutes / focusMaxMinutes) * 100)
  const focusCircumference = 2 * Math.PI * RING_RADIUS
  const focusStrokeDashoffset =
    focusCircumference - (focusPercentage / 100) * focusCircumference

  return (
    <div className="space-y-6">
      {/* Cards de métricas: lado a lado (flex-row, círculos pequenos) */}
      <div className="flex flex-row justify-between items-center gap-4">
        {/* Círculo 1: HÁBITOS — habitsCount/habitsTotal (barra = % real) */}
        <div
          className="rounded-xl p-3 flex flex-col items-center justify-center flex-1 min-w-0"
          style={{ backgroundColor: '#111111', border: '1px solid #333333' }}
        >
          <ProgressRing
            value={today.completed}
            max={today.total}
            label="HÁBITOS"
            subtitle={`${today.score}% concluído`}
            strokeColor={habitStrokeColor}
          />
        </div>

        {/* Círculo 2: FOCO — focusMinutes */}
        <div
          className="rounded-xl p-3 flex flex-col items-center justify-center flex-1 min-w-0"
          style={{ backgroundColor: '#111111', border: '1px solid #333333' }}
        >
          <div className="flex flex-col items-center">
            <div className="relative" style={{ width: RING_SIZE, height: RING_SIZE }}>
              <svg
                className="transform -rotate-90"
                width={RING_SIZE}
                height={RING_SIZE}
                viewBox="0 0 100 100"
              >
                <circle
                  cx="50"
                  cy="50"
                  r={RING_RADIUS}
                  fill="none"
                  stroke="#333333"
                  strokeWidth="6"
                  strokeOpacity="1"
                />
                <circle
                  cx="50"
                  cy="50"
                  r={RING_RADIUS}
                  fill="none"
                  stroke={focusStrokeColor}
                  strokeWidth="6"
                  strokeDasharray={focusCircumference}
                  strokeDashoffset={focusStrokeDashoffset}
                  strokeLinecap="round"
                  strokeOpacity="1"
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span
                  className="text-lg font-heading font-bold leading-none"
                  style={{ color: '#ffffff' }}
                >
                  {formatFocusTime(today.focusMinutes)}
                </span>
              </div>
            </div>
            <div className="mt-2 text-center">
              <p
                className="text-xs font-serif uppercase tracking-wider"
                style={{ color: '#ffffff' }}
              >
                FOCO
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: '#cccccc' }}>
                Tempo focado hoje
              </p>
            </div>
          </div>
        </div>

        {/* Círculo 3: NÍVEL — (habitsCount/habitsTotal)*100 */}
        <div
          className="rounded-xl p-3 flex flex-col items-center justify-center flex-1 min-w-0"
          style={{ backgroundColor: '#111111', border: '1px solid #333333' }}
        >
          <ProgressRing
            value={today.score}
            max={100}
            label="NÍVEL"
            subtitle="Produtividade"
            strokeColor={levelStrokeColor}
          />
        </div>
      </div>

      {/* Gráfico principal: abaixo das métricas, largura total */}
      <div
        className="rounded-xl p-4 sm:p-6 w-full"
        style={{ backgroundColor: '#111111', border: '1px solid #333333' }}
      >
        <h2
          className="text-2xl font-heading uppercase tracking-widest mb-6 text-center"
          style={{ color: '#d4af37' }}
        >
          CONSISTÊNCIA
        </h2>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
              <defs>
                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#d4af37" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#d4af37" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fill: '#ffffff', fontSize: 11 }}
                axisLine={{ stroke: '#666666' }}
                tickLine={{ stroke: '#666666' }}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: '#ffffff', fontSize: 11 }}
                axisLine={{ stroke: '#666666' }}
                tickLine={{ stroke: '#666666' }}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#111111',
                  border: '1px solid #d4af37',
                  borderRadius: '8px',
                  color: '#d4af37',
                }}
                labelStyle={{ color: '#d4af37', fontFamily: 'var(--font-heading)', fontSize: '12px' }}
                formatter={(value: number) => [`${value}%`, 'Score']}
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke="#d4af37"
                strokeWidth={3}
                fill="url(#colorScore)"
                dot={false}
                activeDot={{ r: 5, fill: '#d4af37' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
