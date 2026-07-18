import { cn } from "@/lib/utils"

interface AppCardProps {
  variant?: "default" | "metric" | "panel"
  className?: string
  children: React.ReactNode
}

// AppCard wraps the .card-surface glass system.
// shadcn's <Card> (card.tsx) remains separate — it's used only by shadcn internals.
export function AppCard({ variant = "default", className, children }: AppCardProps) {
  return (
    <div
      className={cn(
        "card-surface",
        variant === "default" && "p-5",
        variant === "metric" && "p-4",
        variant === "panel" && "p-6",
        className
      )}
    >
      {children}
    </div>
  )
}
