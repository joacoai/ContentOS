import { cn } from "@/lib/utils"

export type AgentId = "instagram" | "youtube" | "combined"

export const agents: Record<AgentId, { label: string; handle: string; color: string; description: string }> = {
  instagram: {
    label: "Instagram",
    handle: "Instagram",
    color: "var(--accent-instagram)",
    description: "Reels, métricas, transcripciones",
  },
  youtube: {
    label: "YouTube",
    handle: "YouTube",
    color: "var(--accent-youtube)",
    description: "Videos, views, watch time",
  },
  combined: {
    label: "Ambas plataformas",
    handle: "IG + YT",
    color: "var(--accent)",
    description: "Instagram y YouTube juntos",
  },
}

interface AgentBadgeProps {
  agentId: AgentId
  active?: boolean
  onClick?: (id: AgentId) => void
  size?: "sm" | "md"
}

export function AgentBadge({ agentId, active = false, onClick, size = "md" }: AgentBadgeProps) {
  const agent = agents[agentId]
  return (
    <button
      onClick={() => onClick?.(agentId)}
      className={cn(
        "rounded-lg border transition-all cursor-pointer",
        size === "sm" ? "px-2 py-1 text-[10px]" : "px-3 py-1.5 text-xs",
        active
          ? "border-transparent font-semibold"
          : "border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-medium)] hover:text-[var(--text-primary)]"
      )}
      style={
        active
          ? { backgroundColor: agent.color + "18", color: agent.color, borderColor: agent.color + "40" }
          : {}
      }
    >
      {agent.handle}
    </button>
  )
}
