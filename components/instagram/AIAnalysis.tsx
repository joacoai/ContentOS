import { Zap, Hash, BarChart2, Trophy } from "lucide-react"
import { getIGMedia } from "@/lib/instagramClient"
import { getAIAnalysis } from "@/lib/instagramAI"
import { getHooksWithReach } from "@/lib/db/transcriptions"
import { SectionHeader } from "@/components/ui/section-header"
import { EmptyState } from "@/components/ui/empty-state"
import { InfoTooltip } from "@/components/ui/info-tooltip"
import { ScoreSection } from "./ScoreSection"

function formatReach(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M"
  if (n >= 1_000) return (n / 1000).toFixed(1) + "k"
  return String(n)
}

export async function AIAnalysis() {
  const [media, hooksFromTranscriptions] = await Promise.all([
    getIGMedia().catch(() => []),
    getHooksWithReach(5).catch(() => []),
  ])
  const { keywords, scores, themes, hooks: captionHooks } = getAIAnalysis(media)

  const noData = media.length === 0
  const noTranscriptions = hooksFromTranscriptions.length === 0

  // Use transcription hooks if available, otherwise fall back to caption-based hooks
  const displayHooks = noTranscriptions
    ? captionHooks.map(h => ({ post_id: '', hook: h.text, reach: h.reach }))
    : hooksFromTranscriptions

  const hooksHasData = displayHooks.length > 0
  const scoreHasData = !noData && scores.length > 0
  const kwHasData = !noData && keywords.length >= 3
  const themesHasData = !noData && themes.length > 0

  return (
    <div className="flex flex-col gap-3.5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <h2 className="section-label">Análisis IA</h2>
        <span
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: "var(--accent-12)", color: "var(--accent)" }}
        >
          Beta
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
        {/* Hooks más efectivos */}
        <div
          className="card-surface p-5"
          style={hooksHasData && !scoreHasData ? { gridColumn: "1 / -1" } : undefined}
        >
          <SectionHeader
            title="Hooks más efectivos"
            actions={<span style={{ color: "var(--accent)" }}><Zap size={14} /></span>}
          />
          {hooksHasData ? (
            <ol className="flex flex-col gap-3">
              {displayHooks.map((h, i) => (
                <li key={h.post_id || i} className="flex items-start gap-3">
                  <span
                    className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5"
                    style={{ background: "var(--accent-15)", color: "var(--accent)" }}
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] leading-snug" style={{ color: "var(--text-primary)" }}>
                      &ldquo;{h.hook}&rdquo;
                    </p>
                    <p className="text-[11px] mt-1" style={{ color: "var(--text-faint)" }}>
                      {formatReach(h.reach)} reach
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState
              icon={<Zap size={20} />}
              title="Sincronizá Instagram para ver los hooks"
              description="Los hooks de transcripción aparecen después de transcribir."
            />
          )}
        </div>

        {/* Score de contenido */}
        <div
          className="card-surface p-5"
          style={scoreHasData && !hooksHasData ? { gridColumn: "1 / -1" } : undefined}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span style={{ color: "var(--accent)" }}><Trophy size={14} /></span>
              <h3 className="text-[13px] font-semibold tracking-wide uppercase" style={{ color: "var(--text-secondary)" }}>
                Score de contenido
              </h3>
            </div>
            <InfoTooltip content="reach × 0.4 + saves × 0.4 + shares × 0.2" />
          </div>
          {scoreHasData ? (
            <ScoreSection scores={scores} media={media} />
          ) : (
            <EmptyState
              icon={<Trophy size={20} />}
              title="Sincronizá Instagram para ver el ranking de tus reels"
            />
          )}
        </div>

        {/* Palabras clave ganadoras */}
        <div
          className="card-surface p-5"
          style={kwHasData && !themesHasData ? { gridColumn: "1 / -1" } : undefined}
        >
          <SectionHeader
            title="Palabras clave ganadoras"
            actions={<span style={{ color: "var(--accent)" }}><Hash size={14} /></span>}
          />
          {kwHasData ? (
            <div className="flex flex-wrap gap-2">
              {keywords.map((k, i) => (
                <div
                  key={k.word}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px]"
                  style={{
                    background: i === 0 ? "var(--accent-15)" : "rgba(255,255,255,0.05)",
                    border: "1px solid",
                    borderColor: i === 0 ? "var(--accent-30)" : "var(--border-subtle)",
                  }}
                >
                  <span style={{ color: i === 0 ? "var(--accent)" : "var(--text-primary)" }}>
                    {k.word}
                  </span>
                  <span style={{ color: "var(--text-faint)" }}>
                    {formatReach(k.avg_reach)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Hash size={20} />}
              title={noData ? "Sincronizá Instagram para ver qué términos generan más reach" : "Sincronizá más reels para detectar patrones"}
            />
          )}
        </div>

        {/* Temas por performance */}
        <div
          className="card-surface p-5"
          style={themesHasData && !kwHasData ? { gridColumn: "1 / -1" } : undefined}
        >
          <SectionHeader
            title="Temas por performance"
            actions={<span style={{ color: "var(--accent)" }}><BarChart2 size={14} /></span>}
          />
          {themesHasData ? (
            <div className="flex flex-col gap-2.5">
              {themes.map((t) => {
                const maxReach = themes[0].avg_reach || 1
                const pct = Math.round((t.avg_reach / maxReach) * 100)
                return (
                  <div key={t.tag}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[12px] font-medium" style={{ color: "var(--text-primary)" }}>
                        {t.tag}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px]" style={{ color: "var(--text-faint)" }}>
                          {t.count} reels
                        </span>
                        <span className="text-[12px] font-semibold" style={{ color: "var(--accent)" }}>
                          {formatReach(t.avg_reach)}
                        </span>
                      </div>
                    </div>
                    <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--border-subtle)" }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, background: "linear-gradient(to right, var(--accent), var(--accent-40))" }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState
              icon={<BarChart2 size={20} />}
              title="Sincronizá Instagram para ver qué hashtags generan más reach"
            />
          )}
        </div>
      </div>
    </div>
  )
}
