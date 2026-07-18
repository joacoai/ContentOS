import { NextResponse } from 'next/server'

export async function GET() {
  const clientId = process.env.YOUTUBE_CLIENT_ID
  const redirectUri = process.env.YOUTUBE_REDIRECT_URI

  if (!clientId || !redirectUri) {
    return NextResponse.json({ error: 'YOUTUBE_CLIENT_ID o YOUTUBE_REDIRECT_URI no configurados' }, { status: 400 })
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly',
    access_type: 'offline',
    prompt: 'consent',
  })

  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  return NextResponse.redirect(url)
}
