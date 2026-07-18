import type { IGMediaItem } from './instagramTypes'

export interface AIHook {
  text: string
  reach: number
}

export interface AIKeyword {
  word: string
  count: number
  avg_reach: number
}

export interface AIScore {
  id: string
  caption: string
  score: number
  reach: number
  saves: number
  shares: number
}

export interface AITheme {
  tag: string
  count: number
  avg_reach: number
}

export interface AIAnalysisData {
  hooks: AIHook[]
  keywords: AIKeyword[]
  scores: AIScore[]
  themes: AITheme[]
}

const STOP_WORDS = new Set([
  'de', 'la', 'el', 'en', 'y', 'a', 'que', 'es', 'se', 'no', 'por', 'con', 'una', 'un',
  'para', 'del', 'los', 'las', 'tu', 'te', 'me', 'mi', 'lo', 'su', 'al', 'o', 'si',
  'le', 'más', 'pero', 'todo', 'ya', 'hay', 'como', 'este', 'esta', 'esto', 'son',
  'fue', 'ser', 'han', 'muy', 'bien', 'está', 'tiene', 'hacer', 'tus', 'sus', 'les',
  'nos', 'qué', 'cuando', 'https', 'www', 'com',
])

export function getAIAnalysis(media: IGMediaItem[]): AIAnalysisData {
  if (media.length === 0) return { hooks: [], keywords: [], scores: [], themes: [] }

  const sorted = [...media].sort((a, b) => (b.insights?.reach ?? 0) - (a.insights?.reach ?? 0))

  // Hooks: primera línea del caption de los top 5 reels por reach
  const hooks: AIHook[] = sorted.slice(0, 5).map(m => ({
    text: m.caption?.split('\n')[0]?.replace(/#\w+/g, '').trim().slice(0, 110) ?? 'Sin caption',
    reach: m.insights?.reach ?? 0,
  })).filter(h => h.text.length > 3)

  // Keywords: términos frecuentes en la mitad superior de reels por reach
  const topHalf = sorted.slice(0, Math.max(1, Math.ceil(sorted.length / 2)))
  const wordMap: Record<string, { count: number; total_reach: number }> = {}
  for (const item of topHalf) {
    const words = (item.caption ?? '')
      .toLowerCase()
      .replace(/[^a-záéíóúüñ\s]/gi, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !STOP_WORDS.has(w))
    const reach = item.insights?.reach ?? 0
    const seen = new Set<string>()
    for (const w of words) {
      if (seen.has(w)) continue
      seen.add(w)
      if (!wordMap[w]) wordMap[w] = { count: 0, total_reach: 0 }
      wordMap[w].count += 1
      wordMap[w].total_reach += reach
    }
  }
  const keywords: AIKeyword[] = Object.entries(wordMap)
    .map(([word, { count, total_reach }]) => ({ word, count, avg_reach: Math.round(total_reach / count) }))
    .filter(k => k.count >= 2)
    .sort((a, b) => b.avg_reach - a.avg_reach)
    .slice(0, 8)

  // Score: reach × 0.4 + saves × 0.4 + shares × 0.2
  const scores: AIScore[] = sorted.slice(0, 8).map(m => {
    const reach = m.insights?.reach ?? 0
    const saves = m.insights?.saves ?? 0
    const shares = m.insights?.shares ?? 0
    return {
      id: m.id,
      caption: m.caption?.split('\n')[0]?.slice(0, 55) ?? 'Sin caption',
      score: Math.round(reach * 0.4 + saves * 0.4 + shares * 0.2),
      reach,
      saves,
      shares,
    }
  }).sort((a, b) => b.score - a.score)

  // Themes: hashtags ordenados por avg reach
  const tagMap: Record<string, { count: number; total_reach: number }> = {}
  for (const item of media) {
    const tags = (item.caption ?? '').match(/#[\wáéíóúüñ]+/gi) ?? []
    const reach = item.insights?.reach ?? 0
    const seen = new Set<string>()
    for (const tag of tags) {
      const t = tag.toLowerCase()
      if (seen.has(t)) continue
      seen.add(t)
      if (!tagMap[t]) tagMap[t] = { count: 0, total_reach: 0 }
      tagMap[t].count += 1
      tagMap[t].total_reach += reach
    }
  }
  const themes: AITheme[] = Object.entries(tagMap)
    .map(([tag, { count, total_reach }]) => ({ tag, count, avg_reach: Math.round(total_reach / count) }))
    .sort((a, b) => b.avg_reach - a.avg_reach)
    .slice(0, 6)

  return { hooks, keywords, scores, themes }
}
