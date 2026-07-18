"use client"

import { useState, useEffect } from "react"
import { Save, Target, Plug, FileText, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react"
import { loadGoals, loadYTGoals, saveTargets, type Goal } from "@/lib/goals"

interface TranscribeResult {
  processed: number
  failed: number
  message?: string
}

function GoalRow({
  goal,
  onChange,
  accentColor = "var(--text-faint)",
}: {
  goal: Goal
  onChange: (v: string) => void
  accentColor?: string
}) {
  return (
    <div
      className="flex items-center justify-between gap-4 rounded-xl p-4"
      style={{
        background: "var(--glass-bg)",
        backdropFilter: "var(--glass-blur)",
        border: "1px solid var(--glass-border)",
        boxShadow: "var(--glass-shadow)",
      }}
    >
      <div className="flex flex-col gap-1">
        <span className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>
          {goal.label}
        </span>
        <span className="text-[10px]" style={{ color: "var(--text-faint)" }}>
          Actual:{" "}
          <span style={{ color: "var(--text-secondary)" }}>
            {goal.current > 0 ? goal.current.toLocaleString() : "—"}
            {goal.unit ?? ""}
          </span>
          <span style={{ marginLeft: 6, opacity: 0.5 }}>vía API</span>
        </span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
          Objetivo:
        </span>
        <input
          type="text"
          value={goal.target.toLocaleString()}
          onChange={(e) => onChange(e.target.value)}
          className="w-28 rounded-lg px-3 py-1.5 text-right font-mono text-[12px] focus:outline-none transition-colors"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-medium)",
            color: "var(--text-primary)",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = accentColor)}
          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-medium)")}
        />
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [ytGoals, setYtGoals] = useState<Goal[]>([])
  const [saved, setSaved] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [transcribeResult, setTranscribeResult] = useState<TranscribeResult | null>(null)
  const [transcribeError, setTranscribeError] = useState<string | null>(null)
  const [ytTranscribing, setYtTranscribing] = useState(false)
  const [ytTranscribeResult, setYtTranscribeResult] = useState<TranscribeResult | null>(null)
  const [ytTranscribeError, setYtTranscribeError] = useState<string | null>(null)

  useEffect(() => {
    setGoals(loadGoals())
    setYtGoals(loadYTGoals())
  }, [])

  function updateTarget(index: number, value: string) {
    const num = parseInt(value.replace(/\D/g, ""), 10)
    if (isNaN(num)) return
    setGoals((prev) => prev.map((g, i) => (i === index ? { ...g, target: num } : g)))
  }

  function updateYTTarget(index: number, value: string) {
    const num = parseInt(value.replace(/\D/g, ""), 10)
    if (isNaN(num)) return
    setYtGoals((prev) => prev.map((g, i) => (i === index ? { ...g, target: num } : g)))
  }

  function save() {
    const igTargets = Object.fromEntries(goals.map((g) => [g.label, g.target]))
    const ytTargets = Object.fromEntries(ytGoals.map((g) => [g.label, g.target]))
    saveTargets({ ...igTargets, ...ytTargets })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function runYTTranscriptions() {
    setYtTranscribing(true)
    setYtTranscribeResult(null)
    setYtTranscribeError(null)
    try {
      const res = await fetch("/api/youtube/transcribe", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`)
      setYtTranscribeResult(data)
    } catch (err) {
      setYtTranscribeError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setYtTranscribing(false)
    }
  }

  async function runTranscriptions() {
    setTranscribing(true)
    setTranscribeResult(null)
    setTranscribeError(null)
    try {
      const res = await fetch("/api/instagram/transcribe", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`)
      setTranscribeResult(data)
    } catch (err) {
      setTranscribeError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setTranscribing(false)
    }
  }

  return (
    <div className="flex flex-col gap-8 p-6 max-w-2xl">

      {/* Transcripciones */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2.5">
          <FileText size={15} style={{ color: "var(--text-secondary)" }} />
          <h2 className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
            Transcripciones de Instagram
          </h2>
        </div>
        <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          Transcribe el audio de tus reels y extrae hooks, temas e insights. Requiere{" "}
          <code
            className="rounded px-1.5 py-0.5 font-mono text-[10px]"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}
          >
            GROQ_API_KEY
          </code>{" "}
          y{" "}
          <code
            className="rounded px-1.5 py-0.5 font-mono text-[10px]"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}
          >
            GEMINI_API_KEY
          </code>{" "}
          configuradas. Podés correrlo varias veces — solo procesa los reels pendientes.
        </p>

        <div
          className="rounded-2xl p-5 flex flex-col gap-4"
          style={{
            background: "var(--glass-bg)",
            backdropFilter: "var(--glass-blur)",
            border: "1px solid var(--glass-border)",
            boxShadow: "var(--glass-shadow)",
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>
                Transcribir reels pendientes
              </span>
              <span className="text-[10px]" style={{ color: "var(--text-faint)" }}>
                Whisper (Groq) → LLaMA análisis → Supabase
              </span>
            </div>
            <button
              onClick={runTranscriptions}
              disabled={transcribing}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-[12px] font-semibold transition-all hover:opacity-80 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              style={{
                background: "rgba(0,168,255,0.12)",
                border: "1px solid rgba(0,168,255,0.25)",
                color: "var(--accent)",
              }}
            >
              <RefreshCw size={13} className={transcribing ? "animate-spin" : ""} />
              {transcribing ? "Procesando..." : "Transcribir"}
            </button>
          </div>

          {transcribing && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 rounded-full overflow-hidden" style={{ background: "var(--border-subtle)" }}>
                  <div
                    className="h-full rounded-full animate-pulse"
                    style={{ width: "60%", background: "var(--accent)" }}
                  />
                </div>
                <span className="text-[10px]" style={{ color: "var(--text-faint)" }}>procesando...</span>
              </div>
              <p className="text-[10px]" style={{ color: "var(--text-faint)" }}>
                Puede tardar varios minutos dependiendo de la cantidad de reels.
              </p>
            </div>
          )}

          {transcribeResult && !transcribing && (
            <div
              className="rounded-xl p-3 flex items-start gap-3"
              style={{
                background: (transcribeResult.failed ?? 0) === 0 ? "rgba(0,200,100,0.06)" : "rgba(255,160,0,0.06)",
                border: `1px solid ${(transcribeResult.failed ?? 0) === 0 ? "rgba(0,200,100,0.2)" : "rgba(255,160,0,0.2)"}`,
              }}
            >
              <CheckCircle2
                size={15}
                style={{ color: (transcribeResult.failed ?? 0) === 0 ? "rgba(0,200,100,0.9)" : "rgba(255,160,0,0.9)", flexShrink: 0, marginTop: 1 }}
              />
              <div className="flex flex-col gap-0.5">
                <span className="text-[12px] font-semibold" style={{ color: "var(--text-primary)" }}>
                  {transcribeResult.message
                    ? transcribeResult.message
                    : `${transcribeResult.processed} transcriptos${transcribeResult.failed > 0 ? `, ${transcribeResult.failed} fallaron` : ""}`}
                </span>
                {!transcribeResult.message && transcribeResult.processed > 0 && (
                  <span className="text-[10px]" style={{ color: "var(--text-faint)" }}>
                    Ahora aparecen en el Análisis IA de Instagram
                  </span>
                )}
              </div>
            </div>
          )}

          {transcribeError && !transcribing && (
            <div
              className="rounded-xl p-3 flex items-start gap-3"
              style={{ background: "rgba(255,68,68,0.06)", border: "1px solid rgba(255,68,68,0.2)" }}
            >
              <AlertCircle size={15} style={{ color: "rgba(255,100,100,0.9)", flexShrink: 0, marginTop: 1 }} />
              <div className="flex flex-col gap-1">
                <span className="text-[12px] font-semibold" style={{ color: "var(--text-primary)" }}>Error al transcribir</span>
                <span className="text-[11px]" style={{ color: "var(--text-faint)" }}>{transcribeError}</span>
                <button
                  onClick={runTranscriptions}
                  className="text-[11px] font-semibold w-fit cursor-pointer hover:opacity-80 mt-0.5"
                  style={{ color: "var(--accent-youtube)" }}
                >
                  Reintentar →
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Transcripciones YouTube */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2.5">
          <FileText size={15} style={{ color: "var(--accent-youtube)" }} />
          <h2 className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
            Transcripciones de YouTube
          </h2>
        </div>
        <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          Descarga el audio de cada video con yt-dlp, transcribe con Whisper y analiza con LLaMA. Los insights aparecen en el modal de cada video. Solo procesa videos pendientes.
        </p>

        <div
          className="rounded-2xl p-5 flex flex-col gap-4"
          style={{
            background: "var(--glass-bg)",
            backdropFilter: "var(--glass-blur)",
            border: "1px solid var(--glass-border)",
            boxShadow: "var(--glass-shadow)",
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>
                Transcribir videos pendientes
              </span>
              <span className="text-[10px]" style={{ color: "var(--text-faint)" }}>
                yt-dlp → Whisper (Groq) → LLaMA análisis → Supabase
              </span>
            </div>
            <button
              onClick={runYTTranscriptions}
              disabled={ytTranscribing}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-[12px] font-semibold transition-all hover:opacity-80 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              style={{
                background: "rgba(255,68,68,0.1)",
                border: "1px solid rgba(255,68,68,0.25)",
                color: "var(--accent-youtube)",
              }}
            >
              <RefreshCw size={13} className={ytTranscribing ? "animate-spin" : ""} />
              {ytTranscribing ? "Procesando..." : "Transcribir"}
            </button>
          </div>

          {ytTranscribing && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 rounded-full overflow-hidden" style={{ background: "var(--border-subtle)" }}>
                  <div
                    className="h-full rounded-full animate-pulse"
                    style={{ width: "60%", background: "var(--accent-youtube)" }}
                  />
                </div>
                <span className="text-[10px]" style={{ color: "var(--text-faint)" }}>procesando...</span>
              </div>
              <p className="text-[10px]" style={{ color: "var(--text-faint)" }}>
                yt-dlp descarga el audio de cada video. Puede tardar varios minutos.
              </p>
            </div>
          )}

          {ytTranscribeResult && !ytTranscribing && (
            <div
              className="rounded-xl p-3 flex items-start gap-3"
              style={{
                background: (ytTranscribeResult.failed ?? 0) === 0 ? "rgba(0,200,100,0.06)" : "rgba(255,160,0,0.06)",
                border: `1px solid ${(ytTranscribeResult.failed ?? 0) === 0 ? "rgba(0,200,100,0.2)" : "rgba(255,160,0,0.2)"}`,
              }}
            >
              <CheckCircle2
                size={15}
                style={{ color: (ytTranscribeResult.failed ?? 0) === 0 ? "rgba(0,200,100,0.9)" : "rgba(255,160,0,0.9)", flexShrink: 0, marginTop: 1 }}
              />
              <div className="flex flex-col gap-0.5">
                <span className="text-[12px] font-semibold" style={{ color: "var(--text-primary)" }}>
                  {ytTranscribeResult.message
                    ? ytTranscribeResult.message
                    : `${ytTranscribeResult.processed} transcriptos${ytTranscribeResult.failed > 0 ? `, ${ytTranscribeResult.failed} fallaron` : ""}`}
                </span>
                {!ytTranscribeResult.message && ytTranscribeResult.processed > 0 && (
                  <span className="text-[10px]" style={{ color: "var(--text-faint)" }}>
                    Los insights aparecen en el modal de cada video en /youtube
                  </span>
                )}
              </div>
            </div>
          )}

          {ytTranscribeError && !ytTranscribing && (
            <div
              className="rounded-xl p-3 flex items-start gap-3"
              style={{ background: "rgba(255,68,68,0.06)", border: "1px solid rgba(255,68,68,0.2)" }}
            >
              <AlertCircle size={15} style={{ color: "rgba(255,100,100,0.9)", flexShrink: 0, marginTop: 1 }} />
              <div className="flex flex-col gap-1">
                <span className="text-[12px] font-semibold" style={{ color: "var(--text-primary)" }}>Error al transcribir</span>
                <span className="text-[11px]" style={{ color: "var(--text-faint)" }}>{ytTranscribeError}</span>
                <button
                  onClick={runYTTranscriptions}
                  className="text-[11px] font-semibold w-fit cursor-pointer hover:opacity-80 mt-0.5"
                  style={{ color: "var(--accent-youtube)" }}
                >
                  Reintentar →
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Objetivos — Instagram */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2.5">
          <Target size={15} style={{ color: "var(--text-secondary)" }} />
          <h2 className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
            Objetivos del mes — Instagram
          </h2>
        </div>
        <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          Los valores actuales vienen de la API. Ajustá los targets acá.
        </p>

        <div className="flex flex-col gap-2">
          {goals.map((goal, i) => (
            <GoalRow
              key={goal.label}
              goal={goal}
              onChange={(v) => updateTarget(i, v)}
            />
          ))}
        </div>
      </section>

      {/* Objetivos — YouTube */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2.5">
          <Target size={15} style={{ color: "var(--accent-youtube)" }} />
          <h2 className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
            Objetivos del mes — YouTube
          </h2>
        </div>
        <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          Usados en el bloque de progreso del dashboard. Los actuales vienen del sync de YouTube.
        </p>

        <div className="flex flex-col gap-2">
          {ytGoals.map((goal, i) => (
            <GoalRow
              key={goal.label}
              goal={goal}
              onChange={(v) => updateYTTarget(i, v)}
              accentColor="var(--accent-youtube)"
            />
          ))}
        </div>
      </section>

      {/* Save button shared */}
      <div>
        <button
          onClick={save}
          className="flex w-fit items-center gap-2 rounded-lg px-4 py-2 text-[12px] font-medium transition-all duration-150 cursor-pointer"
          style={{
            background: "var(--bg-floating)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-medium)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          }}
        >
          <Save size={13} />
          {saved ? "Guardado ✓" : "Guardar cambios"}
        </button>
      </div>

      {/* Integraciones */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2.5">
          <Plug size={15} style={{ color: "var(--text-secondary)" }} />
          <h2 className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
            Integraciones
          </h2>
        </div>
        <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          Configurá las variables de entorno en{" "}
          <code
            className="rounded px-1.5 py-0.5 font-mono text-[10px]"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-secondary)",
            }}
          >
            .env.local
          </code>{" "}
          para activar cada módulo.
        </p>

        <div className="flex flex-col gap-2">
          {[
            { label: "Instagram Graph API", env: "INSTAGRAM_ACCESS_TOKEN", note: "Expira cada 60 días — renovar mensualmente" },
            { label: "Groq API", env: "GROQ_API_KEY", note: "Transcripciones (Whisper) + limpieza STT + chat IA · Gratis" },
            { label: "Gemini API", env: "GEMINI_API_KEY", note: "Embeddings semánticos · Gratis hasta 1M tokens/mes" },
            { label: "YouTube Data API", env: "YOUTUBE_REFRESH_TOKEN", note: "Videos + estadísticas del canal" },
            { label: "Supabase", env: "SUPABASE_URL", note: "Base de datos PostgreSQL + pgvector para búsqueda semántica" },
          ].map(({ label, env, note }) => (
            <div
              key={env}
              className="flex items-center justify-between rounded-xl p-4"
              style={{
                background: "var(--glass-bg)",
                backdropFilter: "var(--glass-blur)",
                border: "1px solid var(--glass-border)",
                boxShadow: "var(--glass-shadow)",
              }}
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>
                  {label}
                </span>
                <span className="text-[10px]" style={{ color: "var(--text-faint)" }}>
                  {note}
                </span>
              </div>
              <code className="text-[10px] font-mono" style={{ color: "var(--text-faint)" }}>
                {env}
              </code>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
