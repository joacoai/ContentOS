import fs from 'fs'
import path from 'path'
import type { IGMediaItem, IGInsights, IGCacheEntry } from './instagramTypes'

const CACHE_DIR = '/tmp/instagram-cache'
const CACHE_HOURS_MEDIA = 6
const CACHE_HOURS_INSIGHTS = 24

// --- Cache helpers ---

function cachePath(key: string): string {
  const dir = path.resolve(process.cwd(), CACHE_DIR)
  fs.mkdirSync(dir, { recursive: true })
  return path.join(dir, `${key}.json`)
}

function loadCache<T>(key: string, maxHours: number): T | null {
  const p = cachePath(key)
  if (!fs.existsSync(p)) return null
  try {
    const entry: IGCacheEntry<T> = JSON.parse(fs.readFileSync(p, 'utf-8'))
    const ageH = (Date.now() - new Date(entry.cached_at).getTime()) / 3_600_000
    return ageH > maxHours ? null : entry.payload
  } catch {
    return null
  }
}

function saveCache<T>(key: string, payload: T): void {
  fs.writeFileSync(
    cachePath(key),
    JSON.stringify({ cached_at: new Date().toISOString(), payload }, null, 2)
  )
}

// --- API ---

function getCredentials(): { token: string; userId: string } | null {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN
  const userId = process.env.INSTAGRAM_USER_ID
  if (!token || !userId) return null
  return { token, userId }
}

// Insights por video
async function getIGInsights(mediaId: string, token: string, forceRefresh = false): Promise<IGInsights> {
  if (!forceRefresh) {
    const cached = loadCache<IGInsights>(`insights_${mediaId}`, CACHE_HOURS_INSIGHTS)
    if (cached) return cached
  }

  const metrics = 'reach,likes,comments,shares,saved,ig_reels_avg_watch_time'
  const url = `https://graph.facebook.com/v21.0/${mediaId}/insights?metric=${metrics}&access_token=${token}`

  const res = await fetch(url)
  const data = await res.json()

  if (data.error) {
    return { reach: 0, likes: 0, comments: 0, shares: 0, saves: 0 }
  }

  const getValue = (name: string) =>
    data.data?.find((d: { name: string }) => d.name === name)?.values?.[0]?.value ?? 0

  const reach = getValue('reach')
  const likes = getValue('likes')
  const comments = getValue('comments')
  const shares = getValue('shares')
  const saves = getValue('saved')
  const avg_watch_time_ms = getValue('ig_reels_avg_watch_time')
  const engagement_rate = reach > 0 ? (likes + comments + shares + saves) / reach : 0

  const insights: IGInsights = { reach, likes, comments, shares, saves, avg_watch_time_ms, engagement_rate }
  saveCache(`insights_${mediaId}`, insights)
  return insights
}

// Obtiene lista de media con insights — fetch paginado, sin límite de 50
export async function getIGMedia(forceRefresh = false): Promise<IGMediaItem[]> {
  if (!forceRefresh) {
    const cached = loadCache<IGMediaItem[]>('media_list', CACHE_HOURS_MEDIA)
    if (cached) return cached
  }

  const creds = getCredentials()
  if (!creds) return []
  const { token, userId } = creds
  const fields = 'id,caption,media_type,thumbnail_url,permalink,timestamp,video_duration'
  const allItems: IGMediaItem[] = []

  // Fetch paginado — itera todas las páginas hasta que no haya "next"
  let url: string | null =
    `https://graph.facebook.com/v21.0/${userId}/media?fields=${fields}&limit=50&access_token=${token}`

  while (url) {
    const currentUrl: string = url
    const res = await fetch(currentUrl)
    const data = await res.json()
    if (data.error) throw new Error(`IG API: ${data.error.message}`)

    const page = (data.data ?? []).filter(
      (m: IGMediaItem) => m.media_type === 'VIDEO' || m.media_type === 'REEL'
    )
    allItems.push(...page)

    url = data.paging?.next ?? null
  }

  const withInsights = await Promise.all(
    allItems.map(async (item: IGMediaItem) => ({
      ...item,
      insights: await getIGInsights(item.id, token, forceRefresh),
    }))
  )

  saveCache('media_list', withInsights)
  return withInsights
}

// Seguidores actuales — cache 6h
export async function getFollowerCount(): Promise<number> {
  const cached = loadCache<number>('follower_count', 6)
  if (cached !== null) return cached

  const creds = getCredentials()
  if (!creds) return 0
  const { token, userId } = creds
  const url = `https://graph.facebook.com/v21.0/${userId}?fields=followers_count&access_token=${token}`
  const res = await fetch(url)
  const data = await res.json()
  if (data.error) return 0
  const count = data.followers_count ?? 0
  saveCache('follower_count', count)
  return count
}

// media_url fresca — NUNCA cachear, expira ~1h
export async function getIGMediaUrl(mediaId: string): Promise<string> {
  const creds = getCredentials()
  if (!creds) throw new Error('INSTAGRAM_ACCESS_TOKEN o INSTAGRAM_USER_ID no configurados')
  const { token } = creds
  const url = `https://graph.facebook.com/v21.0/${mediaId}?fields=media_url&access_token=${token}`
  const res = await fetch(url)
  const data = await res.json()
  if (data.error) throw new Error(`IG API: ${data.error.message}`)
  if (!data.media_url) throw new Error(`No media_url disponible para ${mediaId}`)
  return data.media_url
}
