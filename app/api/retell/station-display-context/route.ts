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

function haversineDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      customer_id?: string
      station_id?: string
    }

    const customerId = String(body.customer_id ?? "").trim()
    const selectedStationId = String(body.station_id ?? "").trim()
    if (!customerId) {
      return NextResponse.json({ error: "Missing customer_id" }, { status: 400 })
    }

    const supabase = createDirectClient()
    const [{ data: location }, { data: stations, error: stationsError }] = await Promise.all([
      supabase
        .from("customer_demo_locations")
        .select("label, lat, lng")
        .eq("customer_id", customerId)
        .maybeSingle(),
      supabase
        .from("stations")
        .select("id, name, city, region, lat, lng, ev_charging, services, car_care, fnb, facilities, station_type")
        .eq("station_type", "express_demo")
        .order("name"),
    ])

    if (stationsError) {
      return NextResponse.json({ error: stationsError.message }, { status: 500 })
    }
    if (!location || location.lat == null || location.lng == null) {
      return NextResponse.json({ error: "No demo location found for customer" }, { status: 404 })
    }

    const stationRows = (stations ?? []) as StationRow[]
    const withDistance = stationRows
      .filter((s) => s.lat != null && s.lng != null)
      .map((s) => ({
        ...s,
        distance_km: haversineDistanceKm(location.lat, location.lng, s.lat as number, s.lng as number),
      }))
      .sort((a, b) => a.distance_km - b.distance_km)

    const nearestThree = withDistance.slice(0, 3).map((s) => ({
      station_id: s.id,
      station_name: s.name,
      distance_km: Math.round(s.distance_km * 10) / 10,
      ev_charging: s.ev_charging ?? false,
      services: s.services ?? [],
      car_care: s.car_care ?? [],
      fnb: s.fnb ?? [],
      facilities: s.facilities ?? [],
    }))

    const primarySource =
      withDistance.find((s) => s.id === selectedStationId) ??
      withDistance[0] ??
      null
    const primaryStation = primarySource
      ? {
          station_id: primarySource.id,
          station_name: primarySource.name,
          distance_km: Math.round(primarySource.distance_km * 10) / 10,
          ev_charging: primarySource.ev_charging ?? false,
          services: primarySource.services ?? [],
          car_care: primarySource.car_care ?? [],
          fnb: primarySource.fnb ?? [],
          facilities: primarySource.facilities ?? [],
        }
      : null

    return NextResponse.json({
      customer_id: customerId,
      location: {
        label: location.label,
        lat: location.lat,
        lng: location.lng,
      },
      primary_station: primaryStation,
      nearest_three: nearestThree,
      response_contract:
        "When speaking to the user, always use station_name. Do not read station_id codes unless asked.",
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to build station display context"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

