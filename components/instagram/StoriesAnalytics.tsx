"use client"

import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts"
import type { StoriesAnalyticsResult } from "@/lib/db/stories"

function fmt(n: number): string {
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k"
  return String(Math.round(n))
}

function ChartTooltip({
  active,
  payload,
  label,
  valueFormatter = fmt,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
  valueFormatter?: (v: number) => string
}) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg-floating)', border: '1px solid var(--border-medium)', borderRadius: 10, padding: '9px 13px', boxShadow: '0 12px 32px rgba(0,0,0,0.50)', fontSize: 11, backdropFilter: 'blur(16px)' }}>
      <p style={{ marginBottom: 6, fontWeight: 600, color: 'var(--text-faint)', fontSize: 9, letterSpacing: '0.10em', textTransform: 'uppercase' }}>{label}</p>
      {payload.map((p) => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
          <span style={{ color: 'var(--text-secondary)', fontSize: 10 }}>{p.name}</span>
          <span style={{ fontWeight: 700, marginLeft: 'auto', paddingLeft: 10, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
            {valueFormatter(p.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

interface StoriesAnalyticsProps {
  analytics: StoriesAnalyticsResult
}

export function StoriesAnalytics({ analytics }: StoriesAnalyticsProps) {
  const { reach_trend, by_day_of_week, by_media_type } = analytics

  const showTrend = reach_trend.length > 1
  const showDays = by_day_of_week.length > 0
  const showTypes = by_media_type.IMAGE.count > 0 || by_media_type.VIDEO.count > 0

  if (!showTrend && !showDays && !showTypes) return null

  return (
    <div className="flex flex-col gap-4">

      {/* Reach trend + Day of week */}
      {(showTrend || showDays) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {showTrend && (
            <div className="card-surface p-4">
              <h3 className="text-[10px] font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--text-faint)' }}>
                Tendencia de Reach
              </h3>
              <ResponsiveContainer width="100%" height={130}>
                <AreaChart data={reach_trend} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                  <defs>
                    <linearGradient id="storiesReachGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.18} />
                      <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="0" stroke="rgba(255,255,255,0.028)" horizontal={true} vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--text-faint)' }} axisLine={false} tickLine={false} dy={4} />
                  <YAxis tick={{ fontSize: 9, fill: 'var(--text-faint)' }} axisLine={false} tickLine={false} tickFormatter={fmt} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.05)', strokeWidth: 1 }} />
                  <Area type="monotone" dataKey="reach" name="Reach" stroke="var(--accent)" strokeWidth={1.5} fill="url(#storiesReachGrad)" dot={{ r: 2, fill: 'var(--accent)', strokeWidth: 0 }} activeDot={{ r: 4, strokeWidth: 0, fill: 'var(--accent)' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {showDays && (
            <div className="card-surface p-4">
              <h3 className="text-[10px] font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--text-faint)' }}>
                Reach por día de la semana
              </h3>
              <ResponsiveContainer width="100%" height={130}>
                <BarChart data={by_day_of_week} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                  <CartesianGrid strokeDasharray="0" stroke="rgba(255,255,255,0.028)" horizontal={true} vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 9, fill: 'var(--text-faint)' }} axisLine={false} tickLine={false} dy={4} />
                  <YAxis tick={{ fontSize: 9, fill: 'var(--text-faint)' }} axisLine={false} tickLine={false} tickFormatter={fmt} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="avg_reach" name="Reach prom." fill="var(--accent)" fillOpacity={0.7} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Foto vs Video comparison */}
      {showTypes && (
        <div className="card-surface p-4">
          <h3 className="text-[10px] font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--text-faint)' }}>
            Foto vs Video
          </h3>
          <div className="flex flex-col gap-4">
            {(['IMAGE', 'VIDEO'] as const).map((type) => {
              const stats = by_media_type[type]
              if (stats.count === 0) return null
              const maxReach = Math.max(by_media_type.IMAGE.avg_reach, by_media_type.VIDEO.avg_reach, 1)
              const label = type === 'IMAGE' ? 'Fotos' : 'Videos'
              const color = type === 'VIDEO' ? 'var(--accent)' : 'rgba(0,168,255,0.4)'

              return (
                <div key={type}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      {label}
                      <span className="ml-1.5 font-normal text-[10px]" style={{ color: 'var(--text-faint)' }}>({stats.count})</span>
                    </span>
                    <span className="text-[11px] font-bold" style={{ color: 'var(--text-primary)' }}>{fmt(stats.avg_reach)} reach</span>
                  </div>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(stats.avg_reach / maxReach) * 100}%`, background: color, borderRadius: 2, transition: 'width 0.6s ease' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 14, marginTop: 4 }}>
                    <span style={{ fontSize: 9, color: 'var(--text-faint)' }}>{fmt(stats.avg_impressions)} impresiones</span>
                    <span style={{ fontSize: 9, color: 'var(--text-faint)' }}>{(stats.avg_completion_rate * 100).toFixed(0)}% completado</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
