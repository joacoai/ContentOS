"use client"

import { Component, type ReactNode } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  override render() {
    if (!this.state.hasError) return this.props.children

    if (this.props.fallback) return this.props.fallback

    return (
      <div
        className="flex flex-col items-center gap-3 rounded-xl p-8 text-center"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <AlertTriangle size={20} style={{ color: "var(--color-warning)" }} />
        <div>
          <p className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
            Algo salió mal
          </p>
          {this.state.error?.message && (
            <p className="text-[11px] mt-1" style={{ color: "var(--text-faint)" }}>
              {this.state.error.message}
            </p>
          )}
        </div>
        <button
          onClick={() => this.setState({ hasError: false, error: null })}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-colors cursor-pointer"
          style={{
            background: "var(--sidebar-active-bg)",
            border: "1px solid var(--border-medium)",
            color: "var(--text-primary)",
          }}
        >
          <RefreshCw size={11} />
          Reintentar
        </button>
      </div>
    )
  }
}
