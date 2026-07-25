"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { RefreshCw, Copy, Check, Search, Zap } from "lucide-react"
import { EmptyState } from "@/components/ui/empty-state"
import type { HookRow } from "@/lib/db/hooks"

const MONTHS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function formatDate(ts: string | null): string {
  if (!ts) return '—'
  const d = new Date(ts)
  return `${d.getDate()} ${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`
}

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M"
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k"
  return String(Math.round(n))
}

type SortKey = 'reach' | 'saves' | 'date' | 'used_count'

function HookCard({ hook }: { hook: HookRow }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(hook.text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className="card-surface p-4 flex flex-col gap-3 transition-all"
      style={{ borderLeft: '3px solid var(--accent-22)' }}
    >
      {/* Hook text + copy */}
      <div className="flex items-start gap-3">
        <p
          className="flex-1 text-[13px] font-medium leading-relaxed"
          style={{ color: 'var(--text-primary)' }}
        >
          &ldquo;{hook.text}&rdquo;
        </p>
        <button
          onClick={handleCopy}
          title="Copiar hook"
          className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-lg transition-all cursor-pointer"
          style={{
            background: copied ? 'rgba(0,229,160,0.12)' : 'var(--bg-elevated)',
            border: `1px solid ${copied ? 'rgba(0,229,160,0.3)' : 'var(--border-subtle)'}`,
            color: copied ? '#00e5a0' : 'var(--text-faint)',
          }}
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
        </button>
      </div>

      {/* Metrics row */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-semibold" style={{ color: 'var(--text-faint)' }}>Reach</span>
          <span className="text-[12px] font-bold" style={{ color: 'var(--text-secondary)' }}>{fmt(hook.reach)}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-semibold" style={{ color: 'var(--text-faint)' }}>Guardados</span>
          <span className="text-[12px] font-bold" style={{ color: 'var(--text-secondary)' }}>{fmt(hook.saves)}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-semibold" style={{ color: 'var(--text-faint)' }}>ER</span>
          <span className="text-[12px] font-bold" style={{ color: 'var(--text-secondary)' }}>
            {((hook.engagement_rate ?? 0) * 100).toFixed(1)}%
          </span>
        </div>

        {/* Source badge */}
        <span
          className="ml-auto text-[9px] font-semibold uppercase tracking-wider rounded px-1.5 py-0.5"
          style={
            hook.source === 'transcription'
              ? { background: 'rgba(138,43,226,0.12)', color: 'rgba(180,100,255,0.9)', border: '1px solid rgba(138,43,226,0.2)' }
              : { background: 'rgba(0,168,255,0.1)', color: 'var(--accent)', border: '1px solid var(--accent-22)' }
          }
        >
          {hook.source === 'transcription' ? 'transcripción' : 'caption'}
        </span>

        <span className="text-[9px]" style={{ color: 'var(--text-faint)' }}>
          {formatDate(hook.date_published)}
        </span>
      </div>
    </div>
  )
}

export function HooksDatabase() {
  const [hooks, setHooks] = useState<HookRow[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [syncedCount, setSyncedCount] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('reach')

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/hooks')
      const json = await res.json()
      if (!json.success) throw new Error(json.error ?? 'Error cargando hooks')
      setHooks(json.data ?? [])
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
      const res = await fetch('/api/hooks', { method: 'POST' })
      const json = await res.json()
      if (!json.success) throw new Error(json.error ?? 'Error sincronizando')
      setHooks(json.data ?? [])
      setSyncedCount(json.synced ?? 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error sincronizando')
    } finally {
      setSyncing(false)
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    const result = q ? hooks.filter(h => h.text.toLowerCase().includes(q)) : [...hooks]
    return result.sort((a, b) => {
      if (sortBy === 'reach') return b.reach - a.reach
      if (sortBy === 'saves') return b.saves - a.saves
      if (sortBy === 'date') return new Date(b.date_published ?? 0).getTime() - new Date(a.date_published ?? 0).getTime()
      if (sortBy === 'used_count') return b.used_count - a.used_count
      return 0
    })
  }, [hooks, search, sortBy])

  return (
    <div className="flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-black tracking-tight leading-none" style={{ color: 'var(--text-primary)' }}>
            Hooks
            {hooks.length > 0 && (
              <span className="ml-2 text-[13px] font-normal" style={{ color: 'var(--text-faint)' }}>
                {hooks.length} extraídos de transcripciones
              </span>
            )}
          </h1>
          <p className="text-[11px] mt-1" style={{ color: 'var(--text-faint)' }}>
            Lo que realmente dijiste en los primeros 3 segundos de cada reel
          </p>
        </div>
        <div className="flex items-center gap-2">
          {syncedCount !== null && (
            <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>
              {syncedCount} sincronizados
            </span>
          )}
          <button
            onClick={handleSync}
            disabled={syncing || loading}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all cursor-pointer disabled:opacity-50"
            style={{ background: 'var(--accent-15)', color: 'var(--accent)', border: '1px solid var(--accent-22)' }}
          >
            <RefreshCw size={11} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Extrayendo…' : 'Extraer hooks'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg px-4 py-2 text-[11px]" style={{ background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)', color: '#ff6b6b' }}>
          {error}
        </div>
      )}

      {/* Filters */}
      {!loading && hooks.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-faint)' }} />
            <input
              type="text"
              placeholder="Buscar en hooks…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-lg pl-8 pr-3 py-1.5 text-[12px] outline-none"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
          <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
            {([
              { key: 'reach', label: 'Reach' },
              { key: 'saves', label: 'Guardados' },
              { key: 'date', label: 'Fecha' },
            ] as { key: SortKey; label: string }[]).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setSortBy(key)}
                className="rounded px-2.5 py-1 text-[10px] font-semibold cursor-pointer transition-all"
                style={sortBy === key
                  ? { background: 'var(--accent-15)', color: 'var(--accent)', border: '1px solid var(--accent-22)' }
                  : { background: 'transparent', color: 'var(--text-faint)', border: '1px solid transparent' }
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex flex-col gap-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl h-20" style={{ background: 'var(--bg-elevated)' }} />
          ))}
        </div>
      ) : hooks.length === 0 ? (
        <div className="card-surface p-8">
          <EmptyState
            icon={<Zap size={28} />}
            title="Sin hooks extraídos"
            description="Necesitás reels con transcripciones. Primero transcribí tus reels en la sección Instagram, luego extraé los hooks."
            action={
              <button
                onClick={handleSync}
                disabled={syncing}
                className="rounded-lg px-4 py-1.5 text-[11px] font-semibold cursor-pointer disabled:opacity-50"
                style={{ background: 'var(--accent-15)', color: 'var(--accent)', border: '1px solid var(--accent-22)' }}
              >
                {syncing ? 'Extrayendo…' : 'Extraer hooks ahora'}
              </button>
            }
          />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card-surface p-6">
          <EmptyState icon={<Search size={24} />} title="Sin resultados" description={`No hay hooks que contengan "${search}"`} />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(hook => (
            <HookCard key={hook.id} hook={hook} />
          ))}
        </div>
      )}
    </div>
  )
}
