import OpenAI from "openai"

import { createDirectClient } from "@/lib/supabase/direct-client"
import { logBackendError, logBackendInfo } from "@/lib/voice-backend/logger"

export type ExpressDemoChatRequest = {
  customer_id: string
  station_id: string
  customer_name?: string
  customer_first_name?: string
  customer_last_name?: string
  loyalty_tier?: string
  trigger_type?: string
  available_triggers?: string[]
  distance_km?: number | null
  message: string
  conversation_history?: Array<{ role?: string; text?: string }>
  express_demo_context?: Record<string, unknown> | null
  express_demo_context_json?: string | null
}

export type ExpressDemoChatAction = {
  type: string
  label: string
  detail: string
}

export type ExpressDemoChatResponse = {
  reply: string
  actions: ExpressDemoChatAction[]
}

type VisitItem = {
  item_category?: string | null
  item_name?: string | null
  quantity?: number | null
}

type VisitRow = {
  total_amount?: number | null
  fuel_liters?: number | null
  ev_kwh_charged?: number | null
  service_categories?: string[] | null
  customer_visit_items?: VisitItem[] | null
}

type CustomerRow = {
  first_name: string
  last_name: string
  loyalty_tier: string
}

type CustomerProfileRow = {
  favorite_product: string
  avg_basket_value: number
  visits_per_week: number
  upsell_acceptance_score: number
  price_sensitivity_score: number
}

type StationRow = {
  id: string
  name: string
  city: string
  car_care: string[] | null
  ev_charging: boolean | null
}

type SignalsRow = {
  coffee_prep_time_minutes: number
  car_wash_queue_minutes: number
  interior_cleaning_available: boolean
  ev_chargers_available: number
  avg_ev_charge_time_minutes: number
  cold_beverage_stock_high: boolean
}

type ProductRow = {
  sku: string
  name: string
  price: number
  category: string
}

type PromotionRow = {
  name: string
  discount_percent: number | null
  product_sku: string | null
  loyalty_required: string | null
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function runExpressDemoChat(request: ExpressDemoChatRequest): Promise<ExpressDemoChatResponse> {
  const payload = normalizeRequest(request)
  const context = await loadContext(payload)
  if (!context.station) {
    throw Object.assign(new Error("Station not found"), { statusCode: 404 })
  }
  const customer = context.customer ?? buildFallbackCustomer(payload)

  const systemPrompt = buildSystemPrompt({
    customer,
    profile: context.profile,
    station: context.station,
    signals: context.signals,
    products: context.products,
    promotions: context.promotions,
    visits: context.visits,
    distanceKm: payload.distance_km ?? null,
    triggerType: payload.trigger_type ?? "",
    availableTriggers: payload.available_triggers ?? [],
  })

  const messages = buildMessages(systemPrompt, payload.conversation_history ?? [], payload.message)
  const completion = await openai.chat.completions.create({
    model: "gpt-5.4-nano",
    temperature: 0.7,
    max_tokens: 250,
    messages,
  })

  const fullReply = completion.choices?.[0]?.message?.content ?? "I could not generate a response."
  return extractActions(fullReply)
}

function normalizeRequest(input: ExpressDemoChatRequest): ExpressDemoChatRequest {
  return {
    customer_id: String(input.customer_id ?? "").trim(),
    station_id: String(input.station_id ?? "").trim(),
    customer_name: input.customer_name ? String(input.customer_name).trim() : undefined,
    customer_first_name: input.customer_first_name ? String(input.customer_first_name).trim() : undefined,
    customer_last_name: input.customer_last_name ? String(input.customer_last_name).trim() : undefined,
    loyalty_tier: input.loyalty_tier ? String(input.loyalty_tier).trim() : undefined,
    trigger_type: input.trigger_type ? String(input.trigger_type) : undefined,
    available_triggers: Array.isArray(input.available_triggers)
      ? input.available_triggers.map((v) => String(v))
      : undefined,
    distance_km: typeof input.distance_km === "number" ? input.distance_km : null,
    message: String(input.message ?? "").trim(),
    conversation_history: Array.isArray(input.conversation_history) ? input.conversation_history : [],
    express_demo_context:
      input.express_demo_context && typeof input.express_demo_context === "object"
        ? input.express_demo_context
        : null,
    express_demo_context_json: input.express_demo_context_json ? String(input.express_demo_context_json) : null,
  }
}

function buildMessages(
  systemPrompt: string,
  history: Array<{ role?: string; text?: string }>,
  message: string
): Array<{ role: "system" | "user" | "assistant"; content: string }> {
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: systemPrompt },
  ]
  for (const msg of history) {
    const text = typeof msg.text === "string" ? msg.text.trim() : ""
    if (!text) continue
    messages.push({
      role: msg.role === "customer" ? "user" : "assistant",
      content: text,
    })
  }
  messages.push({ role: "user", content: message })
  return messages
}

async function loadContext(request: ExpressDemoChatRequest) {
  const supabase = createDirectClient() as any
  const customerIdIsUuid = isUuid(request.customer_id)
  const [customerRes, profileRes, stationRes, signalsRes, productsRes, promosRes, visitsRes] = await Promise.all([
    customerIdIsUuid
      ? supabase.from("customers").select("*").eq("id", request.customer_id).single()
      : Promise.resolve({ data: null }),
    customerIdIsUuid
      ? supabase.from("customer_behavior_profiles").select("*").eq("customer_id", request.customer_id).single()
      : Promise.resolve({ data: null }),
    supabase
      .from("stations")
      .select("id,name,city,car_care,ev_charging")
      .eq("id", request.station_id)
      .single(),
    supabase
      .from("station_operational_signals")
      .select("*")
      .eq("station_id", request.station_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single(),
    supabase.from("products").select("sku,name,price,category").eq("active", true).order("sku"),
    supabase
      .from("promotions")
      .select("name,discount_percent,product_sku,loyalty_required")
      .eq("station_id", request.station_id)
      .eq("active", true)
      .not("discount_percent", "is", null),
    customerIdIsUuid
      ? supabase
          .from("customer_visits")
          .select("total_amount,fuel_liters,ev_kwh_charged,service_categories,customer_visit_items(item_category,item_name,quantity)")
          .eq("customer_id", request.customer_id)
          .order("visited_at", { ascending: false })
          .limit(12)
      : Promise.resolve({ data: [] }),
  ])
  const contextProfile = getContextCustomerProfile(request)

  return {
    customer: (customerRes.data ?? null) as CustomerRow | null,
    profile:
      ((profileRes.data ?? null) as CustomerProfileRow | null) ??
      (contextProfile
        ? {
            favorite_product: contextProfile.favorite_product ?? "",
            avg_basket_value: Number(contextProfile.avg_basket_value ?? 0),
            visits_per_week: 0,
            upsell_acceptance_score: 0.5,
            price_sensitivity_score: 0.5,
          }
        : null),
    station: (stationRes.data ?? null) as StationRow | null,
    signals: (signalsRes.data ?? null) as SignalsRow | null,
    products: ((productsRes.data ?? []) as ProductRow[]).filter(Boolean),
    promotions: ((promosRes.data ?? []) as PromotionRow[]).filter(Boolean),
    visits: ((visitsRes.data ?? []) as VisitRow[]).filter(Boolean),
  }
}

function buildSystemPrompt(params: {
  customer: CustomerRow
  profile: CustomerProfileRow | null
  station: StationRow
  signals: SignalsRow | null
  products: ProductRow[]
  promotions: PromotionRow[]
  visits: VisitRow[]
  distanceKm: number | null
  triggerType: string
  availableTriggers: string[]
}) {
  const {
    customer,
    profile,
    station,
    signals,
    products,
    promotions,
    visits,
    distanceKm,
    triggerType,
    availableTriggers,
  } = params
  const visitHistoryContext = buildVisitHistoryContext(visits)

  const productsByCategory: Record<string, Array<{ name: string; price: number }>> = {}
  for (const p of products) {
    if (!productsByCategory[p.category]) productsByCategory[p.category] = []
    productsByCategory[p.category].push({ name: p.name, price: Number(p.price) })
  }

  const promoLines = promotions.map((promo) => {
    const product = products.find((p) => p.sku === promo.product_sku)
    const discount = typeof promo.discount_percent === "number" ? `${promo.discount_percent}%` : "promo"
    return `- ${promo.name}: ${discount} off ${product ? product.name : promo.product_sku ?? "selected item"}${
      promo.loyalty_required ? ` (${promo.loyalty_required}+ only)` : ""
    }`
  })

  const proximityContext = buildProximityContext(distanceKm)
  const availableServices = buildAvailableServices(station, signals)

  return `You are **ADNOC Express**, a voice-activated concierge at ADNOC service stations in the UAE. Always respond in English.

## PERSONALITY
Warm, helpful, natural. Like a friend who works at the station. Short spoken sentences.

## CORE RULE: ALWAYS UPSELL
Every single response where you confirm something must ALSO suggest the next thing. You are a revenue-maximizing concierge. The customer should never leave without being offered every relevant service.

## UPSELL CHAIN
1. Primary need (fuel / EV / what they asked for)
2. Coffee or beverage (their favorite, or cold drink)
3. Food (pastry, snack to pair with coffee)
4. Car wash
5. Interior cleaning
6. Premium upgrade (wash, wax, lube)

## FIRST MESSAGE RULES
${distanceKm != null && distanceKm > 0.5
    ? `Customer is ${distanceKm.toFixed(1)} km away. They're approaching.
- Greet by name, then ask what they need.
- Do NOT offer products in the first message.`
    : `Customer is at the station.
- Greet and immediately offer based on context.`}
${proximityContext}
## RESPONSE FORMAT
- 2-3 sentences max.
- Confirm + upsell in the same response.
- Use real data when available: queue times, prep times, prices.

## CONTEXT SIGNALS
- Trigger type: ${triggerType || "unknown"}
- Available triggers: ${availableTriggers.join(", ") || "none"}

## CUSTOMER: ${customer.first_name} ${customer.last_name} (${customer.loyalty_tier})
${profile
    ? `- Favorite: ${profile.favorite_product} | Basket: AED ${profile.avg_basket_value} | ${profile.visits_per_week}x/week
- Upsell score: ${profile.upsell_acceptance_score > 0.7 ? "HIGH — go for premium" : profile.upsell_acceptance_score > 0.5 ? "MODERATE" : "LOW — stick to basics"}
- Price sensitivity: ${profile.price_sensitivity_score > 0.6 ? "HIGH — mention value/deals" : "LOW — premium is fine"}`
    : ""}
${visitHistoryContext}

## STATION: ${station.name} (${station.city})
Available services to offer:
${availableServices.map((service) => `- ${service}`).join("\n")}
${signals
    ? `Live data: Coffee ${signals.coffee_prep_time_minutes} min | Wash queue ${signals.car_wash_queue_minutes} min | Interior: ${
        signals.interior_cleaning_available ? "available" : "busy"
      } | EV chargers: ${signals.ev_chargers_available} free | Cold drinks: ${
        signals.cold_beverage_stock_high ? "stocked" : "running low"
      }`
    : ""}

## PRODUCTS
${Object.entries(productsByCategory)
  .map(([category, items]) => `${category}: ${items.map((item) => `${item.name} AED ${item.price}`).join(", ")}`)
  .join("\n")}
${promoLines.length > 0 ? `\nPROMOS:\n${promoLines.join("\n")}` : ""}

## ACTIONS
When customer CONFIRMS (yes/ok/sure/go ahead), emit actions and continue upsell suggestion:
[ACTIONS]:[{"type":"TYPE","label":"LABEL","detail":"DETAIL"}]
Types: order_sent_to_pos, car_wash_reserved, interior_team_dispatched, ev_charge_monitored, loyalty_points_applied, coffee_preparing, recommendation`
}

function buildVisitHistoryContext(visits: VisitRow[]) {
  if (visits.length === 0) return ""

  let totalSpend = 0
  let totalFuel = 0
  let totalEv = 0
  const itemCounts = new Map<string, number>()
  const categoryCounts = new Map<string, number>()

  for (const visit of visits) {
    totalSpend += toNumber(visit.total_amount)
    totalFuel += toNumber(visit.fuel_liters)
    totalEv += toNumber(visit.ev_kwh_charged)

    for (const category of visit.service_categories ?? []) {
      categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1)
    }

    for (const item of visit.customer_visit_items ?? []) {
      if (!item.item_name || item.item_category === "fuel") continue
      itemCounts.set(item.item_name, (itemCounts.get(item.item_name) ?? 0) + toNumber(item.quantity))
    }
  }

  const topItems = [...itemCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => `${name} (${count}x)`)
    .join(", ")

  const topCategories = [...categoryCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => `${name.replaceAll("_", " ")} (${count})`)
    .join(", ")

  const latestVisitItems = (visits[0]?.customer_visit_items ?? [])
    .filter((item) => item.item_category !== "fuel" && item.item_name)
    .map((item) => item.item_name)
    .join(", ")

  return `
## Visit History (${visits.length} visits)
- Total spend: AED ${totalSpend.toFixed(0)} | Avg: AED ${(totalSpend / visits.length).toFixed(0)}/visit
${totalFuel > 0 ? `- Fuel: ${totalFuel.toFixed(0)}L` : ""}${totalFuel > 0 && totalEv > 0 ? " | " : ""}${totalEv > 0 ? `EV: ${totalEv.toFixed(0)} kWh` : ""}
- Top items: ${topItems || "None"}
- Services: ${topCategories || "None"}
- Last visit: ${latestVisitItems || "fuel only"}`
}

function buildProximityContext(distanceKm: number | null) {
  if (distanceKm == null) return `\n## CONTEXT: Location unknown — ask what they need first.`
  if (distanceKm > 0.5) {
    return `\n## CRITICAL: Customer is APPROACHING (${distanceKm.toFixed(
      1
    )} km away)\nThey are not at the station yet. First understand why they are coming, then start building their visit.`
  }
  return `\n## CONTEXT: Customer is AT the station\nThey are here. Be direct with offers.`
}

function buildAvailableServices(station: StationRow, signals: SignalsRow | null) {
  const services: string[] = []
  if (station.car_care && station.car_care.length > 0) {
    services.push(`Car wash (${signals?.car_wash_queue_minutes ?? 5} min queue, from AED 35)`)
    services.push("Premium wash + wax (AED 65)")
  }
  if (signals?.interior_cleaning_available) {
    services.push("Interior cleaning (15 min, AED 45)")
  }
  if (station.ev_charging) {
    services.push(
      `EV Fast Charge (${signals?.ev_chargers_available ?? 0} chargers free, ~${signals?.avg_ev_charge_time_minutes ?? 25} min)`
    )
  }
  services.push("Quick Lube Change (AED 120)")
  return services
}

function extractActions(fullReply: string): ExpressDemoChatResponse {
  const match = fullReply.match(/\[ACTIONS\]:(\[.*\])/s)
  if (!match) return { reply: fullReply.trim(), actions: [] }

  try {
    const parsed = JSON.parse(match[1]) as Array<Record<string, unknown>>
    const actions = parsed
      .map((action) => ({
        type: String(action.type ?? ""),
        label: String(action.label ?? ""),
        detail: String(action.detail ?? ""),
      }))
      .filter((action) => action.type && action.label)
    return {
      reply: fullReply.replace(/\[ACTIONS\]:.*$/s, "").trim(),
      actions,
    }
  } catch (error) {
    logBackendError("express-demo-chat", "Failed to parse [ACTIONS] payload", error)
    return { reply: fullReply.trim(), actions: [] }
  }
}

function toNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function buildFallbackCustomer(request: ExpressDemoChatRequest): CustomerRow {
  const fullName = request.customer_name?.trim() ?? ""
  const [derivedFirst = "", ...rest] = fullName.split(/\s+/)
  const derivedLast = rest.join(" ")
  return {
    first_name: request.customer_first_name || derivedFirst || "Customer",
    last_name: request.customer_last_name || derivedLast || "",
    loyalty_tier: request.loyalty_tier || "silver",
  }
}

function getContextCustomerProfile(request: ExpressDemoChatRequest):
  | { favorite_product?: string; avg_basket_value?: number | null; preferred_language?: string; loyalty_tier?: string }
  | null {
  const context = request.express_demo_context
  if (context && typeof context === "object") {
    const profile = (context as Record<string, unknown>).customer_profile
    if (profile && typeof profile === "object") {
      const parsed = profile as Record<string, unknown>
      return {
        favorite_product: typeof parsed.favorite_product === "string" ? parsed.favorite_product : undefined,
        avg_basket_value: typeof parsed.avg_basket_value === "number" ? parsed.avg_basket_value : null,
        preferred_language: typeof parsed.preferred_language === "string" ? parsed.preferred_language : undefined,
        loyalty_tier: typeof parsed.loyalty_tier === "string" ? parsed.loyalty_tier : undefined,
      }
    }
  }
  return null
}

export async function tryRunExpressDemoChat(request: ExpressDemoChatRequest): Promise<ExpressDemoChatResponse> {
  try {
    return await runExpressDemoChat(request)
  } catch (error) {
    logBackendError("express-demo-chat", "Chat orchestration failed", error, {
      customerId: request.customer_id ?? null,
      stationId: request.station_id ?? null,
    })
    throw error
  } finally {
    logBackendInfo("express-demo-chat", "Processed express demo chat request", {
      customerId: request.customer_id ?? null,
      stationId: request.station_id ?? null,
    })
  }
}
