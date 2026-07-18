import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const [videoRes, metricsRes, transcriptionRes] = await Promise.all([
    supabase.from('yt_videos').select('*').eq('id', id).single(),
    supabase.from('yt_metrics').select('*').eq('video_id', id).single(),
    supabase.from('yt_transcriptions').select('text, ai_insights, improvement_points').eq('video_id', id).single(),
  ])

  if (videoRes.error && videoRes.error.code !== 'PGRST116') {
    return NextResponse.json({ error: videoRes.error.message }, { status: 500 })
  }

  return NextResponse.json({
    video: videoRes.data ?? null,
    metrics: metricsRes.data ?? null,
    transcription: transcriptionRes.data ?? null,
  })
}
