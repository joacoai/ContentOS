import { supabase } from '../supabaseClient'

export type PlanStatus = 'pendiente' | 'en_proceso' | 'publicado'

export interface ContentPlanItem {
  id: string
  emoji: string
  title: string
  hook_text: string
  estructura: string[] | null
  suggested_day: string | null
  format: string
  why: string | null
  status: PlanStatus
  linked_reel_id: string | null
  week_start: string
  created_at: string
  updated_at: string
}

export function getCurrentWeekStart(): string {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(now)
  monday.setDate(diff)
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString().split('T')[0]
}

export function formatWeekRange(weekStart: string): string {
  const MONTHS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  const start = new Date(weekStart + 'T00:00:00')
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return `${start.getDate()} ${MONTHS_ES[start.getMonth()]} — ${end.getDate()} ${MONTHS_ES[end.getMonth()]}`
}

export async function getPlan(weekStart: string): Promise<ContentPlanItem[]> {
  const DAY_ORDER = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

  const { data, error } = await supabase
    .from('content_plan')
    .select('*')
    .eq('week_start', weekStart)
    .order('created_at', { ascending: true })

  if (error) throw new Error(`getPlan: ${error.message}`)

  return ((data ?? []) as ContentPlanItem[]).sort((a, b) => {
    const ai = DAY_ORDER.indexOf(a.suggested_day ?? '')
    const bi = DAY_ORDER.indexOf(b.suggested_day ?? '')
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })
}

export async function replacePendingItems(
  weekStart: string,
  items: Omit<ContentPlanItem, 'id' | 'created_at' | 'updated_at'>[]
): Promise<void> {
  // Delete only pending items for this week — keeps en_proceso and publicado
  await supabase.from('content_plan').delete()
    .eq('week_start', weekStart)
    .eq('status', 'pendiente')

  if (items.length === 0) return

  const { error } = await supabase.from('content_plan').insert(
    items.map(item => ({ ...item, updated_at: new Date().toISOString() }))
  )
  if (error) throw new Error(`replacePendingItems: ${error.message}`)
}

export async function deletePlanItem(id: string): Promise<void> {
  const { error } = await supabase.from('content_plan').delete().eq('id', id)
  if (error) throw new Error(`deletePlanItem: ${error.message}`)
}

export async function updatePlanStatus(
  id: string,
  status: PlanStatus,
  linkedReelId?: string
): Promise<void> {
  const { error } = await supabase.from('content_plan')
    .update({
      status,
      ...(linkedReelId !== undefined ? { linked_reel_id: linkedReelId || null } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) throw new Error(`updatePlanStatus: ${error.message}`)
}
