"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  X,
  Send,
  Loader2,
  Bot,
  User,
  Sparkles,
  Minimize2,
  Zap,
  Star,
  ShieldCheck,
  ShoppingCart,
  ArrowRight,
} from "lucide-react"

/* ================================================================== */
/*  Exports                                                            */
/* ================================================================== */

export interface StationDataContext {
  topProducts?: { name: string; revenue: number; margin: number; qty: number }[]
  loyaltySummary?: { members: number; signups: number; redemptionRate: number; avgBasket: number }
  evSummary?: { sessions: number; kwh: number; avgUtil: number; revenue: number; avgQueue: number }
  hseSummary?: { avgAudit: number; trir: number; fatalities: number; openActions: number; nearMisses: number }
}

interface AgentChatWidgetProps {
  stationIds: string[]
  supabaseUrl: string
  dataContext?: StationDataContext
}

interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

/* ================================================================== */
/*  Markdown Renderer                                                  */
/* ================================================================== */

function MarkdownContent({ content }: { content: string }) {
  const lines = content.split("\n")
  const elements: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Empty line
    if (!line.trim()) {
      elements.push(<div key={i} className="h-1.5" />)
      i++
      continue
    }

    // Heading ##
    if (line.startsWith("## ")) {
      elements.push(
        <h3 key={i} className="text-[12.5px] font-bold text-foreground mt-2.5 mb-1 flex items-center gap-1.5">
          <span className="h-1 w-1 rounded-full bg-primary shrink-0" />
          {renderInline(line.slice(3))}
        </h3>
      )
      i++
      continue
    }

    // Heading ###
    if (line.startsWith("### ")) {
      elements.push(
        <h4 key={i} className="text-[12px] font-semibold text-foreground/90 mt-2 mb-0.5">
          {renderInline(line.slice(4))}
        </h4>
      )
      i++
      continue
    }

    // Blockquote (used for insights/recommendations)
    if (line.startsWith("> ")) {
      const quoteLines: string[] = []
      while (i < lines.length && lines[i].startsWith("> ")) {
        quoteLines.push(lines[i].slice(2))
        i++
      }
      elements.push(
        <div key={`q-${i}`} className="my-2 rounded-lg border-l-3 border-primary/50 bg-primary/5 px-3 py-2">
          <div className="text-[11.5px] leading-relaxed text-foreground/80">
            {quoteLines.map((ql, qi) => (
              <p key={qi} className={qi > 0 ? "mt-1" : ""}>{renderInline(ql)}</p>
            ))}
          </div>
        </div>
      )
      continue
    }

    // Table
    if (line.includes("|") && line.trim().startsWith("|")) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].includes("|") && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i])
        i++
      }
      const rows = tableLines
        .filter((tl) => !tl.match(/^\|[\s\-:|]+\|$/)) // skip separator rows
        .map((tl) =>
          tl.split("|").slice(1, -1).map((c) => c.trim())
        )
      if (rows.length > 0) {
        const headers = rows[0]
        const body = rows.slice(1)
        elements.push(
          <div key={`t-${i}`} className="my-2 rounded-lg border border-border/40 overflow-hidden">
            <table className="w-full text-[10.5px]">
              <thead>
                <tr className="bg-muted/30">
                  {headers.map((h, hi) => (
                    <th key={hi} className={cn(
                      "px-2 py-1.5 font-semibold text-muted-foreground border-b border-border/30",
                      hi === 0 ? "text-left" : "text-right"
                    )}>
                      {renderInline(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {body.map((row, ri) => (
                  <tr key={ri} className="border-b border-border/20 last:border-0">
                    {row.map((cell, ci) => (
                      <td key={ci} className={cn(
                        "px-2 py-1.5",
                        ci === 0 ? "font-medium text-foreground" : "text-right tabular-nums text-foreground/70"
                      )}>
                        {renderInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
      continue
    }

    // Bullet list
    if (line.match(/^[-*] /)) {
      const listItems: string[] = []
      while (i < lines.length && lines[i].match(/^[-*] /)) {
        listItems.push(lines[i].replace(/^[-*] /, ""))
        i++
      }
      elements.push(
        <ul key={`ul-${i}`} className="my-1.5 space-y-1">
          {listItems.map((item, li) => (
            <li key={li} className="flex gap-1.5 text-[11.5px] leading-relaxed">
              <span className="mt-[7px] h-1 w-1 rounded-full bg-foreground/30 shrink-0" />
              <span className="text-foreground/80">{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      )
      continue
    }

    // Numbered list
    if (line.match(/^\d+\. /)) {
      const listItems: string[] = []
      while (i < lines.length && lines[i].match(/^\d+\. /)) {
        listItems.push(lines[i].replace(/^\d+\. /, ""))
        i++
      }
      elements.push(
        <ol key={`ol-${i}`} className="my-1.5 space-y-1">
          {listItems.map((item, li) => (
            <li key={li} className="flex gap-1.5 text-[11.5px] leading-relaxed">
              <span className="text-[10px] font-bold text-primary/60 mt-[1px] w-4 shrink-0 text-right">{li + 1}.</span>
              <span className="text-foreground/80">{renderInline(item)}</span>
            </li>
          ))}
        </ol>
      )
      continue
    }

    // Regular paragraph
    elements.push(
      <p key={i} className="text-[11.5px] leading-relaxed text-foreground/80 my-0.5">
        {renderInline(line)}
      </p>
    )
    i++
  }

  return <div className="space-y-0">{elements}</div>
}

/** Render inline formatting: **bold**, *italic*, `code`, emoji */
function renderInline(text: string): React.ReactNode[] {
  // Split by bold, italic, and code patterns
  const parts: React.ReactNode[] = []
  const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    // Text before match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    const m = match[0]
    if (m.startsWith("**") && m.endsWith("**")) {
      parts.push(<strong key={match.index} className="font-semibold text-foreground">{m.slice(2, -2)}</strong>)
    } else if (m.startsWith("`") && m.endsWith("`")) {
      parts.push(<code key={match.index} className="rounded bg-muted px-1 py-0.5 text-[10px] font-mono">{m.slice(1, -1)}</code>)
    } else if (m.startsWith("*") && m.endsWith("*")) {
      parts.push(<em key={match.index} className="italic">{m.slice(1, -1)}</em>)
    }
    lastIndex = match.index + m.length
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }
  return parts.length > 0 ? parts : [text]
}

/* ================================================================== */
/*  Suggestions                                                        */
/* ================================================================== */

const SUGGESTIONS = [
  "Which station has the highest revenue?",
  "What are the top-selling products and their margins?",
  "How is EV charger utilization and queue time?",
  "Show loyalty member stats and redemption trends",
  "Which stations have HSE open actions?",
  "Give me a full station performance summary",
]

/* ================================================================== */
/*  Widget Component                                                   */
/* ================================================================== */

export function AgentChatWidget({ stationIds, supabaseUrl, dataContext }: AgentChatWidgetProps) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      // Small delay to ensure content is rendered before scrolling
      requestAnimationFrame(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      })
    }
  }, [messages, loading])

  useEffect(() => {
    if (open && inputRef.current) setTimeout(() => inputRef.current?.focus(), 200)
  }, [open])

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return
      setMessages((prev) => [...prev, { role: "user", content: text.trim() }])
      setInput("")
      setLoading(true)

      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/station-agent`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: text.trim(),
            stationIds: stationIds.length > 0 ? stationIds : undefined,
          }),
        })
        const data = await res.json()
        const answer = data.answer ?? data.error ?? "Sorry, I could not get a response."
        setMessages((prev) => [...prev, { role: "assistant", content: answer }])
      } catch {
        setMessages((prev) => [...prev, {
          role: "assistant",
          content: "**Connection error** — Could not reach the server. Please check your connection and try again.",
        }])
      } finally {
        setLoading(false)
      }
    },
    [loading, stationIds, supabaseUrl]
  )

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); sendMessage(input) }

  return (
    <>
      {/* Floating bubble */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-primary/20 transition-all hover:scale-110 hover:ring-primary/30 active:scale-95"
          aria-label="Open AI assistant"
        >
          <Sparkles className="h-6 w-6" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-6 right-6 z-50 flex w-[440px] flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300"
          style={{ height: "min(680px, calc(100vh - 100px))" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border bg-gradient-to-r from-primary/8 to-primary/3 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-sm">
                <Bot className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-foreground">Station Analyst</p>
                <p className="text-[10px] text-muted-foreground">
                  {stationIds.length > 0 ? `${stationIds.length} station${stationIds.length > 1 ? "s" : ""} selected` : "All stations"} · GPT-4o powered
                </p>
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => setOpen(false)}>
                <Minimize2 className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => { setOpen(false); setMessages([]) }}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3">
            {messages.length === 0 && !loading && (
              <div className="flex flex-col gap-3 pt-3">
                <div className="text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">Ask anything about your stations</p>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed max-w-[280px] mx-auto">
                    Powered by GPT-4o with live station data — products, loyalty, EV charging, safety, and more
                  </p>
                </div>

                {/* Category quick-actions */}
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {[
                    { icon: ShoppingCart, label: "Products & Margins", color: "text-orange-500", bg: "bg-orange-500/10", q: "What are the top-selling products and their margins?" },
                    { icon: Star, label: "Loyalty Program", color: "text-purple-500", bg: "bg-purple-500/10", q: "Show loyalty member stats and redemption trends" },
                    { icon: Zap, label: "EV Charging", color: "text-emerald-500", bg: "bg-emerald-500/10", q: "How is EV charger utilization and queue time?" },
                    { icon: ShieldCheck, label: "Safety (HSE)", color: "text-blue-500", bg: "bg-blue-500/10", q: "Which stations have HSE open actions?" },
                  ].map(({ icon: Icon, label, color, bg, q }) => (
                    <button
                      key={label}
                      onClick={() => sendMessage(q)}
                      className="flex items-center gap-2.5 rounded-xl border border-border/60 px-3 py-2.5 text-left transition-all hover:border-primary/30 hover:bg-primary/5 hover:shadow-sm"
                    >
                      <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", bg)}>
                        <Icon className={cn("h-3.5 w-3.5", color)} />
                      </div>
                      <span className="text-[11px] font-medium leading-tight">{label}</span>
                    </button>
                  ))}
                </div>

                {/* Suggestion prompts */}
                <div className="flex flex-col gap-1.5 mt-2">
                  {SUGGESTIONS.slice(0, 3).map((s) => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      className="flex items-center gap-2 rounded-lg border border-border/40 px-3 py-2 text-left transition-all hover:border-primary/30 hover:bg-primary/5"
                    >
                      <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="text-[11px] text-muted-foreground">{s}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Chat messages */}
            {messages.map((msg, i) => (
              <div key={i} className={cn("mb-4", msg.role === "user" ? "flex justify-end" : "")}>
                {msg.role === "user" ? (
                  <div className="flex items-start gap-2 flex-row-reverse max-w-[85%]">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary mt-0.5">
                      <User className="h-3 w-3 text-primary-foreground" />
                    </div>
                    <div className="rounded-2xl rounded-tr-md bg-primary px-3.5 py-2 text-[13px] text-primary-foreground leading-relaxed">
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                      <Bot className="h-3 w-3 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0 rounded-2xl rounded-tl-md bg-muted/40 border border-border/30 px-3.5 py-3 overflow-x-auto">
                      <MarkdownContent content={msg.content} />
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Loading indicator */}
            {loading && (
              <div className="mb-4 flex items-start gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                  <Bot className="h-3 w-3 text-primary" />
                </div>
                <div className="rounded-2xl rounded-tl-md bg-muted/40 border border-border/30 px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary/50 animate-bounce [animation-delay:0ms]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-primary/50 animate-bounce [animation-delay:150ms]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-primary/50 animate-bounce [animation-delay:300ms]" />
                    </div>
                    <span className="text-[12px] text-muted-foreground">Analyzing with GPT-4o...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-border bg-card/80 backdrop-blur-sm p-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about your stations..."
              className="flex-1 rounded-xl border border-border bg-background px-3.5 py-2.5 text-[13px] outline-none placeholder:text-muted-foreground/60 focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
              disabled={loading}
            />
            <Button type="submit" size="icon" className="h-10 w-10 shrink-0 rounded-xl" disabled={!input.trim() || loading}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}
    </>
  )
}
