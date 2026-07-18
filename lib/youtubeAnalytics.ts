import fs from 'fs'
import path from 'path'

const CACHE_DIR = '/tmp/youtube-cache'
const CACHE_TTL_H = 6

interface CacheEntry<T> {
  cached_at: string
  payload: T
}

function cachePath(key: string): string {
  const dir = path.resolve(process.cwd(), CACHE_DIR)
  fs.mkdirSync(dir, { recursive: true })
  return path.join(dir, `analytics_${key}.json`)
}

function loadCache<T>(key: string): T | null {
  const p = cachePath(key)
  if (!fs.existsSync(p)) return null
  try {
    const entry: CacheEntry<T> = JSON.parse(fs.readFileSync(p, 'utf-8'))
    const ageH = (Date.now() - new Date(entry.cached_at).getTime()) / 3_600_000
    return ageH > CACHE_TTL_H ? null : entry.payload
  } catch {
    return null
  }
}

function saveCache<T>(key: string, payload: T): void {
  fs.writeFileSync(cachePath(key), JSON.stringify({ cached_at: new Date().toISOString(), payload }, null, 2))
}

async function getAccessToken(): Promise<string | null> {
  // Try cached token first
  const tokenPath = path.resolve(process.cwd(), CACHE_DIR, 'yt_access_token.json')
  try {
    if (fs.existsSync(tokenPath)) {
      const t = JSON.parse(fs.readFileSync(tokenPath, 'utf-8')) as { access_token: string; expires_at: number }
      if (Date.now() < t.expires_at - 60_000) return t.access_token
    }
  } catch { /* fall through to refresh */ }

  // Refresh using env var credentials
  const clientId = process.env.YOUTUBE_CLIENT_ID
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN
  if (!clientId || !clientSecret || !refreshToken) return null

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' }),
  })
  const data = await res.json() as { access_token?: string; expires_in?: number }
  if (!data.access_token) return null

  try {
    fs.mkdirSync(path.dirname(tokenPath), { recursive: true })
    fs.writeFileSync(tokenPath, JSON.stringify({ access_token: data.access_token, expires_at: Date.now() + (data.expires_in ?? 3600) * 1000 }, null, 2))
  } catch { /* cache write failure is non-fatal */ }

  return data.access_token
}

async function analyticsFetch(url: string): Promise<unknown> {
  const token = await getAccessToken()
  if (!token) throw new Error('YouTube Analytics: no hay credenciales configuradas (YOUTUBE_CLIENT_ID / CLIENT_SECRET / REFRESH_TOKEN)')

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  const data = await res.json() as Record<string, unknown>
  if ((data as { error?: { message: string } }).error) {
    throw new Error(`YouTube Analytics: ${(data as { error: { message: string } }).error.message}`)
  }
  return data
}

function isoDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

export interface VideoAnalytics {
  videoId: string
  watchTimeH: number
  avgViewDurationS: number
  avgViewPercentage: number
  views: number
  ctr: number | null
  impressions: number | null
}

export interface ChannelAnalytics {
  views: number
  watchTimeH: number
  avgViewDurationS: number
  subscribersGained: number
  subscribersLost: number
  viewsTimeSeries: { month: string; views: number }[]
  topCountries: { country: string; views: number }[]
}

export async function getVideoAnalytics(videoId: string): Promise<VideoAnalytics | null> {
  const cacheKey = `video_${videoId}`
  const cached = loadCache<VideoAnalytics>(cacheKey)
  if (cached) return cached

  const end = isoDate(new Date())
  const start = isoDate(new Date(Date.now() - 365 * 24 * 3600 * 1000))

  try {
    const baseUrl = `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel%3D%3DMINE&startDate=${start}&endDate=${end}&filters=video%3D%3D${videoId}&dimensions=video`
    const [watchData, ctrData] = await Promise.allSettled([
      analyticsFetch(`${baseUrl}&metrics=estimatedMinutesWatched,averageViewDuration,averageViewPercentage,views`) as Promise<{ rows?: number[][] }>,
      analyticsFetch(`${baseUrl}&metrics=impressions,impressionClickThroughRate`) as Promise<{ rows?: number[][] }>,
    ])

    const row = watchData.status === 'fulfilled' ? watchData.value.rows?.[0] : null
    if (!row) return null

    const ctrRow = ctrData.status === 'fulfilled' ? ctrData.value.rows?.[0] : null

    const result: VideoAnalytics = {
      videoId,
      watchTimeH: Math.round((row[0] ?? 0) / 60 * 10) / 10,
      avgViewDurationS: Math.round(row[1] ?? 0),
      avgViewPercentage: Math.round((row[2] ?? 0) * 10) / 10,
      views: Math.round(row[3] ?? 0),
      impressions: ctrRow ? Math.round(ctrRow[0] ?? 0) : null,
      ctr: ctrRow ? Math.round((ctrRow[1] ?? 0) * 1000) / 10 : null,
    }

    saveCache(cacheKey, result)
    return result
  } catch {
    return null
  }
}

const MONTHS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export async function getChannelAnalytics(): Promise<ChannelAnalytics | null> {
  const cacheKey = 'channel_90d'
  const cached = loadCache<ChannelAnalytics>(cacheKey)
  if (cached) return cached

  const end = isoDate(new Date())
  const start = isoDate(new Date(Date.now() - 90 * 24 * 3600 * 1000))
  const startYear = isoDate(new Date(Date.now() - 365 * 24 * 3600 * 1000))

  try {
    const [overviewData, timeSeriesData, geoData] = await Promise.all([
      analyticsFetch(
        `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel%3D%3DMINE&startDate=${start}&endDate=${end}&metrics=views,estimatedMinutesWatched,averageViewDuration,subscribersGained,subscribersLost`
      ) as Promise<{ rows?: number[][] }>,
      analyticsFetch(
        `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel%3D%3DMINE&startDate=${startYear}&endDate=${end}&metrics=views&dimensions=month`
      ) as Promise<{ rows?: Array<[string, number]> }>,
      analyticsFetch(
        `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel%3D%3DMINE&startDate=${start}&endDate=${end}&metrics=views&dimensions=country&sort=-views&maxResults=10`
      ) as Promise<{ rows?: Array<[string, number]> }>,
    ])

    const row = (overviewData as { rows?: number[][] }).rows?.[0] ?? [0, 0, 0, 0, 0]

    const viewsTimeSeries = ((timeSeriesData as { rows?: Array<[string, number]> }).rows ?? []).map(([dateStr, views]) => {
      const d = new Date(dateStr + '-01')
      return { month: `${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`, views }
    })

    const topCountries = ((geoData as { rows?: Array<[string, number]> }).rows ?? []).map(([country, views]) => ({ country, views }))

    const result: ChannelAnalytics = {
      views: Math.round(row[0] ?? 0),
      watchTimeH: Math.round((row[1] ?? 0) / 60),
      avgViewDurationS: Math.round(row[2] ?? 0),
      subscribersGained: Math.round(row[3] ?? 0),
      subscribersLost: Math.round(row[4] ?? 0),
      viewsTimeSeries,
      topCountries,
    }

    saveCache(cacheKey, result)
    return result
  } catch {
    return null
  }
}
