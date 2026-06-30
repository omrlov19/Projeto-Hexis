'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'

type HistoryItem = { date: string; score: number }

function SkeletonGraph() {
  return (
    <div className="rounded-3xl bg-zinc-900 border border-zinc-700 p-5 w-full animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 w-24 bg-zinc-800 rounded" />
        <div className="flex rounded-lg bg-zinc-800 p-0.5 gap-1">
          <div className="h-8 w-20 bg-zinc-700 rounded-md" />
          <div className="h-8 w-20 bg-zinc-700 rounded-md" />
        </div>
      </div>
      <div className="h-48 w-full bg-zinc-800/50 rounded-lg" />
    </div>
  )
}

export function ConsistencySection() {
  const router = useRouter()
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [chartRange, setChartRange] = useState<'weekly' | 'monthly'>('weekly')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/dashboard?scope=history')
      .then((res) => {
        if (res.status === 401) {
          router.push('/login')
          return null
        }
        return res.json()
      })
      .then((data) => {
        if (cancelled || !data) return
        if (data.success) setHistory(data.history ?? [])
        else setError(data.error ?? 'Erro ao carregar gráfico')
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? 'Erro ao carregar gráfico')
      })
    return () => { cancelled = true }
  }, [router])

  const chartData = (chartRange === 'weekly' ? history.slice(-7) : history).map((item) => ({
    date: item.date,
    score: item.score,
  }))

  if (error) {
    return (
      <div className="rounded-3xl bg-zinc-900 border border-zinc-700 p-5 w-full">
        <p className="text-center text-zinc-500 text-sm py-8">{error}</p>
      </div>
    )
  }

  if (chartData.length === 0) {
    return <SkeletonGraph />
  }

  return (
    <div className="rounded-3xl bg-zinc-900 border border-zinc-700 p-5 w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wide">
          Consistência
        </h2>
        <div className="flex rounded-lg bg-zinc-800 p-0.5">
          <button
            type="button"
            onClick={() => setChartRange('weekly')}
            className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wide rounded-md transition-colors ${
              chartRange === 'weekly'
                ? 'bg-[#D4AF37] text-black'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Semanal
          </button>
          <button
            type="button"
            onClick={() => setChartRange('monthly')}
            className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wide rounded-md transition-colors ${
              chartRange === 'monthly'
                ? 'bg-[#D4AF37] text-black'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Mensal
          </button>
        </div>
      </div>
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#D4AF37" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#D4AF37" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tick={{ fill: '#71717a', fontSize: 13 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis domain={[0, 100]} hide />
            <Tooltip
              contentStyle={{
                backgroundColor: '#18181b',
                border: '1px solid #D4AF37',
                borderRadius: '12px',
                color: '#D4AF37',
              }}
              formatter={(value: number) => [`${value}%`, 'Produtividade']}
            />
            <Area
              type="monotone"
              dataKey="score"
              stroke="#D4AF37"
              strokeWidth={2}
              fill="url(#goldGradient)"
              dot={{ fill: '#D4AF37', r: 3 }}
              activeDot={{ r: 4, fill: '#D4AF37' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
