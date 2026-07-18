import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

interface MetricCardProps {
  label: string
  value: string | number
  delta?: number
  deltaLabel?: string
  icon?: React.ReactNode
  accentColor?: string
  suffix?: string
  mono?: boolean
  variant?: "default" | "compact"
  platform?: "youtube" | "instagram"
}

export function MetricCard({
  label,
  value,
  delta,
  deltaLabel,
  icon,
  suffix,
  mono = false,
  variant = "default",
  platform,
}: MetricCardProps) {
  const platformClass = platform === "youtube" ? "card-yt" : ""
  const isPositive = delta !== undefined && delta > 0
  const isNegative = delta !== undefined && delta < 0
  const isNeutral = delta !== undefined && delta === 0

  if (variant === "compact") {
    return (
      <div className={`card-surface ${platformClass} flex flex-col justify-between p-4`} style={{ minHeight: 110 }}>
        <div className="flex items-center justify-between">
          <span
            className="text-[10px] font-semibold uppercase tracking-[0.13em]"
            style={{ color: "var(--text-faint)" }}
          >
            {label}
          </span>
          {icon && (
            <span style={{ color: "var(--text-faint)", opacity: 0.5 }}>{icon}</span>
          )}
        </div>
        <div className="flex items-end gap-1">
          <span
            className={cn(
              "text-[30px] font-bold leading-none tracking-tight",
              mono && "font-mono"
            )}
            style={{ color: "var(--text-primary)" }}
          >
            {value}
          </span>
          {suffix && (
            <span
              className="mb-0.5 text-[14px] font-bold leading-none"
              style={{ color: "var(--text-secondary)" }}
            >
              {suffix}
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`card-surface ${platformClass} flex flex-col p-5 gap-0`}>
      {/* Top row — label + icon */}
      <div className="flex items-center justify-between mb-4">
        <span
          className="text-[11px] font-semibold uppercase tracking-[0.13em]"
          style={{ color: "var(--text-faint)" }}
        >
          {label}
        </span>
        {icon && (
          <span
            className="flex h-[28px] w-[28px] items-center justify-center rounded-lg"
            style={{
              background: "linear-gradient(145deg, var(--accent-15) 0%, var(--accent-10) 100%)",
              color: "var(--accent)",
              border: "1px solid var(--accent-22)",
              boxShadow: "0 0 10px var(--accent-12), 0 1px 0 rgba(255,255,255,0.06) inset",
            }}
          >
            {icon}
          </span>
        )}
      </div>

      {/* Value */}
      <div className="flex items-end gap-1.5 mb-3.5">
        <span
          className={cn(
            "text-[34px] font-bold leading-none tracking-tight text-gradient",
            mono && "font-mono"
          )}
        >
          {value}
        </span>
        {suffix && (
          <span
            className="mb-0.5 text-[16px] font-bold leading-none"
            style={{ color: "var(--text-secondary)" }}
          >
            {suffix}
          </span>
        )}
      </div>

      {/* Micro separator */}
      <div className="separator-line mb-3" />

      {/* Delta */}
      {delta !== undefined && (
        <div className="flex items-center gap-1.5">
          {isPositive && (
            <span className="delta-positive">
              <TrendingUp size={9} />
              +{delta}%
            </span>
          )}
          {isNegative && (
            <span className="delta-negative">
              <TrendingDown size={9} />
              {delta}%
            </span>
          )}
          {isNeutral && (
            <span className="delta-neutral">
              <Minus size={9} />
              0%
            </span>
          )}
          {deltaLabel && (
            <span className="text-[11px]" style={{ color: "var(--text-faint)" }}>
              {deltaLabel}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
