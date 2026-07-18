import { getVideos, getChannelStats } from './youtubeClient'
import { getChannelAnalytics } from './youtubeAnalytics'
import { supabase } from './supabaseClient'

const MONTHS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getDate()} ${MONTHS_ES[d.getMonth()]}`
}

export interface YTDashboardKPIs {
  totalViews: number
  subscribers: number
  watchTimeH: number
  avgViewDurationS: number
  totalVideos: number
  subscribersGained: number
}

export interface YTTopVideo {
  id: string
  title: string
  thumbnail: string
  views: number
  date: string
}

export interface YTDashboardData {
  kpis: YTDashboardKPIs
  viewsTimeSeries: { month: string; views: number }[]
  topVideos: YTTopVideo[]
  connected: boolean
}

export async function getYTDashboardData(): Promise<YTDashboardData> {
  const empty: YTDashboardData = {
    kpis: { totalViews: 0, subscribers: 0, watchTimeH: 0, avgViewDurationS: 0, totalVideos: 0, subscribersGained: 0 },
    viewsTimeSeries: [],
    topVideos: [],
    connected: false,
  }

  if (!process.env.YOUTUBE_REFRESH_TOKEN) return empty

  try {
    const [channel, videos, analytics, metricsRes] = await Promise.all([
      getChannelStats().catch(() => null),
      getVideos(20).catch(() => []),
      getChannelAnalytics().catch(() => null),
      supabase.from('yt_metrics').select('watch_time_h, avg_view_duration_s').not('watch_time_h', 'is', null),
    ])

    if (!channel) return empty

    const topVideos: YTTopVideo[] = [...videos]
      .sort((a, b) => b.views - a.views)
      .slice(0, 4)
      .map((v) => ({
        id: v.id,
        title: v.title,
        thumbnail: v.thumbnail,
        views: v.views,
        date: fmtDate(v.publishedAt),
      }))

    // Fallback: compute from synced yt_metrics when analytics API unavailable
    const dbMetrics = metricsRes.data ?? []
    const dbWatchTimeH = analytics?.watchTimeH
      ?? (dbMetrics.length > 0 ? Math.round(dbMetrics.reduce((s, m) => s + (m.watch_time_h ?? 0), 0)) : 0)
    const dbAvgViewDurationS = analytics?.avgViewDurationS
      ?? (dbMetrics.length > 0
        ? Math.round(dbMetrics.reduce((s, m) => s + (m.avg_view_duration_s ?? 0), 0) / dbMetrics.length)
        : 0)

    return {
      kpis: {
        totalViews: channel.totalViews,
        subscribers: channel.subscribers,
        watchTimeH: dbWatchTimeH,
        avgViewDurationS: dbAvgViewDurationS,
        totalVideos: channel.totalVideos,
        subscribersGained: analytics?.subscribersGained ?? 0,
      },
      viewsTimeSeries: analytics?.viewsTimeSeries ?? [],
      topVideos,
      connected: true,
    }
  } catch {
    return empty
  }
}
