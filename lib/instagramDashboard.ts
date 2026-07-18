import type { IGMediaItem } from './instagramTypes'

const MONTHS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const DAYS_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export interface DashboardKPIs {
  total_reach: number
  total_saves: number
  avg_engagement_rate: number
  total_reels: number
  avg_watch_time_s: number
  best_day: string
}

export interface TopContentItem {
  id: string
  platform: 'instagram'
  thumbnail: string
  title: string
  reach: number
  date: string
  permalink: string
}

export interface DashboardData {
  kpis: DashboardKPIs
  viewsTimeSeries: { month: string; organic: number }[]
  topContent: TopContentItem[]
  currentMonthReach: number
}

function formatMonth(timestamp: string): string {
  const d = new Date(timestamp)
  return `${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`
}

function formatDate(timestamp: string): string {
  const d = new Date(timestamp)
  return `${d.getDate()} ${MONTHS_ES[d.getMonth()]}`
}

export function getDashboardData(media: IGMediaItem[]): DashboardData {
  if (media.length === 0) {
    return {
      kpis: { total_reach: 0, total_saves: 0, avg_engagement_rate: 0, total_reels: 0, avg_watch_time_s: 0, best_day: '—' },
      viewsTimeSeries: [],
      topContent: [],
      currentMonthReach: 0,
    }
  }

  // KPIs
  const total_reach = media.reduce((sum, m) => sum + (m.insights?.reach ?? 0), 0)
  const total_saves = media.reduce((sum, m) => sum + (m.insights?.saves ?? 0), 0)
  const avg_engagement_rate =
    media.reduce((sum, m) => sum + (m.insights?.engagement_rate ?? 0), 0) / media.length

  // Avg watch time
  const withWatchTime = media.filter(m => (m.insights?.avg_watch_time_ms ?? 0) > 0)
  const avg_watch_time_s = withWatchTime.length > 0
    ? Math.round(withWatchTime.reduce((sum, m) => sum + (m.insights?.avg_watch_time_ms ?? 0), 0) / withWatchTime.length / 1000)
    : 0

  // Best day to publish (by avg reach per day-of-week)
  const dayMap: Record<number, { total: number; count: number }> = {}
  for (const item of media) {
    const day = new Date(item.timestamp).getDay()
    const reach = item.insights?.reach ?? 0
    if (!dayMap[day]) dayMap[day] = { total: 0, count: 0 }
    dayMap[day].total += reach
    dayMap[day].count += 1
  }
  const bestDayNum = Object.entries(dayMap)
    .map(([d, { total, count }]) => ({ day: Number(d), avg: total / count }))
    .sort((a, b) => b.avg - a.avg)[0]?.day ?? -1
  const best_day = bestDayNum >= 0 ? DAYS_ES[bestDayNum] : '—'

  // Views time series — agrupar por mes, últimos 6 meses
  const monthMap: Map<string, { label: string; date: Date; organic: number }> = new Map()
  for (const item of media) {
    const key = formatMonth(item.timestamp)
    const d = new Date(item.timestamp)
    const existing = monthMap.get(key)
    if (existing) {
      existing.organic += item.insights?.reach ?? 0
    } else {
      monthMap.set(key, { label: key, date: d, organic: item.insights?.reach ?? 0 })
    }
  }

  const viewsTimeSeries = Array.from(monthMap.values())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(-6)
    .map(({ label, organic }) => ({ month: label, organic }))

  const now = new Date()
  const currentMonthKey = `${MONTHS_ES[now.getMonth()]} ${now.getFullYear()}`
  const currentMonthReach = monthMap.get(currentMonthKey)?.organic ?? 0

  // Top 4 por reach
  const topContent: TopContentItem[] = [...media]
    .sort((a, b) => (b.insights?.reach ?? 0) - (a.insights?.reach ?? 0))
    .slice(0, 4)
    .map((item) => ({
      id: item.id,
      platform: 'instagram' as const,
      thumbnail: item.thumbnail_url ?? '',
      title: item.caption?.split('\n')[0]?.slice(0, 80) ?? 'Sin caption',
      reach: item.insights?.reach ?? 0,
      date: formatDate(item.timestamp),
      permalink: item.permalink,
    }))

  return {
    kpis: {
      total_reach,
      total_saves,
      avg_engagement_rate,
      total_reels: media.length,
      avg_watch_time_s,
      best_day,
    },
    viewsTimeSeries,
    topContent,
    currentMonthReach,
  }
}
