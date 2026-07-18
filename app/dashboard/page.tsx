export const dynamic = 'force-dynamic'

import {
  Eye, Bookmark, TrendingUp, Film, Clock, CalendarDays,
  Youtube, Users, Timer, BarChart2, PlayCircle,
} from "lucide-react"
import { MetricCard } from "@/components/shared/MetricCard"
import { HeroMetric } from "@/components/dashboard/HeroMetric"
import { ViewsChart } from "@/components/dashboard/ViewsChart"
import { YTViewsChart } from "@/components/dashboard/YTViewsChart"
import { TopContent } from "@/components/dashboard/TopContent"
import { GoalsSectionClient } from "@/components/dashboard/GoalsSectionClient"
import { YTEngagementClient } from "@/components/dashboard/YTEngagementClient"
import { FadeUp } from "@/components/shared/Animate"
import { EmptyState } from "@/components/ui/empty-state"
import { getIGMedia, getFollowerCount } from "@/lib/instagramClient"
import { getDashboardData } from "@/lib/instagramDashboard"
import { getYTDashboardData } from "@/lib/youtubeDashboard"
import type { YTTopVideo } from "@/lib/youtubeDashboard"
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

export default async function DashboardPage() {
  const [mediaResult, followerCount, ytData] = await Promise.all([
    getIGMedia().catch(() => [] as Awaited<ReturnType<typeof getIGMedia>>),
    getFollowerCount().catch(() => 0),
    getYTDashboardData().catch(() => ({
      kpis: { totalViews: 0, subscribers: 0, watchTimeH: 0, avgViewDurationS: 0, totalVideos: 0, subscribersGained: 0 },
      viewsTimeSeries: [],
      topVideos: [],
      connected: false,
    })),
  ])

  const { kpis, viewsTimeSeries, topContent, currentMonthReach } = getDashboardData(mediaResult)
  const ytKpis = ytData.kpis

  return (
    <div className="flex flex-col gap-5 p-6">
      {/* Header */}
      <FadeUp delay={0}>
        <h1 className="text-[18px] font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
          Dashboard
        </h1>
      </FadeUp>

      {/* Two-column split: IG left / YT right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ── INSTAGRAM PANEL ── */}
        <div className="flex flex-col gap-4">
          {/* Platform label */}
          <FadeUp delay={0.02}>
            <div className="flex items-center gap-2">
              <span style={{ color: "var(--accent-instagram)" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.13em]" style={{ color: "var(--text-faint)" }}>
                Instagram
              </span>
            </div>
          </FadeUp>

          {/* IG Hero */}
          <FadeUp delay={0.04}>
            <HeroMetric label="Reach Total" value={fmt(kpis.total_reach)} icon={<Eye size={13} />} />
          </FadeUp>

          {/* IG compact metrics */}
          <FadeUp delay={0.08}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <MetricCard variant="compact" label="Guardados" value={fmt(kpis.total_saves)} icon={<Bookmark size={12} />} />
              <MetricCard variant="compact" label="Engagement Rate" value={(kpis.avg_engagement_rate * 100).toFixed(1)} suffix="%" icon={<TrendingUp size={12} />} />
              <MetricCard variant="compact" label="Reels" value={String(kpis.total_reels)} icon={<Film size={12} />} />
              <MetricCard variant="compact" label="Avg Watch Time" value={kpis.avg_watch_time_s > 0 ? `${kpis.avg_watch_time_s}s` : "—"} icon={<Clock size={12} />} />
              <MetricCard variant="compact" label="Mejor día" value={kpis.best_day} icon={<CalendarDays size={12} />} />
            </div>
          </FadeUp>

          {/* IG chart */}
          <FadeUp delay={0.12}>
            <div className="card-surface p-5">
              <h2 className="section-label mb-5">Reach mes a mes</h2>
              {viewsTimeSeries.length < 2 ? (
                <EmptyState icon={<BarChart2 size={28} />} title="Necesitás al menos 2 meses de data" description="Seguí publicando y la curva aparecerá sola." />
              ) : (
                <ViewsChart data={viewsTimeSeries} />
              )}
            </div>
          </FadeUp>

          {/* IG top reels */}
          <FadeUp delay={0.16}>
            <div className="card-surface p-5">
              <h2 className="section-label mb-4">Top Reels</h2>
              {topContent.length > 0 ? (
                <TopContent items={topContent} />
              ) : (
                <EmptyState icon={<Film size={24} />} title="Sin reels aún" description="Sincronizá Instagram para ver tus top contenidos." />
              )}
            </div>
          </FadeUp>

          {/* IG goals */}
          <FadeUp delay={0.20}>
            <div className="card-surface p-5">
              <h2 className="section-label mb-5">Objetivos del mes</h2>
              <GoalsSectionClient followerCount={followerCount} currentMonthReach={currentMonthReach} />
            </div>
          </FadeUp>
        </div>

        {/* ── YOUTUBE PANEL ── */}
        <div
          className="flex flex-col gap-4"
          style={{
            borderLeft: "1px solid rgba(255,68,68,0.15)",
            paddingLeft: "20px",
            marginLeft: "-4px",
          }}
        >
          {/* Platform label */}
          <FadeUp delay={0.02}>
            <div className="flex items-center gap-2">
              <Youtube size={13} style={{ color: "var(--accent-youtube)" }} />
              <span className="text-[11px] font-semibold uppercase tracking-[0.13em]" style={{ color: "var(--accent-youtube)", opacity: 0.7 }}>
                YouTube
              </span>
            </div>
          </FadeUp>

          {/* YT Hero */}
          <FadeUp delay={0.04}>
            <div
              className="card-surface card-yt p-6"
              style={{ borderTop: "2px solid var(--accent-youtube)", borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Eye size={13} style={{ color: "var(--accent-youtube)" }} />
                <span className="section-label">Vistas Totales</span>
              </div>
              <span
                style={{
                  fontSize: "var(--font-size-display-lg)",
                  fontWeight: 800,
                  lineHeight: 1,
                  letterSpacing: "-0.03em",
                  color: "var(--accent-youtube)",
                }}
              >
                {fmt(ytKpis.totalViews)}
              </span>
            </div>
          </FadeUp>

          {/* YT compact metrics */}
          <FadeUp delay={0.08}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <MetricCard variant="compact" label="Suscriptores" value={fmt(ytKpis.subscribers)} icon={<Users size={12} />} />
              <MetricCard variant="compact" label="Watch Time" value={ytKpis.watchTimeH > 0 ? `${fmt(ytKpis.watchTimeH)}h` : "—"} icon={<Timer size={12} />} />
              <MetricCard variant="compact" label="Videos" value={String(ytKpis.totalVideos)} icon={<PlayCircle size={12} />} />
              <MetricCard variant="compact" label="Avg View Duration" value={fmtTime(ytKpis.avgViewDurationS)} icon={<Clock size={12} />} />
              <MetricCard variant="compact" label="Subs ganados" value={ytKpis.subscribersGained > 0 ? `+${ytKpis.subscribersGained}` : "—"} icon={<TrendingUp size={12} />} />
            </div>
          </FadeUp>

          {/* YT chart */}
          <FadeUp delay={0.12}>
            <div className="card-surface p-5">
              <h2 className="section-label mb-5">Vistas mes a mes</h2>
              {!ytData.connected ? (
                <EmptyState icon={<Youtube size={28} />} title="YouTube no conectado" description="Configurá las credenciales en Settings." />
              ) : ytData.viewsTimeSeries.length < 2 ? (
                <EmptyState icon={<BarChart2 size={28} />} title="Necesitás al menos 2 meses de data" description="Seguí publicando y la curva aparecerá sola." />
              ) : (
                <YTViewsChart data={ytData.viewsTimeSeries} />
              )}
            </div>
          </FadeUp>

          {/* YT top videos */}
          <FadeUp delay={0.16}>
            <div className="card-surface p-5 flex-1">
              <h2 className="section-label mb-4">Top Videos</h2>
              {ytData.topVideos.length > 0 ? (
                <TopContent items={ytData.topVideos.map((v: YTTopVideo) => ({
                  id: v.id,
                  platform: "youtube" as const,
                  thumbnail: v.thumbnail,
                  title: v.title,
                  reach: v.views,
                  date: v.date,
                  permalink: "/youtube",
                }))} />
              ) : (
                <EmptyState
                  icon={<Youtube size={24} />}
                  title={ytData.connected ? "Sin videos sincronizados" : "YouTube no conectado"}
                  description={ytData.connected ? "Sincronizá YouTube en Settings." : "Configurá las credenciales de YouTube."}
                />
              )}
            </div>
          </FadeUp>

          {/* YT engagement breakdown */}
          {ytData.connected && ytKpis.totalVideos > 0 && (
            <FadeUp delay={0.20}>
              <div className="card-surface p-5">
                <h2 className="section-label mb-4">Objetivos YouTube</h2>
                <YTEngagementClient
                  subscribers={ytKpis.subscribers}
                  totalViews={ytKpis.totalViews}
                  totalVideos={ytKpis.totalVideos}
                />
              </div>
            </FadeUp>
          )}
        </div>
      </div>
    </div>
  )
}
