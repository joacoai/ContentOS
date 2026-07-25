import { NextResponse } from 'next/server'
import { getIGStories } from '@/lib/instagramClient'
import { upsertStory, upsertStoryMetrics, getStories, computeStoriesAnalytics } from '@/lib/db/stories'

export async function GET() {
  try {
    const stories = await getStories()
    const analytics = computeStoriesAnalytics(stories)
    return NextResponse.json({ success: true, data: { stories, analytics } })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

export async function POST() {
  try {
    const apiStories = await getIGStories(true)
    let synced = 0

    await Promise.all(
      apiStories.map(async (story) => {
        await upsertStory(story)
        if (story.insights) {
          await upsertStoryMetrics(story.id, story.insights)
          synced++
        }
      })
    )

    const stories = await getStories()
    const analytics = computeStoriesAnalytics(stories)

    return NextResponse.json({ success: true, synced, data: { stories, analytics } })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
