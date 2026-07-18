import fs from 'fs'
import path from 'path'

const CACHE_DIR = '/tmp/youtube-cache'
const TOKEN_CACHE_KEY = 'yt_access_token'

interface TokenCache {
  access_token: string
  expires_at: number
}

function cachePath(key: string): string {
  const dir = path.resolve(process.cwd(), CACHE_DIR)
  fs.mkdirSync(dir, { recursive: true })
  return path.join(dir, `${key}.json`)
}

function loadCache<T>(key: string): T | null {
  const p = cachePath(key)
  if (!fs.existsSync(p)) return null
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8')) as T
  } catch {
    return null
  }
}

function saveCache<T>(key: string, data: T): void {
  fs.writeFileSync(cachePath(key), JSON.stringify(data, null, 2))
}

function getCredentials() {
  const clientId = process.env.YOUTUBE_CLIENT_ID
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN
  const channelId = process.env.YOUTUBE_CHANNEL_ID
  if (!clientId || !clientSecret || !refreshToken) return null
  return { clientId, clientSecret, refreshToken, channelId }
}

async function getAccessToken(): Promise<string | null> {
  const cached = loadCache<TokenCache>(TOKEN_CACHE_KEY)
  if (cached && Date.now() < cached.expires_at - 60_000) {
    return cached.access_token
  }

  const creds = getCredentials()
  if (!creds) return null

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      refresh_token: creds.refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  const data = await res.json()
  if (!data.access_token) {
    throw new Error(`YouTube token refresh failed: ${JSON.stringify(data)}`)
  }

  saveCache(TOKEN_CACHE_KEY, {
    access_token: data.access_token,
    expires_at: Date.now() + (data.expires_in ?? 3600) * 1000,
  })

  return data.access_token
}

async function ytFetch(url: string): Promise<unknown> {
  const token = await getAccessToken()
  if (!token) throw new Error('YouTube no configurado — verificá YOUTUBE_CLIENT_ID, CLIENT_SECRET y REFRESH_TOKEN')

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json() as Record<string, unknown>
  if ((data as { error?: { message: string } }).error) {
    throw new Error(`YouTube API: ${(data as { error: { message: string } }).error.message}`)
  }
  return data
}

export interface YTChannelStats {
  id: string
  title: string
  thumbnail: string
  subscribers: number
  totalViews: number
  totalVideos: number
  publishedAt: string
}

export async function getChannelStats(): Promise<YTChannelStats | null> {
  const creds = getCredentials()
  if (!creds) return null

  const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true`
  const data = await ytFetch(url) as {
    items?: Array<{
      id: string
      snippet: { title: string; thumbnails: { default: { url: string } }; publishedAt: string }
      statistics: { subscriberCount: string; viewCount: string; videoCount: string }
    }>
  }
  const ch = data.items?.[0]
  if (!ch) return null

  return {
    id: ch.id,
    title: ch.snippet.title,
    thumbnail: ch.snippet.thumbnails.default.url,
    subscribers: parseInt(ch.statistics.subscriberCount ?? '0'),
    totalViews: parseInt(ch.statistics.viewCount ?? '0'),
    totalVideos: parseInt(ch.statistics.videoCount ?? '0'),
    publishedAt: ch.snippet.publishedAt,
  }
}

async function getUploadsPlaylistId(): Promise<string | null> {
  const url = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&mine=true`
  const data = await ytFetch(url) as {
    items?: Array<{ contentDetails: { relatedPlaylists: { uploads: string } } }>
  }
  return data.items?.[0]?.contentDetails.relatedPlaylists.uploads ?? null
}

export interface YTVideoSnippet {
  id: string
  title: string
  description: string
  thumbnail: string
  publishedAt: string
  durationS: number
  tags: string[]
  views: number
  likes: number
  comments: number
  engagementRate: number
}

function parseDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 0
  return (parseInt(match[1] ?? '0') * 3600) + (parseInt(match[2] ?? '0') * 60) + parseInt(match[3] ?? '0')
}

export async function getVideos(maxResults = 50): Promise<YTVideoSnippet[]> {
  const playlistId = await getUploadsPlaylistId()
  if (!playlistId) return []

  const videoIds: string[] = []
  let pageToken: string | undefined

  // Paginado — hasta maxResults videos
  while (videoIds.length < maxResults) {
    const limit = Math.min(50, maxResults - videoIds.length)
    const pageParam = pageToken ? `&pageToken=${pageToken}` : ''
    const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${playlistId}&maxResults=${limit}${pageParam}`
    const data = await ytFetch(url) as {
      items?: Array<{ contentDetails: { videoId: string } }>
      nextPageToken?: string
    }

    for (const item of data.items ?? []) {
      videoIds.push(item.contentDetails.videoId)
    }

    if (!data.nextPageToken || videoIds.length >= maxResults) break
    pageToken = data.nextPageToken
  }

  if (videoIds.length === 0) return []

  // Fetch detalles en batches de 50
  const results: YTVideoSnippet[] = []
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50).join(',')
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${batch}`
    const data = await ytFetch(url) as {
      items?: Array<{
        id: string
        snippet: {
          title: string
          description: string
          publishedAt: string
          tags?: string[]
          thumbnails: { maxres?: { url: string }; high?: { url: string }; default: { url: string } }
        }
        contentDetails: { duration: string }
        statistics: { viewCount?: string; likeCount?: string; commentCount?: string }
      }>
    }

    for (const v of data.items ?? []) {
      const views = parseInt(v.statistics.viewCount ?? '0')
      const likes = parseInt(v.statistics.likeCount ?? '0')
      const comments = parseInt(v.statistics.commentCount ?? '0')
      const engagementRate = views > 0 ? (likes + comments) / views : 0

      results.push({
        id: v.id,
        title: v.snippet.title,
        description: v.snippet.description,
        thumbnail: v.snippet.thumbnails.maxres?.url ?? v.snippet.thumbnails.high?.url ?? v.snippet.thumbnails.default.url,
        publishedAt: v.snippet.publishedAt,
        durationS: parseDuration(v.contentDetails.duration),
        tags: v.snippet.tags ?? [],
        views,
        likes,
        comments,
        engagementRate,
      })
    }
  }

  return results.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
}
