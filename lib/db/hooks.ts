import { supabase } from '../supabaseClient'

export interface HookRow {
  id: string
  reel_id: string
  text: string
  source: 'transcription' | 'caption'
  reach: number
  saves: number
  engagement_rate: number
  date_published: string | null
  used_count: number
  created_at: string
}

export async function upsertHook(data: {
  reel_id: string
  text: string
  source: 'transcription' | 'caption'
  reach: number
  saves: number
  engagement_rate: number
  date_published?: string | null
}): Promise<void> {
  const { error } = await supabase.from('hooks').upsert(data, { onConflict: 'reel_id' })
  if (error) throw new Error(`upsertHook ${data.reel_id}: ${error.message}`)
}

export async function getHooks(limit = 200): Promise<HookRow[]> {
  const { data, error } = await supabase
    .from('hooks')
    .select('*')
    .order('reach', { ascending: false })
    .limit(limit)
  if (error) throw new Error(`getHooks: ${error.message}`)
  return (data ?? []) as HookRow[]
}

export async function incrementHookUsed(hookId: string): Promise<void> {
  const { data: current } = await supabase.from('hooks').select('used_count').eq('id', hookId).single()
  await supabase.from('hooks').update({ used_count: (current?.used_count ?? 0) + 1 }).eq('id', hookId)
}

// Extrae hooks de transcripciones existentes y los guarda en la tabla hooks
export async function syncHooksFromTranscriptions(): Promise<number> {
  // Join transcriptions con posts + metrics
  // Join transcriptions → posts → metrics (no hay FK directa transcriptions→metrics)
  const { data, error } = await supabase
    .from('transcriptions')
    .select('post_id, lines, text, posts!inner(published_at, metrics(reach, saves, engagement_rate))')
    .not('text', 'is', null)

  if (error) throw new Error(`syncHooks fetch: ${error.message}`)
  if (!data || data.length === 0) return 0

  let synced = 0

  await Promise.all(
    data.map(async (row) => {
      const lines = row.lines as string[] | null
      const hookText = (lines && lines.length > 0
        ? lines[0]
        : row.text?.split(/[.!?\n]/)[0]
      ) ?? ''

      if (!hookText || hookText.trim().length < 5) return

      type PostWithMetrics = { published_at: string; metrics: { reach: number; saves: number; engagement_rate: number }[] | null }
      const post = row.posts as unknown as PostWithMetrics
      const m = Array.isArray(post?.metrics) ? post.metrics[0] : post?.metrics

      await upsertHook({
        reel_id: row.post_id,
        text: hookText.trim().slice(0, 200),
        source: 'transcription',
        reach: m?.reach ?? 0,
        saves: m?.saves ?? 0,
        engagement_rate: m?.engagement_rate ?? 0,
        date_published: post?.published_at ?? null,
      })
      synced++
    })
  )

  return synced
}
