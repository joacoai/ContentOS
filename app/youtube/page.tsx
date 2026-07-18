export const dynamic = 'force-dynamic'

import {
  Youtube, Eye, Users, Timer, PlayCircle, Clock, TrendingUp, BarChart2,
} from "lucide-react"
import { MetricCard } from "@/components/shared/MetricCard"
import { YTViewsChart } from "@/components/dashboard/YTViewsChart"
import { VideosFeed } from "@/components/youtube/VideosFeed"
import { FadeUp } from "@/components/shared/Animate"
import { EmptyState } from "@/components/ui/empty-state"
import { ContentIdeasPanel } from "@/components/shared/ContentIdeasPanel"
import { getYTDashboardData } from "@/lib/youtubeDashboard"

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M"
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k"
  return String(n)
}

function fmtTime(s: number): string {
  if (s <= 0) return "—"
  const m = Math.floor(s / 60)
  const sec = s % 60
  return m > 0 ? `${m}m${sec > 0 ? ` ${sec}s` : ""}` : `${sec}s`
}

export default async function YouTubePage() {
  const ytData = await getYTDashboardData().catch(() => ({
    kpis: { totalViews: 0, subscribers: 0, watchTimeH: 0, avgViewDurationS: 0, totalVideos: 0, subscribersGained: 0 },
    viewsTimeSeries: [],
    topVideos: [],
    connected: false,
  }))

  const k = ytData.kpis
  const accentYT = "var(--accent-youtube)"

  return (
    <div className="flex flex-col gap-5 p-6">

      {/* Header */}
      <FadeUp delay={0}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl"
              style={{
                background: "linear-gradient(145deg, rgba(255,68,68,0.18) 0%, rgba(255,68,68,0.08) 100%)",
                border: "1px solid rgba(255,68,68,0.3)",
                boxShadow: "0 0 20px rgba(255,68,68,0.15)",
              }}
            >
              <Youtube size={22} style={{ color: accentYT }} />
            </div>
            <div>
              <h1 className="text-[28px] font-black tracking-tight leading-none" style={{ color: "var(--text-primary)" }}>YouTube</h1>
              <p className="text-[13px] mt-0.5" style={{ color: "var(--text-faint)" }}>Canal · métricas · videos</p>
            </div>
          </div>
          <ContentIdeasPanel platform="youtube" />
        </div>
      </FadeUp>

      {/* Desktop 2-col: KPIs left / Chart right */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1.4fr]">

        {/* Left: hero + metrics */}
        <div className="flex flex-col gap-4">

          {/* Hero */}
          <FadeUp delay={0.04}>
            <div
              className="card-surface card-yt p-5"
              style={{ borderTop: "2px solid var(--accent-youtube)", borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
            >
              <div className="flex items-center gap-1.5 mb-2">
                <Eye size={12} style={{ color: accentYT }} />
                <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>Vistas Totales</span>
              </div>
              <span style={{ fontSize: "var(--font-size-display-lg)", fontWeight: 800, lineHeight: 1, letterSpacing: "-0.03em", color: accentYT }}>
                {fmt(k.totalViews)}
              </span>
              {k.totalVideos > 0 && k.totalViews > 0 && (
                <p className="mt-1.5 text-[11px]" style={{ color: "var(--text-faint)" }}>
                  ~{fmt(Math.round(k.totalViews / k.totalVideos))} vistas por video
                </p>
              )}
            </div>
          </FadeUp>

          {/* Metrics grid */}
          <FadeUp delay={0.08}>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              <MetricCard variant="compact" platform="youtube" label="Suscriptores" value={fmt(k.subscribers)} icon={<Users size={12} />} />
              <MetricCard variant="compact" platform="youtube" label="Videos" value={String(k.totalVideos)} icon={<PlayCircle size={12} />} />
              <MetricCard variant="compact" platform="youtube" label="Watch Time (90d)" value={k.watchTimeH > 0 ? `${fmt(k.watchTimeH)}h` : "—"} icon={<Timer size={12} />} />
              <MetricCard variant="compact" platform="youtube" label="Avg View Duration" value={fmtTime(k.avgViewDurationS)} icon={<Clock size={12} />} />
              <MetricCard variant="compact" platform="youtube" label="Subs ganados" value={k.subscribersGained > 0 ? `+${fmt(k.subscribersGained)}` : "—"} icon={<TrendingUp size={12} />} />
              <MetricCard variant="compact" platform="youtube" label="Views / video" value={k.totalVideos > 0 && k.totalViews > 0 ? fmt(Math.round(k.totalViews / k.totalVideos)) : "—"} icon={<Eye size={12} />} />
            </div>
          </FadeUp>
        </div>

        {/* Right: chart */}
        <FadeUp delay={0.1}>
          <div className="card-surface card-yt p-5 h-full flex flex-col">
            <h2 className="section-label mb-5">Vistas mes a mes</h2>
            <div className="flex-1">
              {!ytData.connected ? (
                <EmptyState icon={<Youtube size={28} />} title="YouTube no conectado" description="Configurá las credenciales en Settings." />
              ) : ytData.viewsTimeSeries.length < 2 ? (
                <EmptyState icon={<BarChart2 size={28} />} title="Necesitás al menos 2 meses de data" description="Seguí publicando y la curva aparecerá sola." />
              ) : (
                <YTViewsChart data={ytData.viewsTimeSeries} />
              )}
            </div>
          </div>
        </FadeUp>
      </div>

      {/* Videos feed */}
      <FadeUp delay={0.14}>
        <div className="flex flex-col gap-3">
          <h2 className="section-label">Todos los videos</h2>
          <VideosFeed />
        </div>
      </FadeUp>

    </div>
  )
}
