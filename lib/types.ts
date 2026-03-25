// App-level types used across components and pages
// These correspond to the domain model and are used for display purposes

export type CallStatus = "active" | "ringing" | "on-hold" | "completed" | "dropped"
export type AgentState = "Listening" | "Speaking" | "Querying DB" | "Retrieving Doc" | "Confirming" | "Processing"
export type Language = "EN" | "AR"
export type Intent = "Order Food" | "Book Car Wash" | "Quick Lube" | "General Inquiry" | "Loyalty Check" | "EV Charge"

export interface Call {
  id: string
  caller: string
  phone: string
  language: Language
  station: string
  stationId: string
  intent: Intent
  status: CallStatus
  agentState: AgentState
  startTime: string
  duration: number
  avgLatency: number
  outcome?: string
  loyaltyId?: string
  sentiment?: "positive" | "neutral" | "negative"
}

export interface HistoricalCall {
  id: string
  caller: string
  station: string
  intent: Intent
  language: Language
  date: string
  duration: string
  outcome: string
  status: CallStatus
}

export interface TranscriptLine {
  speaker: "Customer" | "Agent" | "System"
  text: string
  timestamp: string
}

export interface ToolEvent {
  id: string
  type: "sql" | "rag" | "action" | "guardrail" | "escalation"
  title: string
  timestamp: string
  latency: number
  status: "success" | "pending" | "error"
  details: Record<string, unknown>
}

export interface DashboardKPIs {
  callsToday: number
  conversionRate: number
  avgHandleTime: string
  avgToolLatency: string
  ordersCreated: number
  deflectionRate: number
}

export interface StationAnalyticsRow {
  station: string
  calls: number
  conversion: number
  aht: string
  revenue: number
}

export interface Document {
  id: string
  name: string
  type: string
  size: string
  chunks: number
  lastIndexed: string
  status: "complete" | "running" | "queued"
}

export interface WorkflowNode {
  id: string
  label: string
  description: string
  confirmations: string[]
  fallback: string
}

export interface AgentWorkflow {
  id: string
  name: string
  intent: Intent
  description: string
  icon: string // lucide icon name
  color: string // tailwind color token e.g. "blue", "emerald"
  status: "published" | "draft" | "archived"
  version: string
  nodes: WorkflowNode[]
}

export interface Product {
  sku: string
  name: string
  category: string
  price: number
  stock: number
  margin_percent?: number
  active?: boolean
}

/* ── Agent Concierge Demo types ── */

export type LoyaltyTier = "silver" | "gold" | "platinum"
export type TriggerType = "arrival" | "fueling_started" | "ev_charging_started"

export interface Customer {
  id: string
  first_name: string
  last_name: string
  loyalty_tier: LoyaltyTier
  preferred_language: "en" | "ar"
  voice_enabled: boolean
  created_at?: string
}

export interface CustomerBehaviorProfile {
  id: string
  customer_id: string
  favorite_product: string
  avg_basket_value: number
  visits_per_week: number
  upsell_acceptance_score: number
  price_sensitivity_score: number
  created_at?: string
}

export interface CustomerDemoLocation {
  label: string
  lat: number
  lng: number
}

export interface CustomerWithProfile extends Customer {
  profile?: CustomerBehaviorProfile
  demo_location?: CustomerDemoLocation
}

export interface StationOperationalSignal {
  id: string
  station_id: string
  coffee_prep_time_minutes: number
  car_wash_queue_minutes: number
  interior_cleaning_available: boolean
  ev_chargers_available: number
  avg_ev_charge_time_minutes: number
  cold_beverage_stock_high: boolean
  approach_traffic_minutes?: number | null
  created_at?: string
}

export interface ScenarioTrigger {
  id: string
  customer_id: string
  station_id: string
  trigger_type: TriggerType
  created_at?: string
}

export interface AgentPromotion {
  id: string
  name: string
  discount_percent: number
  loyalty_required: string | null
  station_id: string
  product_sku: string
  product_name?: string
  product_price?: number
  start_time: string
  end_time: string
  active: boolean
}

export interface ConversationMessage {
  role: "customer" | "agent" | "system"
  text: string
  timestamp: string
}

export interface AgentAction {
  type: "order_sent_to_pos" | "car_wash_reserved" | "interior_team_dispatched" | "ev_charge_monitored" | "loyalty_points_applied" | "coffee_preparing" | "recommendation"
  label: string
  detail: string
  timestamp: string
}

/* ── Customer Visit History ── */

export type PaymentMethod = "cash" | "card" | "adnoc_wallet" | "apple_pay"
export type FuelType = "super_98" | "special_95" | "eplus_91" | "diesel"
export type VisitServiceCategory =
  | "fuel"
  | "ev_charging"
  | "coffee"
  | "food"
  | "beverages"
  | "car_wash"
  | "car_care"
  | "interior_cleaning"
  | "shop"

export interface CustomerVisit {
  id: string
  customer_id: string
  station_id: string
  station_name?: string
  visited_at: string
  total_amount: number
  payment_method: PaymentMethod
  loyalty_points_earned: number
  fuel_type: FuelType | null
  fuel_liters: number | null
  ev_kwh_charged: number | null
  service_categories: VisitServiceCategory[]
  notes: string | null
  items?: CustomerVisitItem[]
}

export interface CustomerVisitItem {
  id: string
  visit_id: string
  product_sku: string | null
  item_name: string
  item_category: string
  quantity: number
  unit_price: number
  total_price: number
}

export interface CustomerVisitSummary {
  total_visits: number
  total_spend: number
  total_loyalty_points: number
  avg_visit_amount: number
  total_fuel_liters: number
  total_ev_kwh: number
  favorite_categories: { category: string; count: number }[]
  favorite_items: { item: string; count: number }[]
  payment_breakdown: { method: string; count: number }[]
  recent_visits: CustomerVisit[]
}

export interface TimeSlot {
  time: string
  available: boolean
}

/* ── Station extended fields ── */

export interface Station {
  id: string
  name: string
  city: string
  region: string
  lat: number
  lng: number
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

/* ── Enriched station data ── */

export interface StationSale {
  id: number
  station_id: string
  date: string
  daypart: "morning" | "afternoon" | "evening"
  sku: string
  product_name: string
  category: string
  qty_sold: number
  revenue: number
  cost: number
  margin: number
}

export interface StationLoyalty {
  id: number
  station_id: string
  date: string
  active_members: number
  new_signups: number
  points_earned: number
  points_redeemed: number
  redemption_rate: number
  avg_basket_aed: number
  tier_gold: number
  tier_silver: number
  tier_bronze: number
}

export interface StationEvSession {
  id: number
  station_id: string
  date: string
  charger_type: "fast" | "super_fast"
  total_sessions: number
  total_kwh: number
  avg_duration_min: number
  avg_queue_min: number
  utilization_pct: number
  revenue: number
}

export interface StationHse {
  id: number
  station_id: string
  month: string
  trir: number
  ltif: number
  near_misses: number
  safety_observations: number
  audit_score_pct: number
  training_hours: number
  open_actions: number
  fatalities: number
}
