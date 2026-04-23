"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { LiveBadge, StatusPill, LatencyChip } from "@/components/shared"
import { getCalls } from "@/lib/data/queries"
import { usePreloadCache } from "@/lib/data/preload-cache"
import { useAuth } from "@/lib/supabase/auth-context"
import type { Call } from "@/lib/types"
import { Search, Phone } from "lucide-react"

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s.toString().padStart(2, "0")}s`
}

export default function LiveCallsPage() {
  const { loading: authLoading } = useAuth()
  const { getCached, setCache } = usePreloadCache()
  const router = useRouter()
  const [calls, setCalls] = useState<Call[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("all")
  const [intentFilter, setIntentFilter] = useState("all")
  const [search, setSearch] = useState("")

  useEffect(() => {
    if (authLoading) return
    const cached = getCached("calls")
    if (cached != null) {
      setCalls(cached)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    void getCalls()
      .then((rows) => {
        if (cancelled) return
        setCalls(rows)
        setCache("calls", rows)
      })
      .catch((err) => {
        if (cancelled) return
        console.error("Failed to load live calls:", err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [authLoading, getCached, setCache])

  if (authLoading || loading) {
    return <div className="flex items-center justify-center p-12 text-muted-foreground">Loading...</div>
  }

  const filtered = calls.filter((c) => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false
    if (intentFilter !== "all" && c.intent !== intentFilter) return false
    if (
      search &&
      !c.caller.toLowerCase().includes(search.toLowerCase()) &&
      !c.id.toLowerCase().includes(search.toLowerCase())
    )
      return false
    return true
  })

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground text-balance">Live Calls</h1>
          <p className="text-sm text-muted-foreground">
            Monitor and manage active voice sessions
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <LiveBadge />
          <span className="text-xs text-muted-foreground">
            {calls.filter((c) => c.status === "active").length} active
          </span>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative min-w-0 w-full flex-1 sm:min-w-[12rem]">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by caller or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-8 text-sm"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-full text-sm sm:w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="ringing">Ringing</SelectItem>
                <SelectItem value="on-hold">On Hold</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="dropped">Dropped</SelectItem>
              </SelectContent>
            </Select>
            <Select value={intentFilter} onValueChange={setIntentFilter}>
              <SelectTrigger className="h-9 w-full text-sm sm:w-40">
                <SelectValue placeholder="Intent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Intents</SelectItem>
                <SelectItem value="Order Food">Order Food</SelectItem>
                <SelectItem value="Book Car Wash">Book Car Wash</SelectItem>
                <SelectItem value="Quick Lube">Quick Lube</SelectItem>
                <SelectItem value="EV Charge">EV Charge</SelectItem>
                <SelectItem value="Loyalty Check">Loyalty Check</SelectItem>
                <SelectItem value="General Inquiry">General Inquiry</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Calls Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Phone className="h-4 w-4 text-primary" />
            {filtered.length} Calls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs w-24">ID</TableHead>
                  <TableHead className="text-xs">Caller</TableHead>
                  <TableHead className="text-xs w-14">Lang</TableHead>
                  <TableHead className="text-xs">Station</TableHead>
                  <TableHead className="text-xs">Intent</TableHead>
                  <TableHead className="text-xs w-28">Status</TableHead>
                  <TableHead className="text-xs w-20">Duration</TableHead>
                  <TableHead className="text-xs w-20">Latency</TableHead>
                  <TableHead className="text-xs">Outcome</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((call) => (
                  <TableRow
                    key={call.id}
                    className="cursor-pointer hover:bg-accent/50"
                    onClick={() => router.push(`/live-calls/${call.id}`)}
                  >
                    <TableCell className="font-mono text-xs">
                      <Link
                        href={`/live-calls/${call.id}`}
                        className="text-primary hover:underline"
                      >
                        {call.id}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">
                          {call.caller}
                        </span>
                        {call.status === "active" && (
                          <LiveBadge className="scale-75" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] px-1 py-0">
                        {call.language}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {call.station}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {call.intent}
                    </TableCell>
                    <TableCell>
                      <StatusPill status={call.agentState} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {formatDuration(call.duration)}
                    </TableCell>
                    <TableCell>
                      <LatencyChip ms={call.avgLatency} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-32 truncate">
                      {call.outcome || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
