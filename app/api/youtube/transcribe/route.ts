import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

const GROQ_API_KEY = process.env.GROQ_API_KEY
const GROQ_WHISPER_URL = 'https://api.groq.com/openai/v1/audio/transcriptions'
const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions'
const YTDLP_PATH = process.env.YTDLP_PATH || '/opt/homebrew/bin/yt-dlp'

async function downloadAudio(videoId: string): Promise<{ path: string; cleanup: () => void }> {
  const tmpDir = os.tmpdir()
  const outputTemplate = path.join(tmpDir, `yt_${videoId}.%(ext)s`)

  await execFileAsync(YTDLP_PATH, [
    '-x',
    '--audio-format', 'mp3',
    '--audio-quality', '5',
    '--no-playlist',
    '-o', outputTemplate,
    `https://www.youtube.com/watch?v=${videoId}`,
  ], { timeout: 120_000 })

  const audioPath = path.join(tmpDir, `yt_${videoId}.mp3`)
  if (!fs.existsSync(audioPath)) {
    throw new Error(`yt-dlp no generó el archivo de audio para ${videoId}`)
  }

  return {
    path: audioPath,
    cleanup: () => { try { fs.unlinkSync(audioPath) } catch {} },
  }
}

async function transcribeWithGroq(audioPath: string, videoId: string): Promise<string> {
  const audioBuffer = fs.readFileSync(audioPath)
  const formData = new FormData()
  const blob = new Blob([audioBuffer], { type: 'audio/mpeg' })
  formData.append('file', blob, `${videoId}.mp3`)
  formData.append('model', 'whisper-large-v3-turbo')
  formData.append('language', 'es')
  formData.append('response_format', 'text')

  const res = await fetch(GROQ_WHISPER_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
    body: formData,
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Groq Whisper error: ${err}`)
  }

  return res.text()
}

async function analyzeWithGroq(
  transcript: string,
  videoTitle: string,
  views: number,
): Promise<{ ai_insights: string[]; improvement_points: string[] }> {
  if (!transcript || transcript.trim().length < 20) {
    return { ai_insights: [], improvement_points: [] }
  }

  const metricsLine = views > 0 ? `\nVistas: ${views.toLocaleString('es-AR')}` : ''

  const res = await fetch(GROQ_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Sos un estratega de contenido especializado en YouTube. Analizás el guión de un video para dar insights accionables sobre qué funciona y qué mejorar.

Reglas:
- Los insights conectan el guión con el rendimiento (vistas, retención implícita).
- Los puntos de mejora son SOLO sobre narrativa, estructura y retención del script — no sobre thumbnails, títulos ni edición.
- Citá frases concretas del guión cuando sea relevante.
- Sé específico, evitá generalidades.
- Respondé SOLO en JSON válido: { "ai_insights": ["...", "...", "..."], "improvement_points": ["...", "...", "..."] }`,
        },
        {
          role: 'user',
          content: `Título del video: "${videoTitle}"${metricsLine}

Transcripción:
"""
${transcript.slice(0, 4000)}
"""

Analizá y respondé en JSON.`,
        },
      ],
      temperature: 0.4,
      max_tokens: 900,
    }),
  })

  if (!res.ok) throw new Error(`Groq LLaMA error: ${await res.text()}`)

  const data = await res.json()
  const content = data.choices?.[0]?.message?.content ?? '{}'

  try {
    const parsed = JSON.parse(content)
    return {
      ai_insights: Array.isArray(parsed.ai_insights) ? parsed.ai_insights.slice(0, 3) : [],
      improvement_points: Array.isArray(parsed.improvement_points) ? parsed.improvement_points.slice(0, 3) : [],
    }
  } catch {
    return { ai_insights: [], improvement_points: [] }
  }
}

async function transcribeVideo(videoId: string, title: string, views: number): Promise<void> {
  const audio = await downloadAudio(videoId)
  try {
    const rawTranscript = await transcribeWithGroq(audio.path, videoId)
    const { ai_insights, improvement_points } = await analyzeWithGroq(rawTranscript, title, views)

    const { error } = await supabase.from('yt_transcriptions').upsert({
      video_id: videoId,
      text: rawTranscript.trim(),
      ai_insights,
      improvement_points,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'video_id' })

    if (error) throw new Error(`Supabase upsert error: ${error.message}`)
  } finally {
    audio.cleanup()
  }
}

export async function POST() {
  if (!GROQ_API_KEY) return NextResponse.json({ error: 'GROQ_NOT_CONFIGURED' }, { status: 400 })

  const { data: done } = await supabase.from('yt_transcriptions').select('video_id')
  const doneIds = new Set((done ?? []).map((r: { video_id: string }) => r.video_id))

  const { data: videos } = await supabase
    .from('yt_videos')
    .select('id, title, yt_metrics(views)')
    .order('published_at', { ascending: false })

  const pending = (videos ?? []).filter((v: { id: string }) => !doneIds.has(v.id))

  if (pending.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, message: 'Todo ya está transcripto' })
  }

  const results: { id: string; ok: boolean; error?: string }[] = []

  for (const v of pending) {
    const views = (v.yt_metrics as unknown as { views: number } | null)?.views ?? 0
    try {
      await transcribeVideo(v.id, v.title ?? '', views)
      results.push({ id: v.id, ok: true })
    } catch (err) {
      results.push({ id: v.id, ok: false, error: err instanceof Error ? err.message : 'Error' })
    }
  }

  const success = results.filter(r => r.ok).length

  return NextResponse.json({
    ok: true,
    processed: success,
    failed: results.filter(r => !r.ok).length,
    results,
  })
}

export async function GET(request: NextRequest) {
  const videoId = request.nextUrl.searchParams.get('id')
  if (!videoId) return NextResponse.json({ error: 'Falta el parámetro id' }, { status: 400 })
  if (!GROQ_API_KEY) return NextResponse.json({ error: 'GROQ_NOT_CONFIGURED' }, { status: 400 })

  const { data: videoRow } = await supabase
    .from('yt_videos')
    .select('title, yt_metrics(views)')
    .eq('id', videoId)
    .single()

  const title = (videoRow as { title?: string } | null)?.title ?? ''
  const views = (videoRow as { yt_metrics?: { views: number } } | null)?.yt_metrics?.views ?? 0

  try {
    await transcribeVideo(videoId, title, views)
    const { data } = await supabase
      .from('yt_transcriptions')
      .select('text, ai_insights, improvement_points')
      .eq('video_id', videoId)
      .single()
    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
