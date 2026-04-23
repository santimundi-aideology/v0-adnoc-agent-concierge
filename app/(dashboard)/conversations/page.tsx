"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
import { StatusPill } from "@/components/shared"
import { getHistoricalCalls } from "@/lib/data/queries"
import { usePreloadCache } from "@/lib/data/preload-cache"
import { useAuth } from "@/lib/supabase/auth-context"
import type { HistoricalCall } from "@/lib/types"
import { Search, MessageSquare } from "lucide-react"

export default function ConversationsPage() {
  const { loading: authLoading } = useAuth()
  const { getCached, setCache } = usePreloadCache()
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [intentFilter, setIntentFilter] = useState("all")
  const [historicalCalls, setHistoricalCalls] = useState<HistoricalCall[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    const cached = getCached("historicalCalls")
    if (cached != null) {
      setHistoricalCalls(cached)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    void getHistoricalCalls()
      .then((rows) => {
        if (cancelled) return
        setHistoricalCalls(rows)
        setCache("historicalCalls", rows)
      })
      .catch((err) => {
        if (cancelled) return
        console.error("Failed to load conversations:", err)
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

  const filtered = historicalCalls.filter((c) => {
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
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-foreground text-balance">Conversations</h1>
        <p className="text-sm text-muted-foreground">
          Browse and replay historical voice sessions
        </p>
      </div>

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

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            {filtered.length} Conversations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs w-24">ID</TableHead>
                  <TableHead className="text-xs w-24">Date</TableHead>
                  <TableHead className="text-xs">Caller</TableHead>
                  <TableHead className="text-xs">Station</TableHead>
                  <TableHead className="text-xs">Intent</TableHead>
                  <TableHead className="text-xs w-14">Lang</TableHead>
                  <TableHead className="text-xs w-20">Duration</TableHead>
                  <TableHead className="text-xs">Outcome</TableHead>
                  <TableHead className="text-xs w-24">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((call) => (
                  <TableRow key={call.id} className="cursor-pointer hover:bg-accent/50" onClick={() => router.push(`/conversations/${call.id}`)}>
                    <TableCell className="font-mono text-xs">
                      <Link href={`/conversations/${call.id}`} className="text-primary hover:underline">
                        {call.id}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{call.date}</TableCell>
                    <TableCell className="text-sm font-medium text-foreground">{call.caller}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{call.station}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{call.intent}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] px-1 py-0">{call.language}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">{call.duration}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-40 truncate">{call.outcome}</TableCell>
                    <TableCell>
                      <StatusPill status={call.status} />
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
