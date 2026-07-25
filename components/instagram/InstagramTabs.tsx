"use client"

import { useState, useEffect, useRef } from "react"

type Tab = "analisis" | "reels" | "historias"

interface InstagramTabsProps {
  analysisSlot: React.ReactNode
  reelsSlot: React.ReactNode
  storiesSlot: React.ReactNode
}

function TabSkeleton() {
  return (
    <div className="flex flex-col gap-4 animate-pulse">
      <div className="flex gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex-1 rounded-2xl h-24" style={{ background: 'var(--bg-elevated)' }} />
        ))}
      </div>
      <div className="rounded-2xl h-48" style={{ background: 'var(--bg-elevated)' }} />
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="rounded-2xl h-32" style={{ background: 'var(--bg-elevated)' }} />
        ))}
      </div>
    </div>
  )
}

export function InstagramTabs({ analysisSlot, reelsSlot, storiesSlot }: InstagramTabsProps) {
  const [active, setActive] = useState<Tab>("analisis")
  const [visited, setVisited] = useState<Set<Tab>>(new Set(["analisis"]))
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  function switchTab(tab: Tab) {
    if (tab === active) return
    setLoading(true)
    setActive(tab)
    setVisited(prev => new Set(prev).add(tab))
    timerRef.current = setTimeout(() => setLoading(false), 400)
  }

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
          { id: "historias", label: "Historias" },
        ] as { id: Tab; label: string }[]).map(({ id, label }) => (
          <button
            key={id}
            onClick={() => switchTab(id)}
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

      {/* Loading skeleton — only on first visit of a tab */}
      {loading ? (
        <TabSkeleton />
      ) : (
        <>
          {visited.has("analisis") && (
            <div style={{ display: active === "analisis" ? "block" : "none" }}>{analysisSlot}</div>
          )}
          {visited.has("reels") && (
            <div style={{ display: active === "reels" ? "block" : "none" }}>{reelsSlot}</div>
          )}
          {visited.has("historias") && (
            <div style={{ display: active === "historias" ? "block" : "none" }}>{storiesSlot}</div>
          )}
        </>
      )}
    </div>
  )
}
