import { NextResponse } from "next/server"

export const runtime = "nodejs"

type RouteMetricsRequest = {
  origin?: { lat?: number; lng?: number }
  destinations?: Array<{ id?: string; lat?: number; lng?: number }>
}

type DestinationEta = {
  id: string
  eta_minutes: number | null
  distance_meters: number | null
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const n = Number(value.trim())
    return Number.isFinite(n) ? n : null
  }
  return null
}

async function fetchGoogleEtaMinutes(
  apiKey: string,
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): Promise<{ etaMinutes: number | null; distanceMeters: number | null }> {
  const origin = `${originLat},${originLng}`
  const destination = `${destLat},${destLng}`
  const url = new URL("https://maps.googleapis.com/maps/api/directions/json")
  url.searchParams.set("origin", origin)
  url.searchParams.set("destination", destination)
  url.searchParams.set("mode", "driving")
  url.searchParams.set("departure_time", "now")
  url.searchParams.set("traffic_model", "best_guess")
  url.searchParams.set("key", apiKey)

  const res = await fetch(url.toString(), { cache: "no-store" })
  if (!res.ok) return { etaMinutes: null, distanceMeters: null }

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
  if (data.status !== "OK") return { etaMinutes: null, distanceMeters: null }

  const leg = data.routes?.[0]?.legs?.[0]
  if (!leg) return { etaMinutes: null, distanceMeters: null }

  const durationSecs = leg.duration_in_traffic?.value ?? leg.duration?.value
  const distanceMeters = leg.distance?.value ?? null
  if (typeof durationSecs !== "number" || !Number.isFinite(durationSecs)) {
    return { etaMinutes: null, distanceMeters }
  }
  return { etaMinutes: Math.max(5, Math.round(durationSecs / 60)), distanceMeters }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as RouteMetricsRequest
    const originLat = toNumber(body.origin?.lat)
    const originLng = toNumber(body.origin?.lng)
    const destinations = Array.isArray(body.destinations) ? body.destinations : []

    if (originLat == null || originLng == null || destinations.length === 0) {
      return NextResponse.json({ error: "Invalid origin/destinations payload" }, { status: 400 })
    }

    const mapsApiKey =
      process.env.GOOGLE_MAPS_API_KEY ||
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY ||
      ""

    if (!mapsApiKey) {
      const fallback: DestinationEta[] = destinations
        .map((d) => ({ id: String(d.id ?? ""), eta_minutes: null, distance_meters: null }))
        .filter((d) => d.id.length > 0)
      return NextResponse.json({ source: "none", routes: fallback })
    }

    const routes: DestinationEta[] = []
    for (const d of destinations) {
      const id = String(d.id ?? "")
      const lat = toNumber(d.lat)
      const lng = toNumber(d.lng)
      if (!id || lat == null || lng == null) continue
      const route = await fetchGoogleEtaMinutes(mapsApiKey, originLat, originLng, lat, lng)
      routes.push({
        id,
        eta_minutes: route.etaMinutes,
        distance_meters: route.distanceMeters,
      })
    }

    return NextResponse.json({ source: "google_directions", routes })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to compute route metrics"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

