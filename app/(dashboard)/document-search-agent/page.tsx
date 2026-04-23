"use client"

import { useEffect, useRef, useState } from "react"
import { ExternalLink, FileText, Mic, Sparkles } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import type { ConversationMessage } from "@/lib/types"

type RetellClient = {
  startCall?: (params: { accessToken: string }) => Promise<void> | void
  stopCall?: () => Promise<void> | void
  on?: (event: string, handler: (...args: unknown[]) => void) => void
}

export default function DocumentSearchAgentPage() {
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [textInput, setTextInput] = useState("")
  const [retellActive, setRetellActive] = useState(false)
  const [retellReady, setRetellReady] = useState(false)
  const [retellCallId, setRetellCallId] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const retellClientRef = useRef<RetellClient | null>(null)
  const retellSeenLineIdsRef = useRef<Set<string>>(new Set())
  const retellCurrentSpeakerRef = useRef<"agent" | "customer" | null>(null)
  const retellAgentHasSpokenRef = useRef(false)
  const retellActiveRef = useRef(retellActive)
  const messagesRef = useRef(messages)

  const searchAgentId = process.env.NEXT_PUBLIC_RETELL_AGENT_ID_SEARCH
  const isVoiceAgentConfigured = !!searchAgentId

  // PDF viewer: reference document to verify agent answers
  const PDF_PATH = "/adnoc-report.pdf"

  useEffect(() => {
    retellActiveRef.current = retellActive
  }, [retellActive])

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const mod = await import("retell-client-js-sdk")
        const RetellCtor =
          (mod as unknown as { default?: new () => unknown; RetellWebClient?: new () => unknown }).default ??
          (mod as unknown as { default?: new () => unknown; RetellWebClient?: new () => unknown }).RetellWebClient
        if (!cancelled && RetellCtor) {
          retellClientRef.current = new RetellCtor() as RetellClient
          retellClientRef.current.on?.("update", (...args: unknown[]) => {
            const event = (args[0] ?? {}) as Record<string, unknown>
            handleRetellUpdate(event)
          })
          retellClientRef.current.on?.("call_ended", () => {
            if (retellActiveRef.current) {
              void stopRetellCall("remote")
            }
          })
          setRetellReady(true)
        }
      } catch (err) {
        console.error("Failed to load Retell client:", err)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!retellCallId) return
    void pollRetellTranscript(retellCallId)
    const interval = window.setInterval(() => {
      void pollRetellTranscript(retellCallId)
    }, 1200)
    return () => window.clearInterval(interval)
  }, [retellCallId, retellActive])

  useEffect(() => {
    return () => {
      if (retellActiveRef.current) {
        void stopRetellCall()
      }
    }
  }, [])

  function handleRetellUpdate(event: Record<string, unknown>) {
    const transcript = Array.isArray(event.transcript) ? event.transcript : []
    if (transcript.length === 0) return

    const lastEntry = transcript[transcript.length - 1]
    if (!lastEntry) return

    const row = (lastEntry ?? {}) as Record<string, unknown>
    const role = typeof row.role === "string" ? row.role.toLowerCase() : ""
    const content = typeof row.content === "string" ? row.content.trim() : ""
    if (!content) return

    const speaker: "agent" | "customer" =
      role.includes("agent") || role.includes("assistant") ? "agent" : "customer"

    if (speaker === "agent") {
      retellAgentHasSpokenRef.current = true
    }

    if (speaker === "customer" && !retellAgentHasSpokenRef.current) {
      retellCurrentSpeakerRef.current = speaker
      return
    }

    const previousSpeaker = retellCurrentSpeakerRef.current
    const isSameSpeaker = previousSpeaker === speaker
    retellCurrentSpeakerRef.current = speaker

    const now = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })

    setMessages((prev) => {
      if (isSameSpeaker && prev.length > 0) {
        for (let i = prev.length - 1; i >= 0; i--) {
          if (prev[i].role === speaker) {
            const next = [...prev]
            next[i] = { ...next[i], text: content, timestamp: now }
            return next
          }
        }
      }

      const alreadyExists = prev.some((m) => m.role === speaker && m.text === content)
      if (alreadyExists) return prev

      return [...prev, { role: speaker, text: content, timestamp: now }]
    })
  }

  async function pollRetellTranscript(callId: string) {
    try {
      const res = await fetch(`/api/retell/transcript?callId=${encodeURIComponent(callId)}`)
      if (!res.ok) return
      const data = (await res.json()) as {
        status?: "active" | "ended"
        lines?: Array<{ id: string; speaker: "agent" | "customer" | "system"; text: string; timestamp: string }>
      }

      const newLines = (data.lines ?? []).filter((line) => {
        if (retellSeenLineIdsRef.current.has(line.id)) return false
        retellSeenLineIdsRef.current.add(line.id)
        return true
      })

      if (newLines.length > 0) {
        const now = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
        setMessages((prev) => {
          const next = [...prev]
          for (const line of newLines) {
            if (line.speaker === "system") continue
            const speaker: "agent" | "customer" = line.speaker === "agent" ? "agent" : "customer"
            const content = line.text.trim()
            if (!content) continue

            if (speaker === "agent") {
              retellAgentHasSpokenRef.current = true
            }
            if (speaker === "customer" && !retellAgentHasSpokenRef.current) continue

            const alreadyExists = next.some((m) => m.role === speaker && m.text === content)
            if (!alreadyExists) {
              next.push({ role: speaker, text: content, timestamp: line.timestamp || now })
            }
          }
          return next
        })
      }

      if (data.status === "ended" && retellActive) {
        await stopRetellCall("remote")
      }
    } catch (err) {
      console.error("Failed to poll Retell transcript:", err)
    }
  }

  async function startRetellCall() {
    if (!retellReady || !retellClientRef.current || !searchAgentId || isStarting) return
    setIsStarting(true)
    try {
      const conversationHistory = messagesRef.current.map((m) => `${m.role}: ${m.text}`).join("\n")
      const res = await fetch("/api/retell/create-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: searchAgentId,
          dynamicVariables: {
            mode: "document_search",
            conversation_history: conversationHistory,
          },
          metadata: {
            source: "document-search-agent",
          },
        }),
      })

      if (!res.ok) {
        const errText = await res.text()
        throw new Error(errText || "Failed to create Retell call")
      }

      const data = (await res.json()) as { accessToken?: string; callId?: string }
      if (!data.accessToken || !data.callId) throw new Error("Retell response missing accessToken/callId")

      retellSeenLineIdsRef.current = new Set()
      retellCurrentSpeakerRef.current = null
      retellAgentHasSpokenRef.current = false
      setRetellCallId(data.callId)
      setRetellActive(true)

      await retellClientRef.current.startCall?.({ accessToken: data.accessToken })
    } finally {
      setIsStarting(false)
    }
  }

  async function stopRetellCall(source: "local" | "remote" = "local") {
    try {
      if (source === "local") {
        await retellClientRef.current?.stopCall?.()
      }
    } catch (err) {
      console.error("Failed to stop Retell call:", err)
    } finally {
      setRetellActive(false)
      setRetellCallId(null)
    }
  }

  async function toggleRetellVoice() {
    if (!isVoiceAgentConfigured) return
    if (retellActive) {
      await stopRetellCall()
      return
    }
    try {
      await startRetellCall()
    } catch (err) {
      console.error("Failed to start Retell call:", err)
      setMessages((prev) => [
        ...prev,
        {
          role: "system",
          text: "Could not start document search voice session. Please check Retell config and try again.",
          timestamp: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        },
      ])
    }
  }

  function addLocalUserMessage() {
    const text = textInput.trim()
    if (!text) return
    setMessages((prev) => [
      ...prev,
      {
        role: "customer",
        text,
        timestamp: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      },
    ])
    setTextInput("")
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight">Document Search Agent</h1>
        <p className="text-sm text-muted-foreground">
          Voice RAG demo for ADNOC document-grounded answers
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
        {/* Left: Chat */}
      <Card className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <CardHeader className="flex flex-col gap-2 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Sparkles className="h-4 w-4 text-primary" />
            Document Search Chat
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {retellActive && (
              <Badge variant="outline" className="border-emerald-500/50 text-emerald-400">
                Live
              </Badge>
            )}
            {!isVoiceAgentConfigured && (
              <Badge variant="destructive">Missing NEXT_PUBLIC_RETELL_AGENT_ID_SEARCH</Badge>
            )}
          </div>
        </CardHeader>
        <Separator />

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="flex h-full items-center justify-center">
              <div className="text-center space-y-3">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 ring-2 ring-primary/20">
                  <Mic className={cn("h-7 w-7 text-primary", retellActive && "animate-pulse")} />
                </div>
                <div>
                  <p className="text-sm font-semibold">Document Search Agent is ready</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Start voice to stream transcript into this chat.
                  </p>
                </div>
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={cn("flex", msg.role === "customer" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[80%] rounded-xl px-4 py-2.5",
                  msg.role === "customer"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : msg.role === "agent"
                    ? "bg-muted border border-border rounded-bl-sm"
                    : "bg-destructive/10 text-destructive border border-destructive/20"
                )}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider opacity-70">
                    {msg.role === "customer" ? "You" : msg.role === "agent" ? "Document Agent" : "System"}
                  </span>
                  <span className="text-[10px] opacity-50">{msg.timestamp}</span>
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-border p-3">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              addLocalUserMessage()
            }}
            className="flex flex-col gap-2 sm:flex-row sm:items-center"
          >
            <Input
              placeholder="Optional note in transcript..."
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" variant="outline" className="w-full sm:w-auto" disabled={!textInput.trim()}>
              Add
            </Button>
            <Button
              type="button"
              size="icon"
              variant={retellActive ? "default" : "outline"}
              onClick={toggleRetellVoice}
              disabled={!isVoiceAgentConfigured || !retellReady || isStarting}
              title={isVoiceAgentConfigured ? "Start or stop Document Search voice call" : "No Retell agent configured"}
              className={cn(retellActive && "ring-2 ring-emerald-500/50")}
            >
              <Mic className="h-4 w-4" />
            </Button>
          </form>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {!isVoiceAgentConfigured
              ? "Set NEXT_PUBLIC_RETELL_AGENT_ID_SEARCH to enable the voice document-search call."
              : retellActive
              ? "Document Search voice call is live. Transcript lines stream here in real time."
              : "Click the mic to start the Document Search voice call."}
          </p>
        </div>
      </Card>

        {/* Right: PDF viewer */}
        <Card className="flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden lg:max-w-[min(50%,28rem)]">
          <CardHeader className="flex flex-col gap-2 pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2 sm:shrink-0">
            <CardTitle className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-primary" />
              Reference document
            </CardTitle>
            <a
              href={PDF_PATH}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground"
              title="Open PDF in new tab"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </CardHeader>
          <Separator />
          <CardContent className="flex-1 min-h-0 p-0 flex flex-col relative">
            <object
              data={PDF_PATH}
              type="application/pdf"
              title="ADNOC Report"
              className="w-full flex-1 min-h-[60vh] border-0 rounded-b-lg bg-muted/30"
            >
              <div className="flex flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground min-h-[40vh]">
                <p>PDF cannot be displayed in this browser.</p>
                <a
                  href={PDF_PATH}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline hover:no-underline"
                >
                  Open PDF in new tab
                </a>
              </div>
            </object>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
