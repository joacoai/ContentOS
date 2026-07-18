"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

export type Period = "7d" | "30d" | "90d" | "all"

const PERIODS: { value: Period; label: string }[] = [
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
  { value: "all", label: "Todo" },
]

interface PeriodTabsProps {
  onPeriodChange?: (period: Period) => void
}

export function PeriodTabs({ onPeriodChange }: PeriodTabsProps) {
  const [active, setActive] = useState<Period>("all")

  function select(p: Period) {
    setActive(p)
    onPeriodChange?.(p)
  }

  return (
    <div
      className="flex items-center gap-0.5 rounded-lg p-1"
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      {PERIODS.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => select(value)}
          className={cn(
            "rounded-md px-3 py-1 text-[11px] font-semibold tracking-wide transition-all duration-150 cursor-pointer",
            active === value
              ? "text-[var(--text-primary)]"
              : "text-[var(--text-faint)] hover:text-[var(--text-secondary)]"
          )}
          style={
            active === value
              ? {
                  background: "var(--glass-bg)",
                  border: "1px solid var(--glass-border)",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.30)",
                }
              : undefined
          }
        >
          {label}
        </button>
      ))}
    </div>
  )
}
