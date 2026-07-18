"use client"

import { useState, useEffect, useMemo } from "react"
import { Film } from "lucide-react"
import { ContentCard } from "@/components/shared/ContentCard"
import { ReelModal } from "./ReelModal"
import { EmptyState } from "@/components/ui/empty-state"
import type { IGReelData } from "@/lib/instagramTypes"

type SortBy = "reach" | "score" | "fecha"

function computeScore(reel: IGReelData): number {
  return Math.round(
    reel.metrics.reach * 0.4 +
    reel.metrics.saves * 0.4 +
    reel.metrics.shares * 0.2
  )
}

const SORT_LABELS: Record<SortBy, string> = {
  reach: "Reach",
  score: "Score",
  fecha: "Fecha",
}

export function ReelsFeed() {
  const [reels, setReels] = useState<IGReelData[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedReel, setSelectedReel] = useState<IGReelData | null>(null)
  const [sortBy, setSortBy] = useState<SortBy>("fecha")
  const [showTranscribed, setShowTranscribed] = useState(false)

  async function fetchReels(refresh = false) {
    if (refresh) setSyncing(true)
    else setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/instagram/media${refresh ? "?refresh=1" : ""}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Error al cargar reels")
      setReels(data.reels)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
      setSyncing(false)
    }
  }

  useEffect(() => {
    fetchReels()
  }, [])

  const sorted = useMemo(() => {
    const base = showTranscribed ? reels.filter((r) => r.transcribed) : reels
    return [...base].sort((a, b) => {
      if (sortBy === "reach") return b.metrics.reach - a.metrics.reach
      if (sortBy === "score") return computeScore(b) - computeScore(a)
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    })
  }, [reels, sortBy, showTranscribed])

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-8 rounded-lg animate-pulse" style={{ background: "var(--bg-elevated)", width: 240 }} />
        <div
          className="grid gap-3.5"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl overflow-hidden"
              style={{ border: "1px solid var(--border-subtle)" }}
            >
              <div
                className="w-full"
                style={{ aspectRatio: "9/16", background: "var(--bg-elevated)" }}
              />
              <div className="p-3 flex flex-col gap-2">
                <div className="h-2.5 rounded" style={{ background: "var(--border-subtle)", width: "80%" }} />
                <div className="h-2 rounded" style={{ background: "var(--border-subtle)", width: "50%" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="flex flex-col items-center gap-3 rounded-xl p-10 text-center"
        style={{ border: "1px dashed var(--border-medium)", background: "var(--bg-elevated)" }}
      >
        <p className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>
          No se pudieron cargar los reels
        </p>
        <p className="text-[11px]" style={{ color: "var(--text-faint)" }}>{error}</p>
        <button
          onClick={() => fetchReels()}
          className="mt-1 rounded-md px-3 py-1.5 text-[11px] font-medium transition-colors cursor-pointer"
          style={{
            background: "var(--sidebar-active-bg)",
            border: "1px solid var(--border-medium)",
            color: "var(--text-primary)",
          }}
        >
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <>
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="text-[11px] font-medium" style={{ color: "var(--text-faint)" }}>
          {sorted.length} reels
        </span>

        <div className="flex items-center gap-1.5 ml-auto">
          {/* Sort */}
          <span className="text-[11px]" style={{ color: "var(--text-faint)" }}>Ordenar:</span>
          {(["fecha", "reach", "score"] as SortBy[]).map((opt) => (
            <button
              key={opt}
              onClick={() => setSortBy(opt)}
              className="rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer"
              style={{
                background: sortBy === opt ? "var(--accent-15)" : "var(--bg-elevated)",
                color: sortBy === opt ? "var(--accent)" : "var(--text-secondary)",
                border: `1px solid ${sortBy === opt ? "var(--accent-22)" : "var(--border-subtle)"}`,
              }}
            >
              {SORT_LABELS[opt]}
            </button>
          ))}
        </div>

        {/* Filter: transcribed only */}
        <button
          onClick={() => setShowTranscribed((v) => !v)}
          className="rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer"
          style={{
            background: showTranscribed ? "var(--accent-15)" : "var(--bg-elevated)",
            color: showTranscribed ? "var(--accent)" : "var(--text-secondary)",
            border: `1px solid ${showTranscribed ? "var(--accent-22)" : "var(--border-subtle)"}`,
          }}
        >
          Solo transcriptos
        </button>
      </div>

      {/* Grid */}
      {sorted.length === 0 ? (
        <EmptyState
          icon={<Film size={24} />}
          title="No hay reels que coincidan"
          description="Cambiá el filtro o sincronizá Instagram."
        />
      ) : (
        <div
          className="grid gap-3.5"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}
        >
          {sorted.map((reel) => (
            <ContentCard
              key={reel.id}
              id={reel.id}
              thumbnail={reel.thumbnail}
              caption={reel.caption}
              date={reel.date}
              metrics={{
                reach: reel.metrics.reach,
                likes: reel.metrics.likes,
                saves: reel.metrics.saves,
                engagement_rate: reel.metrics.engagement_rate,
              }}
              transcribed={reel.transcribed}
              platform="instagram"
              duration={reel.metrics.duration_s > 0 ? `${reel.metrics.duration_s}s` : undefined}
              score={computeScore(reel)}
              onClick={() => setSelectedReel(reel)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      <ReelModal reel={selectedReel} onClose={() => setSelectedReel(null)} />
    </>
  )
}
