import { NextResponse } from "next/server"

export interface ModuleCheck {
  id: string
  label: string
  status: "ok" | "not_configured" | "error"
  detail?: string
}

async function checkInstagram(): Promise<ModuleCheck> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN
  const userId = process.env.INSTAGRAM_USER_ID

  if (!token || !userId) {
    return { id: "instagram", label: "Instagram Intelligence", status: "not_configured", detail: "Token o User ID no configurado" }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 3000)

  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${userId}?fields=name&access_token=${token}`,
      { signal: controller.signal }
    )
    clearTimeout(timer)
    if (res.ok) return { id: "instagram", label: "Instagram Intelligence", status: "ok" }
    const body = await res.json().catch(() => ({}))
    return { id: "instagram", label: "Instagram Intelligence", status: "error", detail: body?.error?.message ?? "Error de API" }
  } catch {
    clearTimeout(timer)
    return { id: "instagram", label: "Instagram Intelligence", status: "error", detail: "No se pudo conectar" }
  }
}

async function checkAI(): Promise<ModuleCheck> {
  const key = process.env.GEMINI_API_KEY

  if (!key) {
    return { id: "ai", label: "AI Chat", status: "not_configured", detail: "Gemini API Key no configurada" }
  }

  // Minimal check: validate key format (no cost, no real call needed for now)
  const looksValid = key.length > 20
  if (looksValid) return { id: "ai", label: "AI Chat", status: "ok" }
  return { id: "ai", label: "AI Chat", status: "error", detail: "API Key con formato inválido" }
}

export async function GET() {
  const results = await Promise.all([
    checkInstagram(),
    checkAI(),
  ])

  return NextResponse.json(results)
}
