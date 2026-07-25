"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Instagram,
  Youtube,
  MessageSquare,
  Settings,
  Zap,
  CalendarDays,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/instagram", label: "Instagram", icon: Instagram },
  { href: "/youtube", label: "YouTube", icon: Youtube },
  { href: "/hooks", label: "Hooks", icon: Zap },
  { href: "/content-plan", label: "Plan Semanal", icon: CalendarDays },
  { href: "/chat", label: "Content Intelligence", icon: MessageSquare },
]

interface SidebarProps {
  mobileOpen: boolean
  setMobileOpen: (open: boolean) => void
}

export function Sidebar({ mobileOpen, setMobileOpen }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    function check() {
      setIsMobile(window.innerWidth < 640)
    }
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  useEffect(() => {
    if (!isMobile) {
      const stored = localStorage.getItem("sidebar-collapsed")
      if (stored === "true") setCollapsed(true)
    }
  }, [isMobile])

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname, setMobileOpen])

  function toggle() {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem("sidebar-collapsed", String(next))
  }

  const sidebarContent = (
    <aside
      className={cn(
        "relative flex h-screen flex-col flex-shrink-0",
        !isMobile && "transition-all duration-200 ease-in-out",
        isMobile ? "w-[240px]" : collapsed ? "w-[64px]" : "w-[240px]"
      )}
      style={{
        background: "var(--bg-sidebar)",
        borderRight: "1px solid var(--sidebar-border)",
      }}
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute -top-10 -left-10 w-40 h-40 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(0,80,255,0.18) 0%, transparent 70%)",
          filter: "blur(20px)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-px"
        style={{
          background: "linear-gradient(to bottom, transparent 0%, rgba(0,100,255,0.20) 15%, rgba(0,100,255,0.12) 85%, transparent 100%)",
        }}
      />

      {/* Logo */}
      <div
        className={cn(
          "flex h-[58px] items-center justify-between",
          collapsed && !isMobile ? "px-0 justify-center" : "px-4"
        )}
        style={{ borderBottom: "1px solid var(--sidebar-border)" }}
      >
        {collapsed && !isMobile ? (
          <Image src="/logo-icon.png" alt="UtopIA" width={32} height={32} className="object-contain w-8 h-8" priority />
        ) : (
          <div className="flex items-center gap-2.5 min-w-0">
            <Image src="/logo-icon.png" alt="UtopIA" width={28} height={28} className="object-contain w-7 h-7 flex-shrink-0" priority />
            <span className="text-[15px] font-bold tracking-tight leading-none truncate" style={{ color: "var(--text-primary)" }}>
              UtopIA <span style={{ color: "var(--accent)" }}>OS</span>
            </span>
          </div>
        )}

        {/* Mobile close */}
        {isMobile && (
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Cerrar menú"
            className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
            style={{ color: "var(--text-faint)" }}
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-0.5 p-2 pt-3">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/")
          const item = (
            <Link
              href={href}
              className={cn(
                "group relative flex items-center rounded-[10px] font-medium",
                "transition-all duration-150 cursor-pointer",
                collapsed && !isMobile ? "justify-center p-3" : "gap-3 px-3 py-2.5",
                "text-[14px]",
                active
                  ? "text-[var(--sidebar-active-text)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
              style={
                active
                  ? {
                      background: "linear-gradient(90deg, var(--accent-12) 0%, rgba(0,168,255,0.04) 100%)",
                      boxShadow: "inset 0 1px 0 rgba(0,168,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.20)",
                    }
                  : undefined
              }
            >
              {active && !(collapsed && !isMobile) && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full"
                  style={{
                    background: "linear-gradient(to bottom, var(--accent), var(--accent-40))",
                    boxShadow: "0 0 8px var(--accent-40), 0 0 16px rgba(0,168,255,0.20)",
                  }}
                />
              )}
              <Icon
                size={16}
                className={cn("flex-shrink-0 transition-colors duration-150", active ? "opacity-100" : "opacity-50 group-hover:opacity-75")}
              />
              {!(collapsed && !isMobile) && <span className="truncate">{label}</span>}
            </Link>
          )

          if (collapsed && !isMobile) {
            return (
              <Tooltip key={href}>
                <TooltipTrigger render={<div />}>{item}</TooltipTrigger>
                <TooltipContent side="right">
                  <span className="text-xs font-medium">{label}</span>
                </TooltipContent>
              </Tooltip>
            )
          }

          return <div key={href}>{item}</div>
        })}
      </nav>

      {/* Footer — Settings + collapse toggle */}
      <div
        className="flex flex-col gap-0.5 p-2 pb-3"
        style={{ borderTop: "1px solid var(--sidebar-border)" }}
      >
        {/* Settings */}
        {(() => {
          const active = pathname === "/settings"
          const item = (
            <Link
              href="/settings"
              className={cn(
                "group relative flex items-center rounded-[10px] font-medium",
                "transition-all duration-150 cursor-pointer text-[14px]",
                collapsed && !isMobile ? "justify-center p-3" : "gap-3 px-3 py-2.5",
                active ? "text-[var(--sidebar-active-text)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
              style={
                active
                  ? {
                      background: "linear-gradient(90deg, var(--accent-12) 0%, rgba(0,168,255,0.04) 100%)",
                      boxShadow: "inset 0 1px 0 rgba(0,168,255,0.08), 0 1px 4px rgba(0,0,0,0.20)",
                    }
                  : undefined
              }
            >
              {active && !(collapsed && !isMobile) && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full"
                  style={{
                    background: "linear-gradient(to bottom, var(--accent), var(--accent-40))",
                    boxShadow: "0 0 8px var(--accent-40)",
                  }}
                />
              )}
              <Settings size={16} className={cn("flex-shrink-0 transition-opacity duration-150", active ? "opacity-100" : "opacity-50 group-hover:opacity-75")} />
              {!(collapsed && !isMobile) && <span>Settings</span>}
            </Link>
          )

          if (collapsed && !isMobile) {
            return (
              <Tooltip>
                <TooltipTrigger render={<div />}>{item}</TooltipTrigger>
                <TooltipContent side="right">
                  <span className="text-xs font-medium">Settings</span>
                </TooltipContent>
              </Tooltip>
            )
          }

          return <div>{item}</div>
        })()}

        {/* Collapse toggle — desktop only */}
        {!isMobile && (
          <button
            onClick={toggle}
            aria-label={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
            className={cn(
              "group flex items-center rounded-[10px] font-medium transition-all duration-150 cursor-pointer text-[14px]",
              collapsed ? "justify-center p-3" : "gap-3 px-3 py-2.5"
            )}
            style={{ color: "var(--text-faint)" }}
          >
            {collapsed
              ? <PanelLeftOpen size={16} className="opacity-50 group-hover:opacity-75 transition-opacity" />
              : (
                <>
                  <PanelLeftClose size={16} className="opacity-50 group-hover:opacity-75 transition-opacity flex-shrink-0" />
                  <span className="text-[var(--text-faint)]">Colapsar</span>
                </>
              )
            }
          </button>
        )}
      </div>
    </aside>
  )

  if (isMobile) {
    return (
      <>
        {/* Backdrop */}
        <div
          aria-hidden="true"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 transition-opacity duration-300"
          style={{
            background: "rgba(0,0,0,0.6)",
            opacity: mobileOpen ? 1 : 0,
            pointerEvents: mobileOpen ? "auto" : "none",
          }}
        />
        {/* Drawer */}
        <div
          className="fixed inset-y-0 left-0 z-50 transition-transform duration-300"
          style={{ transform: mobileOpen ? "translateX(0)" : "translateX(-100%)" }}
        >
          {sidebarContent}
        </div>
      </>
    )
  }

  return sidebarContent
}
