"use client"

import { useState, useEffect, useCallback } from "react"
import { RefreshCw, BookImage, Eye, BarChart2, TrendingUp, MessageCircle } from "lucide-react"
import { EmptyState } from "@/components/ui/empty-state"
import { StoryCard } from "./StoryCard"
import { StoriesAnalytics } from "./StoriesAnalytics"
import type { StoryRow, StoriesAnalyticsResult } from "@/lib/db/stories"

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M"
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k"
  return String(Math.round(n))
}

interface ApiResponse {
  success: boolean
  error?: string
  synced?: number
  data: {
    stories: StoryRow[]
    analytics: StoriesAnalyticsResult
  }
}

export function StoriesFeed() {
  const [stories, setStories] = useState<StoryRow[]>([])
  const [analytics, setAnalytics] = useState<StoriesAnalyticsResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [syncedCount, setSyncedCount] = useState<number | null>(null)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/instagram/stories')
      const json: ApiResponse = await res.json()
      if (!json.success) throw new Error(json.error ?? 'Error cargando historias')
      setStories(json.data.stories ?? [])
      setAnalytics(json.data.analytics ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleSync = async () => {
    try {
      setSyncing(true)
      setSyncedCount(null)
      setError(null)
      const res = await fetch('/api/instagram/stories', { method: 'POST' })
      const json: ApiResponse = await res.json()
      if (!json.success) throw new Error(json.error ?? 'Error sincronizando')
      setStories(json.data.stories ?? [])
      setAnalytics(json.data.analytics ?? null)
      setSyncedCount(json.synced ?? 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error sincronizando')
    } finally {
      setSyncing(false)
    }
  }

  const avgMetrics = analytics
    ? { avg_reach: analytics.avg_reach, avg_completion_rate: analytics.avg_completion_rate }
    : { avg_reach: 0, avg_completion_rate: 0 }

  return (
    <div className="flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[14px] font-bold leading-none" style={{ color: 'var(--text-primary)' }}>
            Historias
            {stories.length > 0 && (
              <span className="ml-2 text-[11px] font-normal" style={{ color: 'var(--text-faint)' }}>
                {stories.length} guardadas
              </span>
            )}
          </h2>
          <p className="text-[11px] mt-1" style={{ color: 'var(--text-faint)' }}>
            Sincronizá mientras tenés historias activas — expiran a las 24h
          </p>
        </div>
        <div className="flex items-center gap-2">
          {syncedCount !== null && (
            <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>
              {syncedCount} nueva{syncedCount !== 1 ? 's' : ''}
            </span>
          )}
          <button
            onClick={handleSync}
            disabled={syncing || loading}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all cursor-pointer disabled:opacity-50"
            style={{ background: 'var(--accent-15)', color: 'var(--accent)', border: '1px solid var(--accent-22)' }}
          >
            <RefreshCw size={11} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Sincronizando…' : 'Sincronizar'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg px-4 py-2 text-[11px]" style={{ background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)', color: '#ff6b6b' }}>
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading ? (
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}>
          {[...Array(8)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl" style={{ aspectRatio: '3/4', background: 'var(--bg-elevated)' }} />
          ))}
        </div>
      ) : stories.length === 0 ? (
        <div className="card-surface p-8">
          <EmptyState
            icon={<BookImage size={28} />}
            title="Sin historias guardadas"
            description="Publicá historias en Instagram y sincronizá dentro de las 24h para capturar las métricas."
            action={
              <button
                onClick={handleSync}
                disabled={syncing}
                className="rounded-lg px-4 py-1.5 text-[11px] font-semibold cursor-pointer disabled:opacity-50"
                style={{ background: 'var(--accent-15)', color: 'var(--accent)', border: '1px solid var(--accent-22)' }}
              >
                {syncing ? 'Sincronizando…' : 'Sincronizar ahora'}
              </button>
            }
          />
        </div>
      ) : (
        <>
          {/* KPI strip */}
          {analytics && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { label: 'Reach promedio', value: fmt(analytics.avg_reach), icon: <Eye size={11} /> },
                { label: 'Impresiones prom.', value: fmt(analytics.avg_impressions), icon: <BarChart2 size={11} /> },
                { label: 'Completado prom.', value: `${(analytics.avg_completion_rate * 100).toFixed(0)}%`, icon: <TrendingUp size={11} /> },
                { label: 'Respuestas prom.', value: fmt(analytics.avg_replies), icon: <MessageCircle size={11} /> },
              ].map(({ label, value, icon }) => (
                <div key={label} className="card-surface p-3 flex flex-col gap-1">
                  <div className="flex items-center gap-1.5" style={{ color: 'var(--text-faint)' }}>
                    {icon}
                    <span className="text-[9px] font-semibold uppercase tracking-widest truncate">{label}</span>
                  </div>
                  <span className="text-[18px] font-black leading-none" style={{ color: 'var(--text-primary)' }}>{value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Stories grid */}
          <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}>
            {stories.map((story) => (
              <StoryCard key={story.id} story={story} avgMetrics={avgMetrics} />
            ))}
          </div>

          {/* Charts + comparisons */}
          {analytics && analytics.total > 0 && (
            <StoriesAnalytics analytics={analytics} />
          )}
        </>
      )}
    </div>
  )
}
