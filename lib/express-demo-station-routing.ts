/**
 * Express Demo: build payloads for the concierge / Retell and pick alternate stations
 * when the user's ask (e.g. interior clean) doesn't match the current primary station.
 */

export type ExpressDemoStationPayload = {
  id: string
  name: string
  city: string
  region: string
  lat: number | null
  lng: number | null
  ev_charging: boolean | null
  car_care: string[] | null
  fnb: string[] | null
  services: string[] | null
  facilities: string[] | null
  address: string | null
  distance_km?: number
  approach_traffic_minutes?: number | null
}

export type ExpressDemoContext = {
  user_location: { label: string; lat: number; lng: number }
  primary_station_id: string
  customer_profile?: {
    favorite_product?: string | null
    avg_basket_value?: number | null
    preferred_language?: string | null
    loyalty_tier?: string | null
  }
  upsell_offers?: Array<{
    title: string
    details: string
    discount_label?: string
  }>
  nearest_three: Array<{
    station_id: string
    name: string
    distance_km: number
    traffic_minutes?: number
    eta_minutes?: number
  }>
  stations_catalog: ExpressDemoStationPayload[]
  routing_hints: string
}

const ROUTING_HINTS = `Routing rules (follow in order):
1) The customer starts at user_location. Default primary_station_id is the closest Express Demo stop unless they choose otherwise.
2) If they ask for a service the primary station does NOT clearly offer (check car_care, services, fnb, ev_charging, facilities), suggest the nearest alternative from stations_catalog that DOES offer it, and explain briefly.
3) Prefer minimizing extra drive time: among stations that satisfy the request, prefer closer to user_location.
4) You can handle off-script asks (general questions, small talk, directions, timing) helpfully; stay grounded in stations_catalog and live ops when relevant.
5) When you recommend a different station, say you are switching their suggested stop and why.
6) Output is spoken naturally; the app may also switch the highlighted station when the user asks for something the current one cannot fulfill.`

function norm(s: string): string {
  return s.toLowerCase()
}

function stationTextBlob(st: ExpressDemoStationPayload): string {
  const parts = [
    ...(st.car_care ?? []),
    ...(st.services ?? []),
    ...(st.fnb ?? []),
    ...(st.facilities ?? []),
    st.ev_charging ? "ev charging" : "",
  ]
  return norm(parts.join(" "))
}

/** Keyword buckets → words that must appear in station blob for a match */
const SERVICE_KEYWORDS: Array<{ keys: string[]; patterns: RegExp[] }> = [
  {
    keys: ["interior"],
    patterns: [/interior/, /inside.*clean/, /cabin/, /upholstery/],
  },
  {
    keys: ["wash", "car wash"],
    patterns: [/wash/, /detailing/, /wax/, /premium wash/, /express wash/],
  },
  {
    keys: ["ev", "charge"],
    patterns: [/ev\b/, /charg/, /electric/, /battery/],
  },
  {
    keys: ["coffee", "latte", "food", "drink"],
    patterns: [/coffee/, /latte/, /cappuccino/, /starbucks/, /costa/, /food/, /snack/, /beverage/, /f&b/, /mcdonalds/],
  },
  {
    keys: ["lube", "oil", "tire"],
    patterns: [/lube/, /oil/, /tire/, /ac check/, /quick lube/],
  },
  {
    keys: ["fuel", "petrol", "diesel"],
    patterns: [/fuel/, /super 98/, /diesel/, /pump/],
  },
]

function intentPatternsFromMessage(message: string): RegExp[] {
  const m = norm(message)
  const out: RegExp[] = []
  for (const bucket of SERVICE_KEYWORDS) {
    for (const re of bucket.patterns) {
      if (re.test(m)) out.push(re)
    }
  }
  return out
}

function stationMatchesPatterns(st: ExpressDemoStationPayload, patterns: RegExp[]): boolean {
  if (patterns.length === 0) return true
  const blob = stationTextBlob(st)
  return patterns.some((re) => re.test(blob))
}

function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number | null,
  lng2: number | null
): number | null {
  if (lat2 == null || lng2 == null) return null
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * If the message implies a concrete service need and the current station is a poor match,
 * return a better station id (nearest among those that match), else null.
 */
/** Returns the best primary station id for this message (may equal current). */
export function resolveExpressPrimaryStationId(
  message: string,
  currentStationId: string,
  stations: ExpressDemoStationPayload[],
  userLat: number,
  userLng: number
): string {
  return pickStationForServiceIntent(message, currentStationId, stations, userLat, userLng) ?? currentStationId
}

export function pickStationForServiceIntent(
  message: string,
  currentStationId: string,
  stations: ExpressDemoStationPayload[],
  userLat: number,
  userLng: number
): string | null {
  const patterns = intentPatternsFromMessage(message)
  if (patterns.length === 0) return null

  const current = stations.find((s) => s.id === currentStationId)
  if (current && stationMatchesPatterns(current, patterns)) return null

  const candidates = stations
    .filter((s) => s.id !== currentStationId && stationMatchesPatterns(s, patterns))
    .map((s) => {
      const d = distanceKm(userLat, userLng, s.lat, s.lng)
      return { s, d: d ?? 1e9 }
    })
    .sort((a, b) => a.d - b.d)

  if (candidates.length === 0) return null
  return candidates[0].s.id
}

export function buildExpressDemoContext(params: {
  userLabel: string
  userLat: number
  userLng: number
  primaryStationId: string
  customerProfile?: ExpressDemoContext["customer_profile"]
  upsellOffers?: ExpressDemoContext["upsell_offers"]
  nearestThree: Array<{
    station_id: string
    name: string
    distance_km: number
    traffic_minutes?: number
    eta_minutes?: number
  }>
  stations: ExpressDemoStationPayload[]
}): ExpressDemoContext {
  return {
    user_location: {
      label: params.userLabel,
      lat: params.userLat,
      lng: params.userLng,
    },
    primary_station_id: params.primaryStationId,
    customer_profile: params.customerProfile,
    upsell_offers: params.upsellOffers,
    nearest_three: params.nearestThree,
    stations_catalog: params.stations,
    routing_hints: ROUTING_HINTS,
  }
}

export function googleMapsDirectionsUrl(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): string {
  const o = `${originLat},${originLng}`
  const d = `${destLat},${destLng}`
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(o)}&destination=${encodeURIComponent(d)}&travelmode=driving`
}

/**
 * iframe URL for driving directions (same experience as “Open in Google Maps”, embedded).
 * Enable “Maps Embed API” in Google Cloud, create a browser key, set
 * NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY, and restrict the key by HTTP referrer to your app.
 * @see https://developers.google.com/maps/documentation/embed/embedding-map#directions_mode
 */
export function googleMapsEmbedDirectionsUrl(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  zoom = 13
): string | null {
  const key =
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY
      ? String(process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY).trim()
      : ""
  if (!key) return null
  const origin = encodeURIComponent(`${originLat},${originLng}`)
  const destination = encodeURIComponent(`${destLat},${destLng}`)
  // Note: the official Embed "directions" mode does not expose explicit zoom controls.
  // Passing zoom here is a best-effort hint; Google may ignore it.
  return `https://www.google.com/maps/embed/v1/directions?key=${encodeURIComponent(key)}&origin=${origin}&destination=${destination}&mode=driving&zoom=${encodeURIComponent(String(zoom))}`
}

export function googleMapsEmbedPlaceUrl(lat: number, lng: number, zoom = 14): string {
  return `https://www.google.com/maps?q=${lat},${lng}&z=${zoom}&output=embed`
}

/** Prefer route embed when an API key is configured; otherwise fall back to destination-only map. */
export function googleMapsRoutePreviewEmbed(params: {
  originLat: number
  originLng: number
  destLat: number
  destLng: number
  zoom?: number
}): { src: string; showsDrivingRoute: boolean } {
  const route = googleMapsEmbedDirectionsUrl(
    params.originLat,
    params.originLng,
    params.destLat,
    params.destLng,
    params.zoom ?? 13
  )
  if (route) return { src: route, showsDrivingRoute: true }
  return {
    src: googleMapsEmbedPlaceUrl(params.destLat, params.destLng, params.zoom ?? 13),
    showsDrivingRoute: false,
  }
}

/** Map demo UI stations (with signals) into catalog payloads for the agent */
export function stationRowsToExpressPayloads(
  stations: Array<{
    id: string
    name: string
    city: string
    region: string
    lat: number | null
    lng: number | null
    ev_charging: boolean | null
    car_care: string[] | null
    fnb: string[] | null
    services: string[] | null
    facilities: string[] | null
    address: string | null
    operational_signals: { approach_traffic_minutes?: number | null } | null
  }>,
  userLat: number,
  userLng: number
): ExpressDemoStationPayload[] {
  return stations.map((st) => ({
    id: st.id,
    name: st.name,
    city: st.city,
    region: st.region,
    lat: st.lat,
    lng: st.lng,
    ev_charging: st.ev_charging,
    car_care: st.car_care,
    fnb: st.fnb,
    services: st.services,
    facilities: st.facilities,
    address: st.address,
    approach_traffic_minutes: st.operational_signals?.approach_traffic_minutes ?? null,
    distance_km: (() => {
      if (st.lat == null || st.lng == null) return undefined
      const R = 6371
      const dLat = ((st.lat - userLat) * Math.PI) / 180
      const dLng = ((st.lng - userLng) * Math.PI) / 180
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((userLat * Math.PI) / 180) * Math.cos((st.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
      return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10
    })(),
  }))
}
