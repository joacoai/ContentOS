import { supabase } from '../supabaseClient'
import type { IGStoryItem, IGStoryInsights } from '../instagramTypes'

export interface StoryMetricsRow {
  story_id: string
  impressions: number
  reach: number
  exits: number
  replies: number
  taps_forward: number
  taps_back: number
  link_clicks: number
  completion_rate: number
  captured_at: string
}

export interface StoryRow {
  id: string
  media_type: 'IMAGE' | 'VIDEO'
  media_url: string | null
  thumbnail_url: string | null
  permalink: string | null
  published_at: string
  expires_at: string | null
  created_at: string
  ig_story_metrics: StoryMetricsRow[] | null
}

export interface StoriesAnalyticsResult {
  total: number
  avg_impressions: number
  avg_reach: number
  avg_completion_rate: number
  avg_replies: number
  by_media_type: {
    IMAGE: { count: number; avg_impressions: number; avg_reach: number; avg_completion_rate: number }
    VIDEO: { count: number; avg_impressions: number; avg_reach: number; avg_completion_rate: number }
  }
  by_day_of_week: { day: string; avg_reach: number; count: number }[]
  reach_trend: { date: string; reach: number; impressions: number; completion_rate: number }[]
}

export async function upsertStory(story: IGStoryItem): Promise<void> {
  const { error } = await supabase.from('ig_stories').upsert(
    {
      id: story.id,
      media_type: story.media_type,
      media_url: story.media_url ?? null,
      thumbnail_url: story.thumbnail_url ?? null,
      permalink: story.permalink ?? null,
      published_at: story.timestamp,
      expires_at: new Date(new Date(story.timestamp).getTime() + 24 * 60 * 60 * 1000).toISOString(),
    },
    { onConflict: 'id' }
  )
  if (error) throw new Error(`upsertStory ${story.id}: ${error.message}`)
}

export async function upsertStoryMetrics(storyId: string, insights: IGStoryInsights): Promise<void> {
  const { error } = await supabase.from('ig_story_metrics').upsert(
    {
      story_id: storyId,
      impressions: insights.impressions,
      reach: insights.reach,
      exits: insights.exits,
      replies: insights.replies,
      taps_forward: insights.taps_forward,
      taps_back: insights.taps_back,
      link_clicks: 0,
      completion_rate: insights.completion_rate,
      captured_at: new Date().toISOString(),
    },
    { onConflict: 'story_id' }
  )
  if (error) throw new Error(`upsertStoryMetrics ${storyId}: ${error.message}`)
}

export async function getStories(limit = 100): Promise<StoryRow[]> {
  const { data, error } = await supabase
    .from('ig_stories')
    .select('*, ig_story_metrics(*)')
    .order('published_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`getStories: ${error.message}`)
  return (data ?? []) as StoryRow[]
}

function avgArr(arr: number[]): number {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
}

export function computeStoriesAnalytics(stories: StoryRow[]): StoriesAnalyticsResult {
  const DAYS_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const MONTHS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

  const withMetrics = stories.filter(s => s.ig_story_metrics?.[0])
  const getM = (s: StoryRow): StoryMetricsRow => s.ig_story_metrics![0]

  const byType = (type: 'IMAGE' | 'VIDEO') => {
    const filtered = withMetrics.filter(s => s.media_type === type)
    return {
      count: filtered.length,
      avg_impressions: avgArr(filtered.map(s => getM(s).impressions)),
      avg_reach: avgArr(filtered.map(s => getM(s).reach)),
      avg_completion_rate: avgArr(filtered.map(s => getM(s).completion_rate)),
    }
  }

  const by_day_of_week = DAYS_ES
    .map((day, i) => {
      const dayStories = withMetrics.filter(s => new Date(s.published_at).getDay() === i)
      return { day, avg_reach: avgArr(dayStories.map(s => getM(s).reach)), count: dayStories.length }
    })
    .filter(d => d.count > 0)

  const reach_trend = withMetrics
    .slice(0, 30)
    .reverse()
    .map(s => {
      const d = new Date(s.published_at)
      return {
        date: `${d.getDate()} ${MONTHS_ES[d.getMonth()]}`,
        reach: getM(s).reach,
        impressions: getM(s).impressions,
        completion_rate: getM(s).completion_rate,
      }
    })

  return {
    total: stories.length,
    avg_impressions: avgArr(withMetrics.map(s => getM(s).impressions)),
    avg_reach: avgArr(withMetrics.map(s => getM(s).reach)),
    avg_completion_rate: avgArr(withMetrics.map(s => getM(s).completion_rate)),
    avg_replies: avgArr(withMetrics.map(s => getM(s).replies)),
    by_media_type: { IMAGE: byType('IMAGE'), VIDEO: byType('VIDEO') },
    by_day_of_week,
    reach_trend,
  }
}
