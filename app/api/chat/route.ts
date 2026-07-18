import { NextRequest, NextResponse } from 'next/server'
import { semanticSearch } from '@/lib/db/transcriptions'
import { loadImprovementsFile } from '@/lib/improvements'
import { supabase } from '@/lib/supabaseClient'

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_API_KEY = process.env.GROQ_API_KEY

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k'
  return n.toString()
}

const PERFORMANCE_KEYWORDS = /mejor|top|más (views?|reach|saves?|shares?|likes?|viral|visto|guardado|compartido|comentado|funcionó|funcionaron|performó|engagement|exitoso|exitosos)/i

async function buildYTContext(query: string): Promise<string> {
  if (!process.env.YOUTUBE_REFRESH_TOKEN) return ''

  const [videosRes, metricsRes, transcRes] = await Promise.all([
    supabase.from('yt_videos').select('id, title, published_at, duration_s').order('published_at', { ascending: false }).limit(50),
    supabase.from('yt_metrics').select('video_id, views, likes, comments, watch_time_h, avg_view_duration_s, avg_view_percentage, engagement_rate'),
    supabase.from('yt_transcriptions').select('video_id, text, ai_insights, improvement_points'),
  ])

  const videos = videosRes.data ?? []
  const metricsByVideo = Object.fromEntries((metricsRes.data ?? []).map(m => [m.video_id, m]))
  const transcByVideo = Object.fromEntries((transcRes.data ?? []).map(t => [t.video_id, t]))

  const withMetrics = videos.filter(v => metricsByVideo[v.id]?.views > 0)
  if (withMetrics.length === 0) return ''

  const fmtV = (n: number) => n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n/1_000).toFixed(1)}k` : String(n)
  const fmtTime = (s: number) => { const m = Math.floor(s/60); const sec = s%60; return m > 0 ? `${m}m${sec>0?` ${sec}s`:''}` : `${sec}s` }

  const formatVideo = (v: typeof videos[0]) => {
    const m = metricsByVideo[v.id]
    const t = transcByVideo[v.id]
    const date = v.published_at ? new Date(v.published_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }) : ''
    const metrics = m ? `Views: ${fmtV(m.views)} | Likes: ${fmtV(m.likes)} | Comments: ${fmtV(m.comments)} | Watch time: ${m.watch_time_h ? `${m.watch_time_h}h` : '—'} | Avg view: ${m.avg_view_duration_s ? fmtTime(m.avg_view_duration_s) : '—'} | Avg view %: ${m.avg_view_percentage ? `${m.avg_view_percentage}%` : '—'} | ER: ${m.engagement_rate ? `${(m.engagement_rate*100).toFixed(2)}%` : '—'}` : 'Sin métricas'
    const transcription = t?.text ? `\n   Transcripción: ${t.text.slice(0, 180)}` : ''
    const insights = t?.ai_insights?.length ? `\n   Insight: ${(t.ai_insights as string[])[0]}` : ''
    return `"${v.title?.slice(0, 70) ?? '(sin título)'}" (${date})\n   ${metrics}${transcription}${insights}`
  }

  const sorted = [...withMetrics].sort((a, b) => (metricsByVideo[b.id]?.views ?? 0) - (metricsByVideo[a.id]?.views ?? 0))
  const avgViews = Math.round(withMetrics.reduce((s, v) => s + (metricsByVideo[v.id]?.views ?? 0), 0) / withMetrics.length)
  const avgWatchH = withMetrics.filter(v => metricsByVideo[v.id]?.watch_time_h).length > 0
    ? Math.round(withMetrics.reduce((s, v) => s + (metricsByVideo[v.id]?.watch_time_h ?? 0), 0) / withMetrics.filter(v => metricsByVideo[v.id]?.watch_time_h).length * 10) / 10
    : 0

  const top5 = sorted.slice(0, 5).map((v, i) => formatVideo(v) + ` [Top ${i+1} por views]`).join('\n\n')

  return `
=== YOUTUBE — ${withMetrics.length} VIDEOS ===
Views promedio: ${fmtV(avgViews)} | Watch time promedio: ${avgWatchH > 0 ? `${avgWatchH}h` : '—'}

=== TOP VIDEOS POR VIEWS ===
${top5}`
}

async function buildRAGContext(query: string): Promise<string> {
  const [postsRes, transcriptionsRes, ytContext] = await Promise.all([
    supabase.from('posts').select('id, caption, published_at, metrics(*)'),
    supabase.from('transcriptions').select('post_id, text, ai_insights, improvement_points, visual_analysis'),
    buildYTContext(query).catch(() => ''),
  ])

  const allPosts = postsRes.data ?? []
  const transcByPostId = Object.fromEntries((transcriptionsRes.data ?? []).map(t => [t.post_id, t]))

  // Helper: post compacto (solo métricas) — para listas largas y top performers
  const formatPostCompact = (p: typeof allPosts[0], rank?: string) => {
    const m = Array.isArray(p.metrics) ? p.metrics[0] : p.metrics
    const caption = p.caption?.split('\n')[0]?.slice(0, 60) ?? '(sin caption)'
    const date = p.published_at
      ? new Date(p.published_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
      : ''
    const metrics = m
      ? `Reach: ${fmt(m.reach)} | Likes: ${fmt(m.likes)} | Saves: ${fmt(m.saves)} | Shares: ${fmt(m.shares)} | ER: ${(m.engagement_rate * 100).toFixed(2)}%`
      : 'Sin métricas'
    const prefix = rank ? `${rank} ` : ''
    return `${prefix}"${caption}" (${date}) — ${metrics}`
  }

  // Helper: post completo con transcripción — para resultados semánticos relevantes
  const formatPost = (p: typeof allPosts[0], rank?: string) => {
    const m = Array.isArray(p.metrics) ? p.metrics[0] : p.metrics
    const t = transcByPostId[p.id]
    const caption = p.caption?.split('\n')[0]?.slice(0, 70) ?? '(sin caption)'
    const date = p.published_at
      ? new Date(p.published_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
      : ''
    const metrics = m
      ? `Reach: ${fmt(m.reach)} | Likes: ${fmt(m.likes)} | Saves: ${fmt(m.saves)} | Shares: ${fmt(m.shares)} | Comments: ${fmt(m.comments)} | ER: ${(m.engagement_rate * 100).toFixed(2)}%`
      : 'Sin métricas'
    const transcription = t?.text ? `\n   Transcripción: ${t.text.slice(0, 180)}` : ''
    const insights = t?.ai_insights?.length ? `\n   Insight: ${(t.ai_insights as string[])[0]}` : ''
    const prefix = rank ? `${rank} ` : ''
    return `${prefix}"${caption}" (${date})\n   ${metrics}${transcription}${insights}`
  }

  // 2. KPIs globales
  const postsWithMetrics = allPosts.filter(p => {
    const m = Array.isArray(p.metrics) ? p.metrics[0] : p.metrics
    return m && m.reach > 0
  })
  const total = postsWithMetrics.length

  if (total === 0) {
    return 'No hay datos disponibles aún. Ejecutá /api/sync para sincronizar los datos de Instagram.'
  }

  const avgReach = Math.round(postsWithMetrics.reduce((s, p) => {
    const m = Array.isArray(p.metrics) ? p.metrics[0] : p.metrics
    return s + (m?.reach ?? 0)
  }, 0) / total)

  const avgER = ((postsWithMetrics.reduce((s, p) => {
    const m = Array.isArray(p.metrics) ? p.metrics[0] : p.metrics
    return s + (m?.engagement_rate ?? 0)
  }, 0) / total) * 100).toFixed(2)

  const avgSaves = Math.round(postsWithMetrics.reduce((s, p) => {
    const m = Array.isArray(p.metrics) ? p.metrics[0] : p.metrics
    return s + (m?.saves ?? 0)
  }, 0) / total)

  const globalSummary = `=== MÉTRICAS GLOBALES (${total} posts) ===
Reach promedio: ${fmt(avgReach)} | Saves promedio: ${fmt(avgSaves)} | Engagement Rate promedio: ${avgER}%`

  // 3. Siempre incluir top performers (responde las preguntas más comunes)
  const sortedByReach = [...postsWithMetrics].sort((a, b) => {
    const ma = Array.isArray(a.metrics) ? a.metrics[0] : a.metrics
    const mb = Array.isArray(b.metrics) ? b.metrics[0] : b.metrics
    return (mb?.reach ?? 0) - (ma?.reach ?? 0)
  })
  const sortedBySaves = [...postsWithMetrics].sort((a, b) => {
    const ma = Array.isArray(a.metrics) ? a.metrics[0] : a.metrics
    const mb = Array.isArray(b.metrics) ? b.metrics[0] : b.metrics
    return (mb?.saves ?? 0) - (ma?.saves ?? 0)
  })
  const sortedByER = [...postsWithMetrics].sort((a, b) => {
    const ma = Array.isArray(a.metrics) ? a.metrics[0] : a.metrics
    const mb = Array.isArray(b.metrics) ? b.metrics[0] : b.metrics
    return (mb?.engagement_rate ?? 0) - (ma?.engagement_rate ?? 0)
  })

  // Top performers compactos (solo métricas, sin transcripción) para no inflar tokens
  const topPerformers = `=== TOP PERFORMERS ===
Top 5 por REACH: ${sortedByReach.slice(0, 5).map((p, i) => formatPostCompact(p, `#${i + 1}`)).join('\n')}
Top 5 por SAVES: ${sortedBySaves.slice(0, 5).map((p, i) => formatPostCompact(p, `#${i + 1}`)).join('\n')}
Top 5 por ER: ${sortedByER.slice(0, 5).map((p, i) => formatPostCompact(p, `#${i + 1}`)).join('\n')}`

  // 4. Si la pregunta es sobre rendimiento → top performers compactos + top 10 por reach
  const isPerformanceQuestion = PERFORMANCE_KEYWORDS.test(query)
  if (isPerformanceQuestion) {
    const top10ByReach = sortedByReach
      .slice(0, 10)
      .map((p, i) => formatPostCompact(p, `${i + 1}.`))
      .join('\n')

    return `=== INSTAGRAM ===
${topPerformers}

=== TOP 10 POSTS POR REACH ===
${top10ByReach}

${globalSummary}${ytContext ? `\n\n${ytContext}` : ''}`
  }

  // 5. Búsqueda semántica para preguntas sobre contenido/temas
  let semanticResults: { post_id: string; text: string; similarity: number }[] = []
  try {
    semanticResults = await semanticSearch(query, 5)
  } catch {
    // Si falla, continuar sin búsqueda semántica
  }

  if (semanticResults.length === 0) {
    const top10 = sortedByReach.slice(0, 10).map((p, i) => formatPost(p, `${i + 1}.`)).join('\n\n')
    return `=== INSTAGRAM ===
${topPerformers}

=== TOP 10 POSTS POR REACH (con contexto) ===
${top10}

${globalSummary}${ytContext ? `\n\n${ytContext}` : ''}`
  }

  const semanticPostIds = new Set(semanticResults.map(r => r.post_id))
  const extraTopPosts = sortedByReach.slice(0, 3).filter(p => !semanticPostIds.has(p.id))

  const semanticContent = semanticResults
    .map((r, i) => {
      const post = allPosts.find(p => p.id === r.post_id)
      if (!post) return null
      return formatPost(post, `[${i + 1}]`)
    })
    .filter(Boolean)
    .join('\n\n')

  const extraContent = extraTopPosts.length > 0
    ? `\n\n=== TOP POSTS POR REACH (contexto comparativo) ===\n${extraTopPosts.map((p, i) => formatPost(p, `#${i + 1}`)).join('\n\n')}`
    : ''

  return `=== INSTAGRAM ===
${topPerformers}

=== POSTS MÁS RELEVANTES PARA TU PREGUNTA ===
${semanticContent}${extraContent}

${globalSummary}${ytContext ? `\n\n${ytContext}` : ''}`
}

export async function POST(request: NextRequest) {
  if (!GROQ_API_KEY) {
    return NextResponse.json({ error: 'GROQ_NOT_CONFIGURED' }, { status: 400 })
  }

  const { message, history } = await request.json()
  if (!message) {
    return NextResponse.json({ error: 'Falta el mensaje' }, { status: 400 })
  }

  // Enriquecer la búsqueda semántica con el contexto reciente de la conversación
  // Esto permite que preguntas de seguimiento ("Y qué se ve en ese reel?") encuentren el post correcto
  let context: string
  try {
    const recentContext = (history ?? [])
      .slice(-4)
      .map((m: { role: string; content: string }) => m.content)
      .join(' ')
    const searchQuery = recentContext ? `${recentContext} ${message}` : message
    context = await buildRAGContext(searchQuery)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Error al cargar datos: ${msg}` }, { status: 500 })
  }

  const improvementsContent = loadImprovementsFile()
  const improvementsSection = improvementsContent
    ? `\n<mejoras_históricas>\nEstas son las mejoras identificadas por IA en reels anteriores. Usarlas como referencia al recomendar contenido nuevo o calendarios:\n${improvementsContent}\n</mejoras_históricas>\n`
    : ''

  const systemPrompt = `Sos el analista de contenido de marca de Utopia Agency. Analizás datos reales de rendimiento de Instagram Y YouTube para ayudar a entender qué funciona y cómo crear mejor contenido en ambas plataformas.${improvementsSection}

<datos_disponibles>
INSTAGRAM: métricas por reel (reach, likes, saves, shares, comments, engagement_rate), captions, fechas de publicación, transcripciones de audio, análisis IA, puntos de mejora, descripciones visuales de frames.

YOUTUBE: métricas por video (views, likes, comments, watch_time_h, avg_view_duration_s, avg_view_percentage, engagement_rate), títulos, fechas de publicación, transcripciones (si disponibles), análisis IA.

Reglas de uso:
- Si el usuario pregunta sobre "reels" o "Instagram" → enfocarte en datos de IG
- Si pregunta sobre "videos" o "YouTube" → enfocarte en datos de YT
- Si pregunta en general ("qué me funciona mejor", "cuál es mi mejor contenido") → cruzar ambas plataformas
- Si falta algún campo para un contenido específico, decir que no fue analizado aún, NO que "no tenés acceso"
- No tenés acceso a datos de Meta Ads, competidores ni followers individuales
</datos_disponibles>

<datos>
${context}
</datos>

<instrucciones>
PREGUNTAS SOBRE UN POST ESPECÍFICO O EL MÁS RECIENTE:
Usá la fecha published_at para determinar orden temporal. Respondé con el caption (primera línea) y la fecha en la primera línea, luego las métricas en viñetas, y al final una línea de contexto vs. promedio si es relevante. Ejemplo de formato:
**"[caption]"** — [fecha]
- Reach: [N] ([X]% sobre/bajo el promedio)
- Likes: [N] | Saves: [N] | Shares: [N]
- Engagement Rate: [X]%

PREGUNTAS SOBRE MÉTRICAS Y RENDIMIENTO:
Citá siempre números concretos. Para comparar dos o más posts, usá estructura paralela o tabla. Si hay menos de 5 posts relevantes, aclarà que es una tendencia inicial, no un patrón confirmado.

DETECCIÓN DE PATRONES ("qué funciona", "qué temas generan más X"):
1. Listá los top 3 posts por esa métrica con su reach/saves/ER
2. Identificá qué tienen en común: tema, estructura del hook, tono, longitud
3. Formulá una hipótesis concreta y accionable — "Los posts sobre [tema] generan [X]% más saves que el promedio porque..."

ANÁLISIS DE TRANSCRIPCIONES Y SCRIPTS:
Al analizar qué funciona en el contenido, examiná las transcripciones buscando: estructura del hook (primeros 3 segundos), tensión narrativa, especificidad del mensaje, llamadas a la acción. Citá frases concretas cuando sean relevantes.

RECOMENDACIÓN DE SCRIPTS:
Cuando recomiendes un guión, usá siempre esta estructura:
— Hook (0-3 seg): [frase o situación exacta de apertura]
— Desarrollo (4-30 seg): [estructura narrativa con puntos clave]
— Cierre/CTA (últimos 5 seg): [qué pedir o cómo cerrar]
Basate en lo que ya funcionó: mencioná qué posts exitosos inspiran la recomendación.
</instrucciones>

<formato>
- Empezá siempre con la conclusión o el dato más relevante. Nunca con introducción.
- Frases prohibidas para empezar: "Claro", "Por supuesto", "Con gusto", "Basándome en los datos", "No tengo acceso a", "Como analista", "¡Excelente pregunta!".
- Idioma: español, tono directo y profesional — como un consultor que conoce bien el negocio.
- Longitud: preguntas simples → 3-5 líneas. Análisis de patrones o scripts → hasta 20 líneas con estructura clara.
- Usá **negrita** para números clave y conclusiones principales.
- Usá tablas solo para comparar 3+ variables entre múltiples posts.
- Antes de responder, verificá internamente que cada número que citás está presente en los datos provistos. Nunca inventes métricas.
</formato>

<ejemplos>
Usuario: ¿Cuál fue mi reel con más saves?
Respuesta: Tu reel con más saves es **"[primera línea del caption]"** (publicado el [fecha]) con **[N] saves** — [X]x el promedio de la cuenta (**[promedio] saves**). El volumen alto de saves sugiere que el contenido fue percibido como valioso para guardar y revisar — típico de posts educativos o con frameworks accionables.

Usuario: ¿Qué temas me funcionan mejor?
Respuesta: Analizando los posts con mayor reach:
1. **"[caption]"** — [reach] reach, [ER]% ER
2. **"[caption]"** — [reach] reach, [ER]% ER
3. **"[caption]"** — [reach] reach, [ER]% ER
El patrón común: [observación concreta sobre tema/hook/estructura]. Hipótesis: [explicación accionable de por qué funcionan].
</ejemplos>`

  const messages = [
    { role: 'system', content: systemPrompt },
    ...(history ?? []),
    { role: 'user', content: message },
  ]

  const res = await fetch(GROQ_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature: 0.3,
      max_tokens: 1500,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: err }, { status: 500 })
  }

  const data = await res.json()
  const reply = data.choices?.[0]?.message?.content ?? ''
  return NextResponse.json({ reply })
}
