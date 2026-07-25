"use client"

import { Film, ImageIcon } from "lucide-react"
import type { StoryRow } from "@/lib/db/stories"

const MONTHS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function formatDate(ts: string): string {
  const d = new Date(ts)
  return `${d.getDate()} ${MONTHS_ES[d.getMonth()]}`
}

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M"
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k"
  return String(Math.round(n))
}

interface StoryCardProps {
  story: StoryRow
  avgMetrics: { avg_reach: number; avg_completion_rate: number }
}

export function StoryCard({ story, avgMetrics }: StoryCardProps) {
  const m = story.ig_story_metrics?.[0] ?? null
  const reach = m?.reach ?? 0
  const completionRate = m?.completion_rate ?? 0
  const aboveAvg = avgMetrics.avg_reach > 0 && reach > avgMetrics.avg_reach
  const highCompletion = completionRate > 0.7

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: 12,
        overflow: 'hidden',
        aspectRatio: '3/4',
        background: 'linear-gradient(160deg, #0d1b2a 0%, #1a1a3e 50%, #0f0f23 100%)',
        border: `1px solid ${aboveAvg ? 'var(--accent-30)' : 'var(--border-subtle)'}`,
        boxShadow: aboveAvg ? '0 0 12px rgba(0,168,255,0.12)' : 'none',
      }}
    >
      {story.thumbnail_url && (
        <img
          src={story.thumbnail_url}
          alt=""
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }}
        />
      )}

      {/* gradient overlay */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, transparent 30%, rgba(0,0,0,0.88) 100%)' }} />

      {/* top row */}
      <div style={{ position: 'absolute', top: 8, left: 8, right: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.75)', textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>
          {formatDate(story.published_at)}
        </span>
        <span style={{ color: 'rgba(255,255,255,0.55)' }}>
          {story.media_type === 'VIDEO' ? <Film size={10} /> : <ImageIcon size={10} />}
        </span>
      </div>

      {/* bottom metrics */}
      <div style={{ position: 'absolute', bottom: 8, left: 8, right: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', lineHeight: 1, textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
              {m ? fmt(reach) : '—'}
            </div>
            <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>reach</div>
          </div>
          {m && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: highCompletion ? '#00e5a0' : 'rgba(255,255,255,0.85)', lineHeight: 1, textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
                {(completionRate * 100).toFixed(0)}%
              </div>
              <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>completado</div>
            </div>
          )}
        </div>

        {/* reach bar vs average */}
        {avgMetrics.avg_reach > 0 && m && (
          <div style={{ marginTop: 5, height: 2, background: 'rgba(255,255,255,0.08)', borderRadius: 1, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${Math.min(100, (reach / (avgMetrics.avg_reach * 2)) * 100)}%`,
                background: aboveAvg ? 'var(--accent)' : 'rgba(255,255,255,0.2)',
                borderRadius: 1,
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
