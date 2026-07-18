import { supabase } from '../supabaseClient'

async function getEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY no configurada')

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: { parts: [{ text }] },
      }),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini embedding error ${res.status}: ${err}`)
  }

  const data = await res.json() as { embedding: { values: number[] } }
  return data.embedding.values
}

export interface TranscriptionData {
  postId: string
  text: string               // texto limpio completo (para embedding)
  lines?: string[]           // texto dividido en oraciones (para UI)
  ai_insights?: string[]     // 3 insights del análisis IA
  improvement_points?: string[] // 3 puntos de mejora
  visual_analysis?: string   // descripción de frames del video
  duration_s?: number
  caption?: string           // para mejorar señal semántica del embedding
}

export async function upsertTranscription(data: TranscriptionData) {
  const { postId, text, lines, ai_insights, improvement_points, visual_analysis, duration_s, caption } = data

  // Combinar caption + transcripción + insights para mejor señal semántica
  const partsToEmbed = [
    caption ? `[CAPTION] ${caption}` : '',
    `[TRANSCRIPCIÓN] ${text}`,
    ai_insights?.length ? `[INSIGHTS] ${ai_insights.join(' ')}` : '',
  ].filter(Boolean).join('\n')

  const embedding = await getEmbedding(partsToEmbed)

  const { error } = await supabase.from('transcriptions').upsert({
    post_id: postId,
    platform: 'ig',
    text,
    lines: lines ?? null,
    ai_insights: ai_insights ?? null,
    improvement_points: improvement_points ?? null,
    visual_analysis: visual_analysis ?? null,
    duration_s: duration_s ?? 0,
    transcribed_at: new Date().toISOString(),
    embedding,
  }, { onConflict: 'post_id' })

  if (error) throw new Error(`upsertTranscription ${postId}: ${error.message}`)
}

export async function semanticSearch(query: string, topK = 5) {
  const embedding = await getEmbedding(query)

  const { data, error } = await supabase.rpc('search_transcriptions', {
    query_embedding: embedding,
    match_count: topK,
  })

  if (error) throw new Error(`semanticSearch: ${error.message}`)
  return data as { post_id: string; text: string; similarity: number }[]
}

export async function getTranscriptionByPostId(postId: string) {
  const { data, error } = await supabase
    .from('transcriptions')
    .select('text, lines, ai_insights, improvement_points, visual_analysis, duration_s')
    .eq('post_id', postId)
    .single()

  if (error) return null
  return data
}

export interface HookWithReach {
  post_id: string
  hook: string
  reach: number
}

export async function getHooksWithReach(limit = 5): Promise<HookWithReach[]> {
  const { data, error } = await supabase
    .from('transcriptions')
    .select('post_id, lines, text, metrics!inner(reach)')
    .not('text', 'is', null)
    .order('metrics(reach)', { ascending: false })
    .limit(limit)

  if (error || !data) return []

  return data.map((row) => {
    const lines = row.lines as string[] | null
    const rawHook = (lines && lines.length > 0 ? lines[0] : row.text?.split(/[.!?\n]/)[0]) ?? ''
    return {
      post_id: row.post_id,
      hook: rawHook.trim().slice(0, 120),
      reach: (row.metrics as unknown as { reach: number })?.reach ?? 0,
    }
  }).filter(h => h.hook.length > 3)
}
