"use client"

import { useState } from "react"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { RefreshCw } from "lucide-react"

interface ContentIdea {
  emoji: string
  title: string
  hook: string
  why: string
}

interface ContentIdeasPanelProps {
  platform: "youtube" | "instagram"
}

export function ContentIdeasPanel({ platform }: ContentIdeasPanelProps) {
  const [open, setOpen] = useState(false)
  const [ideas, setIdeas] = useState<ContentIdea[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const accent = platform === "youtube" ? "var(--accent-youtube)" : "var(--accent-instagram)"
  const accentAlpha = platform === "youtube" ? "rgba(255,68,68," : "rgba(0,168,255,"

  async function fetchIdeas() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/content-ideas?platform=${platform}`)
      const data = await res.json() as { ideas?: ContentIdea[]; error?: string }
      if (!res.ok || data.error) throw new Error(data.error ?? `Error ${res.status}`)
      const list = data.ideas ?? []
      if (list.length === 0) throw new Error("No se generaron ideas. Verificá que Groq esté configurado.")
      setIdeas(list)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
      console.error("[ContentIdeas]", err)
    } finally {
      setLoading(false)
    }
  }

  function handleOpen() {
    setOpen(true)
    if (ideas.length === 0) fetchIdeas()
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={handleOpen}
        className="flex items-center justify-center rounded-xl w-11 h-11 text-[26px] transition-all hover:scale-[1.06] cursor-pointer"
        style={{
          background: `${accentAlpha}0.1)`,
          border: `1px solid ${accentAlpha}0.3)`,
          color: accent,
          boxShadow: `0 0 16px ${accentAlpha}0.1)`,
        }}
      >
        💡
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-[480px] max-w-[95vw] border-l border-[var(--border-subtle)] bg-[var(--bg-base)] p-0"
        >
          <div className="flex h-full flex-col">

            {/* Header */}
            <div
              className="flex items-center justify-between p-5"
              style={{ borderBottom: `1px solid ${accentAlpha}0.15)` }}
            >
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[18px] leading-none">💡</span>
                  <h2 className="text-[15px] font-bold" style={{ color: "var(--text-primary)" }}>
                    Próximo contenido
                  </h2>
                </div>
                <p className="text-[11px]" style={{ color: "var(--text-faint)" }}>
                  5 ideas basadas en tu historial de {platform === "youtube" ? "YouTube" : "Instagram"}
                </p>
              </div>

              <button
                onClick={fetchIdeas}
                disabled={loading}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all hover:opacity-80 cursor-pointer disabled:opacity-40"
                style={{
                  background: `${accentAlpha}0.08)`,
                  border: `1px solid ${accentAlpha}0.2)`,
                  color: accent,
                }}
              >
                <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
                {loading ? "Generando..." : "Regenerar"}
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5">

              {loading && ideas.length === 0 && (
                <div className="flex flex-col gap-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="animate-pulse rounded-2xl p-4"
                      style={{ background: `${accentAlpha}0.04)`, border: `1px solid ${accentAlpha}0.1)`, height: 120 }}
                    />
                  ))}
                </div>
              )}

              {error && (
                <div
                  className="rounded-xl p-4 flex flex-col gap-3"
                  style={{ background: "rgba(255,68,68,0.06)", border: "1px solid rgba(255,68,68,0.2)" }}
                >
                  <p className="text-[12px]" style={{ color: "var(--text-secondary)" }}>{error}</p>
                  <button
                    onClick={fetchIdeas}
                    className="text-[11px] font-semibold w-fit cursor-pointer hover:opacity-80"
                    style={{ color: "var(--accent-youtube)" }}
                  >
                    Reintentar →
                  </button>
                </div>
              )}

              {!loading && !error && ideas.length === 0 && (
                <p className="text-[12px]" style={{ color: "var(--text-faint)" }}>
                  No se encontraron ideas. Sincronizá primero tu plataforma.
                </p>
              )}

              <div className="flex flex-col gap-3">
                {ideas.map((idea, i) => (
                  <div
                    key={i}
                    className="group rounded-2xl p-4 transition-all"
                    style={{
                      background: `${accentAlpha}0.04)`,
                      border: `1px solid ${accentAlpha}0.12)`,
                    }}
                  >
                    {/* Number + emoji + title */}
                    <div className="flex items-start gap-3 mb-3">
                      <div
                        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                        style={{ background: `${accentAlpha}0.15)`, color: accent }}
                      >
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[18px] leading-none">{idea.emoji}</span>
                          <h3 className="text-[13px] font-bold leading-snug" style={{ color: "var(--text-primary)" }}>
                            {idea.title}
                          </h3>
                        </div>
                      </div>
                    </div>

                    {/* Hook */}
                    <div
                      className="rounded-xl px-3 py-2.5 mb-2.5"
                      style={{ background: `${accentAlpha}0.08)`, borderLeft: `2px solid ${accent}` }}
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: accent }}>
                        Hook de apertura
                      </p>
                      <p className="text-[12px] leading-relaxed italic" style={{ color: "var(--text-primary)" }}>
                        &ldquo;{idea.hook}&rdquo;
                      </p>
                    </div>

                    {/* Why */}
                    <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-faint)" }}>
                      💡 {idea.why}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
