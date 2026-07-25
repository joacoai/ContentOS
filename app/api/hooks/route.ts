import { NextResponse } from 'next/server'
import { getHooks, syncHooksFromTranscriptions } from '@/lib/db/hooks'

export async function GET() {
  try {
    const hooks = await getHooks()
    return NextResponse.json({ success: true, data: hooks })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

export async function POST() {
  try {
    const synced = await syncHooksFromTranscriptions()
    const hooks = await getHooks()
    return NextResponse.json({ success: true, synced, data: hooks })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
