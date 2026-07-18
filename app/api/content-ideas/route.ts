import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import { getIGMedia } from '@/lib/instagramClient'

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions'

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

async function buildYTContext(): Promise<string> {
  const [videosRes, metricsRes] = await Promise.all([
    supabase.from('yt_videos').select('id, title, published_at').order('published_at', { ascending: false }).limit(20),
    supabase.from('yt_metrics').select('video_id, views, likes, comments, engagement_rate, avg_view_duration_s'),
  ])

  const videos = videosRes.data ?? []
  const metricsByVideo = Object.fromEntries((metricsRes.data ?? []).map(m => [m.video_id, m]))

  const top = [...videos]
    .filter(v => metricsByVideo[v.id])
    .sort((a, b) => (metricsByVideo[b.id]?.views ?? 0) - (metricsByVideo[a.id]?.views ?? 0))
    .slice(0, 8)

  if (top.length === 0) return 'Sin datos de YouTube disponibles.'

  const lines = top.map(v => {
    const m = metricsByVideo[v.id]
    return `- "${v.title}" → ${fmt(m.views)} vistas, ER ${(m.engagement_rate * 100).toFixed(2)}%, avg view ${m.avg_view_duration_s ? Math.round(m.avg_view_duration_s / 60) + 'm' : '—'}`
  })

  return `Top videos del canal:\n${lines.join('\n')}`
}

async function buildIGContext(): Promise<string> {
  const media = await getIGMedia().catch(() => [])
  if (media.length === 0) return 'Sin datos de Instagram disponibles.'

  const withMetrics = media
    .filter(m => (m.insights?.reach ?? 0) > 0)
    .sort((a, b) => (b.insights?.reach ?? 0) - (a.insights?.reach ?? 0))
    .slice(0, 8)

  const lines = withMetrics.map(m => {
    const caption = m.caption?.split('\n')[0]?.slice(0, 80) ?? 'Sin caption'
    return `- "${caption}" → ${fmt(m.insights?.reach ?? 0)} reach, ER ${((m.insights?.engagement_rate ?? 0) * 100).toFixed(1)}%, watch time ${m.insights?.avg_watch_time_ms ? Math.round((m.insights.avg_watch_time_ms ?? 0) / 1000) + 's' : '—'}`
  })

  return `Top reels del canal:\n${lines.join('\n')}`
}

export interface ContentIdea {
  emoji: string
  title: string
  hook: string
  why: string
}

export async function GET(req: NextRequest) {
  const platform = req.nextUrl.searchParams.get('platform') as 'youtube' | 'instagram' | null
  if (!platform) return NextResponse.json({ error: 'platform required' }, { status: 400 })

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'GROQ_API_KEY no configurada' }, { status: 500 })

  const context = platform === 'youtube' ? await buildYTContext() : await buildIGContext()

  const platformLabel = platform === 'youtube' ? 'YouTube (videos cortos/Shorts)' : 'Instagram Reels'
  const formatHint = platform === 'youtube'
    ? 'videos cortos verticales de 30-60 segundos o Shorts'
    : 'Reels de 30-60 segundos con hook fuerte en los primeros 3 segundos'

  const systemPrompt = `Sos un estratega de contenido experto en ${platformLabel}. Analizás los datos del canal y generás ideas de contenido accionables y específicas.

Reglas:
- Basate SIEMPRE en los datos reales del canal que te dan
- Las ideas deben ser ${formatHint}
- Cada idea debe tener un hook concreto, no genérico
- Usá el nicho y tono que se infiere de los títulos existentes
- Respondé ÚNICAMENTE con JSON válido, sin texto adicional`

  const userPrompt = `Analizá estos datos del canal y generá exactamente 5 ideas para el próximo contenido en ${platformLabel}.

${context}

Respondé con este JSON exacto (sin markdown, sin texto extra):
{
  "ideas": [
    {
      "emoji": "🎯",
      "title": "Título corto del video",
      "hook": "Hook de apertura concreto para usar en los primeros 3 segundos",
      "why": "Por qué va a funcionar basado en los datos del canal (1 oración)"
    }
  ]
}`

  try {
    const res = await fetch(GROQ_CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 1200,
      }),
    })

    const data = await res.json() as { choices?: { message: { content: string } }[] }
    const raw = data.choices?.[0]?.message?.content ?? ''

    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')

    const parsed = JSON.parse(jsonMatch[0]) as { ideas: ContentIdea[] }
    return NextResponse.json({ ideas: parsed.ideas ?? [] })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
