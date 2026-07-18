"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import {
  ExternalLink, Clock, Eye, ThumbsUp, MessageCircle, Timer,
  TrendingUp, BarChart2, Play, Sparkles, ChevronDown, ChevronUp,
} from "lucide-react"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import type { YTVideoSnippet } from "@/lib/youtubeClient"

interface VideoDetailData {
  video: {
    id: string
    title: string
    description: string
    thumbnail: string
    published_at: string
    duration_s: number
    tags: string[]
  } | null
  metrics: {
    views: number
    likes: number
    comments: number
    watch_time_h: number
    avg_view_duration_s: number
    avg_view_percentage: number
    ctr: number
    impressions: number
    engagement_rate: number
    traffic_sources: Record<string, number> | null
    top_countries: Record<string, number> | null
  } | null
  transcription: {
    text: string
    ai_insights: string[] | null
    improvement_points: string[] | null
  } | null
}

interface VideoModalProps {
  video: YTVideoSnippet | null
  onClose: () => void
}

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M"
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k"
  return n.toString()
}

function fmtDuration(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
  return `${m}:${String(sec).padStart(2, "0")}`
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

function MetricTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div
      className="flex flex-col gap-1 rounded-xl p-3"
      style={{
        background: "rgba(255,68,68,0.05)",
        border: "1px solid rgba(255,68,68,0.15)",
      }}
    >
      <span className="text-[9px] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--text-faint)" }}>
        {label}
      </span>
      <span className="text-base font-bold leading-none" style={{ color: "var(--accent-youtube)" }}>
        {value}
      </span>
      {sub && <span className="text-[10px]" style={{ color: "var(--text-faint)" }}>{sub}</span>}
    </div>
  )
}

export function VideoModal({ video, onClose }: VideoModalProps) {
  const [detail, setDetail] = useState<VideoDetailData | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [showTranscription, setShowTranscription] = useState(false)

  useEffect(() => {
    if (!video) {
      setDetail(null)
      setShowTranscription(false)
      return
    }
    setLoadingDetail(true)
    fetch(`/api/youtube/video-detail?id=${video.id}`)
      .then((r) => r.json())
      .then((d) => setDetail(d))
      .catch(() => setDetail(null))
      .finally(() => setLoadingDetail(false))
  }, [video?.id])

  const m = detail?.metrics
  const t = detail?.transcription
  const durationS = detail?.video?.duration_s ?? video?.durationS ?? 0
  const retention = m && durationS > 0
    ? Math.round((m.avg_view_duration_s / durationS) * 100)
    : null

  return (
    <Sheet open={!!video} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-[60vw] max-w-[760px] border-l border-[var(--border-subtle)] bg-[var(--bg-base)] p-0"
      >
        {video && (
          <ScrollArea className="h-full">
            <div className="flex flex-col gap-0">

              {/* Thumbnail */}
              <div className="relative aspect-video w-full overflow-hidden">
                <Image
                  src={video.thumbnail}
                  alt={video.title}
                  fill
                  className="object-cover"
                  sizes="760px"
                />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(3,3,10,0.85) 0%, transparent 50%)" }} />
                <div className="absolute bottom-4 left-4 right-4">
                  <h2 className="text-[15px] font-bold leading-snug text-white drop-shadow">
                    {video.title}
                  </h2>
                  <p className="mt-1 text-[11px]" style={{ color: "rgba(255,255,255,0.6)" }}>
                    {fmtDate(video.publishedAt)}
                  </p>
                </div>
                <div className="absolute bottom-4 right-4 flex items-center gap-1 rounded-lg bg-black/70 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
                  <Clock size={10} />
                  {fmtDuration(video.durationS)}
                </div>
                <div
                  className="absolute top-3 left-3 flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
                  style={{ background: "var(--accent-youtube)", color: "#fff" }}
                >
                  <Play size={9} fill="white" />
                  YouTube
                </div>
              </div>

              <div className="flex flex-col gap-5 p-5">

                {/* Primary metrics row */}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <MetricTile label="Views" value={fmt(video.views)} />
                  <MetricTile label="Likes" value={fmt(video.likes)} />
                  <MetricTile label="Comentarios" value={fmt(video.comments)} />
                  <MetricTile label="Engagement" value={(video.engagementRate * 100).toFixed(2) + "%"} />
                </div>

                {/* Analytics metrics — from Supabase yt_metrics */}
                {loadingDetail ? (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
                  </div>
                ) : m ? (
                  <>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <MetricTile
                        label="Watch Time"
                        value={m.watch_time_h > 0 ? `${fmt(Math.round(m.watch_time_h))}h` : "—"}
                      />
                      <MetricTile
                        label="Avg View Duration"
                        value={m.avg_view_duration_s > 0 ? fmtDuration(m.avg_view_duration_s) : "—"}
                      />
                      <MetricTile
                        label="Retención"
                        value={retention !== null ? `${retention}%` : "—"}
                        sub={m.avg_view_percentage > 0 ? `${m.avg_view_percentage.toFixed(1)}% avg` : undefined}
                      />
                      <MetricTile
                        label="CTR"
                        value={m.ctr > 0 ? `${m.ctr.toFixed(2)}%` : "—"}
                        sub={m.impressions > 0 ? `${fmt(m.impressions)} imp.` : undefined}
                      />
                    </div>

                    {/* Traffic sources */}
                    {m.traffic_sources && Object.keys(m.traffic_sources).length > 0 && (
                      <div>
                        <div className="mb-2 flex items-center gap-1.5">
                          <BarChart2 size={11} style={{ color: "var(--accent-youtube)" }} />
                          <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>
                            Fuentes de tráfico
                          </span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          {Object.entries(m.traffic_sources)
                            .sort(([, a], [, b]) => b - a)
                            .slice(0, 5)
                            .map(([source, pct]) => (
                              <div key={source} className="flex items-center gap-2">
                                <span className="w-32 truncate text-[11px]" style={{ color: "var(--text-secondary)" }}>
                                  {source}
                                </span>
                                <div className="flex-1 rounded-full h-1.5 overflow-hidden" style={{ background: "var(--bg-surface)" }}>
                                  <div
                                    className="h-full rounded-full"
                                    style={{ width: `${Math.min(pct, 100)}%`, background: "var(--accent-youtube)" }}
                                  />
                                </div>
                                <span className="text-[11px] font-medium w-10 text-right" style={{ color: "var(--text-secondary)" }}>
                                  {pct.toFixed(1)}%
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Top countries */}
                    {m.top_countries && Object.keys(m.top_countries).length > 0 && (
                      <div>
                        <div className="mb-2 flex items-center gap-1.5">
                          <TrendingUp size={11} style={{ color: "var(--accent-youtube)" }} />
                          <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>
                            Top países
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(m.top_countries)
                            .sort(([, a], [, b]) => b - a)
                            .slice(0, 6)
                            .map(([country, views]) => (
                              <div
                                key={country}
                                className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px]"
                                style={{
                                  background: "rgba(255,68,68,0.06)",
                                  border: "1px solid rgba(255,68,68,0.15)",
                                  color: "var(--text-secondary)",
                                }}
                              >
                                <span className="font-semibold">{country}</span>
                                <span style={{ color: "var(--text-faint)" }}>·</span>
                                <span style={{ color: "var(--accent-youtube)" }}>{fmt(views as number)}</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div
                    className="rounded-xl px-4 py-3 text-[11px]"
                    style={{ background: "rgba(255,68,68,0.05)", border: "1px solid rgba(255,68,68,0.1)", color: "var(--text-faint)" }}
                  >
                    Analytics detallados no disponibles — sincronizá en Settings para ver watch time, CTR e impresiones.
                  </div>
                )}

                {/* AI Insights */}
                {t?.ai_insights && t.ai_insights.length > 0 && (
                  <div>
                    <div className="mb-2 flex items-center gap-1.5">
                      <Sparkles size={11} style={{ color: "var(--accent-youtube)" }} />
                      <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>
                        Insights IA
                      </span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {t.ai_insights.map((insight, i) => (
                        <div
                          key={i}
                          className="rounded-lg px-3 py-2.5 text-[12px] leading-relaxed"
                          style={{
                            background: "rgba(255,68,68,0.04)",
                            border: "1px solid rgba(255,68,68,0.12)",
                            color: "var(--text-secondary)",
                          }}
                        >
                          {insight}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Improvement points */}
                {t?.improvement_points && t.improvement_points.length > 0 && (
                  <div>
                    <div className="mb-2 flex items-center gap-1.5">
                      <TrendingUp size={11} style={{ color: "var(--accent-youtube)" }} />
                      <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>
                        Puntos de mejora
                      </span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {t.improvement_points.map((pt, i) => (
                        <div key={i} className="flex gap-2 text-[12px]" style={{ color: "var(--text-secondary)" }}>
                          <span style={{ color: "var(--accent-youtube)" }}>·</span>
                          {pt}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {video.tags && video.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {video.tags.slice(0, 12).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                        style={{
                          background: "rgba(255,68,68,0.06)",
                          border: "1px solid rgba(255,68,68,0.15)",
                          color: "var(--text-faint)",
                        }}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Transcription collapsible */}
                {t?.text && (
                  <div>
                    <button
                      onClick={() => setShowTranscription((v) => !v)}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-[11px] font-semibold uppercase tracking-widest transition-colors hover:bg-white/[0.03]"
                      style={{ color: "var(--text-faint)", border: "1px solid var(--border-subtle)" }}
                    >
                      Transcripción
                      {showTranscription ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                    {showTranscription && (
                      <p className="mt-2 text-[12px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                        {t.text}
                      </p>
                    )}
                  </div>
                )}

                {/* Footer */}
                <a
                  href={`https://www.youtube.com/watch?v=${video.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-fit items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-medium transition-colors hover:bg-white/[0.04]"
                  style={{ color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}
                >
                  <ExternalLink size={11} />
                  Ver en YouTube
                </a>

              </div>
            </div>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  )
}
