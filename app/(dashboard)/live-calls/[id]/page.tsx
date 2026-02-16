"use client"

import { useState, useEffect, useRef, use } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  LiveBadge,
  StatusPill,
  LatencyChip,
} from "@/components/shared"
import { getCallById, getTranscriptLines, getToolEvents, getProducts, getTimeSlots } from "@/lib/data/queries"
import type { Call, TranscriptLine, ToolEvent, AgentState, Product, TimeSlot } from "@/lib/types"
import {
  ArrowLeft,
  Play,
  Pause,
  ChevronDown,
  ChevronUp,
  Database,
  FileSearch,
  Zap,
  Shield,
  AlertTriangle,
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  User,
  Bot,
  Monitor,
  ShoppingCart,
  Clock,
  Check,
  RefreshCw,
  Edit3,
  Send,
  Plus,
  Minus,
  Sparkles,
  ArrowUpRight,
  CheckCircle2,
  Circle,
  Timer,
} from "lucide-react"
import { cn } from "@/lib/utils"

const agentStateSequence: AgentState[] = [
  "Listening",
  "Speaking",
  "Querying DB",
  "Retrieving Doc",
  "Speaking",
  "Confirming",
  "Processing",
  "Speaking",
  "Listening",
]

export default function LiveCallDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()

  const [call, setCall] = useState<Call | null>(null)
  const [initialTranscript, setInitialTranscript] = useState<TranscriptLine[]>([])
  const [simLines, setSimLines] = useState<TranscriptLine[]>([])
  const [initialEvents, setInitialEvents] = useState<ToolEvent[]>([])
  const [simToolEvents, setSimToolEvents] = useState<ToolEvent[]>([])
  const [productsList, setProductsList] = useState<Product[]>([])
  const [timeSlotsList, setTimeSlotsList] = useState<TimeSlot[]>([])

  const [transcript, setTranscript] = useState<TranscriptLine[]>([])
  const [events, setEvents] = useState<ToolEvent[]>([])
  const [simIndex, setSimIndex] = useState(0)
  const [simEventIndex, setSimEventIndex] = useState(0)
  const [autoScroll, setAutoScroll] = useState(true)
  const [demoMode, setDemoMode] = useState(true)
  const [elapsed, setElapsed] = useState(0)
  const [currentAgentState, setCurrentAgentState] = useState<AgentState>("Listening")

  // Fetch all data from Supabase
  useEffect(() => {
    getCallById(id).then((c) => {
      if (c) setCall(c)
    }).catch(console.error)

    getTranscriptLines(id).then((lines) => {
      // Split: first 11 lines are initial transcript, rest are simulation
      setInitialTranscript(lines.slice(0, 11))
      setSimLines(lines.slice(11))
    }).catch(console.error)

    getToolEvents(id).then((events) => {
      // Split: first 3 events are initial, rest are simulation
      setInitialEvents(events.slice(0, 3))
      setSimToolEvents(events.slice(3))
    }).catch(console.error)

    getProducts().then(setProductsList).catch(console.error)
    getTimeSlots().then(setTimeSlotsList).catch(console.error)
  }, [id])

  // Sync transcript and events when initial data loads
  useEffect(() => {
    if (initialTranscript.length > 0) setTranscript(initialTranscript)
  }, [initialTranscript])

  useEffect(() => {
    if (initialEvents.length > 0) setEvents(initialEvents)
  }, [initialEvents])

  // Sync call-dependent state
  useEffect(() => {
    if (call) setCurrentAgentState(call.agentState)
  }, [call])

  useEffect(() => {
    if (call) setElapsed(call.duration)
  }, [call])
  const [agentStateIdx, setAgentStateIdx] = useState(0)
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set())
  const [draftResponse, setDraftResponse] = useState(
    "I've applied the Coffee + Croissant Bundle promotion for 20% off. Your total is 16 AED. Would you like to add anything else to your order?"
  )
  const [cartItems, setCartItems] = useState([
    { name: "Arabic Coffee (Large)", qty: 1, price: 12 },
    { name: "Zaatar Croissant", qty: 1, price: 8 },
  ])
  const [discount, setDiscount] = useState(4)
  const [selectedService, setSelectedService] = useState("")
  const [orderStage, setOrderStage] = useState(1)

  const transcriptEndRef = useRef<HTMLDivElement>(null)

  // Transcript simulation
  useEffect(() => {
    if (!demoMode || simIndex >= simLines.length) return
    const timer = setTimeout(
      () => {
        setTranscript((prev) => [...prev, simLines[simIndex]])
        setSimIndex((i) => i + 1)
      },
      3000 + Math.random() * 2000
    )
    return () => clearTimeout(timer)
  }, [demoMode, simIndex, simLines])

  // Tool event simulation
  useEffect(() => {
    if (!demoMode || simEventIndex >= simToolEvents.length) return
    const timer = setTimeout(
      () => {
        setEvents((prev) => [...prev, simToolEvents[simEventIndex]])
        setSimEventIndex((i) => i + 1)
      },
      5000 + Math.random() * 3000
    )
    return () => clearTimeout(timer)
  }, [demoMode, simEventIndex, simToolEvents])

  // Agent state rotation
  useEffect(() => {
    if (!demoMode) return
    const timer = setInterval(() => {
      setAgentStateIdx((i) => {
        const next = (i + 1) % agentStateSequence.length
        setCurrentAgentState(agentStateSequence[next])
        return next
      })
    }, 4000)
    return () => clearInterval(timer)
  }, [demoMode])

  // Elapsed timer
  useEffect(() => {
    const timer = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  // Cart update on simulation progress
  useEffect(() => {
    if (simIndex >= 3 && cartItems.length < 3) {
      setCartItems((prev) => [
        ...prev,
        { name: "Express Car Wash", qty: 1, price: 35 },
      ])
      setDiscount(4)
    }
    if (simIndex >= 8) {
      setOrderStage(2)
    }
    if (simIndex >= 12) {
      setOrderStage(3)
    }
  }, [simIndex, cartItems.length])

  // Auto-scroll
  useEffect(() => {
    if (autoScroll && transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [transcript, autoScroll])

  const toggleEvent = (id: string) => {
    setExpandedEvents((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const formatElapsed = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, "0")}`
  }

  const cartTotal = cartItems.reduce((sum, item) => sum + item.price * item.qty, 0)

  const eventIcon = (type: string) => {
    switch (type) {
      case "sql":
        return <Database className="h-3.5 w-3.5" />
      case "rag":
        return <FileSearch className="h-3.5 w-3.5" />
      case "action":
        return <Zap className="h-3.5 w-3.5" />
      case "guardrail":
        return <Shield className="h-3.5 w-3.5" />
      case "escalation":
        return <AlertTriangle className="h-3.5 w-3.5" />
      default:
        return <Circle className="h-3.5 w-3.5" />
    }
  }

  const speakerIcon = (speaker: string) => {
    switch (speaker) {
      case "Customer":
        return <User className="h-3.5 w-3.5" />
      case "Agent":
        return <Bot className="h-3.5 w-3.5" />
      default:
        return <Monitor className="h-3.5 w-3.5" />
    }
  }

  const orderStages = ["Created", "Confirmed", "Payment Sent", "Ready", "Collected"]

  if (!call) {
    return <div className="flex items-center justify-center p-12 text-muted-foreground">Loading...</div>
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/live-calls")}
          className="gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-foreground">{call.id}</h1>
          {call.status === "active" && <LiveBadge />}
          <StatusPill status={currentAgentState} />
        </div>
        <span className="font-mono text-sm text-muted-foreground">
          {formatElapsed(elapsed)}
        </span>
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="demo-mode" className="text-xs text-muted-foreground">
              Demo Mode
            </Label>
            <Switch
              id="demo-mode"
              checked={demoMode}
              onCheckedChange={setDemoMode}
            />
          </div>
        </div>
      </div>

      {/* 4-Panel Grid */}
      <div className="grid gap-4 lg:grid-cols-5 lg:grid-rows-2">
        {/* Panel A: Live Call Transcript (top-left, 3 cols) */}
        <Card className="lg:col-span-3 lg:row-span-1 flex flex-col max-h-[480px]">
          <CardHeader className="pb-2 shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />
                Live Transcript
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={() => setAutoScroll(!autoScroll)}
                >
                  {autoScroll ? (
                    <Pause className="h-3 w-3" />
                  ) : (
                    <Play className="h-3 w-3" />
                  )}
                  {autoScroll ? "Pause scroll" : "Resume scroll"}
                </Button>
              </div>
            </div>
            {/* Caller info strip */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
              <span className="font-medium text-foreground">{call.caller}</span>
              <span>{call.phone}</span>
              <Badge variant="outline" className="text-[10px] px-1 py-0">
                {call.language}
              </Badge>
              <span>{call.station}</span>
              {call.loyaltyId && (
                <span className="text-primary font-mono">{call.loyaltyId}</span>
              )}
              {call.sentiment && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] px-1.5 py-0",
                    call.sentiment === "positive"
                      ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                      : call.sentiment === "negative"
                        ? "border-red-500/30 text-red-600 dark:text-red-400"
                        : "border-border"
                  )}
                >
                  {call.sentiment}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden pb-3">
            <ScrollArea className="h-full pr-3">
              <div className="flex flex-col gap-2">
                {transcript.map((line, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex items-start gap-2 rounded-md px-2 py-1.5 text-sm",
                      line.speaker === "System"
                        ? "bg-muted/50 font-mono text-xs text-muted-foreground"
                        : line.speaker === "Agent"
                          ? "bg-primary/5"
                          : ""
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 shrink-0",
                        line.speaker === "Agent"
                          ? "text-primary"
                          : line.speaker === "Customer"
                            ? "text-foreground"
                            : "text-muted-foreground"
                      )}
                    >
                      {speakerIcon(line.speaker)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "text-[10px] font-medium",
                            line.speaker === "Agent"
                              ? "text-primary"
                              : "text-muted-foreground"
                          )}
                        >
                          {line.speaker}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {line.timestamp}
                        </span>
                      </div>
                      <p className="leading-relaxed text-foreground">
                        {line.text}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={transcriptEndRef} />
              </div>
            </ScrollArea>
          </CardContent>
          {/* Next utterance card */}
          <div className="border-t border-border p-3 shrink-0">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold text-foreground">
                Next Utterance
              </span>
              <div className="ml-auto flex items-center gap-1">
                <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                  <Check className="h-3 w-3" />
                  Confirmed
                </span>
                <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                  <Shield className="h-3 w-3" />
                  Policy OK
                </span>
                <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                  <Check className="h-3 w-3" />
                  PII redacted
                </span>
              </div>
            </div>
            <Textarea
              value={draftResponse}
              onChange={(e) => setDraftResponse(e.target.value)}
              className="min-h-16 text-sm mb-2 resize-none"
            />
            <div className="flex items-center gap-2">
              <Button size="sm" className="h-7 gap-1 text-xs">
                <Check className="h-3 w-3" />
                Approve
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 text-xs"
              >
                <Edit3 className="h-3 w-3" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 text-xs"
              >
                <RefreshCw className="h-3 w-3" />
                Regenerate
              </Button>
              <div className="ml-auto flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled
                >
                  <Mic className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled
                >
                  <MicOff className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  disabled
                >
                  <PhoneOff className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Panel B: Tool Timeline (top-right, 2 cols) */}
        <Card className="lg:col-span-2 lg:row-span-1 flex flex-col max-h-[480px]">
          <CardHeader className="pb-2 shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Tool Timeline
              </CardTitle>
              <span className="text-[10px] text-muted-foreground">
                {events.length} events
              </span>
            </div>
            {/* Latency summary */}
            <div className="flex items-center gap-3 mt-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Database className="h-3 w-3" /> SQL avg:{" "}
                <LatencyChip ms={300} />
              </div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <FileSearch className="h-3 w-3" /> RAG avg:{" "}
                <LatencyChip ms={480} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden pb-3">
            <ScrollArea className="h-full pr-3">
              <div className="relative flex flex-col gap-0">
                {/* Vertical line */}
                <div className="absolute left-3.5 top-0 bottom-0 w-px bg-border" />
                {events.map((evt) => {
                  const isExpanded = expandedEvents.has(evt.id)
                  return (
                    <div key={evt.id} className="relative pl-9 pb-4">
                      {/* Node */}
                      <div
                        className={cn(
                          "absolute left-1.5 top-1 flex h-4 w-4 items-center justify-center rounded-full border",
                          evt.status === "success"
                            ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : evt.status === "error"
                              ? "border-red-500 bg-red-500/10 text-red-600 dark:text-red-400"
                              : "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        )}
                      >
                        {eventIcon(evt.type)}
                      </div>
                      {/* Content */}
                      <button
                        onClick={() => toggleEvent(evt.id)}
                        className="flex w-full items-center justify-between text-left"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-foreground">
                            {evt.title}
                          </span>
                          <LatencyChip ms={evt.latency} />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {evt.timestamp}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="h-3 w-3 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="mt-2 rounded-md border border-border bg-muted/30 p-3 text-xs">
                          {evt.type === "sql" && (
                            <>
                              <p className="mb-2 font-mono text-[11px] text-muted-foreground leading-relaxed bg-card p-2 rounded overflow-x-auto">
                                {String(evt.details.query)}
                              </p>
                              {Array.isArray(evt.details.rows) && (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-[10px]">
                                    <thead>
                                      <tr className="border-b border-border">
                                        {Object.keys(
                                          (evt.details.rows as Record<string, unknown>[])[0] || {}
                                        ).map((k) => (
                                          <th
                                            key={k}
                                            className="px-2 py-1 text-left font-medium text-muted-foreground"
                                          >
                                            {k}
                                          </th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {(evt.details.rows as Record<string, unknown>[]).map(
                                        (row, ri) => (
                                          <tr
                                            key={ri}
                                            className="border-b border-border/50"
                                          >
                                            {Object.values(row).map(
                                              (v, vi) => (
                                                <td
                                                  key={vi}
                                                  className="px-2 py-1 text-foreground"
                                                >
                                                  {String(v)}
                                                </td>
                                              )
                                            )}
                                          </tr>
                                        )
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                className="mt-2 h-6 text-[10px]"
                              >
                                <RefreshCw className="h-3 w-3 mr-1" />
                                Re-run query
                              </Button>
                            </>
                          )}
                          {evt.type === "rag" && (
                            <>
                              <p className="mb-2 text-muted-foreground">
                                Query: {String(evt.details.query)}
                              </p>
                              {Array.isArray(evt.details.chunks) &&
                                (
                                  evt.details.chunks as Array<{
                                    doc: string
                                    page: number
                                    text: string
                                    used: boolean
                                  }>
                                ).map((chunk, ci) => (
                                  <div
                                    key={ci}
                                    className={cn(
                                      "mb-2 rounded border p-2",
                                      chunk.used
                                        ? "border-primary/30 bg-primary/5"
                                        : "border-border bg-card"
                                    )}
                                  >
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-medium text-foreground">
                                        {chunk.doc}
                                      </span>
                                      <span className="text-muted-foreground">
                                        p.{chunk.page}
                                      </span>
                                      {chunk.used && (
                                        <Badge className="h-4 text-[9px] bg-primary/15 text-primary border-0">
                                          Used
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-muted-foreground leading-relaxed">
                                      {chunk.text}
                                    </p>
                                  </div>
                                ))}
                              <Button
                                variant="outline"
                                size="sm"
                                className="mt-1 h-6 text-[10px]"
                              >
                                <RefreshCw className="h-3 w-3 mr-1" />
                                Re-run retrieval
                              </Button>
                            </>
                          )}
                          {evt.type === "action" && (
                            <div className="flex flex-col gap-1">
                              <p className="text-muted-foreground">
                                Action:{" "}
                                <span className="font-mono text-foreground">
                                  {String(evt.details.action)}
                                </span>
                              </p>
                              <pre className="rounded bg-card p-2 text-[10px] font-mono text-muted-foreground overflow-x-auto">
                                {JSON.stringify(evt.details.payload, null, 2)}
                              </pre>
                              <Badge
                                variant="outline"
                                className="w-fit text-[10px]"
                              >
                                {String(evt.details.status)}
                              </Badge>
                            </div>
                          )}
                          {evt.type === "guardrail" && (
                            <div className="flex flex-col gap-1">
                              <p className="text-muted-foreground">
                                Check:{" "}
                                <span className="text-foreground">
                                  {String(evt.details.check)}
                                </span>
                              </p>
                              <p className="text-emerald-600 dark:text-emerald-400">
                                {String(evt.details.result)}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Panel C: Order & Upsell (bottom-left, 3 cols) */}
        <Card className="lg:col-span-3 lg:row-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-primary" />
              Order & Services
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {/* Cart */}
              <div className="flex flex-col gap-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Cart Summary
                </h3>
                <div className="rounded-lg border border-border divide-y divide-border">
                  {cartItems.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-foreground">
                          {item.name}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1 py-0"
                        >
                          x{item.qty}
                        </Badge>
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        {item.price} AED
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-3 py-2 text-xs text-muted-foreground">
                    <span>Subtotal</span>
                    <span>{cartTotal} AED</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex items-center justify-between px-3 py-2 text-xs text-emerald-600 dark:text-emerald-400">
                      <span>Bundle Discount</span>
                      <span>-{discount} AED</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between px-3 py-2 font-semibold text-foreground">
                    <span>Total</span>
                    <span>{cartTotal - discount} AED</span>
                  </div>
                </div>

                {/* Recommended add-ons */}
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-2">
                  Recommended Add-ons
                </h3>
                <div className="flex flex-col gap-2">
                  {[
                    {
                      name: "Premium Car Wash + Wax",
                      price: 65,
                      reason: "Popular pairing with food orders",
                    },
                    {
                      name: "Mixed Nuts Pack",
                      price: 10,
                      reason: "Snack bundle eligible",
                    },
                  ].map((rec, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-md border border-primary/20 bg-primary/5 px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {rec.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {rec.reason}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-foreground">
                          {rec.price} AED
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 text-[10px] gap-1"
                        >
                          <Plus className="h-3 w-3" />
                          Add
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Services & Actions */}
              <div className="flex flex-col gap-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Service Booking
                </h3>
                <Select
                  value={selectedService}
                  onValueChange={setSelectedService}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Select a service..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="car-wash">Express Car Wash</SelectItem>
                    <SelectItem value="premium-wash">
                      Premium Wash + Wax
                    </SelectItem>
                    <SelectItem value="quick-lube">Quick Lube</SelectItem>
                    <SelectItem value="ev-charge">EV Fast Charge</SelectItem>
                  </SelectContent>
                </Select>
                <div className="grid grid-cols-5 gap-1.5">
                  {timeSlotsList.map((slot) => (
                    <button
                      key={slot.time}
                      disabled={!slot.available}
                      className={cn(
                        "rounded border px-2 py-1.5 text-[10px] font-mono transition-colors",
                        slot.available
                          ? "border-border text-foreground hover:border-primary hover:bg-primary/5"
                          : "border-transparent bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                      )}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>

                {/* Primary actions */}
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-2">
                  Actions
                </h3>
                <div className="flex flex-col gap-2">
                  <Button size="sm" className="h-8 gap-2 text-xs justify-start">
                    <Send className="h-3.5 w-3.5" />
                    Send to Station POS
                  </Button>
                  <Button size="sm" className="h-8 gap-2 text-xs justify-start">
                    <Zap className="h-3.5 w-3.5" />
                    Generate Pickup Code
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-2 text-xs justify-start"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    Send Payment Link (SMS)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-2 text-xs justify-start"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Apply Loyalty Discount
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Panel D: Ops Handoff (bottom-right, 2 cols) */}
        <Card className="lg:col-span-2 lg:row-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-primary" />
              Operations & Handoff
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              {/* Order Status Tracker */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Order Pipeline
                </h3>
                <div className="flex items-center gap-1">
                  {orderStages.map((stage, i) => (
                    <div key={stage} className="flex items-center gap-1 flex-1">
                      <div
                        className={cn(
                          "flex items-center justify-center rounded-full border h-6 w-6 shrink-0",
                          i < orderStage
                            ? "border-primary bg-primary text-primary-foreground"
                            : i === orderStage
                              ? "border-primary text-primary"
                              : "border-border text-muted-foreground"
                        )}
                      >
                        {i < orderStage ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          <span className="text-[9px] font-mono">
                            {i + 1}
                          </span>
                        )}
                      </div>
                      {i < orderStages.length - 1 && (
                        <div
                          className={cn(
                            "flex-1 h-px",
                            i < orderStage ? "bg-primary" : "bg-border"
                          )}
                        />
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-1">
                  {orderStages.map((stage) => (
                    <span
                      key={stage}
                      className="text-[9px] text-muted-foreground flex-1 text-center"
                    >
                      {stage}
                    </span>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Pickup Config */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Pickup Configuration
                </h3>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">
                      Time Window
                    </Label>
                    <Select defaultValue="30">
                      <SelectTrigger className="w-32 h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
                    Station Instructions: Drive to Bay #3 for car wash.
                    Food pickup at Kiosk B.
                  </div>
                  <Textarea
                    placeholder="Staff notes..."
                    className="min-h-14 text-xs resize-none"
                  />
                </div>
              </div>

              <Separator />

              {/* Activity Log */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Activity Log
                </h3>
                <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto">
                  {[
                    {
                      time: "10:32:02",
                      action: "Call connected",
                      by: "System",
                    },
                    {
                      time: "10:32:13",
                      action: "Inventory queried",
                      by: "Agent",
                    },
                    {
                      time: "10:32:23",
                      action: "Promotion applied",
                      by: "Agent",
                    },
                    {
                      time: "10:32:24",
                      action: "Guardrail check passed",
                      by: "System",
                    },
                    {
                      time: "10:32:30",
                      action: "Customer confirmed order",
                      by: "Customer",
                    },
                  ].map((log, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-[11px]"
                    >
                      <span className="font-mono text-muted-foreground w-14 shrink-0">
                        {log.time}
                      </span>
                      <span className="text-foreground">{log.action}</span>
                      <span className="text-muted-foreground ml-auto">
                        {log.by}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Escalate Button */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-8 gap-2 text-xs w-full"
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Escalate / Handoff
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Escalate to Human Agent</SheetTitle>
                  </SheetHeader>
                  <div className="flex flex-col gap-4 mt-4">
                    <div>
                      <Label className="text-sm">Assign Agent</Label>
                      <Select>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select agent..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="agent-1">
                            Mariam K. (Available)
                          </SelectItem>
                          <SelectItem value="agent-2">
                            Rashed A. (Available)
                          </SelectItem>
                          <SelectItem value="agent-3">
                            James P. (Busy)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm">Reason</Label>
                      <Textarea
                        className="mt-1"
                        placeholder="Describe the reason for escalation..."
                      />
                    </div>
                    <div className="rounded-md bg-muted p-3">
                      <p className="text-xs font-medium text-foreground mb-1">
                        Call Summary (auto-generated)
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Customer Ahmed Al Mansouri called for food order at Al
                        Raha Beach station. Ordered Arabic Coffee + Zaatar
                        Croissant bundle (16 AED with 20% discount). Customer
                        requested car wash booking.
                      </p>
                    </div>
                    <Button className="gap-2">
                      <Send className="h-4 w-4" />
                      Send Handoff
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
