"use client"

import { useEffect, useState } from "react"
import { ProgressBar } from "@/components/shared/ProgressBar"
import { loadYTGoals, type Goal } from "@/lib/goals"

interface Props {
  subscribers: number
  totalViews: number
  totalVideos: number
}

export function YTEngagementClient({ subscribers, totalViews, totalVideos }: Props) {
  const [goals, setGoals] = useState<Goal[]>([])

  useEffect(() => {
    const saved = loadYTGoals()
    setGoals(
      saved.map((g) => ({
        ...g,
        current:
          g.label === "Suscriptores"
            ? subscribers
            : g.label === "Vistas totales"
            ? totalViews
            : g.label === "Videos publicados"
            ? totalVideos
            : g.current,
      }))
    )
  }, [subscribers, totalViews, totalVideos])

  if (goals.length === 0) return null

  return (
    <div className="flex flex-col gap-5">
      {goals.map((g) => (
        <ProgressBar
          key={g.label}
          label={g.label}
          current={g.current}
          target={g.target}
          unit={g.unit}
        />
      ))}
    </div>
  )
}
