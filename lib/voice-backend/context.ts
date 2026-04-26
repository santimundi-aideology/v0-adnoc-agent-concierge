import {
  type CreateRetellCallRequest,
  type JsonValue,
  type RetellSessionContext,
  type StationContext,
  createRetellCallRequestSchema,
  retellSessionContextSchema,
  stationContextSchema,
} from "@/lib/voice-backend/schemas"
import {
  DEMO_CATALOG_ITEMS,
  SARAH_LOYALTY_CONTEXT,
  emptyCartState,
  openCheckoutState,
} from "@/lib/voice-backend/catalog"
import { getBusinessProfile, getDemoScenario } from "@/lib/voice-backend/profiles"
import { listCoordinationEvents } from "@/lib/voice-backend/session-coordination"
import { createVoiceBackendClient } from "@/lib/voice-backend/supabase-admin"

type StationRow = {
  id: string
  name: string
  city?: string | null
  region?: string | null
  lat?: number | null
  lng?: number | null
  ev_charging?: boolean | null
  services?: string[] | null
  facilities?: string[] | null
  car_care?: string[] | null
  fnb?: string[] | null
  address?: string | null
  station_type?: string | null
}

export async function buildRetellSessionContext(input: unknown): Promise<RetellSessionContext | null> {
  const request = createRetellCallRequestSchema.parse(input)
  const persistedSession = request.sessionId ? await getPersistedSession(request.sessionId) : null
  const profileId = request.profileId ?? stringFromRecord(request.dynamicVariables, [
    "profile_id",
    "customer_id",
    "customerId",
  ]) ?? persistedSession?.profile_id
  const profile = await getBusinessProfile(profileId)
  if (!profile) return null

  const scenario = getDemoScenario(
    request.scenarioId ??
      stringFromRecord(request.dynamicVariables, ["scenario_id", "scenarioId"]) ??
      persistedSession?.scenario_id
  )
  const primaryStationId = stringFromRecord(request.dynamicVariables, [
    "primary_station_id",
    "station_id",
    "stationId",
  ])
  const primaryStation = primaryStationId ? await getStationContext(primaryStationId) : undefined
  const coordinationEvents = request.sessionId ? await listCoordinationEvents(request.sessionId) : []
  const conversationHistory = stringFromRecord(request.dynamicVariables, [
    "conversation_history",
    "conversationHistory",
  ])
  const stationCatalog = await getStationCatalog(profile.demoLocation)

  return retellSessionContextSchema.parse({
    sessionId: request.sessionId,
    profile,
    scenario,
    primaryStation,
    nearestStations: primaryStation ? [primaryStation] : [],
    stationCatalog,
    catalogItems: DEMO_CATALOG_ITEMS,
    loyaltyContext: {
      ...SARAH_LOYALTY_CONTEXT,
      customerId: profile.customerId ?? profile.id,
      tier: String(profile.loyaltyTier),
      paymentPreference: profile.paymentPreference ?? SARAH_LOYALTY_CONTEXT.paymentPreference,
    },
    cartState: objectFromUnknown(persistedSession?.cart_state) ?? emptyCartState(),
    checkoutState: objectFromUnknown(persistedSession?.checkout_state) ?? openCheckoutState(),
    actionInstructions: [
      "Call get_demo_context for fresh station, route, catalog, cart, checkout, loyalty, or coordination state.",
      "Call update_session_ui whenever station, route, cart, reservation, loyalty, checkout, or System Coordination state changes.",
      "Use catalog item AED and points prices exactly; do not invent prices.",
    ],
    coordinationEvents,
    conversationHistory,
    metadata: {
      ...request.metadata,
      requested_profile_id: profileId,
      requested_station_id: primaryStationId,
      function_names: {
        get_demo_context: "get_demo_context",
        update_session_ui: "update_session_ui",
      },
    },
  })
}

export async function getStationContext(stationId: string): Promise<StationContext | undefined> {
  const supabase = createVoiceBackendClient()
  const [{ data: station, error: stationError }, { data: signals }] = await Promise.all([
    supabase
      .from("stations")
      .select("id, name, city, region, lat, lng, ev_charging, services, facilities")
      .eq("id", stationId)
      .maybeSingle(),
    supabase
      .from("station_operational_signals")
      .select("*")
      .eq("station_id", stationId)
      .maybeSingle(),
  ])

  if (stationError) throw new Error(stationError.message)
  const row = station as StationRow | null
  if (!row?.id || !row.name) return undefined

  return stationContextSchema.parse({
    stationId: row.id,
    stationName: row.name,
    city: row.city ?? undefined,
    region: row.region ?? undefined,
    lat: row.lat ?? null,
    lng: row.lng ?? null,
    services: row.services ?? [],
    facilities: row.facilities ?? [],
    evCharging: row.ev_charging ?? false,
    operationalSignals: objectFromUnknown(signals),
  })
}

async function getStationCatalog(origin?: { lat: number; lng: number }) {
  const supabase = createVoiceBackendClient()
  const { data, error } = await supabase
    .from("stations")
    .select("id, name, city, region, lat, lng, ev_charging, car_care, fnb, services, facilities, address, station_type")
    .order("name")

  if (error) throw new Error(error.message)

  return (Array.isArray(data) ? (data as StationRow[]) : []).map((station) => ({
    id: station.id,
    station_id: station.id,
    name: station.name,
    station_name: station.name,
    city: station.city ?? "",
    region: station.region ?? "",
    lat: station.lat ?? null,
    lng: station.lng ?? null,
    ev_charging: station.ev_charging ?? false,
    car_care: station.car_care ?? [],
    fnb: station.fnb ?? [],
    services: station.services ?? [],
    facilities: station.facilities ?? [],
    address: station.address ?? "",
    station_type: station.station_type ?? "",
    distance_km:
      origin && station.lat != null && station.lng != null
        ? Math.round(distanceKm(origin.lat, origin.lng, Number(station.lat), Number(station.lng)) * 10) / 10
        : null,
  }))
}

async function getPersistedSession(sessionId: string) {
  const supabase = createVoiceBackendClient()
  const { data, error } = await supabase
    .from("demo_voice_sessions")
    .select("profile_id, scenario_id, cart_state, checkout_state")
    .eq("id", sessionId)
    .maybeSingle()
  if (error) return null
  return data as {
    profile_id?: string
    scenario_id?: string
    cart_state?: JsonValue
    checkout_state?: JsonValue
  } | null
}

export function ensureRequestSessionId(request: CreateRetellCallRequest, fallbackSessionId?: string) {
  return {
    ...request,
    sessionId: request.sessionId ?? fallbackSessionId,
  }
}

function stringFromRecord(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return undefined
}

function objectFromUnknown(value: unknown): Record<string, JsonValue> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, JsonValue>)
    : undefined
}

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
