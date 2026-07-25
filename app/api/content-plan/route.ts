import { NextRequest, NextResponse } from 'next/server'
import { getPlan, replacePendingItems, updatePlanStatus, deletePlanItem, getCurrentWeekStart } from '@/lib/db/contentPlan'
import { getHooks } from '@/lib/db/hooks'
import { getIGMedia } from '@/lib/instagramClient'
import { getDashboardData } from '@/lib/instagramDashboard'
import { getAIAnalysis } from '@/lib/instagramAI'
import type { PlanStatus } from '@/lib/db/contentPlan'

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions'

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(Math.round(n))
}

async function buildPlanContext(): Promise<string> {
  const [media, hooks] = await Promise.all([
    getIGMedia().catch(() => []),
    getHooks(10),
  ])

  const { kpis } = getDashboardData(media)
  const aiData = getAIAnalysis(media)
  const lines: string[] = []

  if (hooks.length > 0) {
    lines.push('PATRONES DE HOOKS QUE GENERARON MÁS REACH (analizá el ESTILO y ESTRUCTURA, NO copies el texto):')
    hooks.slice(0, 5).forEach((h, i) => {
      lines.push(`${i + 1}. "${h.text}" → ${fmtNum(h.reach)} reach, ${fmtNum(h.saves)} guardados`)
    })
    lines.push('→ Creá hooks NUEVOS y ORIGINALES que usen los mismos patrones lingüísticos exitosos (pregunta directa, confesión, dato inesperado, etc) pero con contenido diferente.')
  }

  if (kpis.best_day) {
    lines.push(`\nMEJOR DÍA PARA PUBLICAR: ${kpis.best_day} (mayor reach histórico promedio)`)
  }

  if (aiData.themes.length > 0) {
    lines.push('\nTEMAS CON MEJOR REACH:')
    aiData.themes.slice(0, 4).forEach(t => {
      lines.push(`- ${t.tag}: ${fmtNum(t.avg_reach)} reach promedio en ${t.count} reels`)
    })
  }

  if (aiData.keywords.length > 0) {
    lines.push('\nPALABRAS CLAVE EN CONTENIDO TOP:')
    lines.push(aiData.keywords.slice(0, 6).map(k => k.word).join(', '))
  }

  const avgReach = kpis.total_reels > 0 ? Math.round(kpis.total_reach / kpis.total_reels) : 0
  lines.push(`\nREFERENCIA: ${fmtNum(avgReach)} reach promedio por reel, ${fmtNum(kpis.total_saves)} guardados totales`)

  return lines.join('\n')
}

export async function GET(req: NextRequest) {
  try {
    const weekStart = req.nextUrl.searchParams.get('week') ?? getCurrentWeekStart()
    const items = await getPlan(weekStart)
    return NextResponse.json({ success: true, data: items, weekStart })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

export async function POST() {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return NextResponse.json({ success: false, error: 'GROQ_API_KEY no configurada' }, { status: 500 })

  try {
    const context = await buildPlanContext()
    const weekStart = getCurrentWeekStart()

    const systemPrompt = `Sos un estratega y guionista de contenido para Instagram Reels. Generás planes semanales con guiones concretos y listos para filmar, basados en datos reales del canal.

Reglas:
- Basate EXCLUSIVAMENTE en los datos del canal proporcionados
- El "hook" es exactamente lo que el creador DICE en los primeros 3 segundos — concreto, conversacional, no genérico
- NUNCA copies un hook existente del historial. Usá los patrones exitosos (pregunta directa, confesión, dato sorpresa, desafío) para CREAR hooks completamente nuevos sobre temas diferentes
- La "estructura" son 3 pasos del guión del video: apertura/desarrollo, giro o dato clave, y CTA concreto
- Cada paso de la estructura debe ser una oración corta y accionable (lo que se diría/haría en el video)
- Distribuí los 5 reels entre Lunes y Viernes, priorizando el mejor día del canal al menos 2 veces
- El "why" referencia datos específicos del canal (reach, saves, tema con mejor performance)
- Respondé ÚNICAMENTE con JSON válido, sin markdown ni texto adicional`

    const userPrompt = `Generá un plan de contenido para Instagram Reels para esta semana.

DATOS DEL CANAL:
${context}

Generá exactamente 5 ideas de reels con guión. Respondé con este JSON exacto:
{
  "plan": [
    {
      "emoji": "🎯",
      "title": "Título del reel",
      "hook": "Lo que decís literalmente en los primeros 3 segundos del video",
      "estructura": [
        "Desarrollo: lo que contás en el medio del video (10-20s)",
        "Giro o dato sorpresa que engancha al espectador",
        "CTA: lo que pedís específicamente al final (comentar, guardar, etc)"
      ],
      "suggested_day": "Lunes",
      "format": "reel",
      "why": "Por qué va a funcionar — citá un dato específico del canal"
    }
  ]
}`

    const res = await fetch(GROQ_CHAT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.75,
        max_tokens: 2400,
      }),
    })

    const llmData = await res.json() as { choices?: { message: { content: string } }[] }
    const raw = llmData.choices?.[0]?.message?.content ?? ''
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('AI no retornó JSON válido')

    const parsed = JSON.parse(jsonMatch[0]) as {
      plan: Array<{
        emoji: string
        title: string
        hook: string
        estructura: string[]
        suggested_day: string
        format: string
        why: string
      }>
    }

    await replacePendingItems(
      weekStart,
      (parsed.plan ?? []).map(item => ({
        emoji: item.emoji ?? '🎯',
        title: item.title,
        hook_text: item.hook,
        estructura: item.estructura ?? null,
        suggested_day: item.suggested_day ?? null,
        format: item.format ?? 'reel',
        why: item.why ?? null,
        status: 'pendiente' as PlanStatus,
        linked_reel_id: null,
        week_start: weekStart,
      }))
    )

    const saved = await getPlan(weekStart)
    return NextResponse.json({ success: true, data: saved, weekStart })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json() as { id: string; status: PlanStatus; linked_reel_id?: string }
    const { id, status, linked_reel_id } = body
    if (!id || !status) return NextResponse.json({ success: false, error: 'id y status requeridos' }, { status: 400 })

    await updatePlanStatus(id, status, linked_reel_id)
    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json() as { id: string }
    if (!id) return NextResponse.json({ success: false, error: 'id requerido' }, { status: 400 })

    await deletePlanItem(id)
    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
