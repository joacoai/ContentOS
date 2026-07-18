"use client"

import Image from "next/image"
import { useState } from "react"
import { Eye, Bookmark, Share2, Trophy } from "lucide-react"
import { Drawer } from "@/components/ui/drawer"
import type { AIScore } from "@/lib/instagramAI"
import type { IGMediaItem } from "@/lib/instagramTypes"

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M"
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k"
  return String(n)
}

interface ScoreSectionProps {
  scores: AIScore[]
  media: IGMediaItem[]
}

export function ScoreSection({ scores, media }: ScoreSectionProps) {
  const [selected, setSelected] = useState<AIScore | null>(null)

  if (scores.length === 0) return null

  const maxScore = scores[0].score || 1
  const mediaMap = new Map(media.map((m) => [m.id, m]))
  const reel = selected ? mediaMap.get(selected.id) : null

  return (
    <>
      <div className="flex flex-col gap-2">
        {scores.map((s, i) => {
          const pct = Math.round((s.score / maxScore) * 100)
          return (
            <button
              key={s.id}
              onClick={() => setSelected(s)}
              className="group w-full text-left rounded-lg px-2 py-1.5 transition-colors"
              style={{ background: "transparent" }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.background = "transparent")
              }
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-[12px] truncate flex-1 mr-2" style={{ color: "var(--text-secondary)" }}>
                  <span className="font-semibold mr-1.5" style={{ color: "var(--accent)" }}>
                    #{i + 1}
                  </span>
                  {s.caption}
                </p>
                <span className="text-[12px] font-bold flex-shrink-0" style={{ color: "var(--text-primary)" }}>
                  {s.score.toLocaleString()}
                </span>
              </div>
              <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--border-subtle)" }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, background: "var(--accent)" }}
                />
              </div>
            </button>
          )
        })}
      </div>

      <Drawer
        open={selected !== null}
        onClose={() => setSelected(null)}
        title="Detalle del reel"
      >
        {selected && (
          <div className="flex flex-col gap-5">
            {/* Thumbnail */}
            {reel?.thumbnail_url && (
              <div
                className="relative w-full overflow-hidden rounded-xl"
                style={{ aspectRatio: "9/16", maxHeight: 280 }}
              >
                <Image
                  src={reel.thumbnail_url}
                  alt={selected.caption}
                  fill
                  className="object-cover"
                  sizes="384px"
                  unoptimized
                />
              </div>
            )}

            {/* Caption */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-faint)" }}>
                Caption
              </p>
              <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-primary)" }}>
                {selected.caption || "Sin caption"}
              </p>
            </div>

            {/* Score badge */}
            <div
              className="flex items-center gap-2 rounded-lg px-3 py-2.5"
              style={{ background: "var(--accent-10)", border: "1px solid var(--accent-22)" }}
            >
              <Trophy size={14} style={{ color: "var(--accent)" }} />
              <span className="text-[13px] font-bold" style={{ color: "var(--accent)" }}>
                Score: {selected.score.toLocaleString()}
              </span>
            </div>

            {/* Métricas */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-2.5" style={{ color: "var(--text-faint)" }}>
                Métricas
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: <Eye size={12} />, label: "Reach", value: fmt(selected.reach) },
                  { icon: <Bookmark size={12} />, label: "Saves", value: fmt(selected.saves) },
                  { icon: <Share2 size={12} />, label: "Shares", value: fmt(selected.shares) },
                ].map(({ icon, label, value }) => (
                  <div
                    key={label}
                    className="flex flex-col items-center gap-1 rounded-lg p-2.5"
                    style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}
                  >
                    <span style={{ color: "var(--text-faint)" }}>{icon}</span>
                    <span className="text-[16px] font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>
                      {value}
                    </span>
                    <span className="text-[10px]" style={{ color: "var(--text-faint)" }}>
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </>
  )
}
