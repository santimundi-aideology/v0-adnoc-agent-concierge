import { googleMapsEmbedDirectionsUrl } from "@/lib/express-demo-station-routing"
import { type RouteState, routeStateSchema } from "@/lib/voice-backend/schemas"
import { createVoiceBackendClient } from "@/lib/voice-backend/supabase-admin"

export type RouteMetricDestination = {
  id: string
  stationName?: string | null
  lat: number
  lng: number
}

export type RouteMetricResult = {
  id: string
  stationName: string | null
  etaMinutes: number | null
  distanceMeters: number | null
}

export async function computeRouteMetrics(params: {
  origin: { label?: string; lat: number; lng: number }
  destinations: RouteMetricDestination[]
}): Promise<{ source: string; routes: RouteMetricResult[] }> {
  const mapsApiKey =
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY ||
    ""

  if (!mapsApiKey) {
    return {
      source: "fallback",
      routes: params.destinations.map((destination) => ({
        id: destination.id,
        stationName: destination.stationName ?? null,
        etaMinutes: fallbackEtaMinutes(params.origin, destination),
        distanceMeters: fallbackDistanceMeters(params.origin, destination),
      })),
    }
  }

  const routes: RouteMetricResult[] = []
  for (const destination of params.destinations) {
    const route = await fetchGoogleEtaMinutes(
      mapsApiKey,
      params.origin.lat,
      params.origin.lng,
      destination.lat,
      destination.lng
    )
    routes.push({
      id: destination.id,
      stationName: destination.stationName ?? null,
      etaMinutes: route.etaMinutes,
      distanceMeters: route.distanceMeters,
    })
  }

  return { source: "google_directions", routes }
}

export async function buildRouteState(params: {
  origin: { label?: string; lat: number; lng: number }
  destination: RouteMetricDestination
  reason?: string
}): Promise<RouteState> {
  const metrics = await computeRouteMetrics({
    origin: params.origin,
    destinations: [params.destination],
  })
  const route = metrics.routes[0]
  return routeStateSchema.parse({
    source: metrics.source,
    origin: params.origin,
    destination: {
      stationId: params.destination.id,
      stationName: params.destination.stationName ?? route?.stationName ?? undefined,
      lat: params.destination.lat,
      lng: params.destination.lng,
    },
    etaMinutes: route?.etaMinutes ?? null,
    distanceMeters: route?.distanceMeters ?? null,
    previewUrl: googleMapsEmbedDirectionsUrl(
      params.origin.lat,
      params.origin.lng,
      params.destination.lat,
      params.destination.lng
    ),
    reason: params.reason ?? null,
    updatedAt: new Date().toISOString(),
  })
}

export async function resolveStationDestination(stationId: string): Promise<RouteMetricDestination | null> {
  const supabase = createVoiceBackendClient()
  const { data, error } = await supabase
    .from("stations")
    .select("id, name, lat, lng")
    .eq("id", stationId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  const row = data as { id?: string; name?: string; lat?: number | null; lng?: number | null } | null
  if (!row?.id || row.lat == null || row.lng == null) return resolveStationDestinationByName(stationId)
  return {
    id: row.id,
    stationName: row.name ?? null,
    lat: Number(row.lat),
    lng: Number(row.lng),
  }
}

async function resolveStationDestinationByName(stationName: string): Promise<RouteMetricDestination | null> {
  const normalizedInput = normalizeStationLookup(stationName)
  if (!normalizedInput) return null

  const supabase = createVoiceBackendClient()
  const { data, error } = await supabase
    .from("stations")
    .select("id, name, lat, lng")
    .limit(300)

  if (error) throw new Error(error.message)
  const rows = (Array.isArray(data) ? data : []) as Array<{
    id?: string
    name?: string
    lat?: number | null
    lng?: number | null
  }>
  const row = rows.find((station) => {
    const normalizedName = normalizeStationLookup(station.name)
    return normalizedName.includes(normalizedInput) || normalizedInput.includes(normalizedName)
  })
  if (!row?.id || row.lat == null || row.lng == null) return null
  return {
    id: row.id,
    stationName: row.name ?? null,
    lat: Number(row.lat),
    lng: Number(row.lng),
  }
}

function normalizeStationLookup(value?: string | null) {
  return (value ?? "")
    .toLowerCase()
    .replace(/\badnoc\b/g, "")
    .replace(/\bexpress\b/g, "")
    .replace(/[^a-z0-9]/g, "")
}

async function fetchGoogleEtaMinutes(
  apiKey: string,
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): Promise<{ etaMinutes: number | null; distanceMeters: number | null }> {
  const url = new URL("https://maps.googleapis.com/maps/api/directions/json")
  url.searchParams.set("origin", `${originLat},${originLng}`)
  url.searchParams.set("destination", `${destLat},${destLng}`)
  url.searchParams.set("mode", "driving")
  url.searchParams.set("departure_time", "now")
  url.searchParams.set("traffic_model", "best_guess")
  url.searchParams.set("key", apiKey)

  const fallback = {
    etaMinutes: fallbackEtaMinutes({ lat: originLat, lng: originLng }, { lat: destLat, lng: destLng }),
    distanceMeters: fallbackDistanceMeters({ lat: originLat, lng: originLng }, { lat: destLat, lng: destLng }),
  }
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 3500)
  const res = await fetch(url.toString(), { cache: "no-store", signal: controller.signal }).catch(() => null)
  clearTimeout(timeoutId)
  if (!res?.ok) return fallback

  const data = (await res.json()) as {
    status?: string
    routes?: Array<{
      legs?: Array<{
        duration?: { value?: number }
        duration_in_traffic?: { value?: number }
        distance?: { value?: number }
      }>
    }>
  }
  if (data.status !== "OK") return fallback

  const leg = data.routes?.[0]?.legs?.[0]
  if (!leg) return fallback
  const durationSecs = leg.duration_in_traffic?.value ?? leg.duration?.value
  return {
    etaMinutes: typeof durationSecs === "number" ? Math.max(5, Math.round(durationSecs / 60)) : fallback.etaMinutes,
    distanceMeters: leg.distance?.value ?? fallback.distanceMeters,
  }
}

function fallbackDistanceMeters(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
) {
  const R = 6371
  const dLat = ((destination.lat - origin.lat) * Math.PI) / 180
  const dLng = ((destination.lng - origin.lng) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((origin.lat * Math.PI) / 180) *
      Math.cos((destination.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1000)
}

function fallbackEtaMinutes(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
) {
  const distanceKm = fallbackDistanceMeters(origin, destination) / 1000
  return Math.max(5, Math.round((distanceKm / 38) * 60))
}
