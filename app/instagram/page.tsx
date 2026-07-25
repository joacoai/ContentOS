export const dynamic = 'force-dynamic'

import {
  Eye, Bookmark, TrendingUp, Film, Clock, CalendarDays,
  BarChart2, ThumbsUp, MessageCircle, Share2, Heart,
} from "lucide-react"
import { MetricCard } from "@/components/shared/MetricCard"
import { ViewsChart } from "@/components/dashboard/ViewsChart"
import { ReelsFeed } from "@/components/instagram/ReelsFeed"
import { AIAnalysis } from "@/components/instagram/AIAnalysis"
import { StoriesFeed } from "@/components/instagram/StoriesFeed"
import { InstagramTabs } from "@/components/instagram/InstagramTabs"
import { FadeUp } from "@/components/shared/Animate"
import { EmptyState } from "@/components/ui/empty-state"
import { ContentIdeasPanel } from "@/components/shared/ContentIdeasPanel"
import { getIGMedia, getFollowerCount } from "@/lib/instagramClient"
import { getDashboardData } from "@/lib/instagramDashboard"
function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M"
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k"
  return String(n)
}

export default async function InstagramPage() {
  const [mediaResult, followerCount] = await Promise.all([
    getIGMedia().catch(() => [] as Awaited<ReturnType<typeof getIGMedia>>),
    getFollowerCount().catch(() => 0),
  ])

  const { kpis, viewsTimeSeries } = getDashboardData(mediaResult)

  const totalLikes = mediaResult.reduce((s, m) => s + (m.insights?.likes ?? 0), 0)
  const totalComments = mediaResult.reduce((s, m) => s + (m.insights?.comments ?? 0), 0)
  const totalShares = mediaResult.reduce((s, m) => s + (m.insights?.shares ?? 0), 0)
  const avgReachPerReel = kpis.total_reels > 0 ? Math.round(kpis.total_reach / kpis.total_reels) : 0

  const accentIG = "var(--accent-instagram)"

  return (
    <div className="flex flex-col gap-5 p-6">

      {/* Header */}
      <FadeUp delay={0}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl"
              style={{
                background: "linear-gradient(145deg, rgba(0,168,255,0.15) 0%, rgba(138,43,226,0.1) 100%)",
                border: "1px solid rgba(0,168,255,0.25)",
                boxShadow: "0 0 20px rgba(0,168,255,0.12)",
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" style={{ color: accentIG }}>
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </div>
            <div>
              <h1 className="text-[28px] font-black tracking-tight leading-none" style={{ color: "var(--text-primary)" }}>Instagram</h1>
              <p className="text-[13px] mt-0.5" style={{ color: "var(--text-faint)" }}>Canal · métricas · reels</p>
            </div>
          </div>
          <ContentIdeasPanel platform="instagram" />
        </div>
      </FadeUp>

      {/* Desktop 2-col: KPIs left / Chart right */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1.4fr]">

        {/* Left: hero + metrics */}
        <div className="flex flex-col gap-4">

          {/* Hero */}
          <FadeUp delay={0.04}>
            <div className="card-surface p-5" style={{ borderTop: "2px solid var(--accent)", borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
              <div className="flex items-center gap-1.5 mb-2">
                <Eye size={12} style={{ color: accentIG }} />
                <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>Reach Total</span>
              </div>
              <span style={{ fontSize: "var(--font-size-display-lg)", fontWeight: 800, lineHeight: 1, letterSpacing: "-0.03em", color: accentIG }}>
                {fmt(kpis.total_reach)}
              </span>
              {avgReachPerReel > 0 && (
                <p className="mt-1.5 text-[11px]" style={{ color: "var(--text-faint)" }}>
                  ~{fmt(avgReachPerReel)} por reel
                </p>
              )}
            </div>
          </FadeUp>

          {/* Metrics grid */}
          <FadeUp delay={0.08}>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              <MetricCard variant="compact" label="Seguidores" value={fmt(followerCount)} icon={<Eye size={12} />} />
              <MetricCard variant="compact" label="Reels" value={String(kpis.total_reels)} icon={<Film size={12} />} />
              <MetricCard variant="compact" label="Engagement Rate" value={(kpis.avg_engagement_rate * 100).toFixed(1)} suffix="%" icon={<TrendingUp size={12} />} />
              <MetricCard variant="compact" label="Guardados" value={fmt(kpis.total_saves)} icon={<Bookmark size={12} />} />
              <MetricCard variant="compact" label="Likes totales" value={fmt(totalLikes)} icon={<ThumbsUp size={12} />} />
              <MetricCard variant="compact" label="Comentarios" value={fmt(totalComments)} icon={<MessageCircle size={12} />} />
              <MetricCard variant="compact" label="Compartidos" value={fmt(totalShares)} icon={<Share2 size={12} />} />
              <MetricCard variant="compact" label="Avg Watch Time" value={kpis.avg_watch_time_s > 0 ? `${kpis.avg_watch_time_s}s` : "—"} icon={<Clock size={12} />} />
              <MetricCard variant="compact" label="Mejor día" value={kpis.best_day} icon={<CalendarDays size={12} />} />
            </div>
          </FadeUp>
        </div>

        {/* Right: chart */}
        <FadeUp delay={0.1}>
          <div className="card-surface p-5 h-full flex flex-col">
            <h2 className="section-label mb-5">Reach mes a mes</h2>
            <div className="flex-1">
              {viewsTimeSeries.length < 2 ? (
                <EmptyState icon={<BarChart2 size={28} />} title="Necesitás al menos 2 meses de data" description="Seguí publicando y la curva aparecerá sola." />
              ) : (
                <ViewsChart data={viewsTimeSeries} />
              )}
            </div>
          </div>
        </FadeUp>
      </div>

      {/* Reels + AI Analysis */}
      <FadeUp delay={0.14}>
        <InstagramTabs
          analysisSlot={<AIAnalysis />}
          reelsSlot={<ReelsFeed />}
          storiesSlot={<StoriesFeed />}
        />
      </FadeUp>

    </div>
  )
}
