"use client"

import { use, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { StatusPill, LatencyChip } from "@/components/shared"
import { getHistoricalCallById, getTranscriptLines, getToolEvents } from "@/lib/data/queries"
import { useAuth } from "@/lib/supabase/auth-context"
import type { HistoricalCall, TranscriptLine, ToolEvent } from "@/lib/types"
import {
  ArrowLeft,
  User,
  Bot,
  Monitor,
  Database,
  FileSearch,
  Zap,
  Shield,
  Download,
  Flag,
  Phone,
  CheckCircle2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

const speakerIcon = (speaker: string) => {
  switch (speaker) {
    case "Customer": return <User className="h-3.5 w-3.5" />
    case "Agent": return <Bot className="h-3.5 w-3.5" />
    default: return <Monitor className="h-3.5 w-3.5" />
  }
}

const eventIcon = (type: string) => {
  switch (type) {
    case "sql": return <Database className="h-3.5 w-3.5" />
    case "rag": return <FileSearch className="h-3.5 w-3.5" />
    case "action": return <Zap className="h-3.5 w-3.5" />
    case "guardrail": return <Shield className="h-3.5 w-3.5" />
    default: return <Zap className="h-3.5 w-3.5" />
  }
}

export default function ConversationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { loading: authLoading } = useAuth()
  const [call, setCall] = useState<HistoricalCall | null>(null)
  const [allTranscript, setAllTranscript] = useState<TranscriptLine[]>([])
  const [allEvents, setAllEvents] = useState<ToolEvent[]>([])
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    if (authLoading) return
    let cancelled = false
    setLoadingData(true)

    void Promise.all([getHistoricalCallById(id), getTranscriptLines(id), getToolEvents(id)])
      .then(([callData, transcript, events]) => {
        if (cancelled) return
        if (callData) setCall(callData)
        setAllTranscript(transcript)
        setAllEvents(events)
      })
      .catch((err) => {
        if (cancelled) return
        console.error("Failed to load conversation detail:", err)
      })
      .finally(() => {
        if (!cancelled) setLoadingData(false)
      })

    return () => {
      cancelled = true
    }
  }, [id, authLoading])

  if (authLoading || loadingData) {
    return <div className="flex items-center justify-center p-12 text-muted-foreground">Loading...</div>
  }

  if (!call) {
    return <div className="flex items-center justify-center p-12 text-muted-foreground">Conversation not found.</div>
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push("/conversations")} className="gap-1">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Separator orientation="vertical" className="hidden h-6 sm:block" />
          <h1 className="truncate text-lg font-bold text-foreground">{call.id}</h1>
          <StatusPill status={call.status} />
          <Badge variant="outline" className="text-xs">
            {call.language}
          </Badge>
          <span className="text-sm text-muted-foreground">{call.date}</span>
          <span className="font-mono text-sm text-muted-foreground">{call.duration}</span>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto sm:justify-end">
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
            <Download className="h-3 w-3" />
            Export
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                <Flag className="h-3 w-3" />
                Flag for Review
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Flag Conversation for Review</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-3 mt-2">
                <Textarea placeholder="Describe the issue or reason for flagging..." />
                <Button>Submit Flag</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <span className="text-xs text-muted-foreground">Caller</span>
              <p className="font-medium text-foreground">{call.caller}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Station</span>
              <p className="font-medium text-foreground">{call.station}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Intent</span>
              <p className="font-medium text-foreground">{call.intent}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Outcome</span>
              <p className="font-medium text-foreground">{call.outcome}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transcript + Events */}
      <div className="grid min-w-0 gap-4 lg:grid-cols-5">
        {/* Full Transcript */}
        <Card className="min-w-0 lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary" />
              Full Transcript
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96 pr-3">
              <div className="flex flex-col gap-2">
                {allTranscript.map((line, i) => (
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
                    <span className={cn(
                      "mt-0.5 shrink-0",
                      line.speaker === "Agent" ? "text-primary" : line.speaker === "Customer" ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {speakerIcon(line.speaker)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn("text-[10px] font-medium", line.speaker === "Agent" ? "text-primary" : "text-muted-foreground")}>
                          {line.speaker}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">{line.timestamp}</span>
                      </div>
                      <p className="leading-relaxed text-foreground">{line.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Events */}
        <Card className="min-w-0 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Tool Events ({allEvents.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96 pr-3">
              <div className="relative flex flex-col gap-0">
                <div className="absolute left-3.5 top-0 bottom-0 w-px bg-border" />
                {allEvents.map((evt) => (
                  <div key={evt.id} className="relative pl-9 pb-4">
                    <div className={cn(
                      "absolute left-1.5 top-1 flex h-4 w-4 items-center justify-center rounded-full border",
                      evt.status === "success"
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "border-red-500 bg-red-500/10 text-red-600 dark:text-red-400"
                    )}>
                      {eventIcon(evt.type)}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-foreground">{evt.title}</span>
                      <LatencyChip ms={evt.latency} />
                      <span className="text-[10px] font-mono text-muted-foreground ml-auto">{evt.timestamp}</span>
                    </div>
                    <div className="mt-1 rounded-md border border-border bg-muted/30 p-2 text-xs">
                      {evt.type === "sql" && (
                        <p className="font-mono text-[10px] text-muted-foreground truncate">{String(evt.details.query)}</p>
                      )}
                      {evt.type === "rag" && (
                        <p className="text-muted-foreground">Query: {String(evt.details.query)}</p>
                      )}
                      {evt.type === "action" && (
                        <p className="text-muted-foreground">
                          <span className="font-mono text-foreground">{String(evt.details.action)}</span> - {String(evt.details.status)}
                        </p>
                      )}
                      {evt.type === "guardrail" && (
                        <p className="text-emerald-600 dark:text-emerald-400">{String(evt.details.result)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Outcome Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            Outcome Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground mb-1">Order Items</p>
              <p className="text-sm font-medium text-foreground">Arabic Coffee + Zaatar Croissant (16 AED)</p>
              <p className="text-sm font-medium text-foreground">Express Car Wash (35 AED)</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground mb-1">Booking</p>
              <p className="text-sm font-medium text-foreground">Car Wash - 11:00 AM</p>
              <p className="text-xs text-muted-foreground">Bay #3, Al Raha Beach</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground mb-1">Actions Taken</p>
              <p className="text-sm font-medium text-foreground">SMS Payment Link sent</p>
              <p className="text-sm font-medium text-foreground">Pickup Code: ADNOC-7823</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
