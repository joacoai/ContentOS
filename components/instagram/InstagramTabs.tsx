"use client"

import { useState } from "react"

type Tab = "analisis" | "reels"

interface InstagramTabsProps {
  analysisSlot: React.ReactNode
  reelsSlot: React.ReactNode
}

export function InstagramTabs({ analysisSlot, reelsSlot }: InstagramTabsProps) {
  const [active, setActive] = useState<Tab>("analisis")

  return (
    <div className="flex flex-col gap-5">
      {/* Tab bar */}
      <div
        className="flex gap-1 p-1 rounded-xl w-fit"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}
      >
        {([
          { id: "analisis", label: "Análisis IA" },
          { id: "reels", label: "Reels" },
        ] as { id: Tab; label: string }[]).map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActive(id)}
            className="rounded-lg px-4 py-1.5 text-[12px] font-semibold transition-all cursor-pointer"
            style={
              active === id
                ? {
                    background: "var(--accent-15)",
                    color: "var(--accent)",
                    border: "1px solid var(--accent-22)",
                    boxShadow: "0 1px 4px rgba(0,168,255,0.15)",
                  }
                : {
                    background: "transparent",
                    color: "var(--text-secondary)",
                    border: "1px solid transparent",
                  }
            }
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ display: active === "analisis" ? "block" : "none" }}>
        {analysisSlot}
      </div>
      <div style={{ display: active === "reels" ? "block" : "none" }}>
        {reelsSlot}
      </div>
    </div>
  )
}
