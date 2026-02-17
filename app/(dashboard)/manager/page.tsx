"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import dynamic from "next/dynamic"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/supabase/auth-context"
import { useRouter } from "next/navigation"
import { AgentChatWidget, type StationDataContext } from "@/components/agent-chat-widget"
import { ADNOC_MISSING_DIMENSIONS, ADNOC_REPORT_2024_METRICS } from "@/lib/data/adnoc-insights"
import type { MapStation } from "@/components/station-map"
import type { StationSale, StationLoyalty, StationEvSession, StationHse } from "@/lib/types"
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  Phone,
  Target,
  Download,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Loader2,
  MapPin,
  X,
  Activity,
  Search,
  Filter,
  Calendar,
  ShoppingCart,
  Star,
  Zap,
  ShieldCheck,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  ReferenceLine,
  LabelList,
} from "recharts"

function withTimeout<T>(promise: Promise<T>, ms = 2000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => reject(new Error(`Supabase request timed out after ${ms}ms`)), ms)
    promise
      .then((value) => {
        clearTimeout(timeoutId)
        resolve(value)
      })
      .catch((error) => {
        clearTimeout(timeoutId)
        reject(error)
      })
  })
}

function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && error.message.toLowerCase().includes("timed out")
}

async function withRetry<T>(task: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await task()
    } catch (error) {
      lastError = error
      const shouldRetry = attempt < attempts && isTimeoutError(error)
      if (!shouldRetry) break
      await new Promise((resolve) => setTimeout(resolve, 200 * attempt))
    }
  }
  throw lastError
}

/* ── Dynamic Leaflet map (SSR disabled) ── */

const StationMap = dynamic(() => import("@/components/station-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center rounded-lg bg-muted/30">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  ),
})

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface StationAnalytics {
  id: number
  station_id: string
  date: string
  calls: number
  conversion: number
  aht: string
  revenue: number
}

interface Station {
  id: string
  name: string
  city: string
  region: string
  lat: number | null
  lng: number | null
  station_number?: number
  address?: string
  station_type?: string
  services?: string[]
  fuel_types?: string[]
  ev_charging?: boolean
  car_care?: string[]
  fnb?: string[]
  shop?: string[]
  facilities?: string[]
  operating_hours?: string
}

interface DailyKpi {
  id: number
  date: string
  calls_today: number
  conversion_rate: number
  avg_handle_time: string
  avg_tool_latency: string
  orders_created: number
  deflection_rate: number
}

interface CallRecord {
  id: string
  station_id: string
  intent: string
  status: string
  duration: number
  avg_latency: number
  sentiment: string
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const CHART_COLORS = [
  "hsl(216, 100%, 50%)",
  "hsl(216, 80%, 60%)",
  "hsl(216, 60%, 70%)",
  "hsl(142, 71%, 45%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 84%, 60%)",
]

const CHART_TOOLTIP_STYLE = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: 12,
  color: "hsl(var(--foreground))",
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    maximumFractionDigits: 0,
  }).format(amount)
}

function ahtToSeconds(aht: string): number {
  const match = aht.match(/(\d+)m\s*(\d+)s/)
  if (!match) return 0
  return parseInt(match[1]) * 60 + parseInt(match[2])
}

/* ------------------------------------------------------------------ */
/*  CSV / PDF Export                                                    */
/* ------------------------------------------------------------------ */

function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}

async function downloadPdf(
  title: string,
  headers: string[],
  rows: string[][],
  kpi: DailyKpi | null
) {
  const { jsPDF } = await import("jspdf")
  const autoTable = (await import("jspdf-autotable")).default
  const doc = new jsPDF()
  doc.setFontSize(18)
  doc.setTextColor(0, 51, 153)
  doc.text(title, 14, 22)
  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30)
  if (kpi) {
    doc.setFontSize(12)
    doc.setTextColor(0, 0, 0)
    doc.text("Daily KPI Summary", 14, 42)
    doc.setFontSize(10)
    doc.text(`Total Calls: ${kpi.calls_today ?? 0}`, 14, 50)
    doc.text(`Conversion Rate: ${kpi.conversion_rate ?? 0}%`, 14, 56)
    doc.text(`Avg Handle Time: ${kpi.avg_handle_time ?? "-"}`, 100, 50)
    doc.text(`Orders Created: ${kpi.orders_created ?? 0}`, 100, 56)
  }
  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: kpi ? 65 : 38,
    theme: "striped",
    headStyles: { fillColor: [0, 51, 153] },
    styles: { fontSize: 9 },
  })
  doc.save(`${title.replace(/\s+/g, "_").toLowerCase()}.pdf`)
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function ManagerOverviewPage() {
  const { profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  /* ── Raw data state ── */
  const [allAnalytics, setAllAnalytics] = useState<StationAnalytics[]>([])
  const [stations, setStations] = useState<Station[]>([])
  const [dailyKpi, setDailyKpi] = useState<DailyKpi | null>(null)
  const [allCalls, setAllCalls] = useState<CallRecord[]>([])
  const [allSales, setAllSales] = useState<StationSale[]>([])
  const [allLoyalty, setAllLoyalty] = useState<StationLoyalty[]>([])
  const [allEv, setAllEv] = useState<StationEvSession[]>([])
  const [allHse, setAllHse] = useState<StationHse[]>([])
  const [loading, setLoading] = useState(true)

  /* ── Station selection ── */
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  /* ── Filters ── */
  const [searchQuery, setSearchQuery] = useState("")
  const [regionFilter, setRegionFilter] = useState<string>("all")
  const [dateRange, setDateRange] = useState<"today" | "7d" | "30d" | "all">("all")
  const [intentFilter, setIntentFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [sentimentFilter, setSentimentFilter] = useState<string>("all")

  const toggleStation = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectAll = useCallback(
    (stationIds: Set<string>) => setSelectedIds(new Set(stationIds)),
    []
  )

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  /* ── Auth guard ── */
  useEffect(() => {
    if (!authLoading && profile && !["manager", "admin"].includes(profile.role)) {
      router.push("/dashboard")
    }
  }, [authLoading, profile, router])

  /* ── Fetch data ── */
  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      try {
        const [analyticsRes, stationsRes, kpiRes, callsRes, salesRes, loyaltyRes, evRes, hseRes] = await withRetry(
          () =>
            withTimeout(
              Promise.all([
                supabase.from("station_analytics").select("*").order("revenue", { ascending: false }),
                supabase.from("stations").select("*"),
                supabase.from("daily_kpis").select("*").order("date", { ascending: false }).limit(1),
                supabase.from("calls").select("id, station_id, intent, status, duration, avg_latency, sentiment"),
                supabase.from("station_sales").select("*").order("revenue", { ascending: false }),
                supabase.from("station_loyalty").select("*").order("date", { ascending: false }),
                supabase.from("station_ev_sessions").select("*").order("date", { ascending: false }),
                supabase.from("station_hse").select("*").order("month", { ascending: false }),
              ]),
              2000
            )
        )

        if (cancelled) return

        if (analyticsRes.data) {
          setAllAnalytics(
            analyticsRes.data.map((d) => ({
              id: d.id,
              station_id: d.station_id ?? "",
              date: d.date,
              calls: d.calls ?? 0,
              conversion: Number(d.conversion ?? 0),
              aht: d.aht ?? "0m 0s",
              revenue: Number(d.revenue ?? 0),
            }))
          )
        }
        if (stationsRes.data) setStations(stationsRes.data as Station[])
        if (kpiRes.data?.[0]) {
          const k = kpiRes.data[0]
          setDailyKpi({
            id: k.id,
            date: k.date,
            calls_today: k.calls_today ?? 0,
            conversion_rate: Number(k.conversion_rate ?? 0),
            avg_handle_time: k.avg_handle_time ?? "-",
            avg_tool_latency: k.avg_tool_latency ?? "-",
            orders_created: k.orders_created ?? 0,
            deflection_rate: Number(k.deflection_rate ?? 0),
          })
        }
        if (callsRes.data) {
          setAllCalls(
            callsRes.data.map((c) => ({
              id: c.id,
              station_id: c.station_id ?? "",
              intent: c.intent ?? "",
              status: c.status,
              duration: c.duration ?? 0,
              avg_latency: c.avg_latency ?? 0,
              sentiment: c.sentiment ?? "neutral",
            }))
          )
        }
        if (salesRes.data) {
          setAllSales(salesRes.data.map((s: Record<string, unknown>) => ({
            id: s.id as number, station_id: s.station_id as string, date: s.date as string,
            daypart: s.daypart as StationSale["daypart"], sku: s.sku as string,
            product_name: s.product_name as string, category: s.category as string,
            qty_sold: (s.qty_sold as number) ?? 0, revenue: Number(s.revenue ?? 0),
            cost: Number(s.cost ?? 0), margin: Number(s.margin ?? 0),
          })))
        }
        if (loyaltyRes.data) {
          setAllLoyalty(loyaltyRes.data.map((l: Record<string, unknown>) => ({
            id: l.id as number, station_id: l.station_id as string, date: l.date as string,
            active_members: (l.active_members as number) ?? 0, new_signups: (l.new_signups as number) ?? 0,
            points_earned: (l.points_earned as number) ?? 0, points_redeemed: (l.points_redeemed as number) ?? 0,
            redemption_rate: Number(l.redemption_rate ?? 0), avg_basket_aed: Number(l.avg_basket_aed ?? 0),
            tier_gold: (l.tier_gold as number) ?? 0, tier_silver: (l.tier_silver as number) ?? 0,
            tier_bronze: (l.tier_bronze as number) ?? 0,
          })))
        }
        if (evRes.data) {
          setAllEv(evRes.data.map((e: Record<string, unknown>) => ({
            id: e.id as number, station_id: e.station_id as string, date: e.date as string,
            charger_type: e.charger_type as StationEvSession["charger_type"],
            total_sessions: (e.total_sessions as number) ?? 0, total_kwh: Number(e.total_kwh ?? 0),
            avg_duration_min: (e.avg_duration_min as number) ?? 0, avg_queue_min: (e.avg_queue_min as number) ?? 0,
            utilization_pct: Number(e.utilization_pct ?? 0), revenue: Number(e.revenue ?? 0),
          })))
        }
        if (hseRes.data) {
          setAllHse(hseRes.data.map((h: Record<string, unknown>) => ({
            id: h.id as number, station_id: h.station_id as string, month: h.month as string,
            trir: Number(h.trir ?? 0), ltif: Number(h.ltif ?? 0),
            near_misses: (h.near_misses as number) ?? 0, safety_observations: (h.safety_observations as number) ?? 0,
            audit_score_pct: Number(h.audit_score_pct ?? 0), training_hours: (h.training_hours as number) ?? 0,
            open_actions: (h.open_actions as number) ?? 0, fatalities: (h.fatalities as number) ?? 0,
          })))
        }
        setLoading(false)
      } catch (err) {
        if (cancelled) return
        console.error("Failed to fetch manager data:", err)
        setLoading(false)
      }
    }
    fetchData()

    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Station map for lookups ── */
  const stationMap = useMemo(
    () => Object.fromEntries(stations.map((s) => [s.id, s])),
    [stations]
  )

  /* ── Filtered data (region + search + selected stations + date + call filters) ── */

  const uniqueRegions = useMemo(() => {
    const regions = new Set(stations.map((s) => s.region).filter(Boolean))
    return Array.from(regions).sort()
  }, [stations])

  const uniqueIntents = useMemo(() => {
    const intents = new Set(allCalls.map((c) => c.intent).filter(Boolean))
    return Array.from(intents).sort()
  }, [allCalls])

  const uniqueStatuses = useMemo(() => {
    const statuses = new Set(allCalls.map((c) => c.status).filter(Boolean))
    return Array.from(statuses).sort()
  }, [allCalls])

  const effectiveStationIds = useMemo(() => {
    let ids = new Set(stations.map((s) => s.id))
    if (regionFilter !== "all") {
      ids = new Set(stations.filter((s) => s.region === regionFilter).map((s) => s.id))
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      ids = new Set(
        Array.from(ids).filter((id) => {
          const s = stationMap[id]
          return s?.name?.toLowerCase().includes(q) || s?.city?.toLowerCase().includes(q)
        })
      )
    }
    if (selectedIds.size > 0) {
      ids = new Set(Array.from(ids).filter((id) => selectedIds.has(id)))
    }
    return ids
  }, [stations, regionFilter, searchQuery, selectedIds, stationMap])

  const isFiltered =
    selectedIds.size > 0 || regionFilter !== "all" || searchQuery.trim() !== ""

  const dateRangeBounds = useMemo(() => {
    const now = new Date()
    const today = now.toISOString().slice(0, 10)
    if (dateRange === "today") return { start: today, end: today }
    if (dateRange === "7d") {
      const d = new Date(now)
      d.setDate(d.getDate() - 6)
      return { start: d.toISOString().slice(0, 10), end: today }
    }
    if (dateRange === "30d") {
      const d = new Date(now)
      d.setDate(d.getDate() - 29)
      return { start: d.toISOString().slice(0, 10), end: today }
    }
    return null
  }, [dateRange])

  const stationAnalytics = useMemo(() => {
    let data = allAnalytics.filter((sa) => effectiveStationIds.has(sa.station_id))
    if (dateRangeBounds) {
      data = data.filter(
        (sa) => sa.date >= dateRangeBounds!.start && sa.date <= dateRangeBounds!.end
      )
      const byStation = new Map<string, StationAnalytics[]>()
      for (const row of data) {
        if (!byStation.has(row.station_id)) byStation.set(row.station_id, [])
        byStation.get(row.station_id)!.push(row)
      }
      data = Array.from(byStation.entries()).map(([station_id, rows]) => {
        const totalCalls = rows.reduce((s, r) => s + r.calls, 0)
        const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0)
        const avgConversion =
          rows.length > 0 ? rows.reduce((s, r) => s + r.conversion, 0) / rows.length : 0
        const totalAhtSec = rows.reduce((s, r) => s + ahtToSeconds(r.aht), 0)
        const avgAhtSec = rows.length > 0 ? totalAhtSec / rows.length : 0
        const m = Math.floor(avgAhtSec / 60)
        const sec = Math.round(avgAhtSec % 60)
        return {
          id: rows[0]!.id,
          station_id,
          date: rows[0]!.date,
          calls: totalCalls,
          conversion: avgConversion,
          aht: `${m}m ${sec}s`,
          revenue: totalRevenue,
        }
      })
    }
    return data
  }, [allAnalytics, effectiveStationIds, dateRangeBounds])

  const calls = useMemo(() => {
    let data = allCalls.filter((c) => effectiveStationIds.has(c.station_id))
    if (intentFilter !== "all") data = data.filter((c) => c.intent === intentFilter)
    if (statusFilter !== "all") data = data.filter((c) => c.status === statusFilter)
    if (sentimentFilter !== "all") data = data.filter((c) => c.sentiment === sentimentFilter)
    return data
  }, [allCalls, effectiveStationIds, intentFilter, statusFilter, sentimentFilter])

  /* ── Filtered enriched data ── */

  const filteredSales = useMemo(
    () => allSales.filter((s) => effectiveStationIds.has(s.station_id)),
    [allSales, effectiveStationIds]
  )

  const filteredLoyalty = useMemo(
    () => allLoyalty.filter((l) => effectiveStationIds.has(l.station_id)),
    [allLoyalty, effectiveStationIds]
  )

  const filteredEv = useMemo(
    () => allEv.filter((e) => effectiveStationIds.has(e.station_id)),
    [allEv, effectiveStationIds]
  )

  const filteredHse = useMemo(
    () => allHse.filter((h) => effectiveStationIds.has(h.station_id)),
    [allHse, effectiveStationIds]
  )

  /* ── Sales derived ── */
  const topProducts = useMemo(() => {
    const byProduct = new Map<string, { name: string; category: string; qty: number; revenue: number; margin: number }>()
    for (const s of filteredSales) {
      const existing = byProduct.get(s.sku) || { name: s.product_name, category: s.category, qty: 0, revenue: 0, margin: 0 }
      existing.qty += s.qty_sold
      existing.revenue += s.revenue
      existing.margin += s.margin
      byProduct.set(s.sku, existing)
    }
    return Array.from(byProduct.entries())
      .map(([sku, d]) => ({ sku, ...d, marginPct: d.revenue > 0 ? Math.round((d.margin / d.revenue) * 100) : 0 }))
      .sort((a, b) => b.revenue - a.revenue)
  }, [filteredSales])

  const salesByDaypart = useMemo(() => {
    const dp: Record<string, { revenue: number; qty: number }> = { morning: { revenue: 0, qty: 0 }, afternoon: { revenue: 0, qty: 0 }, evening: { revenue: 0, qty: 0 } }
    for (const s of filteredSales) { dp[s.daypart].revenue += s.revenue; dp[s.daypart].qty += s.qty_sold }
    return Object.entries(dp).map(([name, d]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), ...d }))
  }, [filteredSales])

  const totalSalesRevenue = useMemo(() => filteredSales.reduce((s, r) => s + r.revenue, 0), [filteredSales])
  const totalSalesMargin = useMemo(() => filteredSales.reduce((s, r) => s + r.margin, 0), [filteredSales])

  /* ── Loyalty derived ── */
  const loyaltyTotals = useMemo(() => {
    const t = { members: 0, signups: 0, earned: 0, redeemed: 0, avgBasket: 0, gold: 0, silver: 0, bronze: 0 }
    for (const l of filteredLoyalty) {
      t.members += l.active_members; t.signups += l.new_signups
      t.earned += l.points_earned; t.redeemed += l.points_redeemed
      t.avgBasket += l.avg_basket_aed; t.gold += l.tier_gold
      t.silver += l.tier_silver; t.bronze += l.tier_bronze
    }
    if (filteredLoyalty.length > 0) t.avgBasket = t.avgBasket / filteredLoyalty.length
    return t
  }, [filteredLoyalty])

  /* ── EV derived ── */
  const evTotals = useMemo(() => {
    const t = { sessions: 0, kwh: 0, revenue: 0, avgUtil: 0, avgQueue: 0 }
    for (const e of filteredEv) {
      t.sessions += e.total_sessions; t.kwh += e.total_kwh
      t.revenue += e.revenue; t.avgUtil += e.utilization_pct
      t.avgQueue += e.avg_queue_min
    }
    if (filteredEv.length > 0) { t.avgUtil = t.avgUtil / filteredEv.length; t.avgQueue = t.avgQueue / filteredEv.length }
    return t
  }, [filteredEv])

  /* ── HSE derived (latest month) ── */
  const hseSummary = useMemo(() => {
    const latest = filteredHse.filter((_, i, arr) => {
      const maxMonth = arr.reduce((m, h) => h.month > m ? h.month : m, "")
      return arr[i].month === maxMonth
    })
    if (latest.length === 0) return null
    const t = { avgAudit: 0, totalNearMisses: 0, totalObs: 0, totalTraining: 0, openActions: 0, fatalities: 0, avgTrir: 0 }
    for (const h of latest) {
      t.avgAudit += h.audit_score_pct; t.totalNearMisses += h.near_misses
      t.totalObs += h.safety_observations; t.totalTraining += h.training_hours
      t.openActions += h.open_actions; t.fatalities += h.fatalities; t.avgTrir += h.trir
    }
    t.avgAudit /= latest.length; t.avgTrir /= latest.length
    return { ...t, stationCount: latest.length, month: latest[0].month }
  }, [filteredHse])

  /* ── Chat data context ── */
  const chatDataContext = useMemo<StationDataContext>(() => ({
    topProducts: topProducts.slice(0, 10).map((p) => ({ name: p.name, revenue: p.revenue, margin: p.margin, qty: p.qty })),
    loyaltySummary: filteredLoyalty.length > 0
      ? { members: loyaltyTotals.members, signups: loyaltyTotals.signups, redemptionRate: loyaltyTotals.earned > 0 ? Math.round((loyaltyTotals.redeemed / loyaltyTotals.earned) * 100) : 0, avgBasket: loyaltyTotals.avgBasket }
      : undefined,
    evSummary: filteredEv.length > 0
      ? { sessions: evTotals.sessions, kwh: evTotals.kwh, avgUtil: evTotals.avgUtil, revenue: evTotals.revenue, avgQueue: evTotals.avgQueue }
      : undefined,
    hseSummary: hseSummary
      ? { avgAudit: hseSummary.avgAudit, trir: hseSummary.avgTrir, fatalities: hseSummary.fatalities, openActions: hseSummary.openActions, nearMisses: hseSummary.totalNearMisses }
      : undefined,
  }), [topProducts, filteredLoyalty, loyaltyTotals, filteredEv, evTotals, hseSummary])

  /* ── Map stations with analytics overlay ── */
  const mapStations: MapStation[] = useMemo(() => {
    const analyticsLookup = Object.fromEntries(allAnalytics.map((a) => [a.station_id, a]))
    return stations
      .filter((s) => s.lat != null && s.lng != null)
      .map((s) => ({
        id: s.id,
        name: s.name,
        city: s.city,
        region: s.region,
        lat: s.lat!,
        lng: s.lng!,
        revenue: analyticsLookup[s.id]?.revenue,
        calls: analyticsLookup[s.id]?.calls,
        station_number: s.station_number,
        ev_charging: s.ev_charging,
        services: s.services,
      }))
  }, [stations, allAnalytics])

  /* ── Derived KPIs (filtered) ── */

  const totalRevenue = useMemo(
    () => stationAnalytics.reduce((sum, s) => sum + s.revenue, 0),
    [stationAnalytics]
  )

  const totalCalls = useMemo(
    () => stationAnalytics.reduce((sum, s) => sum + s.calls, 0),
    [stationAnalytics]
  )

  const avgConversion = useMemo(() => {
    if (stationAnalytics.length === 0) return 0
    return stationAnalytics.reduce((sum, s) => sum + s.conversion, 0) / stationAnalytics.length
  }, [stationAnalytics])

  const avgAht = useMemo(() => {
    if (stationAnalytics.length === 0) return "0m 0s"
    const totalSec =
      stationAnalytics.reduce((sum, s) => sum + ahtToSeconds(s.aht), 0) / stationAnalytics.length
    const m = Math.floor(totalSec / 60)
    const sec = Math.round(totalSec % 60)
    return `${m}m ${sec}s`
  }, [stationAnalytics])

  const slaCompliance = useMemo(() => {
    if (calls.length === 0) return 0
    const underTarget = calls.filter((c) => c.avg_latency < 1000).length
    return Math.round((underTarget / calls.length) * 100)
  }, [calls])

  const sentimentData = useMemo(() => {
    const counts = { positive: 0, neutral: 0, negative: 0 }
    calls.forEach((c) => {
      if (c.sentiment === "positive") counts.positive++
      else if (c.sentiment === "negative") counts.negative++
      else counts.neutral++
    })
    return [
      { name: "Positive", value: counts.positive, color: "hsl(142, 71%, 45%)" },
      { name: "Neutral", value: counts.neutral, color: "hsl(216, 80%, 60%)" },
      { name: "Negative", value: counts.negative, color: "hsl(0, 84%, 60%)" },
    ]
  }, [calls])

  /* ── Chart data (filtered) ── */

  const comparisonChartData = useMemo(
    () =>
      stationAnalytics.map((sa) => ({
        name: stationMap[sa.station_id]?.name || sa.station_id || "Unknown",
        revenue: sa.revenue,
        calls: sa.calls,
        conversion: sa.conversion,
      })),
    [stationAnalytics, stationMap]
  )

  const revenueChartData = useMemo(() => {
    const total = totalRevenue || 1
    return [...comparisonChartData]
      .sort((a, b) => b.revenue - a.revenue)
      .map((d) => ({
        ...d,
        pctTotal: total > 0 ? Math.round((d.revenue / total) * 100) : 0,
      }))
  }, [comparisonChartData, totalRevenue])

  const avgRevenue = useMemo(() => {
    if (revenueChartData.length === 0) return 0
    return totalRevenue / revenueChartData.length
  }, [revenueChartData.length, totalRevenue])

  /* ── Sorted table ── */

  const [sortCol, setSortCol] = useState<"calls" | "conversion" | "revenue" | "aht">("revenue")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  const sortedStations = useMemo(() => {
    return [...stationAnalytics].sort((a, b) => {
      let aVal: number, bVal: number
      if (sortCol === "aht") {
        aVal = ahtToSeconds(a.aht)
        bVal = ahtToSeconds(b.aht)
      } else {
        aVal = Number(a[sortCol])
        bVal = Number(b[sortCol])
      }
      return sortDir === "desc" ? bVal - aVal : aVal - bVal
    })
  }, [stationAnalytics, sortCol, sortDir])

  const handleSort = (col: typeof sortCol) => {
    if (sortCol === col) setSortDir(sortDir === "desc" ? "asc" : "desc")
    else { setSortCol(col); setSortDir("desc") }
  }

  const bestStation = sortedStations.length > 0 ? sortedStations[0] : null
  const worstStation = sortedStations.length > 1 ? sortedStations[sortedStations.length - 1] : null

  /* ── Export handlers ── */

  function exportStationCsv() {
    downloadCsv(
      "station_analytics.csv",
      ["Station", "City", "Region", "Calls", "Conversion %", "AHT", "Revenue (AED)"],
      sortedStations.map((sa) => {
        const s = stationMap[sa.station_id]
        return [s?.name || "", s?.city || "", s?.region || "", String(sa.calls), String(sa.conversion), sa.aht, String(sa.revenue)]
      })
    )
  }

  function exportPdfReport() {
    downloadPdf(
      "ADNOC Manager Report",
      ["Station", "Calls", "Conversion %", "AHT", "Revenue (AED)"],
      sortedStations.map((sa) => [
        stationMap[sa.station_id]?.name || sa.station_id, String(sa.calls), String(sa.conversion), sa.aht, String(sa.revenue),
      ]),
      dailyKpi
    )
  }

  /* ── Loading / auth guard ── */

  if (authLoading || loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!profile || !["manager", "admin"].includes(profile.role)) {
    return null
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""

  /* ── Render ── */

  return (
    <div className="flex flex-col gap-6">
      {/* ──────────────── Header ──────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manager Overview</h1>
          <p className="text-sm text-muted-foreground">
            Interactive station map, analytics, and AI-powered insights
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={exportStationCsv}>
            <Download className="h-3.5 w-3.5" />
            CSV
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={exportPdfReport}>
            <FileText className="h-3.5 w-3.5" />
            PDF
          </Button>
          <Badge variant="outline" className="text-xs">
            {new Date().toLocaleDateString("en-AE", { weekday: "short", month: "short", day: "numeric" })}
          </Badge>
        </div>
      </div>

      {/* ──────────────── Filters ──────────────── */}
      <Card className="border-dashed">
        <CardContent className="py-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Filter className="h-4 w-4" />
              <span className="text-xs font-medium">Filters</span>
            </div>
            <div className="h-6 w-px bg-border" />
            <div className="relative flex-1 min-w-[180px] max-w-[240px]">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search stations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
            <Select value={regionFilter} onValueChange={setRegionFilter}>
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <SelectValue placeholder="Region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All regions</SelectItem>
                {uniqueRegions.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as typeof dateRange)}>
              <SelectTrigger className="h-8 w-[130px] text-xs">
                <Calendar className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
            <div className="h-6 w-px bg-border" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Calls</span>
            <Select value={intentFilter} onValueChange={setIntentFilter}>
              <SelectTrigger className="h-8 w-[130px] text-xs">
                <SelectValue placeholder="Intent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All intents</SelectItem>
                {uniqueIntents.map((i) => (
                  <SelectItem key={i} value={i}>
                    {i || "(empty)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-[120px] text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {uniqueStatuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
              <SelectTrigger className="h-8 w-[120px] text-xs">
                <SelectValue placeholder="Sentiment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sentiment</SelectItem>
                <SelectItem value="positive">Positive</SelectItem>
                <SelectItem value="neutral">Neutral</SelectItem>
                <SelectItem value="negative">Negative</SelectItem>
              </SelectContent>
            </Select>
            {(searchQuery || regionFilter !== "all" || dateRange !== "all" || intentFilter !== "all" || statusFilter !== "all" || sentimentFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground"
                onClick={() => {
                  setSearchQuery("")
                  setRegionFilter("all")
                  setDateRange("all")
                  setIntentFilter("all")
                  setStatusFilter("all")
                  setSentimentFilter("all")
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ──────────────── Station filter chips ──────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <MapPin className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">
          {effectiveStationIds.size} station{effectiveStationIds.size !== 1 ? "s" : ""} in view
          {isFiltered && ` (${selectedIds.size} selected on map)`}
        </span>
        {isFiltered && (
          <>
            {Array.from(selectedIds).map((id) => {
              const s = stationMap[id]
              return (
                <Badge
                  key={id}
                  variant="secondary"
                  className="gap-1 text-xs cursor-pointer hover:bg-destructive/10"
                  onClick={() => toggleStation(id)}
                >
                  {s?.name || id}
                  <X className="h-3 w-3" />
                </Badge>
              )
            })}
            <Button variant="ghost" size="sm" className="h-6 text-[10px] text-muted-foreground" onClick={clearSelection}>
              Clear all
            </Button>
          </>
        )}
        {effectiveStationIds.size > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] text-muted-foreground"
            onClick={() => selectAll(effectiveStationIds)}
          >
            Select all in view
          </Button>
        )}
      </div>

      {/* ──────────────── Interactive Map ──────────────── */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="h-[400px]">
            <StationMap
              stations={mapStations}
              selectedIds={selectedIds}
              onToggleStation={toggleStation}
            />
          </div>
        </CardContent>
      </Card>

      {/* ──────────────── KPI Cards ──────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Revenue</CardTitle>
            <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(totalRevenue)}</div>
            <p className="text-[10px] text-muted-foreground">{stationAnalytics.length} stations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Total Calls</CardTitle>
            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{totalCalls}</div>
            <p className="text-[10px] text-muted-foreground">{dailyKpi?.orders_created || 0} orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Conversion</CardTitle>
            <Target className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{avgConversion.toFixed(1)}%</div>
            <p className="text-[10px] text-muted-foreground">avg across selection</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Avg Handle Time</CardTitle>
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{avgAht}</div>
            <p className="text-[10px] text-muted-foreground">latency: {dailyKpi?.avg_tool_latency || "N/A"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">SLA Compliance</CardTitle>
            <Activity className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{slaCompliance}%</div>
            <p className={`text-[10px] ${slaCompliance >= 80 ? "text-emerald-500" : "text-amber-500"}`}>
              {slaCompliance >= 80 ? "On target" : "Below target"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Sentiment</CardTitle>
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {sentimentData[0].value}
              </span>
              <span className="text-xs text-muted-foreground">/ {calls.length}</span>
            </div>
            <p className="text-[10px] text-muted-foreground">positive calls</p>
          </CardContent>
        </Card>
      </div>

      {/* ──────────────── Strategic ADNOC Context ──────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Strategic ADNOC 2024 context</CardTitle>
            <CardDescription>
              Annual report signals to complement station-level operational KPIs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {ADNOC_REPORT_2024_METRICS.slice(0, 9).map((m) => (
                <div key={m.id} className="rounded-lg border border-border bg-muted/20 p-2.5">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {m.label}
                  </div>
                  <div className="mt-1 text-sm font-semibold">{m.value}</div>
                  {(m.yoy || m.note) && (
                    <div className="mt-0.5 text-[10px] text-muted-foreground">
                      {[m.yoy, m.note].filter(Boolean).join(" · ")}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Data to add next</CardTitle>
            <CardDescription>
              Highest-value dimensions not yet in this dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {ADNOC_MISSING_DIMENSIONS.slice(0, 4).map((d) => (
              <div key={d.id} className="rounded-md border border-border p-2">
                <p className="text-xs font-medium">{d.title}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">{d.whyItMatters}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ──────────────── Charts Row ──────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Revenue by Station */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Revenue by Station</CardTitle>
            <CardDescription>
              {revenueChartData.length} stations · {formatCurrency(totalRevenue)} total
              {dateRange !== "all" && ` · ${dateRange === "today" ? "Today" : dateRange === "7d" ? "Last 7 days" : "Last 30 days"}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={revenueChartData}
                  layout="vertical"
                  margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
                >
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="hsl(216, 70%, 55%)" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="hsl(216, 90%, 45%)" stopOpacity={1} />
                    </linearGradient>
                    <linearGradient id="revenueGradientDim" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="hsl(216, 50%, 70%)" stopOpacity={0.7} />
                      <stop offset="100%" stopColor="hsl(216, 60%, 60%)" stopOpacity={0.8} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis
                    type="number"
                    tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={120}
                    tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.[0]?.payload) return null
                      const d = payload[0].payload
                      return (
                        <div className="rounded-lg border bg-card px-3 py-2.5 text-sm shadow-lg">
                          <div className="font-semibold text-foreground">{d.name}</div>
                          <div className="mt-1.5 space-y-1 text-muted-foreground">
                            <div className="flex justify-between gap-4">
                              <span>Revenue</span>
                              <span className="font-medium text-foreground">{formatCurrency(d.revenue)}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span>Share of total</span>
                              <span className="font-medium text-foreground">{d.pctTotal}%</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span>Calls</span>
                              <span>{d.calls}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span>Conversion</span>
                              <span>{d.conversion.toFixed(1)}%</span>
                            </div>
                          </div>
                        </div>
                      )
                    }}
                  />
                  <ReferenceLine
                    x={avgRevenue}
                    stroke="hsl(var(--muted-foreground))"
                    strokeDasharray="4 4"
                    strokeOpacity={0.6}
                    label={{ value: "Avg", position: "right", fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  />
                  <Bar dataKey="revenue" radius={[0, 6, 6, 0]} barSize={20}>
                    {revenueChartData.map((entry, idx) => (
                      <Cell
                        key={idx}
                        fill={entry.revenue >= avgRevenue ? "url(#revenueGradient)" : "url(#revenueGradientDim)"}
                      />
                    ))}
                    <LabelList
                      dataKey="revenue"
                      position="right"
                      formatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v)}
                      fontSize={10}
                      fill="hsl(var(--muted-foreground))"
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Calls & Conversion */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Calls &amp; Conversion</CardTitle>
            <CardDescription>Performance comparison across stations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={50} />
                  <YAxis yAxisId="left" orientation="left" tickFormatter={(v) => `${v}%`} />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Bar yAxisId="left" dataKey="conversion" fill="hsl(142, 71%, 45%)" name="Conversion %" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="calls" fill="hsl(216, 80%, 60%)" name="Calls" radius={[4, 4, 0, 0]} />
                  <Legend />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ──────────────── Sentiment Pie + Best/Worst ──────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Sentiment */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Customer Sentiment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sentimentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {sentimentData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Best Performer */}
        {bestStation && (
          <Card className="border-emerald-500/30">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                <CardTitle className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  Best Performer
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {stationMap[bestStation.station_id]?.name || bestStation.station_id}
              </div>
              <div className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Revenue</span>
                  <span className="font-medium">{formatCurrency(bestStation.revenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Calls</span>
                  <span className="font-medium">{bestStation.calls}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Conversion</span>
                  <span className="font-medium">{bestStation.conversion}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">AHT</span>
                  <span className="font-medium">{bestStation.aht}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Worst Performer */}
        {worstStation && (
          <Card className="border-amber-500/30">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-amber-500" />
                <CardTitle className="text-sm font-medium text-amber-600 dark:text-amber-400">
                  Needs Improvement
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {stationMap[worstStation.station_id]?.name || worstStation.station_id}
              </div>
              <div className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Revenue</span>
                  <span className="font-medium">{formatCurrency(worstStation.revenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Calls</span>
                  <span className="font-medium">{worstStation.calls}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Conversion</span>
                  <span className="font-medium">{worstStation.conversion}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">AHT</span>
                  <span className="font-medium">{worstStation.aht}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ──────────────── Sales Mix & Daypart ──────────────── */}
      {topProducts.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-orange-500" />
                Top Products by Revenue
              </CardTitle>
              <CardDescription>
                {formatCurrency(totalSalesRevenue)} revenue · {formatCurrency(totalSalesMargin)} margin ({totalSalesRevenue > 0 ? Math.round((totalSalesMargin / totalSalesRevenue) * 100) : 0}%)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Product</TableHead>
                      <TableHead className="text-xs">Category</TableHead>
                      <TableHead className="text-xs text-right">Qty</TableHead>
                      <TableHead className="text-xs text-right">Revenue</TableHead>
                      <TableHead className="text-xs text-right">Margin %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topProducts.slice(0, 8).map((p) => (
                      <TableRow key={p.sku}>
                        <TableCell className="text-sm font-medium">{p.name}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{p.category}</Badge></TableCell>
                        <TableCell className="text-right text-sm">{p.qty}</TableCell>
                        <TableCell className="text-right text-sm font-medium">{formatCurrency(p.revenue)}</TableCell>
                        <TableCell className="text-right">
                          <span className={p.marginPct >= 50 ? "text-emerald-600 dark:text-emerald-400 text-sm" : "text-amber-600 dark:text-amber-400 text-sm"}>
                            {p.marginPct}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Revenue by Daypart</CardTitle>
              <CardDescription>Morning / Afternoon / Evening split</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesByDaypart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                      contentStyle={CHART_TOOLTIP_STYLE}
                    />
                    <Bar dataKey="revenue" fill="hsl(38, 92%, 50%)" name="Revenue" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ──────────────── Loyalty & EV ──────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Loyalty */}
        {filteredLoyalty.length > 0 && (
          <Card className="border-purple-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Star className="h-4 w-4 text-purple-500" />
                ADNOC Rewards Loyalty
              </CardTitle>
              <CardDescription>
                {loyaltyTotals.members.toLocaleString()} active members across selection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-2.5">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">New Signups</div>
                  <div className="text-lg font-bold mt-0.5">{loyaltyTotals.signups}</div>
                </div>
                <div className="rounded-lg border p-2.5">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Avg Basket</div>
                  <div className="text-lg font-bold mt-0.5">{formatCurrency(loyaltyTotals.avgBasket)}</div>
                </div>
                <div className="rounded-lg border p-2.5">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Points Earned</div>
                  <div className="text-lg font-bold mt-0.5">{(loyaltyTotals.earned / 1000).toFixed(0)}k</div>
                </div>
                <div className="rounded-lg border p-2.5">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Redemption Rate</div>
                  <div className="text-lg font-bold mt-0.5">
                    {loyaltyTotals.earned > 0 ? Math.round((loyaltyTotals.redeemed / loyaltyTotals.earned) * 100) : 0}%
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  <span className="text-[10px] text-muted-foreground">Gold {loyaltyTotals.gold}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                  <span className="text-[10px] text-muted-foreground">Silver {loyaltyTotals.silver}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-700" />
                  <span className="text-[10px] text-muted-foreground">Bronze {loyaltyTotals.bronze}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* EV */}
        {filteredEv.length > 0 && (
          <Card className="border-emerald-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4 text-emerald-500" />
                EV Charging (E²GO)
              </CardTitle>
              <CardDescription>
                {evTotals.sessions} sessions · {evTotals.kwh.toFixed(0)} kWh delivered
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-2.5">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Revenue</div>
                  <div className="text-lg font-bold mt-0.5">{formatCurrency(evTotals.revenue)}</div>
                </div>
                <div className="rounded-lg border p-2.5">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Avg Utilization</div>
                  <div className="text-lg font-bold mt-0.5">
                    <span className={evTotals.avgUtil >= 60 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>
                      {evTotals.avgUtil.toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div className="rounded-lg border p-2.5">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Avg Queue Time</div>
                  <div className="text-lg font-bold mt-0.5">{evTotals.avgQueue.toFixed(0)} min</div>
                </div>
                <div className="rounded-lg border p-2.5">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">kWh / Session</div>
                  <div className="text-lg font-bold mt-0.5">
                    {evTotals.sessions > 0 ? (evTotals.kwh / evTotals.sessions).toFixed(1) : 0}
                  </div>
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>Charger types in view</span>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      Fast: {filteredEv.filter((e) => e.charger_type === "fast").length} stations
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      Super-fast: {filteredEv.filter((e) => e.charger_type === "super_fast").length} stations
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ──────────────── HSE Safety ──────────────── */}
      {hseSummary && (
        <Card className="border-blue-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-blue-500" />
              Health, Safety &amp; Environment
            </CardTitle>
            <CardDescription>
              {hseSummary.stationCount} stations · {hseSummary.month ? new Date(hseSummary.month).toLocaleDateString("en-AE", { month: "long", year: "numeric" }) : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
              <div className="rounded-lg border p-2.5">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">TRIR</div>
                <div className="text-lg font-bold mt-0.5">
                  <span className={hseSummary.avgTrir === 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>
                    {hseSummary.avgTrir.toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="rounded-lg border p-2.5">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Fatalities</div>
                <div className="text-lg font-bold mt-0.5 text-emerald-600 dark:text-emerald-400">{hseSummary.fatalities}</div>
              </div>
              <div className="rounded-lg border p-2.5">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Avg Audit</div>
                <div className="text-lg font-bold mt-0.5">{hseSummary.avgAudit.toFixed(1)}%</div>
              </div>
              <div className="rounded-lg border p-2.5">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Near Misses</div>
                <div className="text-lg font-bold mt-0.5">{hseSummary.totalNearMisses}</div>
              </div>
              <div className="rounded-lg border p-2.5">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Observations</div>
                <div className="text-lg font-bold mt-0.5">{hseSummary.totalObs}</div>
              </div>
              <div className="rounded-lg border p-2.5">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Training Hrs</div>
                <div className="text-lg font-bold mt-0.5">{hseSummary.totalTraining}</div>
              </div>
              <div className="rounded-lg border p-2.5">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Open Actions</div>
                <div className="text-lg font-bold mt-0.5">
                  <span className={hseSummary.openActions === 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>
                    {hseSummary.openActions}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ──────────────── Station Ranking Table ──────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Station Ranking</CardTitle>
              <CardDescription>Click column headers to sort &middot; Best/worst highlighted</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>Station</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead className="cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort("calls")}>
                    Calls {sortCol === "calls" && (sortDir === "desc" ? "\u2193" : "\u2191")}
                  </TableHead>
                  <TableHead className="cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort("conversion")}>
                    Conversion {sortCol === "conversion" && (sortDir === "desc" ? "\u2193" : "\u2191")}
                  </TableHead>
                  <TableHead className="cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort("aht")}>
                    AHT {sortCol === "aht" && (sortDir === "desc" ? "\u2193" : "\u2191")}
                  </TableHead>
                  <TableHead className="cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort("revenue")}>
                    Revenue {sortCol === "revenue" && (sortDir === "desc" ? "\u2193" : "\u2191")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedStations.map((sa, idx) => {
                  const s = stationMap[sa.station_id]
                  const isBest = idx === 0 && sortDir === "desc"
                  const isWorst = idx === sortedStations.length - 1 && sortDir === "desc" && sortedStations.length > 1
                  return (
                    <TableRow
                      key={sa.id}
                      className={isBest ? "bg-emerald-500/5" : isWorst ? "bg-amber-500/5" : ""}
                    >
                      <TableCell className="font-medium text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="font-medium">
                        {s?.name || sa.station_id}
                        {isBest && <ArrowUpRight className="ml-1 inline h-3 w-3 text-emerald-500" />}
                        {isWorst && <ArrowDownRight className="ml-1 inline h-3 w-3 text-amber-500" />}
                      </TableCell>
                      <TableCell>{s?.city || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{s?.region || "-"}</Badge>
                      </TableCell>
                      <TableCell>{sa.calls}</TableCell>
                      <TableCell>
                        <span className={sa.conversion >= avgConversion ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>
                          {sa.conversion}%
                        </span>
                      </TableCell>
                      <TableCell>{sa.aht}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(sa.revenue)}</TableCell>
                    </TableRow>
                  )
                })}
                {/* Summary row */}
                <TableRow className="bg-muted/50 font-medium">
                  <TableCell colSpan={4}>Total / Average</TableCell>
                  <TableCell>{totalCalls}</TableCell>
                  <TableCell>{avgConversion.toFixed(1)}%</TableCell>
                  <TableCell>{avgAht}</TableCell>
                  <TableCell>{formatCurrency(totalRevenue)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ──────────────── AI Chat Widget ──────────────── */}
      <AgentChatWidget
        stationIds={Array.from(selectedIds)}
        supabaseUrl={supabaseUrl}
        dataContext={chatDataContext}
      />
    </div>
  )
}
