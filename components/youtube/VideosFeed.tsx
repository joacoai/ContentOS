"use client"

import { useState, useEffect, useMemo } from "react"
import { Youtube } from "lucide-react"
import { ContentCard } from "@/components/shared/ContentCard"
import { VideoModal } from "./VideoModal"
import { EmptyState } from "@/components/ui/empty-state"
import type { YTVideoSnippet } from "@/lib/youtubeClient"

type SortBy = "fecha" | "vistas" | "engagement"

const SORT_LABELS: Record<SortBy, string> = {
  fecha: "Fecha",
  vistas: "Vistas",
  engagement: "Engagement",
}

function fmtDuration(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
  return `${m}:${String(sec).padStart(2, "0")}`
}

export function VideosFeed() {
  const [videos, setVideos] = useState<YTVideoSnippet[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVideo, setSelectedVideo] = useState<YTVideoSnippet | null>(null)
  const [sortBy, setSortBy] = useState<SortBy>("fecha")

  useEffect(() => {
    fetch("/api/youtube/videos?limit=50")
      .then((r) => r.json())
      .then((d) => setVideos(d.data ?? []))
      .catch(() => setVideos([]))
      .finally(() => setLoading(false))
  }, [])

  const sorted = useMemo(() => {
    return [...videos].sort((a, b) => {
      if (sortBy === "vistas") return b.views - a.views
      if (sortBy === "engagement") return b.engagementRate - a.engagementRate
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    })
  }, [videos, sortBy])

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-8 rounded-lg animate-pulse" style={{ background: "var(--bg-elevated)", width: 240 }} />
        <div
          className="grid gap-3.5"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl overflow-hidden"
              style={{ border: "1px solid var(--border-subtle)" }}
            >
              <div className="w-full aspect-video" style={{ background: "var(--bg-elevated)" }} />
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

  if (videos.length === 0) {
    return (
      <EmptyState
        icon={<Youtube size={28} />}
        title="Sin videos sincronizados"
        description="Andá a Settings → sincronizar YouTube"
      />
    )
  }

  return (
    <>
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="text-[11px] font-medium" style={{ color: "var(--text-faint)" }}>
          {sorted.length} videos
        </span>

        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-[11px]" style={{ color: "var(--text-faint)" }}>Ordenar:</span>
          {(["fecha", "vistas", "engagement"] as SortBy[]).map((opt) => (
            <button
              key={opt}
              onClick={() => setSortBy(opt)}
              className="rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer"
              style={{
                background: sortBy === opt ? "rgba(255,68,68,0.12)" : "var(--bg-elevated)",
                color: sortBy === opt ? "var(--accent-youtube)" : "var(--text-secondary)",
                border: `1px solid ${sortBy === opt ? "rgba(255,68,68,0.3)" : "var(--border-subtle)"}`,
              }}
            >
              {SORT_LABELS[opt]}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div
        className="grid gap-3.5"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}
      >
        {sorted.map((video) => (
          <ContentCard
            key={video.id}
            id={video.id}
            thumbnail={video.thumbnail}
            caption={video.title}
            date={new Date(video.publishedAt).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })}
            metrics={{
              reach: video.views,
              likes: video.likes,
              saves: video.comments,
              engagement_rate: video.engagementRate,
            }}
            platform="youtube"
            duration={fmtDuration(video.durationS)}
            onClick={() => setSelectedVideo(video)}
          />
        ))}
      </div>

      <VideoModal video={selectedVideo} onClose={() => setSelectedVideo(null)} />
    </>
  )
}
