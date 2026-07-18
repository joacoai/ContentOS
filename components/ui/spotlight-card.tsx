'use client'

import { useRef, useState, type ReactNode, type CSSProperties } from 'react'

interface SpotlightCardProps {
  children: ReactNode
  /** HSL hue. 0 = red, 200 = cyan */
  hue?: number
  className?: string
  style?: CSSProperties
}

export function SpotlightCard({ children, hue = 200, className, style }: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: -9999, y: -9999 })
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [active, setActive] = useState(false)

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  function handleEnter() {
    const el = ref.current
    if (!el) return
    setSize({ w: el.offsetWidth, h: el.offsetHeight })
    setActive(true)
  }

  // Nearest edge Y: snap beam to top or bottom based on cursor position
  const edgeY = pos.y < size.h / 2 ? 0 : size.h
  const edgeX = pos.x < size.w / 2 ? 0 : size.w

  // Pick dominant axis (which border is closer)
  const distTop = pos.y
  const distBottom = size.h - pos.y
  const distLeft = pos.x
  const distRight = size.w - pos.x
  const minDist = Math.min(distTop, distBottom, distLeft, distRight)

  let beamX = pos.x
  let beamY = pos.y
  let beamW = '35%'
  let beamH = '1px'

  if (minDist === distTop)    { beamY = 0;       beamX = pos.x; beamW = '35%'; beamH = '1px' }
  if (minDist === distBottom) { beamY = size.h;  beamX = pos.x; beamW = '35%'; beamH = '1px' }
  if (minDist === distLeft)   { beamX = 0;       beamY = pos.y; beamW = '1px'; beamH = '35%' }
  if (minDist === distRight)  { beamX = size.w;  beamY = pos.y; beamW = '1px'; beamH = '35%' }

  return (
    <div
      ref={ref}
      className={className}
      style={{ position: 'relative', borderRadius: '0.875rem', overflow: 'hidden', ...style }}
      onPointerMove={handlePointerMove}
      onPointerEnter={handleEnter}
      onPointerLeave={() => { setActive(false) }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 20,
          borderRadius: 'inherit',
          opacity: active ? 1 : 0,
          transition: 'opacity 250ms ease',
          background: [
            // bright beam line on nearest border
            `radial-gradient(ellipse ${beamW} 60px at ${beamX}px ${beamY}px, hsl(${hue} 100% 85% / 1) 0%, hsl(${hue} 90% 65% / 0.5) 40%, transparent 70%)`,
            // soft inner ambient glow toward cursor
            `radial-gradient(ellipse 50% 200px at ${pos.x}px ${pos.y}px, hsl(${hue} 100% 65% / 0.07), transparent 65%)`,
          ].join(', '),
        }}
      />
      {children}
    </div>
  )
}
