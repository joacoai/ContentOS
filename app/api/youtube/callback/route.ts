import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const error = req.nextUrl.searchParams.get('error')

  if (error) {
    return new NextResponse(`<html><body style="font-family:monospace;background:#03030a;color:#f5f8ff;padding:40px">
      <h2 style="color:#ff4444">Error: ${error}</h2>
      <p>Cerrá esta pestaña y revisá la configuración.</p>
    </body></html>`, { headers: { 'Content-Type': 'text/html' } })
  }

  if (!code) {
    return new NextResponse(`<html><body style="font-family:monospace;background:#03030a;color:#f5f8ff;padding:40px">
      <h2 style="color:#ff4444">No se recibió el código de autorización</h2>
    </body></html>`, { headers: { 'Content-Type': 'text/html' } })
  }

  const clientId = process.env.YOUTUBE_CLIENT_ID!
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET!
  const redirectUri = process.env.YOUTUBE_REDIRECT_URI!

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  const data = await res.json() as { refresh_token?: string; error?: string; error_description?: string }

  if (data.error || !data.refresh_token) {
    return new NextResponse(`<html><body style="font-family:monospace;background:#03030a;color:#f5f8ff;padding:40px">
      <h2 style="color:#ff4444">Error al obtener tokens</h2>
      <pre>${JSON.stringify(data, null, 2)}</pre>
    </body></html>`, { headers: { 'Content-Type': 'text/html' } })
  }

  return new NextResponse(`<html><body style="font-family:monospace;background:#03030a;color:#f5f8ff;padding:40px;max-width:800px">
    <h2 style="color:#00a8ff">✓ YouTube conectado</h2>
    <p style="color:#aaa">Copiá este valor y pegalo en <code style="color:#00a8ff">.env.local</code> como <code style="color:#00a8ff">YOUTUBE_REFRESH_TOKEN</code>:</p>
    <div style="background:#0a0a1a;border:1px solid #1a2a4a;border-radius:8px;padding:16px;margin:16px 0;word-break:break-all">
      <code style="color:#00ff88;font-size:13px">${data.refresh_token}</code>
    </div>
    <p style="color:#aaa">Después de pegarlo, reiniciá el servidor y ejecutá el sync.</p>
    <p style="color:#555;font-size:12px">Podés cerrar esta pestaña.</p>
  </body></html>`, { headers: { 'Content-Type': 'text/html' } })
}
