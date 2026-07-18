import { NextRequest, NextResponse } from 'next/server'
import { getVideos } from '@/lib/youtubeClient'

export async function GET(req: NextRequest) {
  const limit = parseInt(req.nextUrl.searchParams.get('limit') ?? '50')

  try {
    const videos = await getVideos(limit)
    return NextResponse.json({ data: videos, total: videos.length })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
