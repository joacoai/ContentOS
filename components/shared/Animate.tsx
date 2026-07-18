"use client"

import { motion } from "framer-motion"

interface FadeUpProps {
  children: React.ReactNode
  delay?: number
  className?: string
}

export function FadeUp({ children, delay = 0, className }: FadeUpProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

interface StaggerProps {
  children: React.ReactNode[]
  className?: string
  staggerDelay?: number
  baseDelay?: number
}

export function Stagger({ children, className, staggerDelay = 0.07, baseDelay = 0 }: StaggerProps) {
  return (
    <div className={className}>
      {children.map((child, i) => (
        <FadeUp key={i} delay={baseDelay + i * staggerDelay}>
          {child}
        </FadeUp>
      ))}
    </div>
  )
}
