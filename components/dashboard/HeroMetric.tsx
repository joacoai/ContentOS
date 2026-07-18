import { Delta } from "@/components/ui/delta"

interface HeroMetricProps {
  label: string
  value: string | number
  suffix?: string
  icon?: React.ReactNode
  delta?: number
  deltaLabel?: string
  sparkline?: React.ReactNode
}

export function HeroMetric({
  label,
  value,
  suffix,
  icon,
  delta,
  deltaLabel,
  sparkline,
}: HeroMetricProps) {
  return (
    <div className="card-surface p-6">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon && (
            <span style={{ color: "var(--accent)" }}>{icon}</span>
          )}
          <span className="section-label">{label}</span>
        </div>
        <Delta value={delta} label={deltaLabel} />
      </div>

      <div className="flex items-end justify-between gap-6">
        <div className="flex items-end gap-2.5">
          <span
            style={{
              fontSize: "var(--font-size-display-lg)",
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: "-0.03em",
              color: "var(--accent)",
            }}
          >
            {value}
          </span>
          {suffix && (
            <span
              className="mb-0.5"
              style={{
                fontSize: "var(--font-size-h2)",
                fontWeight: 700,
                color: "var(--text-secondary)",
              }}
            >
              {suffix}
            </span>
          )}
        </div>

        {sparkline && (
          <div className="flex-1 max-w-[240px] min-w-0">{sparkline}</div>
        )}
      </div>
    </div>
  )
}
