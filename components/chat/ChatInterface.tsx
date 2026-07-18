"use client"

import { useState, useRef, useEffect } from "react"
import { Send, Loader2, Sparkles, ArrowUp } from "lucide-react"
import { agents } from "./AgentBadge"
import type { AgentId } from "./AgentBadge"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  ts: string
}

function parseMarkdown(text: string) {
  return text
    .replace(/```[\s\S]*?```/g, (match) => {
      const code = match.replace(/```\w*\n?/, "").replace(/```$/, "")
      return `<pre style="background:rgba(255,255,255,0.03);border:1px solid var(--border-subtle);border-radius:10px;padding:14px 16px;overflow-x:auto;font-size:11.5px;line-height:1.7;color:var(--text-secondary);margin:10px 0"><code>${code.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>`
    })
    .replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.06);border:1px solid var(--border-subtle);border-radius:4px;padding:1px 6px;font-size:11.5px;color:var(--accent)">$1</code>')
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--text-primary);font-weight:650">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em style="color:var(--text-secondary)">$1</em>')
    .replace(/^### (.*?)$/gm, '<p style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-faint);margin:14px 0 6px">$1</p>')
    .replace(/^- (.*?)$/gm, '<div style="display:flex;gap:8px;margin:3px 0"><span style="color:var(--accent);flex-shrink:0;margin-top:2px">·</span><span>$1</span></div>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>')
}

const PROMPTS_BY_AGENT: Record<AgentId, string[]> = {
  instagram: [
    "¿Qué hook me funcionó mejor este mes?",
    "¿Cuál es mi reel con más saves?",
    "¿Qué día conviene publicar?",
    "Compará mis últimos 5 reels",
  ],
  youtube: [
    "¿Cuál es mi video con más views?",
    "¿Cómo está mi watch time promedio?",
    "¿Qué temas generan más engagement?",
    "Resumime mis videos más recientes",
  ],
  combined: [
    "¿En qué plataforma me va mejor?",
    "¿Qué contenido funcionó en las dos?",
    "Compará mi reach de IG vs views de YT",
    "¿Cuál es mi mejor contenido en general?",
  ],
}

const PLATFORM_LABELS: Record<AgentId, string> = {
  instagram: "Instagram",
  youtube: "YouTube",
  combined: "IG + YT",
}

export function ChatInterface() {
  const [activeAgent, setActiveAgent] = useState<AgentId>("combined")
  const [history, setHistory] = useState<{ role: string; content: string }[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  function growTextarea() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = Math.min(el.scrollHeight, 160) + "px"
  }

  async function sendMessage(text?: string) {
    const content = (text ?? input).trim()
    if (!content || loading) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      ts: new Date().toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" }),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput("")
    if (textareaRef.current) textareaRef.current.style.height = "auto"
    setLoading(true)

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, history }),
      })
      const data = await res.json()
      const replyText = data.reply ?? (data.error ? `Error: ${data.error}` : "No se pudo obtener una respuesta.")

      setHistory((prev) => [
        ...prev,
        { role: "user", content },
        { role: "assistant", content: replyText },
      ])

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: replyText,
          ts: new Date().toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" }),
        },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Error al conectar con el servicio de IA.",
          ts: new Date().toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" }),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex h-full flex-col">

      {/* Platform selector — top bar */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-6 py-3"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <div className="flex items-center gap-1.5">
          {(Object.keys(agents) as AgentId[]).map((id) => {
            const isActive = id === activeAgent
            const color = agents[id].color
            return (
              <button
                key={id}
                onClick={() => setActiveAgent(id)}
                className="rounded-lg px-3 py-1.5 text-[11.5px] font-medium transition-all duration-150 cursor-pointer"
                style={{
                  background: isActive ? color + "18" : "transparent",
                  color: isActive ? color : "var(--text-faint)",
                  border: `1px solid ${isActive ? color + "35" : "transparent"}`,
                }}
              >
                {PLATFORM_LABELS[id]}
              </button>
            )
          })}
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="h-1.5 w-1.5 rounded-full animate-pulse"
            style={{ background: "var(--accent)" }}
          />
          <span className="text-[10px]" style={{ color: "var(--text-faint)" }}>
            Content Intelligence
          </span>
        </div>
      </div>

      {/* Scroll area */}
      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          /* Empty state — ChatGPT/Claude style */
          <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-8 px-6 py-10">
            <div className="flex flex-col items-center gap-4 text-center">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-2xl"
                style={{
                  background: "linear-gradient(145deg, var(--accent-15), var(--accent-10))",
                  border: "1px solid var(--accent-22)",
                  boxShadow: "0 0 32px var(--accent-12)",
                }}
              >
                <Sparkles size={26} style={{ color: "var(--accent)" }} />
              </div>
              <div>
                <h2 className="text-[20px] font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
                  Content Intelligence
                </h2>
                <p className="text-[13px] mt-1" style={{ color: "var(--text-faint)" }}>
                  {agents[activeAgent].description}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 w-full max-w-[520px] sm:grid-cols-2">
              {PROMPTS_BY_AGENT[activeAgent].map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="group rounded-xl px-4 py-3.5 text-left transition-all duration-150 cursor-pointer"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-subtle)",
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLElement
                    el.style.borderColor = "var(--accent-22)"
                    el.style.background = "var(--accent-10)"
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLElement
                    el.style.borderColor = "var(--border-subtle)"
                    el.style.background = "var(--bg-elevated)"
                  }}
                >
                  <p className="text-[12.5px] leading-snug" style={{ color: "var(--text-secondary)" }}>
                    {prompt}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Messages */
          <div className="flex flex-col gap-0 max-w-[760px] mx-auto px-6 py-6">
            {messages.map((msg, i) => (
              <div
                key={msg.id}
                className={cn(
                  "group flex",
                  msg.role === "user" ? "justify-end mb-2" : "justify-start mb-6"
                )}
              >
                {msg.role === "user" ? (
                  /* User message — pill right */
                  <div
                    className="max-w-[75%] rounded-2xl px-4 py-3 text-[13.5px] leading-relaxed"
                    style={{
                      background: "var(--bg-floating)",
                      border: "1px solid var(--border-medium)",
                      color: "var(--text-primary)",
                    }}
                  >
                    {msg.content}
                  </div>
                ) : (
                  /* Assistant message — full width, no bubble */
                  <div className="flex gap-3 w-full">
                    <div
                      className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full mt-0.5"
                      style={{
                        background: "linear-gradient(145deg, var(--accent-15), var(--accent-10))",
                        border: "1px solid var(--accent-22)",
                      }}
                    >
                      <Sparkles size={12} style={{ color: "var(--accent)" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10.5px] font-semibold mb-2" style={{ color: "var(--accent)" }}>
                        Content Intelligence · {agents[activeAgent].handle}
                      </p>
                      <div
                        className="text-[13.5px] leading-relaxed"
                        style={{ color: "var(--text-secondary)" }}
                        dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.content) }}
                      />
                      <span
                        className="mt-2 block opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-[10px]"
                        style={{ color: "var(--text-faint)" }}
                      >
                        {msg.ts}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="flex gap-3 mb-6">
                <div
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full"
                  style={{
                    background: "linear-gradient(145deg, var(--accent-15), var(--accent-10))",
                    border: "1px solid var(--accent-22)",
                  }}
                >
                  <Sparkles size={12} style={{ color: "var(--accent)" }} />
                </div>
                <div className="flex items-center gap-1 pt-2">
                  {[0, 150, 300].map((delay) => (
                    <span
                      key={delay}
                      className="h-1.5 w-1.5 rounded-full animate-bounce"
                      style={{
                        background: "var(--accent-40)",
                        animationDelay: `${delay}ms`,
                        animationDuration: "900ms",
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input bar — pill style */}
      <div
        className="flex-shrink-0 px-6 pb-5 pt-3"
        style={{
          background: "rgba(var(--bg-base-rgb, 8 8 18), 0.90)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
      >
        <div
          className="flex items-end gap-0 max-w-[760px] mx-auto rounded-2xl transition-all duration-150"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-medium)",
            boxShadow: "0 2px 16px rgba(0,0,0,0.25)",
          }}
          onFocusCapture={(e) => {
            const el = e.currentTarget as HTMLElement
            el.style.borderColor = "var(--accent-30)"
            el.style.boxShadow = "0 2px 16px rgba(0,0,0,0.25), 0 0 0 1px var(--accent-15)"
          }}
          onBlurCapture={(e) => {
            const el = e.currentTarget as HTMLElement
            el.style.borderColor = "var(--border-medium)"
            el.style.boxShadow = "0 2px 16px rgba(0,0,0,0.25)"
          }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => { setInput(e.target.value); growTextarea() }}
            onKeyDown={handleKeyDown}
            disabled={loading}
            placeholder={`Preguntá sobre tu contenido en ${agents[activeAgent].handle}...`}
            rows={1}
            className="flex-1 resize-none bg-transparent text-[13.5px] focus:outline-none px-5 py-4"
            style={{
              color: "var(--text-primary)",
              maxHeight: "160px",
              overflowY: "auto",
            }}
          />
          <div className="flex-shrink-0 p-2.5">
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              aria-label="Enviar"
              className="flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-150 cursor-pointer"
              style={
                input.trim() && !loading
                  ? {
                      background: "var(--accent)",
                      color: "#fff",
                      boxShadow: "0 2px 8px rgba(0,168,255,0.3)",
                    }
                  : {
                      background: "var(--bg-base)",
                      color: "var(--text-faint)",
                      cursor: "not-allowed",
                    }
              }
            >
              {loading
                ? <Loader2 size={14} className="animate-spin" />
                : <ArrowUp size={15} />
              }
            </button>
          </div>
        </div>
        <p
          className="mt-2 text-center max-w-[760px] mx-auto"
          style={{ fontSize: 10, color: "var(--text-faint)" }}
        >
          Enter para enviar · Shift+Enter nueva línea
        </p>
      </div>
    </div>
  )
}
