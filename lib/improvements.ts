import fs from 'fs'
import path from 'path'
import { supabase } from './supabaseClient'

const MEJORAS_PATH = path.join(process.cwd(), '..', 'contexto', 'mejoras-contenido.md')

export async function exportImprovementsToFile(): Promise<void> {
  const { data, error } = await supabase
    .from('transcriptions')
    .select('post_id, improvement_points')
    .not('improvement_points', 'is', null)

  if (error || !data || data.length === 0) return

  const allPoints: string[] = []
  for (const row of data) {
    const points = row.improvement_points as string[] | null
    if (Array.isArray(points)) {
      allPoints.push(...points)
    }
  }

  // Dedup preserving order
  const seen = new Set<string>()
  const unique = allPoints.filter(p => {
    const key = p.trim().toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  if (unique.length === 0) return

  const date = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
  const lines = [
    `# Mejoras de Contenido`,
    ``,
    `> Generado automáticamente el ${date} a partir del análisis IA de ${data.length} reels.`,
    `> Usá este archivo como contexto al crear el calendario de contenido.`,
    ``,
    `## Puntos de Mejora`,
    ``,
    ...unique.map(p => `- ${p}`),
  ]

  fs.mkdirSync(path.dirname(MEJORAS_PATH), { recursive: true })
  fs.writeFileSync(MEJORAS_PATH, lines.join('\n'), 'utf-8')
}

export function loadImprovementsFile(): string {
  try {
    if (!fs.existsSync(MEJORAS_PATH)) return ''
    return fs.readFileSync(MEJORAS_PATH, 'utf-8')
  } catch {
    return ''
  }
}
