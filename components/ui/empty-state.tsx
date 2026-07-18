import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

// Height is contained — never matches a card with real data.
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center gap-2 py-6 text-center", className)}
    >
      {icon && (
        <span className="mb-1 opacity-30" style={{ color: "var(--text-secondary)" }}>
          {icon}
        </span>
      )}
      <p className="text-[12px] font-medium" style={{ color: "var(--text-secondary)" }}>
        {title}
      </p>
      {description && (
        <p className="max-w-[220px] text-[11px] leading-relaxed" style={{ color: "var(--text-faint)" }}>
          {description}
        </p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}
