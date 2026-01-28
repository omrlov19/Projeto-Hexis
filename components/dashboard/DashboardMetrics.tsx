'use client'

import { useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { DashboardMetrics } from '@/app/actions/dashboard'

interface DashboardMetricsProps {
  metrics: DashboardMetrics
}

// Componente de Círculo de Progresso (Anel SVG) - CORES HARDCODED
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
  const circumference = 2 * Math.PI * 45 // raio = 45
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32">
        <svg className="transform -rotate-90 w-32 h-32" viewBox="0 0 100 100">
          {/* Círculo de fundo - Trilha CINZA VISÍVEL */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#333333"
            strokeWidth="8"
            strokeOpacity="1"
          />
          {/* Círculo de progresso - COR HARDCODED */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={strokeColor}
            strokeWidth="8"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            strokeOpacity="1"
            className="transition-all duration-500"
          />
        </svg>
        {/* Texto central - BRANCO PURO */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-heading font-bold" style={{ color: '#ffffff' }}>
            {value}
          </span>
          {max > 0 && (
            <span className="text-sm font-mono" style={{ color: '#ffffff' }}>
              /{max}
            </span>
          )}
        </div>
      </div>
      <div className="mt-4 text-center">
        <p className="text-sm font-serif uppercase tracking-wider" style={{ color: '#ffffff' }}>
          {label}
        </p>
        <p className="text-xs mt-1" style={{ color: '#cccccc' }}>
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

  return (
    <div className="space-y-8 border border-red-500">
      {/* A Trindade - Grid de 3 Círculos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Círculo 1: HÁBITOS */}
        <div
          className="rounded-xl p-6"
          style={{ backgroundColor: '#111111', border: '1px solid #333333' }}
        >
          <ProgressRing
            value={today.completedHabits}
            max={today.totalHabits}
            label="HÁBITOS"
            subtitle={`${today.productivityScore}% concluído`}
            strokeColor={habitStrokeColor}
          />
        </div>

        {/* Círculo 2: FOCO */}
        <div
          className="rounded-xl p-6"
          style={{ backgroundColor: '#111111', border: '1px solid #333333' }}
        >
          <div className="flex flex-col items-center">
            <div className="relative w-32 h-32">
              <svg className="transform -rotate-90 w-32 h-32" viewBox="0 0 100 100">
                {/* Trilha de fundo - CINZA VISÍVEL */}
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#333333"
                  strokeWidth="8"
                  strokeOpacity="1"
                />
                {/* Progresso - BRANCO */}
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke={focusStrokeColor}
                  strokeWidth="8"
                  strokeDasharray={2 * Math.PI * 45}
                  strokeDashoffset={
                    2 * Math.PI * 45 - ((today.focusMinutes / 480) * 100 * (2 * Math.PI * 45)) / 100
                  }
                  strokeLinecap="round"
                  strokeOpacity="1"
                  className="transition-all duration-500"
                />
              </svg>
              {/* Texto central - BRANCO PURO */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-heading font-bold" style={{ color: '#ffffff' }}>
                  {formatFocusTime(today.focusMinutes)}
                </span>
              </div>
            </div>
            <div className="mt-4 text-center">
              <p className="text-sm font-serif uppercase tracking-wider" style={{ color: '#ffffff' }}>
                FOCO
              </p>
              <p className="text-xs mt-1" style={{ color: '#cccccc' }}>
                Tempo focado hoje
              </p>
            </div>
          </div>
        </div>

        {/* Círculo 3: NÍVEL */}
        <div
          className="rounded-xl p-6"
          style={{ backgroundColor: '#111111', border: '1px solid #333333' }}
        >
          <ProgressRing
            value={today.productivityScore}
            max={100}
            label="NÍVEL"
            subtitle="Produtividade"
            strokeColor={levelStrokeColor}
          />
        </div>
      </div>

      {/* O Gráfico de Desempenho */}
      <div
        className="rounded-xl p-6"
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
