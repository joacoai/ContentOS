import { NextResponse } from 'next/server'
import { getVideos, getChannelStats } from '@/lib/youtubeClient'
import { getVideoAnalytics } from '@/lib/youtubeAnalytics'
import { supabase } from '@/lib/supabaseClient'

export async function POST() {
  if (!process.env.YOUTUBE_REFRESH_TOKEN) {
    return NextResponse.json({ error: 'YOUTUBE_NOT_CONFIGURED' }, { status: 400 })
  }

  try {
    const [channel, videos] = await Promise.all([
      getChannelStats(),
      getVideos(50),
    ])

    if (!channel) {
      return NextResponse.json({ error: 'No se pudo obtener el canal de YouTube' }, { status: 500 })
    }

    // Upsert canal
    await supabase.from('yt_channel').upsert({
      id: 'main',
      channel_id: channel.id,
      title: channel.title,
      subscribers: channel.subscribers,
      total_views: channel.totalViews,
      total_videos: channel.totalVideos,
      synced_at: new Date().toISOString(),
    })

    // Upsert videos + métricas
    let synced = 0
    for (const video of videos) {
      await supabase.from('yt_videos').upsert({
        id: video.id,
        title: video.title,
        description: video.description,
        thumbnail: video.thumbnail,
        published_at: video.publishedAt,
        duration_s: video.durationS,
        tags: video.tags,
        synced_at: new Date().toISOString(),
      })

      const analytics = await getVideoAnalytics(video.id).catch(() => null)

      await supabase.from('yt_metrics').upsert({
        video_id: video.id,
        views: video.views,
        likes: video.likes,
        comments: video.comments,
        engagement_rate: video.engagementRate,
        watch_time_h: analytics?.watchTimeH ?? null,
        avg_view_duration_s: analytics?.avgViewDurationS ?? null,
        avg_view_percentage: analytics?.avgViewPercentage ?? null,
        ctr: analytics?.ctr ?? null,
        impressions: analytics?.impressions ?? null,
        updated_at: new Date().toISOString(),
      })

      synced++
    }

    return NextResponse.json({
      ok: true,
      channel: channel.title,
      synced,
      total: videos.length,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
