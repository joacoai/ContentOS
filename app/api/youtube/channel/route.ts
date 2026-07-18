import { NextResponse } from 'next/server'
import { getChannelStats } from '@/lib/youtubeClient'

export async function GET() {
  try {
    const stats = await getChannelStats()
    if (!stats) {
      return NextResponse.json({ error: 'YOUTUBE_NOT_CONFIGURED' }, { status: 400 })
    }
    return NextResponse.json({ data: stats })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
