import { TrendingUp, TrendingDown, Minus } from "lucide-react"

interface DeltaProps {
  value?: number
  label?: string
}

// Renders nothing when value is undefined — safe to spread as an optional slot.
export function Delta({ value, label }: DeltaProps) {
  if (value === undefined) return null

  const isPos = value > 0
  const isNeg = value < 0

  return (
    <div className="flex items-center gap-1.5">
      {isPos && (
        <span className="delta-positive">
          <TrendingUp size={9} />
          +{value}%
        </span>
      )}
      {isNeg && (
        <span className="delta-negative">
          <TrendingDown size={9} />
          {value}%
        </span>
      )}
      {!isPos && !isNeg && (
        <span className="delta-neutral">
          <Minus size={9} />
          0%
        </span>
      )}
      {label && (
        <span className="text-[11px]" style={{ color: "var(--text-faint)" }}>
          {label}
        </span>
      )}
    </div>
  )
}
