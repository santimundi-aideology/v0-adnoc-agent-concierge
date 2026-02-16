"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { KPIStatCard } from "@/components/shared"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getDailyKPIs, getStationAnalytics } from "@/lib/data/queries"
import type { DashboardKPIs, StationAnalyticsRow } from "@/lib/types"
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
import { BarChart3, TrendingUp, Phone, Timer, MapPin } from "lucide-react"

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

const latencyByTool = [
  { tool: "Voice ASR", avg: 180 },
  { tool: "Voice TTS", avg: 220 },
  { tool: "SQL Query", avg: 320 },
  { tool: "RAG Retrieval", avg: 480 },
  { tool: "Action Exec", avg: 150 },
  { tool: "Guardrail", avg: 45 },
]

const chartTooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "var(--radius)",
  fontSize: 12,
  color: "hsl(var(--foreground))",
}

export default function AnalyticsPage() {
  const [dashboardKPIs, setDashboardKPIs] = useState<DashboardKPIs>({
    callsToday: 0, conversionRate: 0, avgHandleTime: "-", avgToolLatency: "-", ordersCreated: 0, deflectionRate: 0,
  })
  const [stationAnalytics, setStationAnalytics] = useState<StationAnalyticsRow[]>([])

  useEffect(() => {
    getDailyKPIs().then(setDashboardKPIs).catch(console.error)
    getStationAnalytics().then(setStationAnalytics).catch(console.error)
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground text-balance">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Performance metrics and station-level insights
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <KPIStatCard title="Calls Today" value={dashboardKPIs.callsToday} change="+12% vs yesterday" trend="up" />
        <KPIStatCard title="Conversion Rate" value={`${dashboardKPIs.conversionRate}%`} change="+2.1pp" trend="up" />
        <KPIStatCard title="Avg Handle Time" value={dashboardKPIs.avgHandleTime} change="-8s vs avg" trend="up" />
        <KPIStatCard title="Avg Tool Latency" value={dashboardKPIs.avgToolLatency} change="Within SLA" trend="neutral" />
        <KPIStatCard title="Orders Created" value={dashboardKPIs.ordersCreated} change="+15% vs yesterday" trend="up" />
        <KPIStatCard title="Deflection Rate" value={`${dashboardKPIs.deflectionRate}%`} change="+1.5pp" trend="up" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary" />
              Calls Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={callsOverTime}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="time" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Line type="monotone" dataKey="calls" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))", r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Conversion Funnel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={conversionFunnel} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <YAxis type="category" dataKey="stage" tick={{ fontSize: 10 }} width={90} className="text-muted-foreground" />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {conversionFunnel.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={`hsl(216, ${100 - index * 12}%, ${36 + index * 6}%)`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Top Intents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topIntents}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="intent" tick={{ fontSize: 10 }} className="text-muted-foreground" interval={0} angle={-15} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Timer className="h-4 w-4 text-primary" />
              Avg Latency by Tool
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={latencyByTool} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} className="text-muted-foreground" unit="ms" />
                  <YAxis type="category" dataKey="tool" tick={{ fontSize: 10 }} width={90} className="text-muted-foreground" />
                  <Tooltip contentStyle={chartTooltipStyle} formatter={(value: number) => [`${value}ms`, "Avg Latency"]} />
                  <Bar dataKey="avg" radius={[0, 4, 4, 0]}>
                    {latencyByTool.map((entry) => (
                      <Cell
                        key={entry.tool}
                        fill={
                          entry.avg < 200
                            ? "hsl(var(--success))"
                            : entry.avg < 400
                              ? "hsl(var(--primary))"
                              : "hsl(var(--warning))"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Station Analytics Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            Station Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Station</TableHead>
                  <TableHead className="text-xs w-20">Calls</TableHead>
                  <TableHead className="text-xs w-28">Conversion %</TableHead>
                  <TableHead className="text-xs w-24">AHT</TableHead>
                  <TableHead className="text-xs w-28">Revenue (AED)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stationAnalytics.map((s) => (
                  <TableRow key={s.station}>
                    <TableCell className="text-sm font-medium text-foreground">{s.station}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.calls}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${s.conversion}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-12 text-right">{s.conversion}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">{s.aht}</TableCell>
                    <TableCell className="text-sm font-medium text-foreground">{s.revenue.toLocaleString()}</TableCell>
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
