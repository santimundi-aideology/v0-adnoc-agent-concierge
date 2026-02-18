"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { KPIStatCard, LiveBadge, StatusPill, LatencyChip } from "@/components/shared"
import { getDailyKPIs, getCalls } from "@/lib/data/queries"
import { useAuth } from "@/lib/supabase/auth-context"
import type { Call, DashboardKPIs } from "@/lib/types"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import { Phone, AlertTriangle, Clock, TrendingUp, ShoppingCart, ShieldCheck } from "lucide-react"

const callsOverTime = [
  { time: "06:00", calls: 8 },
  { time: "07:00", calls: 22 },
  { time: "08:00", calls: 35 },
  { time: "09:00", calls: 48 },
  { time: "10:00", calls: 42 },
  { time: "11:00", calls: 31 },
  { time: "12:00", calls: 25 },
  { time: "13:00", calls: 18 },
  { time: "14:00", calls: 28 },
  { time: "15:00", calls: 15 },
]

const conversionFunnel = [
  { stage: "Calls Received", value: 247 },
  { stage: "Intent Identified", value: 231 },
  { stage: "Product Offered", value: 198 },
  { stage: "Order Created", value: 169 },
  { stage: "Payment Sent", value: 152 },
  { stage: "Collected", value: 138 },
]

const topIntents = [
  { intent: "Order Food", count: 89 },
  { intent: "Book Car Wash", count: 52 },
  { intent: "Quick Lube", count: 38 },
  { intent: "EV Charge", count: 28 },
  { intent: "Loyalty Check", count: 24 },
  { intent: "General Inquiry", count: 16 },
]

const alerts = [
  {
    severity: "high" as const,
    message: "CALL-1003: Latency spike 1.1s on SQL query",
    time: "2 min ago",
  },
  {
    severity: "medium" as const,
    message: "RAG index for EV_Charging_Guide.pdf still running",
    time: "12 min ago",
  },
  {
    severity: "low" as const,
    message: "Station STN-005: Low coffee stock (3 units)",
    time: "25 min ago",
  },
]

export default function DashboardPage() {
  const { loading: authLoading } = useAuth()
  const [dashboardKPIs, setDashboardKPIs] = useState<DashboardKPIs>({
    callsToday: 0, conversionRate: 0, avgHandleTime: "-", avgToolLatency: "-", ordersCreated: 0, deflectionRate: 0,
  })
  const [calls, setCalls] = useState<Call[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    let cancelled = false
    setLoading(true)

    void Promise.all([getDailyKPIs(), getCalls()])
      .then(([kpis, callRows]) => {
        if (cancelled) return
        setDashboardKPIs(kpis)
        setCalls(callRows)
      })
      .catch((err) => {
        if (cancelled) return
        console.error("Failed to load dashboard data:", err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [authLoading])

  if (authLoading || loading) {
    return <div className="flex items-center justify-center p-12 text-muted-foreground">Loading...</div>
  }

  const activeCalls = calls.filter((c) => c.status === "active")

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground text-balance">
            Command Center
          </h1>
          <p className="text-sm text-muted-foreground">
            Real-time overview of voice concierge operations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <LiveBadge />
          <span className="text-xs text-muted-foreground">
            {activeCalls.length} active calls
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <KPIStatCard
          title="Calls Today"
          value={dashboardKPIs.callsToday}
          change="+12% vs yesterday"
          trend="up"
        />
        <KPIStatCard
          title="Conversion Rate"
          value={`${dashboardKPIs.conversionRate}%`}
          change="+2.1pp"
          trend="up"
        />
        <KPIStatCard
          title="Avg Handle Time"
          value={dashboardKPIs.avgHandleTime}
          change="-8s vs avg"
          trend="up"
        />
        <KPIStatCard
          title="Avg Tool Latency"
          value={dashboardKPIs.avgToolLatency}
          change="Within SLA"
          trend="neutral"
        />
        <KPIStatCard
          title="Orders Created"
          value={dashboardKPIs.ordersCreated}
          change="+15% vs yesterday"
          trend="up"
        />
        <KPIStatCard
          title="Deflection Rate"
          value={`${dashboardKPIs.deflectionRate}%`}
          change="+1.5pp"
          trend="up"
        />
      </div>

      {/* Live Activity + Alerts */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Active Calls Grid */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">
                Active Calls
              </CardTitle>
              <Link
                href="/live-calls"
                className="text-xs font-medium text-primary hover:underline"
              >
                View all
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {activeCalls.map((call) => (
                <Link
                  key={call.id}
                  href={`/live-calls/${call.id}`}
                  className="group flex flex-col gap-2 rounded-lg border border-border p-3 transition-colors hover:border-primary/40 hover:bg-accent/50"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-muted-foreground">
                      {call.id}
                    </span>
                    <LiveBadge className="scale-90" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {call.caller}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1 py-0"
                    >
                      {call.language}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{call.station}</span>
                    <span>{"/"}</span>
                    <span>{call.intent}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <StatusPill status={call.agentState} />
                    <LatencyChip ms={call.avgLatency} />
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Alerts & Exceptions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Alerts & Exceptions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {alerts.map((alert, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-md border border-border p-3"
                >
                  <div
                    className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                      alert.severity === "high"
                        ? "bg-red-500"
                        : alert.severity === "medium"
                          ? "bg-amber-500"
                          : "bg-sky-500"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground leading-relaxed">
                      {alert.message}
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {alert.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Calls Over Time */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary" />
              Calls Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={callsOverTime}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-border"
                  />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 10 }}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                      fontSize: 12,
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="calls"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))", r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Conversion Funnel */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Conversion Funnel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={conversionFunnel}
                  layout="vertical"
                  margin={{ left: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-border"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10 }}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    type="category"
                    dataKey="stage"
                    tick={{ fontSize: 9 }}
                    width={80}
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                      fontSize: 12,
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {conversionFunnel.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={`hsl(216, ${100 - index * 12}%, ${36 + index * 6}%)`}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Intents */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-primary" />
              Top Intents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topIntents}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-border"
                  />
                  <XAxis
                    dataKey="intent"
                    tick={{ fontSize: 9 }}
                    className="text-muted-foreground"
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                      fontSize: 12,
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Bar
                    dataKey="count"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
