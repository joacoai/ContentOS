"use client"

import { useState, useEffect, useCallback } from "react"
import { Sparkles, CheckCircle2, Circle, Clapperboard, Film, Link2, X, Trash2 } from "lucide-react"
import { EmptyState } from "@/components/ui/empty-state"
import { formatWeekRange } from "@/lib/db/contentPlan"
import type { ContentPlanItem, PlanStatus } from "@/lib/db/contentPlan"

const STATUS_CONFIG = {
  pendiente: {
    label: 'Pendiente',
    color: 'var(--text-faint)',
    dot: 'rgba(255,255,255,0.2)',
    cardBorder: 'var(--border-subtle)',
  },
  en_proceso: {
    label: 'Filmando',
    color: 'var(--accent)',
    dot: 'var(--accent)',
    cardBorder: 'var(--accent-22)',
  },
  publicado: {
    label: 'Publicado',
    color: '#00e5a0',
    dot: '#00e5a0',
    cardBorder: 'rgba(0,229,160,0.3)',
  },
}

const DAY_COLORS: Record<string, string> = {
  Lunes: '#7b8cff',
  Martes: '#ff7bb5',
  Miércoles: '#ffb347',
  Jueves: '#7be8c8',
  Viernes: 'var(--accent)',
  Sábado: '#d47bff',
  Domingo: '#ff7b7b',
}

function LinkReelInput({ onConfirm, onCancel }: { onConfirm: (id: string) => void; onCancel: () => void }) {
  const [value, setValue] = useState('')

  const handleConfirm = () => {
    const trimmed = value.trim()
    if (!trimmed) return
    const parts = trimmed.replace(/\/$/, '').split('/')
    onConfirm(parts[parts.length - 1] || trimmed)
  }

  return (
    <div className="flex items-center gap-2 pt-1">
      <input
        type="text"
        placeholder="URL o ID del reel publicado…"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleConfirm(); if (e.key === 'Escape') onCancel() }}
        autoFocus
        className="flex-1 rounded-lg px-3 py-1.5 text-[11px] outline-none"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)' }}
      />
      <button
        onClick={handleConfirm}
        disabled={!value.trim()}
        className="rounded-lg px-2.5 py-1.5 text-[10px] font-semibold cursor-pointer disabled:opacity-40"
        style={{ background: 'rgba(0,229,160,0.12)', color: '#00e5a0', border: '1px solid rgba(0,229,160,0.25)' }}
      >
        Confirmar
      </button>
      <button onClick={onCancel} className="cursor-pointer" style={{ color: 'var(--text-faint)' }}>
        <X size={13} />
      </button>
    </div>
  )
}

interface PlanCardProps {
  item: ContentPlanItem
  onStatusChange: (id: string, status: PlanStatus, reelId?: string) => Promise<void>
  onDiscard: (id: string) => Promise<void>
}

function PlanCard({ item, onStatusChange, onDiscard }: PlanCardProps) {
  const [updating, setUpdating] = useState(false)
  const [discarding, setDiscarding] = useState(false)
  const [showLinkInput, setShowLinkInput] = useState(false)
  const cfg = STATUS_CONFIG[item.status]
  const dayColor = item.suggested_day ? (DAY_COLORS[item.suggested_day] ?? 'var(--text-faint)') : 'var(--text-faint)'

  const advance = async () => {
    if (item.status === 'pendiente') {
      setUpdating(true)
      await onStatusChange(item.id, 'en_proceso')
      setUpdating(false)
    } else if (item.status === 'en_proceso') {
      setShowLinkInput(true)
    }
  }

  const handlePublished = async (reelId: string) => {
    setShowLinkInput(false)
    setUpdating(true)
    await onStatusChange(item.id, 'publicado', reelId)
    setUpdating(false)
  }

  const handleDiscard = async () => {
    setDiscarding(true)
    await onDiscard(item.id)
  }

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all"
      style={{
        border: `1px solid ${cfg.cardBorder}`,
        background: 'var(--card-surface, var(--bg-elevated))',
        opacity: discarding ? 0.4 : 1,
      }}
    >
      {/* Card header bar */}
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.02)' }}
      >
        <div className="flex items-center gap-2">
          {item.suggested_day && (
            <span
              className="text-[9px] font-bold uppercase tracking-wider rounded-md px-2 py-0.5"
              style={{ background: `${dayColor}18`, color: dayColor, border: `1px solid ${dayColor}28` }}
            >
              {item.suggested_day}
            </span>
          )}
          <span
            className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider rounded-md px-2 py-0.5"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-faint)', border: '1px solid var(--border-subtle)' }}
          >
            <Film size={8} />{item.format}
          </span>
          <div className="flex items-center gap-1.5 ml-1">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot }} />
            <span className="text-[9px] font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
          </div>
        </div>

        {/* Discard — solo si no está publicado */}
        {item.status !== 'publicado' && (
          <button
            onClick={handleDiscard}
            disabled={discarding}
            title="Descartar idea"
            className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[9px] font-semibold cursor-pointer transition-all opacity-40 hover:opacity-100 disabled:opacity-20"
            style={{ color: '#ff6b6b', border: '1px solid transparent' }}
          >
            <Trash2 size={9} />
            Descartar
          </button>
        )}
      </div>

      {/* Card body */}
      <div className="p-4 flex flex-col gap-4">

        {/* Title */}
        <div className="flex items-start gap-2.5">
          <span className="text-[20px] leading-none flex-shrink-0 mt-0.5">{item.emoji}</span>
          <h3 className="text-[15px] font-bold leading-snug" style={{ color: 'var(--text-primary)' }}>
            {item.title}
          </h3>
        </div>

        {/* Hook — highlighted block */}
        <div
          className="rounded-xl px-4 py-3"
          style={{
            background: 'var(--accent-10)',
            borderLeft: '3px solid var(--accent)',
            border: '1px solid var(--accent-15)',
            borderLeftWidth: 3,
          }}
        >
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--accent)' }}>
            Hook · primeros 3s
          </p>
          <p className="text-[12px] italic leading-relaxed" style={{ color: 'var(--text-primary)' }}>
            &ldquo;{item.hook_text}&rdquo;
          </p>
        </div>

        {/* Guión */}
        {item.estructura && item.estructura.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>
              Guión
            </p>
            <div className="flex flex-col gap-1.5">
              {item.estructura.map((step, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span
                    className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold mt-0.5"
                    style={{ background: 'var(--accent-15)', color: 'var(--accent)', border: '1px solid var(--accent-22)' }}
                  >
                    {i + 1}
                  </span>
                  <p className="text-[12px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {step}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Why */}
        {item.why && (
          <p className="text-[10px] leading-relaxed" style={{ color: 'var(--text-faint)', borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
            {item.why}
          </p>
        )}

        {/* Linked reel */}
        {item.linked_reel_id && (
          <div className="flex items-center gap-1.5">
            <Link2 size={9} style={{ color: '#00e5a0' }} />
            <span className="text-[9px] font-mono" style={{ color: '#00e5a0' }}>{item.linked_reel_id}</span>
          </div>
        )}

        {/* Link reel input */}
        {showLinkInput && (
          <LinkReelInput onConfirm={handlePublished} onCancel={() => setShowLinkInput(false)} />
        )}

        {/* Action */}
        {item.status !== 'publicado' && !showLinkInput && (
          <button
            onClick={advance}
            disabled={updating}
            className="self-start flex items-center gap-2 rounded-xl px-4 py-2 text-[11px] font-bold cursor-pointer transition-all disabled:opacity-50"
            style={
              item.status === 'pendiente'
                ? { background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-medium)' }
                : { background: 'rgba(0,229,160,0.1)', color: '#00e5a0', border: '1px solid rgba(0,229,160,0.25)' }
            }
          >
            {updating ? '…' : item.status === 'pendiente' ? (
              <><Clapperboard size={11} /> Empezar a filmar</>
            ) : (
              <><CheckCircle2 size={11} /> Marcar como publicado</>
            )}
          </button>
        )}
      </div>
    </div>
  )
}

export function ContentPlan() {
  const [items, setItems] = useState<ContentPlanItem[]>([])
  const [weekStart, setWeekStart] = useState('')
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadPlan = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/content-plan')
      const json = await res.json()
      if (!json.success) throw new Error(json.error ?? 'Error cargando plan')
      setItems(json.data ?? [])
      setWeekStart(json.weekStart ?? '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadPlan() }, [loadPlan])

  const handleGenerate = async () => {
    try {
      setGenerating(true)
      setError(null)
      const res = await fetch('/api/content-plan', { method: 'POST' })
      const json = await res.json()
      if (!json.success) throw new Error(json.error ?? 'Error generando plan')
      setItems(json.data ?? [])
      setWeekStart(json.weekStart ?? weekStart)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error generando')
    } finally {
      setGenerating(false)
    }
  }

  const handleStatusChange = async (id: string, status: PlanStatus, reelId?: string) => {
    const res = await fetch('/api/content-plan', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status, linked_reel_id: reelId }),
    })
    const json = await res.json()
    if (!json.success) { setError('Error actualizando estado'); return }
    setItems(prev => prev.map(item =>
      item.id === id
        ? { ...item, status, linked_reel_id: reelId ?? item.linked_reel_id }
        : item
    ))
  }

  const handleDiscard = async (id: string) => {
    const res = await fetch('/api/content-plan', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    const json = await res.json()
    if (!json.success) { setError('Error descartando idea'); return }
    setItems(prev => prev.filter(item => item.id !== id))
  }

  const pending = items.filter(i => i.status === 'pendiente').length
  const inProgress = items.filter(i => i.status === 'en_proceso').length
  const published = items.filter(i => i.status === 'publicado').length

  return (
    <div className="flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-black tracking-tight leading-none" style={{ color: 'var(--text-primary)' }}>
            Plan Semanal
          </h1>
          {weekStart && (
            <p className="text-[11px] mt-1" style={{ color: 'var(--text-faint)' }}>
              {formatWeekRange(weekStart)}
            </p>
          )}
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating || loading}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-[12px] font-bold cursor-pointer transition-all disabled:opacity-50"
          style={{
            background: 'linear-gradient(135deg, var(--accent-22) 0%, rgba(138,43,226,0.15) 100%)',
            color: 'var(--accent)',
            border: '1px solid var(--accent-22)',
            boxShadow: generating ? 'none' : '0 2px 12px rgba(0,168,255,0.15)',
          }}
        >
          <Sparkles size={13} className={generating ? 'animate-pulse' : ''} />
          {generating ? 'Generando guiones…' : items.length > 0 ? 'Regenerar plan' : 'Generar plan con IA'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg px-4 py-2 text-[11px]" style={{ background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)', color: '#ff6b6b' }}>
          {error}
        </div>
      )}

      {/* Stats */}
      {items.length > 0 && (
        <div className="flex items-center gap-4 flex-wrap">
          {[
            { label: 'pendientes', count: pending, color: 'var(--text-faint)' },
            { label: 'filmando', count: inProgress, color: 'var(--accent)' },
            { label: 'publicados', count: published, color: '#00e5a0' },
          ].map(({ label, count, color }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
              <span className="text-[11px]" style={{ color: 'var(--text-faint)' }}>{count} {label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Loading / generating */}
      {(loading || generating) ? (
        <div className="flex flex-col gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl h-48" style={{ background: 'var(--bg-elevated)' }} />
          ))}
          {generating && (
            <p className="text-center text-[11px] mt-1" style={{ color: 'var(--text-faint)' }}>
              Analizando historial y armando guiones…
            </p>
          )}
        </div>
      ) : items.length === 0 ? (
        <div className="card-surface p-10">
          <EmptyState
            icon={<Circle size={28} />}
            title="Sin plan para esta semana"
            description="Generá 5 guiones de reels basados en tus métricas, hooks que funcionaron y mejores días de publicación."
            action={
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="flex items-center gap-2 rounded-xl px-4 py-2 text-[12px] font-bold cursor-pointer disabled:opacity-50"
                style={{ background: 'var(--accent-15)', color: 'var(--accent)', border: '1px solid var(--accent-22)' }}
              >
                <Sparkles size={12} />
                Generar plan con IA
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {items.map(item => (
            <PlanCard
              key={item.id}
              item={item}
              onStatusChange={handleStatusChange}
              onDiscard={handleDiscard}
            />
          ))}
        </div>
      )}
    </div>
  )
}
