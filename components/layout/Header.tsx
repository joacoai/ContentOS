"use client"

import { usePathname } from "next/navigation"
import { Sun, Moon, RefreshCw, CheckCircle2, Menu } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTheme } from "@/components/providers/ThemeProvider"
import { useState, useEffect } from "react"

const pageTitles: Record<string, { title: string; description: string }> = {
  "/dashboard": { title: "Dashboard", description: "Vista general de tu marca personal" },
  "/instagram": { title: "Instagram Intelligence", description: "Análisis profundo de tus Reels" },
  "/chat": { title: "AI Chat", description: "Conversá con tus agentes de datos" },
  "/settings": { title: "Settings", description: "Configuración y objetivos mensuales" },
}

type SyncState = "idle" | "syncing" | "synced"

function getMinutesAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 60_000)
  if (diff < 1) return "hace un momento"
  if (diff === 1) return "hace 1 min"
  if (diff < 60) return `hace ${diff} min`
  const hours = Math.floor(diff / 60)
  return hours === 1 ? "hace 1 h" : `hace ${hours} h`
}

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname()
  const { theme, toggle } = useTheme()
  const [syncState, setSyncState] = useState<SyncState>("idle")
  const [lastSync, setLastSync] = useState<number | null>(null)
  const [lastSyncLabel, setLastSyncLabel] = useState<string | null>(null)

  const key = Object.keys(pageTitles)
    .sort((a, b) => b.length - a.length)
    .find((k) => pathname === k || pathname.startsWith(k + "/"))
  const info = key ? pageTitles[key] : { title: "Dashboard", description: "" }

  // Read last sync time and keep label updated
  useEffect(() => {
    const stored = localStorage.getItem("last_sync")
    if (stored) {
      const ts = parseInt(stored)
      setLastSync(ts)
      setLastSyncLabel(getMinutesAgo(ts))
    }
  }, [])

  useEffect(() => {
    if (!lastSync) return
    const interval = setInterval(() => {
      setLastSyncLabel(getMinutesAgo(lastSync))
    }, 30_000)
    return () => clearInterval(interval)
  }, [lastSync])

  async function handleSync() {
    if (syncState === "syncing") return
    setSyncState("syncing")
    try {
      const res = await fetch("/api/sync", { method: "POST" })
      const data = await res.json()
      if (data.ok) {
        const ts = Date.now()
        localStorage.setItem("last_sync", String(ts))
        setLastSync(ts)
        setLastSyncLabel(getMinutesAgo(ts))
      }
      setSyncState("synced")
    } catch {
      setSyncState("idle")
    } finally {
      setTimeout(() => setSyncState("idle"), 3000)
    }
  }

  // Auto-sync once per hour
  useEffect(() => {
    const stored = parseInt(localStorage.getItem("last_sync") ?? "0")
    if (Date.now() - stored > 60 * 60 * 1000) {
      handleSync()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const iconBtn = cn(
    "flex h-8 w-8 items-center justify-center rounded-lg",
    "transition-all duration-150 cursor-pointer",
    "hover:bg-[rgba(255,255,255,0.06)]"
  )

  return (
    <header
      className="relative flex h-[58px] flex-shrink-0 items-center justify-between px-5"
      style={{
        background: "var(--bg-sidebar)",
        borderBottom: "1px solid var(--sidebar-border)",
      }}
    >
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-px"
        style={{
          background: "linear-gradient(to right, transparent 0%, var(--border-subtle) 12%, var(--border-subtle) 88%, transparent 100%)",
        }}
      />

      {/* Left */}
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        <button
          onClick={onMenuClick}
          aria-label="Abrir menú"
          className={cn(iconBtn, "sm:hidden")}
          style={{ color: "var(--text-secondary)" }}
        >
          <Menu size={16} />
        </button>

        <div className="flex flex-col gap-[4px]">
          <h1 className="text-[15px] font-bold leading-none tracking-tight" style={{ color: "var(--text-primary)" }}>
            {info.title}
          </h1>
          {info.description && (
            <p className="text-[12px] leading-none hidden sm:block" style={{ color: "var(--text-faint)" }}>
              {info.description}
            </p>
          )}
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-1">
        {/* Sync button */}
        <div className="flex flex-col items-end">
          <button
            onClick={handleSync}
            disabled={syncState === "syncing"}
            aria-label="Sincronizar datos"
            className={cn(
              iconBtn,
              "w-auto gap-1.5 px-2.5",
              syncState === "syncing" && "opacity-60"
            )}
            style={{ color: "var(--text-faint)" }}
          >
            {syncState === "synced" ? (
              <CheckCircle2 size={13} style={{ color: "var(--color-positive)" }} />
            ) : (
              <RefreshCw size={13} className={syncState === "syncing" ? "animate-spin" : ""} />
            )}
            <span
              className="text-[11px] font-medium"
              style={{
                color: syncState === "synced"
                  ? "var(--color-positive)"
                  : "var(--text-faint)",
              }}
            >
              {syncState === "syncing" ? "Sincronizando…" : syncState === "synced" ? "Sincronizado" : "Sync"}
            </span>
          </button>
          {lastSyncLabel && syncState === "idle" && (
            <span
              className="text-[9px] pr-2.5 -mt-0.5"
              style={{ color: "var(--text-faint)" }}
            >
              {lastSyncLabel}
            </span>
          )}
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggle}
          className={iconBtn}
          aria-label={theme === "dark" ? "Cambiar a modo día" : "Cambiar a modo noche"}
          style={{ color: "var(--text-faint)" }}
        >
          {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
        </button>
      </div>
    </header>
  )
}
