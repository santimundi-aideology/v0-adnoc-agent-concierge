import { supabase } from "@/lib/supabase/client"
import type {
  Call,
  HistoricalCall,
  TranscriptLine,
  ToolEvent,
  DashboardKPIs,
  StationAnalyticsRow,
  Document,
  WorkflowNode,
  Product,
  TimeSlot,
  CallStatus,
  AgentState,
  Language,
  Intent,
  StationSale,
  StationLoyalty,
  StationEvSession,
  StationHse,
  Customer,
  CustomerWithProfile,
  CustomerBehaviorProfile,
  StationOperationalSignal,
  ScenarioTrigger,
  AgentPromotion,
  CustomerVisit,
  CustomerVisitItem,
  CustomerVisitSummary,
  PaymentMethod,
  FuelType,
  VisitServiceCategory,
  Station,
} from "@/lib/types"

const SUPABASE_QUERY_TIMEOUT_MS = 2500

async function withSupabaseQueryTimeout<T>(
  promise: Promise<T>,
  context: string,
  timeoutMs = SUPABASE_QUERY_TIMEOUT_MS
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Supabase query timed out after ${timeoutMs}ms (${context})`))
    }, timeoutMs)
  })

  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

// ─── Stations ──────────────────────────────────────────────

export async function getStations() {
  const { data, error } = await supabase
    .from("stations")
    .select("id, name, city, region")
    .order("id")
  if (error) throw error
  return data
}

/** Full stations with operational signals (for demo preload/cache). */
export async function getStationsWithSignals(): Promise<(Station & { operational_signals: StationOperationalSignal | null })[]> {
  const { data: stationData, error: stationError } = await withSupabaseQueryTimeout(
    supabase
      .from("stations")
      .select("id, name, city, region, lat, lng, ev_charging, car_care, fnb, services, facilities, address, operating_hours, station_type")
      .order("name"),
    "getStationsWithSignals:stations"
  )
  if (stationError) throw stationError

  const { data: signalData, error: signalError } = await withSupabaseQueryTimeout(
    supabase
      .from("station_operational_signals")
      .select("*"),
    "getStationsWithSignals:station_operational_signals"
  )
  if (signalError) throw signalError

  const signalMap = new Map((signalData ?? []).map((s) => [s.station_id, s]))
  return (stationData ?? []).map((st) => ({
    ...st,
    operational_signals: (signalMap.get(st.id) as StationOperationalSignal) ?? null,
  })) as (Station & { operational_signals: StationOperationalSignal | null })[]
}

// ─── Products ──────────────────────────────────────────────

export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("sku, name, category, price, stock")
    .order("sku")
  if (error) throw error
  return data.map((p) => ({
    sku: p.sku,
    name: p.name,
    category: p.category,
    price: Number(p.price),
    stock: p.stock,
  }))
}

// ─── Time Slots ────────────────────────────────────────────

export async function getTimeSlots(stationId?: string): Promise<TimeSlot[]> {
  let query = supabase
    .from("time_slots")
    .select("time, available")
    .order("time")
  if (stationId) {
    query = query.eq("station_id", stationId)
  }
  const { data, error } = await query
  if (error) throw error
  return data.map((ts) => ({
    time: ts.time.slice(0, 5), // "09:00:00" → "09:00"
    available: ts.available,
  }))
}

// ─── Calls (Live) ──────────────────────────────────────────

export async function getCalls(): Promise<Call[]> {
  const { data, error } = await withSupabaseQueryTimeout(
    supabase
      .from("calls")
      .select("*")
      .order("start_time", { ascending: false }),
    "getCalls:calls"
  )

  if (error) throw error

  // Resolve station names in a separate query
  const stationIds = [...new Set((data ?? []).map((c) => c.station_id).filter(Boolean))]
  const { data: stations } = await withSupabaseQueryTimeout(
    supabase
      .from("stations")
      .select("id, name")
      .in("id", stationIds as string[]),
    "getCalls:stations"
  )

  const stationMap = new Map((stations ?? []).map((s) => [s.id, s.name]))

  return (data ?? []).map((c) =>
    mapCallRow(c, stationMap.get(c.station_id ?? "") ?? c.station_id ?? "")
  )
}

export async function getCallById(id: string): Promise<Call | null> {
  const { data, error } = await supabase
    .from("calls")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !data) return null

  // Get station name separately
  let stationName = data.station_id ?? ""
  if (data.station_id) {
    const { data: station } = await supabase
      .from("stations")
      .select("name")
      .eq("id", data.station_id)
      .single()
    if (station) stationName = station.name
  }

  return mapCallRow(data, stationName)
}

function mapCallRow(
  c: {
    id: string
    caller: string
    phone: string | null
    language: string
    station_id: string | null
    intent: string | null
    status: string
    agent_state: string | null
    start_time: string | null
    duration: number | null
    avg_latency: number | null
    outcome: string | null
    loyalty_id: string | null
    sentiment: string | null
  },
  stationName: string
): Call {
  return {
    id: c.id,
    caller: c.caller,
    phone: c.phone ?? "",
    language: c.language as Language,
    station: stationName,
    stationId: c.station_id ?? "",
    intent: (c.intent ?? "General Inquiry") as Intent,
    status: c.status as CallStatus,
    agentState: (c.agent_state ?? "Listening") as AgentState,
    startTime: c.start_time ?? "",
    duration: c.duration ?? 0,
    avgLatency: c.avg_latency ?? 0,
    outcome: c.outcome ?? undefined,
    loyaltyId: c.loyalty_id ?? undefined,
    sentiment: c.sentiment as Call["sentiment"],
  }
}

// ─── Historical Calls (Conversations) ──────────────────────

function formatDurationFromSeconds(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s.toString().padStart(2, "0")}s`
}

export async function getHistoricalCalls(): Promise<HistoricalCall[]> {
  const { data, error } = await withSupabaseQueryTimeout(
    supabase
      .from("calls")
      .select("*")
      .in("status", ["completed", "dropped"])
      .order("start_time", { ascending: false }),
    "getHistoricalCalls:calls"
  )

  if (error) throw error

  // Get station names
  const stationIds = [...new Set((data ?? []).map((c) => c.station_id).filter(Boolean))]
  const { data: stations } = await withSupabaseQueryTimeout(
    supabase
      .from("stations")
      .select("id, name")
      .in("id", stationIds as string[]),
    "getHistoricalCalls:stations"
  )

  const stationMap = new Map((stations ?? []).map((s) => [s.id, s.name]))

  return (data ?? []).map((c) => ({
    id: c.id,
    caller: c.caller,
    station: stationMap.get(c.station_id ?? "") ?? c.station_id ?? "",
    intent: (c.intent ?? "General Inquiry") as Intent,
    language: c.language as Language,
    date: c.start_time ? c.start_time.split("T")[0] : "",
    duration: formatDurationFromSeconds(c.duration ?? 0),
    outcome: c.outcome ?? "",
    status: c.status as CallStatus,
  }))
}

export async function getHistoricalCallById(id: string): Promise<HistoricalCall | null> {
  const { data, error } = await supabase
    .from("calls")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !data) return null

  let stationName = data.station_id ?? ""
  if (data.station_id) {
    const { data: station } = await supabase
      .from("stations")
      .select("name")
      .eq("id", data.station_id)
      .single()
    if (station) stationName = station.name
  }

  return {
    id: data.id,
    caller: data.caller,
    station: stationName,
    intent: (data.intent ?? "General Inquiry") as Intent,
    language: data.language as Language,
    date: data.start_time ? data.start_time.split("T")[0] : "",
    duration: formatDurationFromSeconds(data.duration ?? 0),
    outcome: data.outcome ?? "",
    status: data.status as CallStatus,
  }
}

// ─── Transcript Lines ──────────────────────────────────────

export async function getTranscriptLines(callId: string): Promise<TranscriptLine[]> {
  const { data, error } = await supabase
    .from("transcript_lines")
    .select("speaker, text, timestamp")
    .eq("call_id", callId)
    .order("id", { ascending: true })

  if (error) throw error
  return (data ?? []).map((t) => ({
    speaker: t.speaker as TranscriptLine["speaker"],
    text: t.text,
    timestamp: t.timestamp ?? "",
  }))
}

// ─── Tool Events ───────────────────────────────────────────

export async function getToolEvents(callId: string): Promise<ToolEvent[]> {
  const { data, error } = await supabase
    .from("tool_events")
    .select("id, type, title, timestamp, latency, status, details")
    .eq("call_id", callId)
    .order("id", { ascending: true })

  if (error) throw error
  return (data ?? []).map((e) => ({
    id: e.id,
    type: e.type as ToolEvent["type"],
    title: e.title ?? "",
    timestamp: e.timestamp ?? "",
    latency: e.latency ?? 0,
    status: (e.status ?? "success") as ToolEvent["status"],
    details: (e.details ?? {}) as Record<string, unknown>,
  }))
}

// ─── Dashboard KPIs ────────────────────────────────────────

export async function getDailyKPIs(): Promise<DashboardKPIs> {
  try {
    const { data, error } = await withSupabaseQueryTimeout(
      supabase
        .from("daily_kpis")
        .select("*")
        .order("date", { ascending: false })
        .limit(1)
        .single(),
      "getDailyKPIs:daily_kpis"
    )
    if (error || !data) {
      return {
        callsToday: 0,
        conversionRate: 0,
        avgHandleTime: "-",
        avgToolLatency: "-",
        ordersCreated: 0,
        deflectionRate: 0,
      }
    }

    return {
      callsToday: data.calls_today ?? 0,
      conversionRate: Number(data.conversion_rate ?? 0),
      avgHandleTime: data.avg_handle_time ?? "-",
      avgToolLatency: data.avg_tool_latency ?? "-",
      ordersCreated: data.orders_created ?? 0,
      deflectionRate: Number(data.deflection_rate ?? 0),
    }
  } catch {
    return {
      callsToday: 0,
      conversionRate: 0,
      avgHandleTime: "-",
      avgToolLatency: "-",
      ordersCreated: 0,
      deflectionRate: 0,
    }
  }
}

// ─── Station Analytics ─────────────────────────────────────

export async function getStationAnalytics(): Promise<StationAnalyticsRow[]> {
  const { data, error } = await withSupabaseQueryTimeout(
    supabase
      .from("station_analytics")
      .select("station_id, calls, conversion, aht, revenue")
      .order("station_id"),
    "getStationAnalytics:station_analytics"
  )

  if (error) throw error

  // Get station names
  const stationIds = (data ?? []).map((s) => s.station_id).filter(Boolean)
  const { data: stations } = await withSupabaseQueryTimeout(
    supabase
      .from("stations")
      .select("id, name")
      .in("id", stationIds as string[]),
    "getStationAnalytics:stations"
  )

  const stationMap = new Map((stations ?? []).map((s) => [s.id, s.name]))

  return (data ?? []).map((s) => ({
    station: stationMap.get(s.station_id ?? "") ?? s.station_id ?? "",
    calls: s.calls ?? 0,
    conversion: Number(s.conversion ?? 0),
    aht: s.aht ?? "-",
    revenue: Number(s.revenue ?? 0),
  }))
}

// ─── Documents ─────────────────────────────────────────────

export async function getDocuments(): Promise<Document[]> {
  const { data, error } = await withSupabaseQueryTimeout(
    supabase
      .from("documents")
      .select("id, name, type, size, chunks, last_indexed, status")
      .order("id"),
    "getDocuments:documents"
  )

  if (error) throw error
  return (data ?? []).map((d) => ({
    id: d.id,
    name: d.name,
    type: d.type ?? "PDF",
    size: d.size ?? "",
    chunks: d.chunks ?? 0,
    lastIndexed: d.last_indexed ?? "-",
    status: (d.status ?? "queued") as Document["status"],
  }))
}

// ─── Station Sales (SKU-level) ────────────────────────────

export async function getStationSales(stationIds?: string[]): Promise<StationSale[]> {
  let query = supabase
    .from("station_sales")
    .select("id, station_id, date, daypart, sku, product_name, category, qty_sold, revenue, cost, margin")
    .order("revenue", { ascending: false })

  if (stationIds && stationIds.length > 0) {
    query = query.in("station_id", stationIds)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map((s) => ({
    id: s.id,
    station_id: s.station_id,
    date: s.date,
    daypart: s.daypart as StationSale["daypart"],
    sku: s.sku,
    product_name: s.product_name,
    category: s.category,
    qty_sold: s.qty_sold ?? 0,
    revenue: Number(s.revenue ?? 0),
    cost: Number(s.cost ?? 0),
    margin: Number(s.margin ?? 0),
  }))
}

// ─── Station Loyalty ──────────────────────────────────────

export async function getStationLoyalty(stationIds?: string[]): Promise<StationLoyalty[]> {
  let query = supabase
    .from("station_loyalty")
    .select("*")
    .order("date", { ascending: false })

  if (stationIds && stationIds.length > 0) {
    query = query.in("station_id", stationIds)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map((l) => ({
    id: l.id,
    station_id: l.station_id,
    date: l.date,
    active_members: l.active_members ?? 0,
    new_signups: l.new_signups ?? 0,
    points_earned: l.points_earned ?? 0,
    points_redeemed: l.points_redeemed ?? 0,
    redemption_rate: Number(l.redemption_rate ?? 0),
    avg_basket_aed: Number(l.avg_basket_aed ?? 0),
    tier_gold: l.tier_gold ?? 0,
    tier_silver: l.tier_silver ?? 0,
    tier_bronze: l.tier_bronze ?? 0,
  }))
}

// ─── Station EV Sessions ──────────────────────────────────

export async function getStationEvSessions(stationIds?: string[]): Promise<StationEvSession[]> {
  let query = supabase
    .from("station_ev_sessions")
    .select("*")
    .order("date", { ascending: false })

  if (stationIds && stationIds.length > 0) {
    query = query.in("station_id", stationIds)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map((e) => ({
    id: e.id,
    station_id: e.station_id,
    date: e.date,
    charger_type: e.charger_type as StationEvSession["charger_type"],
    total_sessions: e.total_sessions ?? 0,
    total_kwh: Number(e.total_kwh ?? 0),
    avg_duration_min: e.avg_duration_min ?? 0,
    avg_queue_min: e.avg_queue_min ?? 0,
    utilization_pct: Number(e.utilization_pct ?? 0),
    revenue: Number(e.revenue ?? 0),
  }))
}

// ─── Station HSE ──────────────────────────────────────────

export async function getStationHse(stationIds?: string[]): Promise<StationHse[]> {
  let query = supabase
    .from("station_hse")
    .select("*")
    .order("month", { ascending: false })

  if (stationIds && stationIds.length > 0) {
    query = query.in("station_id", stationIds)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map((h) => ({
    id: h.id,
    station_id: h.station_id,
    month: h.month,
    trir: Number(h.trir ?? 0),
    ltif: Number(h.ltif ?? 0),
    near_misses: h.near_misses ?? 0,
    safety_observations: h.safety_observations ?? 0,
    audit_score_pct: Number(h.audit_score_pct ?? 0),
    training_hours: h.training_hours ?? 0,
    open_actions: h.open_actions ?? 0,
    fatalities: h.fatalities ?? 0,
  }))
}

// ─── Workflow Nodes ────────────────────────────────────────

export async function getWorkflowNodes(): Promise<WorkflowNode[]> {
  const { data, error } = await supabase
    .from("workflow_nodes")
    .select("id, label, description, confirmations, fallback")
    .order("sort_order", { ascending: true })

  if (error) throw error
  return (data ?? []).map((n) => ({
    id: n.id,
    label: n.label,
    description: n.description ?? "",
    confirmations: n.confirmations ?? [],
    fallback: n.fallback ?? "",
  }))
}

// ═══════════════════════════════════════════════════════════
// Agent Concierge Demo Queries
// ═══════════════════════════════════════════════════════════

// ─── Customers ────────────────────────────────────────────

export async function getCustomers(): Promise<Customer[]> {
  const { data, error } = await supabase
    .from("customers")
    .select("id, first_name, last_name, loyalty_tier, preferred_language, voice_enabled, created_at")
    .order("first_name")

  if (error) throw error
  return (data ?? []) as Customer[]
}

export async function getCustomerById(id: string): Promise<CustomerWithProfile | null> {
  const { data: customer, error } = await supabase
    .from("customers")
    .select("id, first_name, last_name, loyalty_tier, preferred_language, voice_enabled, created_at")
    .eq("id", id)
    .single()

  if (error || !customer) return null

  const { data: profile } = await supabase
    .from("customer_behavior_profiles")
    .select("id, customer_id, favorite_product, avg_basket_value, visits_per_week, upsell_acceptance_score, price_sensitivity_score, created_at")
    .eq("customer_id", id)
    .single()

  return {
    ...(customer as Customer),
    profile: profile
      ? {
          id: profile.id,
          customer_id: profile.customer_id,
          favorite_product: profile.favorite_product,
          avg_basket_value: Number(profile.avg_basket_value),
          visits_per_week: profile.visits_per_week,
          upsell_acceptance_score: Number(profile.upsell_acceptance_score),
          price_sensitivity_score: Number(profile.price_sensitivity_score),
          created_at: profile.created_at,
        }
      : undefined,
  }
}

/** All customers with behavior profiles (for demo preload/cache). */
export async function getCustomersWithProfiles(): Promise<CustomerWithProfile[]> {
  const { data: custData, error: custError } = await withSupabaseQueryTimeout(
    supabase
      .from("customers")
      .select("id, first_name, last_name, loyalty_tier, preferred_language, voice_enabled, created_at")
      .order("first_name"),
    "getCustomersWithProfiles:customers"
  )
  if (custError) throw custError

  const { data: profileData, error: profileError } = await withSupabaseQueryTimeout(
    supabase
      .from("customer_behavior_profiles")
      .select("*"),
    "getCustomersWithProfiles:customer_behavior_profiles"
  )
  if (profileError) throw profileError

  const profileMap = new Map((profileData ?? []).map((p) => [p.customer_id, p]))
  return (custData ?? []).map((c) => {
    const profile = profileMap.get(c.id)
    return {
      ...(c as Customer),
      profile: profile
        ? {
            id: profile.id,
            customer_id: profile.customer_id,
            favorite_product: profile.favorite_product,
            avg_basket_value: Number(profile.avg_basket_value),
            visits_per_week: profile.visits_per_week,
            upsell_acceptance_score: Number(profile.upsell_acceptance_score),
            price_sensitivity_score: Number(profile.price_sensitivity_score),
          }
        : undefined,
    }
  })
}

// ─── Station Operational Signals ─────────────────────────

export async function getStationOperationalSignals(stationId: string): Promise<StationOperationalSignal | null> {
  const { data, error } = await supabase
    .from("station_operational_signals")
    .select("*")
    .eq("station_id", stationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (error || !data) return null

  return {
    id: data.id,
    station_id: data.station_id,
    coffee_prep_time_minutes: data.coffee_prep_time_minutes,
    car_wash_queue_minutes: data.car_wash_queue_minutes,
    interior_cleaning_available: data.interior_cleaning_available,
    ev_chargers_available: data.ev_chargers_available,
    avg_ev_charge_time_minutes: data.avg_ev_charge_time_minutes,
    cold_beverage_stock_high: data.cold_beverage_stock_high,
    created_at: data.created_at,
  }
}

// ─── Scenario Triggers ───────────────────────────────────

export async function getScenarioTriggers(customerId?: string, stationId?: string): Promise<ScenarioTrigger[]> {
  let query = supabase
    .from("scenario_triggers")
    .select("id, customer_id, station_id, trigger_type, created_at")
    .order("created_at", { ascending: false })

  if (customerId) query = query.eq("customer_id", customerId)
  if (stationId) query = query.eq("station_id", stationId)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as ScenarioTrigger[]
}

// ─── Agent Promotions ────────────────────────────────────

export async function getPromotionsForStation(stationId: string): Promise<AgentPromotion[]> {
  const { data, error } = await supabase
    .from("promotions")
    .select("id, name, discount_percent, loyalty_required, station_id, product_sku, start_time, end_time, active")
    .eq("station_id", stationId)
    .eq("active", true)
    .not("discount_percent", "is", null)

  if (error) throw error

  // Resolve product names
  const skus = (data ?? []).map((p) => p.product_sku).filter(Boolean) as string[]
  const { data: products } = await supabase
    .from("products")
    .select("sku, name, price")
    .in("sku", skus)

  const productMap = new Map((products ?? []).map((p) => [p.sku, { name: p.name, price: Number(p.price) }]))

  return (data ?? []).map((p) => {
    const product = productMap.get(p.product_sku ?? "")
    return {
      id: p.id,
      name: p.name,
      discount_percent: Number(p.discount_percent ?? 0),
      loyalty_required: p.loyalty_required,
      station_id: p.station_id ?? "",
      product_sku: p.product_sku ?? "",
      product_name: product?.name,
      product_price: product?.price,
      start_time: p.start_time ?? "",
      end_time: p.end_time ?? "",
      active: p.active ?? true,
    }
  })
}

// ─── Customer Visit History ─────────────────────────────

export async function getCustomerVisits(customerId: string, limit = 12): Promise<CustomerVisit[]> {
  const { data: visits, error } = await supabase
    .from("customer_visits")
    .select("*")
    .eq("customer_id", customerId)
    .order("visited_at", { ascending: false })
    .limit(limit)

  if (error) throw error

  // Get station names
  const stationIds = [...new Set((visits ?? []).map((v) => v.station_id))]
  const { data: stations } = await supabase
    .from("stations")
    .select("id, name")
    .in("id", stationIds)
  const stationMap = new Map((stations ?? []).map((s) => [s.id, s.name]))

  // Get items for all visits
  const visitIds = (visits ?? []).map((v) => v.id)
  const { data: items } = await supabase
    .from("customer_visit_items")
    .select("*")
    .in("visit_id", visitIds)
    .order("created_at")

  const itemMap = new Map<string, CustomerVisitItem[]>()
  for (const item of items ?? []) {
    const list = itemMap.get(item.visit_id) ?? []
    list.push({
      id: item.id,
      visit_id: item.visit_id,
      product_sku: item.product_sku,
      item_name: item.item_name,
      item_category: item.item_category,
      quantity: item.quantity,
      unit_price: Number(item.unit_price),
      total_price: Number(item.total_price),
    })
    itemMap.set(item.visit_id, list)
  }

  return (visits ?? []).map((v) => ({
    id: v.id,
    customer_id: v.customer_id,
    station_id: v.station_id,
    station_name: stationMap.get(v.station_id) ?? v.station_id,
    visited_at: v.visited_at,
    total_amount: Number(v.total_amount),
    payment_method: v.payment_method as PaymentMethod,
    loyalty_points_earned: v.loyalty_points_earned,
    fuel_type: v.fuel_type as FuelType | null,
    fuel_liters: v.fuel_liters ? Number(v.fuel_liters) : null,
    ev_kwh_charged: v.ev_kwh_charged ? Number(v.ev_kwh_charged) : null,
    service_categories: (v.service_categories ?? []) as VisitServiceCategory[],
    notes: v.notes,
    items: itemMap.get(v.id) ?? [],
  }))
}

export async function getCustomerVisitSummary(customerId: string): Promise<CustomerVisitSummary> {
  const visits = await getCustomerVisits(customerId, 100) // get all

  const total_visits = visits.length
  const total_spend = visits.reduce((s, v) => s + v.total_amount, 0)
  const total_loyalty_points = visits.reduce((s, v) => s + v.loyalty_points_earned, 0)
  const avg_visit_amount = total_visits > 0 ? total_spend / total_visits : 0
  const total_fuel_liters = visits.reduce((s, v) => s + (v.fuel_liters ?? 0), 0)
  const total_ev_kwh = visits.reduce((s, v) => s + (v.ev_kwh_charged ?? 0), 0)

  // Category frequency
  const catCounts = new Map<string, number>()
  for (const v of visits) {
    for (const c of v.service_categories) {
      catCounts.set(c, (catCounts.get(c) ?? 0) + 1)
    }
  }
  const favorite_categories = [...catCounts.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)

  // Item frequency
  const itemCounts = new Map<string, number>()
  for (const v of visits) {
    for (const item of v.items ?? []) {
      if (item.item_category !== "fuel") {
        itemCounts.set(item.item_name, (itemCounts.get(item.item_name) ?? 0) + item.quantity)
      }
    }
  }
  const favorite_items = [...itemCounts.entries()]
    .map(([item, count]) => ({ item, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // Payment breakdown
  const payCounts = new Map<string, number>()
  for (const v of visits) {
    payCounts.set(v.payment_method, (payCounts.get(v.payment_method) ?? 0) + 1)
  }
  const payment_breakdown = [...payCounts.entries()]
    .map(([method, count]) => ({ method, count }))
    .sort((a, b) => b.count - a.count)

  return {
    total_visits,
    total_spend: Math.round(total_spend * 100) / 100,
    total_loyalty_points,
    avg_visit_amount: Math.round(avg_visit_amount * 100) / 100,
    total_fuel_liters: Math.round(total_fuel_liters * 100) / 100,
    total_ev_kwh: Math.round(total_ev_kwh * 100) / 100,
    favorite_categories,
    favorite_items,
    payment_breakdown,
    recent_visits: visits.slice(0, 5),
  }
}
