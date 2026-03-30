import { NextResponse } from "next/server"
import { createDirectClient } from "@/lib/supabase/direct-client"

export const runtime = "nodejs"

type StationRow = {
  id: string
  name: string
  city: string
  region: string
  lat: number | null
  lng: number | null
  ev_charging: boolean | null
  services: string[] | null
  car_care: string[] | null
  fnb: string[] | null
  facilities: string[] | null
  station_type: string | null
}

type DemoLocationRow = {
  customer_id: string
  label: string
  lat: number
  lng: number
}

function haversineDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function stationToResponse(station: StationRow, distanceKm: number | null = null) {
  return {
    station_id: station.id,
    station_name: station.name,
    distance_km: distanceKm == null ? null : Math.round(distanceKm * 10) / 10,
    ev_charging: station.ev_charging ?? false,
    services: station.services ?? [],
    car_care: station.car_care ?? [],
    fnb: station.fnb ?? [],
    facilities: station.facilities ?? [],
  }
}

function buildVoiceSummary(primaryStation: { station_name: string; distance_km: number | null } | null): string {
  if (!primaryStation) {
    return "I found your station context, but I need one more detail to confirm the best station by name."
  }
  const distancePart =
    primaryStation.distance_km == null
      ? ""
      : `, about ${primaryStation.distance_km} kilometers away`
  return `The nearest ADNOC station is ${primaryStation.station_name}${distancePart}.`
}

async function resolveLocation(
  supabase: ReturnType<typeof createDirectClient>,
  customerId: string,
  customerName: string
): Promise<DemoLocationRow | null> {
  if (customerId) {
    const { data } = await supabase
      .from("customer_demo_locations")
      .select("customer_id, label, lat, lng")
      .eq("customer_id", customerId)
      .maybeSingle()
    if (data?.lat != null && data?.lng != null) return data as DemoLocationRow
  }

  if (customerName) {
    const firstName = customerName.trim().split(/\s+/)[0]
    if (firstName) {
      const { data: customer } = await supabase
        .from("customers")
        .select("id, first_name")
        .ilike("first_name", firstName)
        .maybeSingle()
      if (customer?.id) {
        const { data: namedLocation } = await supabase
          .from("customer_demo_locations")
          .select("customer_id, label, lat, lng")
          .eq("customer_id", customer.id)
          .maybeSingle()
        if (namedLocation?.lat != null && namedLocation?.lng != null) {
          return namedLocation as DemoLocationRow
        }
      }
    }
  }

  const { data: fallbackLocation } = await supabase
    .from("customer_demo_locations")
    .select("customer_id, label, lat, lng")
    .limit(1)
    .maybeSingle()
  if (fallbackLocation?.lat != null && fallbackLocation?.lng != null) {
    return fallbackLocation as DemoLocationRow
  }

  return null
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      customer_id?: string
      customer_name?: string
      station_id?: string
    }

    const customerId = String(body.customer_id ?? "").trim()
    const customerName = String(body.customer_name ?? "").trim()
    const selectedStationId = String(body.station_id ?? "").trim()

    const supabase = createDirectClient()
    const [location, { data: stations, error: stationsError }] = await Promise.all([
      resolveLocation(supabase, customerId, customerName),
      supabase
        .from("stations")
        .select("id, name, city, region, lat, lng, ev_charging, services, car_care, fnb, facilities, station_type")
        .eq("station_type", "express_demo")
        .order("name"),
    ])

    if (stationsError) {
      return NextResponse.json({ error: stationsError.message }, { status: 500 })
    }

    const stationRows = (stations ?? []) as StationRow[]
    const selectedStation = stationRows.find((s) => s.id === selectedStationId) ?? null

    if (!location || location.lat == null || location.lng == null) {
      // Graceful fallback: do not fail function calls during a live conversation.
      const fallbackPrimary = selectedStation ? stationToResponse(selectedStation) : null
      return NextResponse.json({
        customer_id: customerId || null,
        location: null,
        primary_station: fallbackPrimary,
        nearest_three: [],
        nearest_three_compact: [],
        voice_summary: buildVoiceSummary(fallbackPrimary),
        warning: "No demo location found for customer; returned station-only context.",
        response_contract:
          "When speaking to the user, always use station_name. Do not read station_id codes unless asked.",
      })
    }

    const withDistance = stationRows
      .filter((s) => s.lat != null && s.lng != null)
      .map((s) => ({
        ...s,
        distance_km: haversineDistanceKm(location.lat, location.lng, s.lat as number, s.lng as number),
      }))
      .sort((a, b) => a.distance_km - b.distance_km)

    const nearestThree = withDistance.slice(0, 3).map((s) => stationToResponse(s, s.distance_km))

    const primarySource =
      withDistance.find((s) => s.id === selectedStationId) ??
      withDistance[0] ??
      null
    const primaryStation = primarySource ? stationToResponse(primarySource, primarySource.distance_km) : null
    const nearestThreeCompact = nearestThree.map((s) => ({
      station_name: s.station_name,
      distance_km: s.distance_km,
      ev_charging: s.ev_charging,
    }))

    return NextResponse.json({
      customer_id: customerId || location.customer_id,
      location: {
        label: location.label,
        lat: location.lat,
        lng: location.lng,
      },
      primary_station: primaryStation,
      nearest_three: nearestThree,
      nearest_three_compact: nearestThreeCompact,
      voice_summary: buildVoiceSummary(primaryStation),
      response_contract:
        "When speaking to the user, always use station_name. Do not read station_id codes unless asked.",
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to build station display context"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

