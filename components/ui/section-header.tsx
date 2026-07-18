interface SectionHeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export function SectionHeader({ title, subtitle, actions }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div className="flex flex-col gap-0.5">
        <h2 className="section-label">{title}</h2>
        {subtitle && (
          <p className="text-[11px]" style={{ color: "var(--text-faint)" }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex-shrink-0">{actions}</div>}
    </div>
  )
}
