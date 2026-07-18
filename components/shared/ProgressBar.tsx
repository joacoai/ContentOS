interface ProgressBarProps {
  label: string
  current: number
  target: number
  unit?: string
  pace?: string
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M"
  if (n >= 1_000) return (n / 1_000).toFixed(n >= 10_000 ? 0 : 1) + "k"
  return n.toString()
}

export function ProgressBar({
  label,
  current,
  target,
  unit = "",
  pace,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.round((current / target) * 100))

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <span
          className="text-[12px] font-semibold tracking-tight"
          style={{ color: "var(--text-secondary)" }}
        >
          {label}
        </span>
        <div className="flex items-baseline gap-1 flex-shrink-0 tabular-nums">
          <span
            className="text-[20px] font-bold leading-none"
            style={{ color: "var(--text-primary)" }}
          >
            {formatNum(current)}{unit}
          </span>
          <span
            className="text-[11px]"
            style={{ color: "var(--text-faint)" }}
          >
            / {formatNum(target)}{unit}
          </span>
        </div>
      </div>

      <div className="progress-track">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: pct === 0 ? "4px" : `${pct}%`,
            background: `linear-gradient(90deg, var(--progress-fill-from) 0%, var(--progress-fill-mid) 55%, var(--progress-fill-to) 100%)`,
            boxShadow: `0 0 8px var(--progress-fill-glow)`,
          }}
        />
      </div>

      <div className="flex items-center justify-between">
        <span
          className="text-[11px] font-bold tabular-nums"
          style={{ color: pct >= 80 ? "var(--color-positive)" : "var(--text-faint)" }}
        >
          {pct}%
        </span>
        {pace ? (
          <span className="text-[11px]" style={{ color: "var(--text-faint)" }}>
            {pace}
          </span>
        ) : (
          <span className="text-[11px]" style={{ color: "var(--text-faint)" }}>
            Faltan {formatNum(target - current)}{unit}
          </span>
        )}
      </div>
    </div>
  )
}
