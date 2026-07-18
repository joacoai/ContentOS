"use client"

import { Tooltip } from "@base-ui/react/tooltip"
import { Info } from "lucide-react"

export function InfoTooltip({ content }: { content: string }) {
  return (
    <Tooltip.Provider>
      <Tooltip.Root>
        <Tooltip.Trigger
          aria-label={content}
          className="flex items-center justify-center"
          style={{ color: "var(--text-faint)", cursor: "default" }}
        >
          <Info size={12} />
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Positioner sideOffset={6}>
            <Tooltip.Popup
              className="rounded-lg px-2.5 py-1.5 text-[11px] font-mono"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-secondary)",
                boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
                zIndex: 60,
              }}
            >
              {content}
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  )
}
