import { cn } from "@/lib/utils"

interface SkeletonProps {
  className?: string
  rounded?: boolean
}

export function Skeleton({ className, rounded = false }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse",
        rounded ? "rounded-full" : "rounded-lg",
        className
      )}
      style={{ background: "var(--border-subtle)" }}
    />
  )
}

export function SkeletonMetricCard() {
  return (
    <div className="card-surface flex flex-col p-5 gap-0">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-7 w-7" rounded />
      </div>
      <Skeleton className="h-9 w-28 mb-3.5" />
      <div className="separator-line mb-3" />
      <Skeleton className="h-4 w-16" />
    </div>
  )
}
