"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Mic,
  Send,
  Coffee,
  Car,
  Fuel,
  BatteryCharging,
  MapPin,
  Crown,
  Star,
  ShoppingCart,
  Sparkles,
  CheckCircle2,
  Timer,
  Loader2,
  History,
  CreditCard,
  Wallet,
  Smartphone,
  Banknote,
  TrendingUp,
  Droplets,
  Zap,
  ExternalLink,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase/client"
import { usePreloadCache } from "@/lib/data/preload-cache"
import { useAuth } from "@/lib/supabase/auth-context"
import type {
  Customer,
  CustomerWithProfile,
  CustomerVisitSummary,
  StationOperationalSignal,
  TriggerType,
  ConversationMessage,
  AgentAction,
} from "@/lib/types"
import {
  buildExpressDemoContext,
  resolveExpressPrimaryStationId,
  stationRowsToExpressPayloads,
  googleMapsDirectionsUrl,
  googleMapsRoutePreviewEmbed,
} from "@/lib/express-demo-station-routing"

// ─── Types ──────────────────────────────────────────────────

interface StationWithSignals {
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
  operating_hours: string | null
  station_type: string | null
  operational_signals: StationOperationalSignal | null
}

type DemoCartState = {
  items: Array<{ sku: string; name: string; qty: number; priceAed: number; pointsPrice: number }>
  totalAed: number
  totalPoints: number
}

type DemoCheckoutState = {
  status: "open" | "awaiting_payment" | "paid" | "failed"
  paymentMethod?: string
  pointsRedeemed: number
  remainingAed: number
  remainingPointsBalance?: number
  summary?: string
}

type DemoRouteState = {
  source?: string
  origin?: { label?: string; lat: number; lng: number }
  destination?: { stationId?: string; stationName?: string; lat: number; lng: number }
  etaMinutes?: number | null
  distanceMeters?: number | null
  previewUrl?: string | null
  reason?: string | null
  updatedAt?: string
}

function withTimeout<T>(promise: Promise<T>, ms = 5000): Promise<T> {
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

// ─── Geo Utilities ──────────────────────────────────────────

/** Haversine distance in km */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // Earth radius km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** Nearest N stations by straight-line distance */
function findNearestStations(
  lat: number,
  lng: number,
  stations: StationWithSignals[],
  count: number
): { station: StationWithSignals; distanceKm: number }[] {
  const withDist: { station: StationWithSignals; distanceKm: number }[] = []
  for (const s of stations) {
    if (s.lat == null || s.lng == null) continue
    withDist.push({ station: s, distanceKm: haversineDistance(lat, lng, s.lat, s.lng) })
  }
  withDist.sort((a, b) => a.distanceKm - b.distanceKm)
  return withDist.slice(0, count)
}

/** UI jitter on top of DB baseline approach_traffic_minutes */
function jitterTrafficMinutes(base: number): number {
  const jitter = Math.round((Math.random() - 0.5) * 6)
  return Math.max(0, Math.min(45, base + jitter))
}

/** Approximate drive ETA using distance + traffic, clamped to demo-friendly floor. */
function estimateDriveMinutes(distanceKm: number, approachTrafficMinutes: number): number {
  const baseDriveMinutes = (distanceKm / 38) * 60 // ~38 km/h urban average
  return Math.max(5, Math.round(baseDriveMinutes + approachTrafficMinutes))
}

type UpsellOffer = {
  title: string
  details: string
  discount_label?: string
}

function pickRandom<T>(arr: T[], n: number): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, Math.max(0, Math.min(n, copy.length)))
}

function buildUpsellOffers(params: {
  favoriteProduct?: string | null
}): UpsellOffer[] {
  const favorite = (params.favoriteProduct ?? "").trim()
  const catalog: UpsellOffer[] = [
    { title: "Flat White + Croissant", details: "Breakfast bundle while you fuel.", discount_label: "2-for-1 on croissant" },
    { title: "Iced Latte Upgrade", details: "Upgrade to large for a small add-on.", discount_label: "30% off upgrade" },
    { title: "Car Wash Add-on", details: "Add an express wash while you’re here.", discount_label: "20% off today" },
    { title: "Interior Clean Add-on", details: "Quick cabin refresh while you shop.", discount_label: "Bundle price" },
    { title: "Cold Drinks Bundle", details: "2 cold beverages for the drive.", discount_label: "2 for 1" },
    { title: "Snack Pack", details: "Coffee + snack ready at arrival.", discount_label: "15% off" },
  ]

  const offers = pickRandom(catalog, 3)
  if (favorite) {
    offers.unshift({
      title: `Your usual: ${favorite}`,
      details: "Want me to have it ready when you arrive?",
    })
  }
  return offers.slice(0, 4)
}

async function fetchRouteEtaMinutes(params: {
  originLat: number
  originLng: number
  destinations: Array<{ id: string; lat: number; lng: number }>
}): Promise<Map<string, number>> {
  const res = await fetch("/api/express-demo/route-metrics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      origin: { lat: params.originLat, lng: params.originLng },
      destinations: params.destinations,
    }),
  })
  if (!res.ok) return new Map()
  const data = (await res.json()) as {
    routes?: Array<{ id?: string; eta_minutes?: number | null }>
  }
  const out = new Map<string, number>()
  for (const row of data.routes ?? []) {
    if (!row?.id || typeof row.eta_minutes !== "number") continue
    out.set(row.id, Math.max(5, Math.round(row.eta_minutes)))
  }
  return out
}

// Persona descriptions for demo customers.
const CUSTOMER_PERSONAS: Record<string, { tag: string; description: string }> = {
  Sarah: { tag: "EV Premium", description: "EV driver with ~30 minute charging dwell, iced latte preference (25 dirhams)." },
  Khalid: { tag: "Executive Time-Sensitive", description: "Time-focused commuter, flat white preference (18 dirhams), optimize for speed." },
  Omar: { tag: "New Customer", description: "First-time ADNOC visitor; warm welcome, one-sentence explainer, welcome bundle (25 dirhams), delivery to car, and loyalty sign-up with an immediate perk." },
  Mariam: { tag: "Family Shopper", description: "Family convenience shopper looking for food, drinks, restrooms, and easy pickup." },
  Nasser: { tag: "Fleet Business", description: "Business/fleet user optimizing fuel stops, receipts, and efficient station choice." },
  Layla: { tag: "Car Care", description: "Car-care customer focused on wash, interior cleaning, and bundled add-ons." },
}

type NearestStationPick = {
  station: StationWithSignals
  distanceKm: number
  trafficMinutes: number
  etaMinutes: number
}

type DemoScenarioId =
  | "smart_commute"
  | "ev_orchestration"
  | "new_customer_welcome"
  | "coffee_food_preorder"
  | "car_care_visit"
  | "fleet_business_visit"

type DemoScenario = {
  id: DemoScenarioId
  title: string
  subtitle: string
  trigger: TriggerType
  primaryPersona: string
  keyPoints: string[]
  starterPrompt: string
}

function SmoothRevealText({ text, className }: { text: string; className?: string }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), 30)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <p
      className={cn(
        "whitespace-pre-wrap transition-opacity duration-[1200ms] ease-out",
        visible ? "opacity-100" : "opacity-0",
        className
      )}
    >
      {text}
    </p>
  )
}

function areConversationMessagesEqual(a: ConversationMessage[], b: ConversationMessage[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i].role !== b[i].role) return false
    if (a[i].text !== b[i].text) return false
    if (a[i].timestamp !== b[i].timestamp) return false
  }
  return true
}

function getNextProxyMessages(
  current: ConversationMessage[],
  target: ConversationMessage[]
): ConversationMessage[] {
  // Conversation reset should happen immediately.
  if (target.length === 0) return []

  // If target was truncated/reset, sync immediately.
  if (target.length < current.length) return target

  // Release one new bubble per tick.
  if (current.length < target.length) {
    return [...current, target[current.length]]
  }

  // Same bubble count: release one content update per tick.
  const next = [...current]
  for (let i = 0; i < target.length; i++) {
    if (
      next[i].role !== target[i].role ||
      next[i].text !== target[i].text ||
      next[i].timestamp !== target[i].timestamp
    ) {
      next[i] = target[i]
      return next
    }
  }

  return current
}

const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: "smart_commute",
    title: "Smart Commute Optimization",
    subtitle: "Get Me Home Faster",
    trigger: "arrival",
    primaryPersona: "Khalid",
    keyPoints: [
      "Recommend the best ADNOC station to minimize total time (traffic + detour + predicted queue).",
      "When recommending a station, state clearly how long the stop will take and how much time it adds to the commute (e.g. “This will only add five minutes to your commute—you can refuel and get your coffee.”).",
      "Show explicit time saved versus alternatives.",
      "Offer coffee/food pre-preparation with delivery to the car.",
      "Offer simulated express payment for a fast exit.",
    ],
    starterPrompt: "I just left the office and want the fastest ADNOC stop before heading home.",
  },
  {
    id: "ev_orchestration",
    title: "EV Charging Revenue Orchestration",
    subtitle: "Turn Charging Time Into Revenue Time",
    trigger: "ev_charging_started",
    primaryPersona: "Sarah",
    keyPoints: [
      "Use the ~30 minute charging window to suggest fitting services.",
      "Offer interior cleaning during charging for 30 dirhams, then sequence an express wash for 40 dirhams after charging.",
      "Offer coffee/food delivery directly to the charging stall or lounge.",
      "Keep the full flow simulated but operationally plausible.",
    ],
    starterPrompt: "What can I get done while I wait for my vehicle to charge?",
  },
  {
    id: "new_customer_welcome",
    title: "New Customer Welcome & Conversion",
    subtitle: "First-Time Visitor",
    trigger: "arrival",
    primaryPersona: "Omar",
    keyPoints: [
      "Give a warm, clear welcome and explain ADNOC Express in one sentence (refuel, shop, eat—order ahead and we bring it to your car).",
      "Offer the first-visit welcome bundle (coffee + snack) for 25 dirhams and highlight the value (e.g. best first-stop deal, no need to leave the car).",
      "Offer delivery to the car so the customer can stay in the car and still get the full experience.",
      "Invite quick loyalty sign-up with immediate welcome points and a concrete perk (e.g. free coffee on next visit or a small discount).",
      "End with a clear next step (e.g. “Your bundle will be ready at the pump—enjoy your first visit.”).",
    ],
    starterPrompt: "This is my first ADNOC visit. What should I try and how does ADNOC Express work?",
  },
  {
    id: "coffee_food_preorder",
    title: "Coffee & Food Pre-Order",
    subtitle: "Have The Order Ready",
    trigger: "arrival",
    primaryPersona: "Mariam",
    keyPoints: [
      "Recommend food and beverage bundles that fit the customer profile.",
      "Confirm pickup timing and make the order feel ready on arrival.",
      "Use family or convenience context when the profile implies it.",
    ],
    starterPrompt: "Can you have food and drinks ready when I arrive?",
  },
  {
    id: "car_care_visit",
    title: "Car Care Orchestration",
    subtitle: "Wash, Interior Clean, And Timing",
    trigger: "arrival",
    primaryPersona: "Layla",
    keyPoints: [
      "Switch route if the current station does not support the requested car-care service.",
      "Mention queue time and reservation status clearly.",
      "Bundle wash, interior cleaning, and refreshments where relevant.",
    ],
    starterPrompt: "I need a car wash and interior cleaning today.",
  },
  {
    id: "fleet_business_visit",
    title: "Fleet Business Stop",
    subtitle: "Efficient Fuel And Receipt Flow",
    trigger: "fueling_started",
    primaryPersona: "Nasser",
    keyPoints: [
      "Optimize for reliable fueling, diesel availability, and quick receipts.",
      "Keep the tone business-like and concise.",
      "Avoid unnecessary consumer upsells unless they help the business visit.",
    ],
    starterPrompt: "Plan the best fuel stop for my fleet route.",
  },
]

const PERSONA_SCENARIO_MAP: Record<string, DemoScenarioId> = {
  Khalid: "smart_commute",
  Sarah: "ev_orchestration",
  Omar: "new_customer_welcome",
  Mariam: "coffee_food_preorder",
  Layla: "car_care_visit",
  Nasser: "fleet_business_visit",
}

const TIER_CONFIG: Record<string, { color: string; icon: typeof Crown }> = {
  platinum: { color: "bg-violet-500/20 text-violet-400 border-violet-500/30", icon: Crown },
  gold: { color: "bg-amber-500/20 text-amber-400 border-amber-500/30", icon: Star },
  silver: { color: "bg-slate-400/20 text-slate-300 border-slate-400/30", icon: Star },
}

/** Omar: no loyalty badge (new customer). Khalid: always silver in UI. */
function displayLoyaltyTier(firstName: string, dbTier: string): keyof typeof TIER_CONFIG | null {
  if (firstName === "Omar") return null
  if (firstName === "Khalid") return "silver"
  if (dbTier in TIER_CONFIG) return dbTier as keyof typeof TIER_CONFIG
  return "silver"
}

const SINGLE_RETELL_AGENT_ID = process.env.NEXT_PUBLIC_RETELL_AGENT_ID
const RETELL_AGENT_IDS_BY_CUSTOMER: Record<string, string | undefined> = {
  Khalid: process.env.NEXT_PUBLIC_RETELL_AGENT_ID_KHALID,
  Sarah: process.env.NEXT_PUBLIC_RETELL_AGENT_ID_SARAH,
  Omar: process.env.NEXT_PUBLIC_RETELL_AGENT_ID_OMAR,
}

// ─── Component ──────────────────────────────────────────────

export default function DemoPage() {
  const { loading: authLoading } = useAuth()
  const { getCached, setCache } = usePreloadCache()
  // Data state
  const [stations, setStations] = useState<StationWithSignals[]>([])
  const [customers, setCustomers] = useState<CustomerWithProfile[]>([])

  // Selection state
  const [selectedStationId, setSelectedStationId] = useState<string>("")
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("")
  const [activeRoutePreview, setActiveRoutePreview] = useState<DemoRouteState | null>(null)

  // Deduced location → top 3 nearest express_demo stations
  const [nearestThreeResults, setNearestThreeResults] = useState<NearestStationPick[]>([])
  const [deducedLocationError, setDeducedLocationError] = useState("")
  const [nearestLoading, setNearestLoading] = useState(false)

  // Visit history summary
  const [visitSummary, setVisitSummary] = useState<CustomerVisitSummary | null>(null)
  const [loadingVisits, setLoadingVisits] = useState(false)

  // Derived
  const selectedStation = stations.find((s) => s.id === selectedStationId) ?? null
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) ?? null
  const selectedCustomerIndex = selectedCustomer ? Math.max(0, customers.findIndex((c) => c.id === selectedCustomer.id)) : 0
  const activeScenarioId = selectedCustomer ? PERSONA_SCENARIO_MAP[selectedCustomer.first_name] : null
  const activeScenario =
    DEMO_SCENARIOS.find((s) => s.id === activeScenarioId) ??
    (selectedCustomer ? DEMO_SCENARIOS[selectedCustomerIndex % DEMO_SCENARIOS.length] : null)
  const activeTrigger = activeScenario?.trigger ?? "arrival"

  const routeMapPreview = useMemo(() => {
    if (activeRoutePreview?.previewUrl) {
      return { src: activeRoutePreview.previewUrl, showsDrivingRoute: true }
    }
    const loc = selectedCustomer?.demo_location
    if (!loc || selectedStation?.lat == null || selectedStation?.lng == null) return null
    const zoom = selectedCustomer?.first_name === "Omar" ? 14 : 13
    return googleMapsRoutePreviewEmbed({
      originLat: loc.lat,
      originLng: loc.lng,
      destLat: selectedStation.lat,
      destLng: selectedStation.lng,
      zoom,
    })
  }, [activeRoutePreview, selectedCustomer, selectedStation])
  const routeDestinationName = activeRoutePreview?.destination?.stationName ?? selectedStation?.name
  const routeDirectionsHref = useMemo(() => {
    const activeOrigin = activeRoutePreview?.origin
    const activeDestination = activeRoutePreview?.destination
    if (activeOrigin && activeDestination) {
      return googleMapsDirectionsUrl(activeOrigin.lat, activeOrigin.lng, activeDestination.lat, activeDestination.lng)
    }
    const loc = selectedCustomer?.demo_location
    if (!loc || selectedStation?.lat == null || selectedStation?.lng == null) return null
    return googleMapsDirectionsUrl(loc.lat, loc.lng, selectedStation.lat, selectedStation.lng)
  }, [activeRoutePreview, selectedCustomer, selectedStation])

  const buildNearestForCustomer = useCallback(
    async (customer: CustomerWithProfile, stationRows: StationWithSignals[]): Promise<NearestStationPick[] | null> => {
      const loc = customer.demo_location
      if (!loc) return null
      const top = findNearestStations(loc.lat, loc.lng, stationRows, 8)
      if (top.length === 0) return null

      const withTraffic: NearestStationPick[] = top.map(({ station, distanceKm }) => {
        const base = station.operational_signals?.approach_traffic_minutes
        const b = typeof base === "number" ? base : 10
        const trafficMinutes = jitterTrafficMinutes(b)
        return {
          station,
          distanceKm,
          trafficMinutes,
          etaMinutes: estimateDriveMinutes(distanceKm, trafficMinutes),
        }
      })

      const routeDestinations = withTraffic
        .map((p) => ({ id: p.station.id, lat: p.station.lat, lng: p.station.lng }))
        .filter((d): d is { id: string; lat: number; lng: number } => d.lat != null && d.lng != null)

      if (routeDestinations.length === 0) {
        return [...withTraffic].sort((a, b) => a.etaMinutes - b.etaMinutes).slice(0, 3)
      }

      const routeEtaMap = await fetchRouteEtaMinutes({
        originLat: loc.lat,
        originLng: loc.lng,
        destinations: routeDestinations,
      })
      const synced =
        routeEtaMap.size === 0
          ? withTraffic
          : withTraffic.map((p) => ({
              ...p,
              etaMinutes: routeEtaMap.get(p.station.id) ?? p.etaMinutes,
            }))
      return [...synced].sort((a, b) => a.etaMinutes - b.etaMinutes).slice(0, 3)
    },
    []
  )

  // Conversation state
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [displayedMessages, setDisplayedMessages] = useState<ConversationMessage[]>([])
  const [actions, setActions] = useState<AgentAction[]>([])
  const [coordinationCart, setCoordinationCart] = useState<DemoCartState | null>(null)
  const [coordinationCheckout, setCoordinationCheckout] = useState<DemoCheckoutState | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [textInput, setTextInput] = useState("")
  const [demoReady, setDemoReady] = useState(false)

  // Voice state
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [voiceState, setVoiceState] = useState<"idle" | "ready" | "listening" | "processing" | "speaking">("idle")
  const [interimText, setInterimText] = useState("")
  const [voiceSupported, setVoiceSupported] = useState(false)
  const [retellActive, setRetellActive] = useState(false)
  const [retellConnecting, setRetellConnecting] = useState(false)
  const [retellCallId, setRetellCallId] = useState<string | null>(null)
  const [retellSessionId, setRetellSessionId] = useState<string | null>(null)
  const [retellReady, setRetellReady] = useState(false)

  // Refs
  const scrollRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)
  const wakeDetectedRef = useRef(false)
  const voiceStateRef = useRef(voiceState)
  const messagesRef = useRef(messages)
  const displayedMessagesRef = useRef<ConversationMessage[]>([])
  const retellActiveRef = useRef(retellActive)
  const retellClientRef = useRef<{
    startCall?: (params: { accessToken: string }) => Promise<void> | void
    stopCall?: () => Promise<void> | void
    on?: (event: string, handler: (...args: unknown[]) => void) => void
  } | null>(null)
  const retellSeenLineIdsRef = useRef<Set<string>>(new Set())
  // Turn-based tracking: always replace current speaker's message until speaker changes
  const retellCurrentSpeakerRef = useRef<"agent" | "customer" | null>(null)
  const retellAgentHasSpokenRef = useRef(false)
  const stationsRef = useRef<StationWithSignals[]>([])
  const customersRef = useRef<CustomerWithProfile[]>([])
  const selectedStationIdRef = useRef<string>("")
  const selectedCustomerIdRef = useRef<string>("")
  const routingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const proxyFlushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pendingMessagesRef = useRef<ConversationMessage[]>([])
  const nearestByCustomerCacheRef = useRef<Map<string, NearestStationPick[]>>(new Map())

  useEffect(() => {
    stationsRef.current = stations
  }, [stations])

  useEffect(() => {
    customersRef.current = customers
  }, [customers])

  useEffect(() => {
    selectedStationIdRef.current = selectedStationId
  }, [selectedStationId])

  useEffect(() => {
    selectedCustomerIdRef.current = selectedCustomerId
  }, [selectedCustomerId])

  useEffect(() => {
    voiceStateRef.current = voiceState
  }, [voiceState])

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(() => {
    displayedMessagesRef.current = displayedMessages
  }, [displayedMessages])

  // UI transcript proxy: buffer live transcript updates and release them gradually.
  useEffect(() => {
    pendingMessagesRef.current = messages

    if (messages.length === 0) {
      if (proxyFlushTimerRef.current) {
        window.clearInterval(proxyFlushTimerRef.current)
        proxyFlushTimerRef.current = null
      }
      setDisplayedMessages([])
      return
    }

    if (proxyFlushTimerRef.current) return

    proxyFlushTimerRef.current = window.setInterval(() => {
      const target = pendingMessagesRef.current
      const current = displayedMessagesRef.current
      const next = getNextProxyMessages(current, target)

      if (!areConversationMessagesEqual(current, next)) {
        setDisplayedMessages(next)
      }

      if (areConversationMessagesEqual(next, target)) {
        if (proxyFlushTimerRef.current) {
          window.clearInterval(proxyFlushTimerRef.current)
          proxyFlushTimerRef.current = null
        }
      }
    }, 220)
  }, [messages])

  useEffect(() => {
    return () => {
      if (proxyFlushTimerRef.current) {
        window.clearInterval(proxyFlushTimerRef.current)
        proxyFlushTimerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    retellActiveRef.current = retellActive
  }, [retellActive])

  // Check voice support
  useEffect(() => {
    const SR =
      typeof window !== "undefined"
        ? (window as unknown as Record<string, unknown>).SpeechRecognition ||
          (window as unknown as Record<string, unknown>).webkitSpeechRecognition
        : null
    setVoiceSupported(!!SR && typeof window !== "undefined" && "speechSynthesis" in window)
    if (typeof window !== "undefined") synthRef.current = window.speechSynthesis
  }, [])

  // Load Retell client only on browser
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const mod = await import("retell-client-js-sdk")
        const RetellCtor = (mod as unknown as { default?: new () => unknown; RetellWebClient?: new () => unknown }).default
          ?? (mod as unknown as { default?: new () => unknown; RetellWebClient?: new () => unknown }).RetellWebClient
        if (!cancelled && RetellCtor) {
          retellClientRef.current = new RetellCtor() as {
            startCall?: (params: { accessToken: string }) => Promise<void> | void
            stopCall?: () => Promise<void> | void
            on?: (event: string, handler: (...args: unknown[]) => void) => void
          }
          retellClientRef.current.on?.("update", (...args: unknown[]) => {
            const event = (args[0] ?? {}) as Record<string, unknown>
            handleRetellUpdate(event)
          })
          retellClientRef.current.on?.("call_ended", () => {
            if (retellActiveRef.current) {
              void stopRetellCall("remote")
            }
          })
          setRetellReady(true)
        }
      } catch (err) {
        console.error("Failed to load Retell client:", err)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  // Load data (use cache if preloaded so switching back to demo is instant)
  useEffect(() => {
    if (authLoading) return
    const cachedStations = getCached("stationsDemoExpressV1")
    const cachedCustomers = getCached("customersDemoV2")
    if (cachedStations != null && cachedCustomers != null) {
      setStations(cachedStations as StationWithSignals[])
      setCustomers(cachedCustomers)
      return
    }
    loadStations()
    loadCustomers()
  }, [authLoading, getCached])

  // Load visit history
  useEffect(() => {
    if (!selectedCustomerId) {
      setVisitSummary(null)
      setLoadingVisits(false)
      setDemoReady(false)
      return
    }

    let cancelled = false
    setLoadingVisits(true)

    ;(async () => {
      try {
        const visitsResult = await withRetry(() =>
          withTimeout(
            Promise.resolve(
              supabase
                .from("customer_visits")
                .select("*, customer_visit_items(*)")
                .eq("customer_id", selectedCustomerId)
                .order("visited_at", { ascending: false })
            ),
            5000
          )
        ) as { data: Record<string, unknown>[] | null }
        if (cancelled) return

        const allVisits = visitsResult.data ?? []

        if (allVisits.length > 0) {
          const sMap = new Map(stations.map((s) => [s.id, s.name]))
          const visitStationIds = [...new Set(allVisits.map((v) => v.station_id as string))]
          const missingIds = visitStationIds.filter((id) => !sMap.has(id))
          if (missingIds.length > 0) {
            const extra = await withRetry(() =>
              withTimeout(
                Promise.resolve(
                  supabase.from("stations").select("id, name").in("id", missingIds)
                ),
                5000
              )
            )
            for (const row of extra.data ?? []) {
              sMap.set(row.id, row.name)
            }
          }

          let totalSpend = 0, totalPoints = 0, totalFuel = 0, totalEv = 0
          const catCounts = new Map<string, number>()
          const itemCounts = new Map<string, number>()
          const payCounts = new Map<string, number>()

          for (const v of allVisits) {
            totalSpend += Number(v.total_amount)
            totalPoints += (v.loyalty_points_earned ?? 0) as number
            if (v.fuel_liters) totalFuel += Number(v.fuel_liters)
            if (v.ev_kwh_charged) totalEv += Number(v.ev_kwh_charged)
            for (const c of ((v.service_categories ?? []) as string[])) catCounts.set(c, (catCounts.get(c) ?? 0) + 1)
            payCounts.set(v.payment_method as string, (payCounts.get(v.payment_method as string) ?? 0) + 1)

            const items = (v.customer_visit_items ?? []) as Record<string, unknown>[]
            for (const item of items) {
              if (item.item_category !== "fuel") itemCounts.set(item.item_name as string, (itemCounts.get(item.item_name as string) ?? 0) + (item.quantity as number))
            }
          }

          setVisitSummary({
            total_visits: allVisits.length,
            total_spend: Math.round(totalSpend * 100) / 100,
            total_loyalty_points: totalPoints,
            avg_visit_amount: Math.round((totalSpend / allVisits.length) * 100) / 100,
            total_fuel_liters: Math.round(totalFuel * 100) / 100,
            total_ev_kwh: Math.round(totalEv * 100) / 100,
            favorite_categories: [...catCounts.entries()].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count),
            favorite_items: [...itemCounts.entries()].map(([item, count]) => ({ item, count })).sort((a, b) => b.count - a.count).slice(0, 5),
            payment_breakdown: [...payCounts.entries()].map(([method, count]) => ({ method, count })).sort((a, b) => b.count - a.count),
            recent_visits: allVisits.slice(0, 5).map((v) => ({
              id: v.id as string, customer_id: v.customer_id as string, station_id: v.station_id as string,
              station_name: sMap.get(v.station_id as string) ?? (v.station_id as string),
              visited_at: v.visited_at as string, total_amount: Number(v.total_amount),
              payment_method: v.payment_method as "cash" | "card" | "adnoc_wallet" | "apple_pay",
              loyalty_points_earned: (v.loyalty_points_earned ?? 0) as number,
              fuel_type: v.fuel_type as string | null,
              fuel_liters: v.fuel_liters ? Number(v.fuel_liters) : null,
              ev_kwh_charged: v.ev_kwh_charged ? Number(v.ev_kwh_charged) : null,
              service_categories: (v.service_categories ?? []) as string[],
              notes: v.notes as string | null,
            })),
          })
        } else {
          setVisitSummary(null)
        }

      } catch (err) {
        console.error("Failed to load context:", err)
        setVisitSummary(null)
      } finally {
        if (!cancelled) {
          setLoadingVisits(false)
        }
      }
    })()

    return () => { cancelled = true }
  }, [selectedCustomerId, selectedStationId, stations])

  // Auto-scroll conversation
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [displayedMessages, actions, interimText])

  // Check if demo is ready
  useEffect(() => {
    setDemoReady(!!selectedStationId && !!selectedCustomerId)
  }, [selectedStationId, selectedCustomerId])

  // When a customer is selected, deduce home location and pick the 3 nearest express_demo stations
  useEffect(() => {
    let cancelled = false
    setNearestLoading(true)
    setDeducedLocationError("")
    setNearestThreeResults([])

    if (!selectedCustomerId || stations.length === 0) {
      setSelectedStationId("")
      setNearestLoading(false)
      return
    }

    const cust = customers.find((c) => c.id === selectedCustomerId)
    if (!cust) {
      setDeducedLocationError("Customer not found.")
      setSelectedStationId("")
      setNearestLoading(false)
      return
    }
    const loc = cust?.demo_location
    if (!loc) {
      setDeducedLocationError("No saved home location for this customer in the database.")
      setSelectedStationId("")
      setNearestLoading(false)
      return
    }

    const setTopThree = (items: NearestStationPick[]) => {
      if (cancelled) return
      if (items.length === 0) {
        setDeducedLocationError("No stations with coordinates found.")
        setSelectedStationId("")
        setNearestLoading(false)
        return
      }
      setNearestThreeResults(items)
      setSelectedStationId(items[0].station.id)
      setNearestLoading(false)
    }

    const cached = nearestByCustomerCacheRef.current.get(selectedCustomerId)
    if (cached && cached.length > 0) {
      setTopThree(cached)
    }

    void (async () => {
      const fresh = await buildNearestForCustomer(cust, stations)
      if (!fresh) {
        setTopThree([])
        return
      }
      nearestByCustomerCacheRef.current.set(selectedCustomerId, fresh)
      setTopThree(fresh)
    })()

    return () => {
      cancelled = true
    }
  }, [selectedCustomerId, stations, customers, buildNearestForCustomer])

  // Pre-warm nearest station cache right after app data loads.
  useEffect(() => {
    if (stations.length === 0 || customers.length === 0) return
    for (const c of customers) {
      if (!c.demo_location) continue
      if (nearestByCustomerCacheRef.current.has(c.id)) continue
      void (async () => {
        const picks = await buildNearestForCustomer(c, stations)
        if (picks && picks.length > 0) {
          nearestByCustomerCacheRef.current.set(c.id, picks)
        }
      })()
    }
  }, [stations, customers, buildNearestForCustomer])

  // Keep all displayed ETAs synced to live route metrics for the selected customer.
  useEffect(() => {
    let cancelled = false
    const loc = selectedCustomer?.demo_location
    if (!loc || nearestThreeResults.length === 0) {
      return
    }
    const destinations = nearestThreeResults
      .map((p) => ({ id: p.station.id, lat: p.station.lat, lng: p.station.lng }))
      .filter((d): d is { id: string; lat: number; lng: number } => d.lat != null && d.lng != null)
    if (destinations.length === 0) return

    void (async () => {
      const routeEtaMap = await fetchRouteEtaMinutes({
        originLat: loc.lat,
        originLng: loc.lng,
        destinations,
      })
      if (routeEtaMap.size === 0) return
      if (cancelled) return

      setNearestThreeResults((prev) => {
        let changed = false
        const next = prev.map((p) => {
          const eta = routeEtaMap.get(p.station.id)
          if (eta == null || eta === p.etaMinutes) return p
          changed = true
          return { ...p, etaMinutes: eta }
        })
        if (changed && selectedCustomerId) {
          nearestByCustomerCacheRef.current.set(selectedCustomerId, next)
        }
        return changed ? next : prev
      })
    })()

    return () => {
      cancelled = true
    }
  }, [selectedCustomer, selectedCustomerId, nearestThreeResults])

  // ─── Data Loading ─────────────────────────────────────────

  async function loadStations() {
    try {
      const { data: stationData } = await withRetry(() =>
        withTimeout(
          supabase
            .from("stations")
            .select("id, name, city, region, lat, lng, ev_charging, car_care, fnb, services, facilities, address, operating_hours, station_type")
            .eq("station_type", "express_demo")
            .neq("name", "ADNOC Express The Greens")
            .order("name")
        )
      )

      const ids = (stationData ?? []).map((s) => s.id)
      const { data: signalData } =
        ids.length > 0
          ? await withRetry(() =>
              withTimeout(
                supabase.from("station_operational_signals").select("*").in("station_id", ids)
              )
            )
          : { data: [] as Record<string, unknown>[] }

      const signalMap = new Map((signalData ?? []).map((s) => [(s as { station_id: string }).station_id, s]))

      const list = (stationData ?? []).map((st) => ({
        ...st,
        operational_signals: (signalMap.get(st.id) as StationOperationalSignal) ?? null,
      }))
      setStations(list)
      setCache("stationsDemoExpressV1", list)
    } catch (err) {
      console.error("Failed to load stations:", err)
      setStations([])
    }
  }

  async function loadCustomers() {
    try {
      const { data: custData } = await withRetry(() =>
        withTimeout(
          supabase
            .from("customers")
            .select("id, first_name, last_name, loyalty_tier, preferred_language, voice_enabled, created_at")
            .order("first_name")
        )
      )

      const { data: profileData } = await withRetry(() =>
        withTimeout(
          supabase.from("customer_behavior_profiles").select("*")
        )
      )

      const { data: demoLocData } = await withRetry(() =>
        withTimeout(
          supabase.from("customer_demo_locations").select("customer_id, label, lat, lng")
        )
      )

      const profileMap = new Map((profileData ?? []).map((p) => [p.customer_id, p]))
      const demoLocMap = new Map(
        (demoLocData ?? []).map((row) => [
          row.customer_id,
          { label: row.label, lat: row.lat, lng: row.lng },
        ])
      )

      const list = (custData ?? []).map((c) => ({
        ...(c as Customer),
        profile: profileMap.get(c.id)
          ? {
              id: profileMap.get(c.id)!.id,
              customer_id: profileMap.get(c.id)!.customer_id,
              favorite_product: profileMap.get(c.id)!.favorite_product,
              avg_basket_value: Number(profileMap.get(c.id)!.avg_basket_value),
              visits_per_week: profileMap.get(c.id)!.visits_per_week,
              upsell_acceptance_score: Number(profileMap.get(c.id)!.upsell_acceptance_score),
              price_sensitivity_score: Number(profileMap.get(c.id)!.price_sensitivity_score),
            }
          : undefined,
        demo_location: demoLocMap.get(c.id),
      }))
      const personaOrder: Record<string, number> = { Sarah: 0, Khalid: 1, Omar: 2, Mariam: 3, Layla: 4, Nasser: 5 }
      const filtered = list
        .sort((a, b) => (personaOrder[a.first_name] ?? 999) - (personaOrder[b.first_name] ?? 999))
        .slice(0, 6)
      setCustomers(filtered)
      setCache("customersDemoV2", filtered)
    } catch (err) {
      console.error("Failed to load customers:", err)
      setCustomers([])
    }
  }

  // ─── Conversation Logic ───────────────────────────────────

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || !selectedStationId || !selectedCustomerId || isProcessing) return

      const currentTrigger = activeTrigger
      const availableTriggers: TriggerType[] = [activeTrigger]

      const timestamp = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })

      // Add customer message
      const customerMsg: ConversationMessage = { role: "customer", text: text.trim(), timestamp }
      setMessages((prev) => [...prev, customerMsg])
      setTextInput("")
      setIsProcessing(true)
      setVoiceState("processing")

      try {
        const history = messagesRef.current.map((m) => ({ role: m.role, text: m.text }))

        const loc = selectedCustomer?.demo_location
        let stationIdForRequest = selectedStationId
        if (loc && stations.length > 0) {
          const catalog = stationRowsToExpressPayloads(stations, loc.lat, loc.lng)
          stationIdForRequest = resolveExpressPrimaryStationId(text.trim(), selectedStationId, catalog, loc.lat, loc.lng)
          if (stationIdForRequest !== selectedStationId) {
            setSelectedStationId(stationIdForRequest)
          }
        }

        const expressDemoContext =
          loc && stations.length > 0
            ? buildExpressDemoContext({
                userLabel: loc.label,
                userLat: loc.lat,
                userLng: loc.lng,
                primaryStationId: stationIdForRequest,
                customerProfile: selectedCustomer
                  ? {
                      favorite_product: selectedCustomer.profile?.favorite_product ?? null,
                      avg_basket_value: selectedCustomer.profile?.avg_basket_value ?? null,
                      preferred_language: selectedCustomer.preferred_language ?? null,
                      loyalty_tier: selectedCustomer.loyalty_tier ?? null,
                    }
                  : undefined,
                upsellOffers: buildUpsellOffers({
                  favoriteProduct: selectedCustomer?.profile?.favorite_product ?? null,
                }),
                nearestThree: nearestThreeResults.map((p) => ({
                  station_id: p.station.id,
                  name: p.station.name,
                  station_name: p.station.name,
                  distance_km: p.distanceKm,
                  traffic_minutes: p.trafficMinutes,
                  eta_minutes: p.etaMinutes,
                })),
                stations: stationRowsToExpressPayloads(stations, loc.lat, loc.lng),
              })
            : null

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/voice-concierge`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              customer_id: selectedCustomerId,
              station_id: stationIdForRequest,
              trigger_type: currentTrigger,
              available_triggers: availableTriggers,
              distance_km: nearestThreeResults[0]?.distanceKm ?? null,
              message: text.trim(),
              conversation_history: history,
              express_demo_context: expressDemoContext,
              express_demo_context_json: expressDemoContext ? JSON.stringify(expressDemoContext) : null,
            }),
          }
        )

        const data = (await res.json()) as {
          reply?: string
          actions?: Array<{ type: string; label: string; detail: string }>
          routing?: { active_station_id?: string }
        }
        const replyTimestamp = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })

        // Add agent response
        const agentMsg: ConversationMessage = {
          role: "agent",
          text: data.reply || "I couldn't process that. Please try again.",
          timestamp: replyTimestamp,
        }
        setMessages((prev) => [...prev, agentMsg])

        if (data.routing?.active_station_id && stations.some((s) => s.id === data.routing!.active_station_id)) {
          setSelectedStationId(data.routing.active_station_id)
        }

        // Add actions
        if (data.actions && data.actions.length > 0) {
          const newActions: AgentAction[] = data.actions.map(
            (a: { type: string; label: string; detail: string }) => ({
              ...a,
              timestamp: replyTimestamp,
            })
          )
          setActions((prev) => [...prev, ...newActions])
        }

        // Speak the response if voice is enabled
        if (voiceEnabled && synthRef.current) {
          setVoiceState("speaking")
          await speakText(data.reply || "")
          setVoiceState("listening")
          restartRecognition()
        } else {
          setVoiceState(wakeDetectedRef.current ? "listening" : "ready")
        }
      } catch (err) {
        console.error("Error calling voice-concierge:", err)
        const errorMsg: ConversationMessage = {
          role: "system",
          text: "Connection error. Please try again.",
          timestamp: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        }
        setMessages((prev) => [...prev, errorMsg])
        setVoiceState(wakeDetectedRef.current ? "listening" : "ready")
      } finally {
        setIsProcessing(false)
      }
    },
    [
      selectedStationId,
      selectedCustomerId,
      selectedCustomer,
      stations,
      isProcessing,
      voiceEnabled,
      activeTrigger,
      nearestThreeResults,
    ]
  )

  // ─── Voice Functions ──────────────────────────────────────

  function speakText(text: string): Promise<void> {
    return new Promise((resolve) => {
      if (!synthRef.current) {
        resolve()
        return
      }
      synthRef.current.cancel()

      const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
      let idx = 0

      function speakNext() {
        if (idx >= sentences.length) {
          resolve()
          return
        }
        const utterance = new SpeechSynthesisUtterance(sentences[idx].trim())
        utterance.rate = 0.92
        utterance.pitch = 1.0
        utterance.lang = "en-US"

        const voices = synthRef.current?.getVoices() || []
        const voice =
          voices.find((v) => v.name.includes("Samantha")) ||
          voices.find((v) => v.name.includes("Google") && v.lang.startsWith("en")) ||
          voices.find((v) => v.lang.startsWith("en") && v.localService)
        if (voice) utterance.voice = voice

        utterance.onend = () => {
          idx++
          setTimeout(speakNext, 700) // intelligent pause
        }
        utterance.onerror = () => {
          idx++
          speakNext()
        }
        synthRef.current?.speak(utterance)
      }

      speakNext()
    })
  }

  function startVoiceListening() {
    const SR =
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition
    if (!SR) return

    if (recognitionRef.current) {
      try { recognitionRef.current.abort() } catch { /* ignore */ }
    }

    const recognition = new (SR as new () => SpeechRecognition)()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = "en-US"

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = ""
      let final = ""
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript
        if (event.results[i].isFinal) final += t
        else interim += t
      }

      setInterimText(interim)

      if (!wakeDetectedRef.current) {
        const combined = (final + " " + interim).toLowerCase()
        if (combined.includes("hey adnoc")) {
          wakeDetectedRef.current = true
          setVoiceState("listening")
          setInterimText("")

          // Auto-send greeting
          setTimeout(() => sendMessage("Hey ADNOC"), 300)
          return
        }
      } else if (final.trim()) {
        setInterimText("")
        sendMessage(final.trim())
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "not-allowed" || event.error === "aborted") return
      setTimeout(() => {
        if (voiceStateRef.current !== "idle" && voiceStateRef.current !== "speaking") {
          restartRecognition()
        }
      }, 500)
    }

    recognition.onend = () => {
      if (voiceStateRef.current === "listening" || voiceStateRef.current === "ready") {
        setTimeout(() => {
          if (voiceStateRef.current !== "idle" && voiceStateRef.current !== "speaking") {
            try { recognition.start() } catch { /* ignore */ }
          }
        }, 100)
      }
    }

    recognitionRef.current = recognition
    try {
      recognition.start()
      setVoiceState("ready")
    } catch { /* ignore */ }
  }

  function restartRecognition() {
    if (recognitionRef.current) {
      try { recognitionRef.current.abort() } catch { /* ignore */ }
    }
    if (voiceStateRef.current !== "idle") {
      setTimeout(() => startVoiceListening(), 200)
    }
  }

  function stopVoice() {
    if (recognitionRef.current) {
      try { recognitionRef.current.abort() } catch { /* ignore */ }
      recognitionRef.current = null
    }
    if (synthRef.current) synthRef.current.cancel()
    wakeDetectedRef.current = false
    setInterimText("")
    setVoiceState("idle")
    setVoiceEnabled(false)
  }

  function toggleVoice() {
    if (voiceEnabled) {
      stopVoice()
    } else {
      setVoiceEnabled(true)
      startVoiceListening()
    }
  }

  // Cleanup
  useEffect(() => {
    return () => {
      if (recognitionRef.current) try { recognitionRef.current.abort() } catch { /* ignore */ }
      if (synthRef.current) synthRef.current.cancel()
    }
  }, [])

  // Reset conversation when selections change
  function resetConversation() {
    setMessages([])
    setActions([])
    setCoordinationCart(null)
    setCoordinationCheckout(null)
    setActiveRoutePreview(null)
    setInterimText("")
    setRetellSessionId(null)
    wakeDetectedRef.current = false
    if (voiceEnabled) {
      setVoiceState("ready")
    }
  }

  useEffect(() => {
    resetConversation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCustomerId])

  useEffect(() => {
    if (!retellCallId) return
    void pollRetellTranscript(retellCallId)
    const interval = window.setInterval(() => {
      void pollRetellTranscript(retellCallId)
    }, 1200)
    return () => window.clearInterval(interval)
  }, [retellCallId])

  // Realtime push: backend session coordination events should show immediately.
  useEffect(() => {
    if (!retellSessionId) return
    const channel = supabase
      .channel(`demo_session_coordination_${retellSessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "demo_session_coordination_events",
          filter: `session_id=eq.${retellSessionId}`,
        },
        (payload: { new?: unknown }) => {
          const row = (payload.new ?? {}) as {
            event_type?: string
            title?: string
            detail?: string | null
            payload?: {
              destination?: { stationId?: string; station_id?: string }
              route_state?: DemoRouteState
              active_station_id?: string
              station_id?: string
              cart_state?: DemoCartState
              checkout_state?: DemoCheckoutState
            }
            created_at?: string
          }
          const destinationStationId =
            row.payload?.destination?.stationId ??
            row.payload?.destination?.station_id ??
            row.payload?.active_station_id ??
            row.payload?.station_id
          if ((row.event_type === "route_change" || row.event_type === "station_recommendation") && destinationStationId) {
            if (row.payload?.route_state?.previewUrl) {
              setActiveRoutePreview(row.payload.route_state)
            }
            if (stationsRef.current.some((s) => s.id === destinationStationId)) {
              setSelectedStationId(destinationStationId)
            }
          }
          if (row.payload?.cart_state) {
            setCoordinationCart(row.payload.cart_state)
          }
          if (row.payload?.checkout_state) {
            setCoordinationCheckout(row.payload.checkout_state)
          }
          setActions((prev) => [
            ...prev,
            {
              type: "recommendation",
              label: row.title ?? "Session update",
              detail: row.detail ?? "",
              timestamp: row.created_at
                ? new Date(row.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
                : new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
            },
          ])
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [retellSessionId])

  // Realtime push: when the Retell tool updates the recommendation, UI updates immediately.
  useEffect(() => {
    if (!retellCallId) return
    const channel = supabase
      .channel(`express_demo_reco_${retellCallId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "express_demo_call_recommendations",
          filter: `call_id=eq.${retellCallId}`,
        },
        (payload: { new?: unknown }) => {
          const row = (payload.new ?? {}) as { active_station_id?: string }
          const nextStationId = row.active_station_id
          if (!nextStationId) return
          if (!stationsRef.current.some((s) => s.id === nextStationId)) return
          if (nextStationId === selectedStationIdRef.current) return
          setSelectedStationId(nextStationId)
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [retellCallId])

  // ─── Render ───────────────────────────────────────────────

  const signals = selectedStation?.operational_signals
  const profile = selectedCustomer?.profile
  const displayTier = selectedCustomer
    ? displayLoyaltyTier(selectedCustomer.first_name, selectedCustomer.loyalty_tier)
    : null
  const tierConfig = displayTier ? TIER_CONFIG[displayTier] : null
  const selectedCustomerName = selectedCustomer?.first_name ?? ""
  const selectedRetellAgentId =
    SINGLE_RETELL_AGENT_ID ||
    RETELL_AGENT_IDS_BY_CUSTOMER[selectedCustomer?.first_name ?? ""]
  const isVoiceAgentConfigured = Boolean(selectedRetellAgentId)

  function shouldReplaceTranscriptText(previousText: string, nextText: string): boolean {
    const prev = previousText.trim()
    const next = nextText.trim()
    if (!prev) return true
    if (!next) return false
    if (prev === next) return false

    // Most Retell partial updates grow over time; allow progressive growth.
    if (next.length >= prev.length) return true

    // Guard against short regression updates that can make words "disappear".
    const normalize = (value: string) =>
      value
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .replace(/\s+/g, " ")
        .trim()

    const normalizedPrev = normalize(prev)
    const normalizedNext = normalize(next)
    const smallRegression = normalizedPrev.length - normalizedNext.length <= 3
    return smallRegression
  }

  /**
   * Retell "update" events contain `transcript`: an array of utterances.
   * We use a turn-based approach: always replace the current speaker's message
   * until a different speaker starts talking.
   * Also: hide the first user message (before agent has responded).
   */
  function handleRetellUpdate(event: Record<string, unknown>) {
    const transcript = Array.isArray(event.transcript) ? event.transcript : []
    if (transcript.length === 0) return

    const now = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })

    // Get the LAST entry in the transcript - this is the most recent utterance
    const lastEntry = transcript[transcript.length - 1]
    if (!lastEntry) return

    const row = (lastEntry ?? {}) as Record<string, unknown>
    const role = typeof row.role === "string" ? row.role.toLowerCase() : ""
    const content = typeof row.content === "string" ? row.content.trim() : ""
    if (!content) return

    const speaker: "agent" | "customer" =
      role.includes("agent") || role.includes("assistant") ? "agent" : "customer"

    // Track if agent has ever spoken (to know whether to show user messages)
    if (speaker === "agent") {
      retellAgentHasSpokenRef.current = true
    }

    // If this is a user message and agent hasn't spoken yet, skip displaying
    // but still track the speaker for turn detection
    if (speaker === "customer" && !retellAgentHasSpokenRef.current) {
      retellCurrentSpeakerRef.current = speaker
      return
    }

    const previousSpeaker = retellCurrentSpeakerRef.current
    const isSameSpeaker = previousSpeaker === speaker

    // Update current speaker ref
    retellCurrentSpeakerRef.current = speaker

    setMessages((prev) => {
      // If same speaker is continuing, replace their last message
      if (isSameSpeaker && prev.length > 0) {
        // Find the last message from this speaker
        for (let i = prev.length - 1; i >= 0; i--) {
          if (prev[i].role === speaker) {
            const existingText = prev[i].text
            if (!shouldReplaceTranscriptText(existingText, content)) {
              return prev
            }
            // Replace this message's text
            const next = [...prev]
            next[i] = { ...next[i], text: content, timestamp: now }
            return next
          }
        }
      }

      // Check if we already have this exact content to avoid duplicates
      const alreadyExists = prev.some(m => m.role === speaker && m.text === content)
      if (alreadyExists) return prev

      // New speaker turn - append new message
      return [...prev, { role: speaker, text: content, timestamp: now }]
    })

    if (speaker === "customer" && retellAgentHasSpokenRef.current && content.length >= 10) {
      if (routingDebounceRef.current) clearTimeout(routingDebounceRef.current)
      routingDebounceRef.current = setTimeout(() => {
        const cust = customersRef.current.find((c) => c.id === selectedCustomerIdRef.current)
        const loc = cust?.demo_location
        if (!loc || stationsRef.current.length === 0) return
        const catalog = stationRowsToExpressPayloads(stationsRef.current, loc.lat, loc.lng)
        const next = resolveExpressPrimaryStationId(content, selectedStationIdRef.current, catalog, loc.lat, loc.lng)
        if (next !== selectedStationIdRef.current) setSelectedStationId(next)
      }, 500)
    }
  }

  async function pollRetellTranscript(callId: string) {
    try {
      const res = await fetch(`/api/retell/transcript?callId=${encodeURIComponent(callId)}`)
      if (!res.ok) return
      const data = await res.json() as {
        status?: "active" | "ended"
        lines?: Array<{ id: string; speaker: "agent" | "customer" | "system"; text: string; timestamp: string }>
      }

      // Mark all line IDs as seen (webhook data is typically finalized)
      const newLines = (data.lines ?? []).filter((line) => {
        if (retellSeenLineIdsRef.current.has(line.id)) return false
        retellSeenLineIdsRef.current.add(line.id)
        return true
      })

      // Polling is mainly a fallback - real-time updates handle most cases
      // Only add finalized messages that aren't already displayed
      if (newLines.length > 0) {
        const now = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })

        setMessages((prev) => {
          const next = [...prev]
          for (const line of newLines) {
            if (line.speaker === "system") continue
            const speaker: "agent" | "customer" = line.speaker === "agent" ? "agent" : "customer"
            const content = line.text.trim()
            if (!content) continue

            // Track agent has spoken
            if (speaker === "agent") {
              retellAgentHasSpokenRef.current = true
            }

            // Skip first user message if agent hasn't spoken
            if (speaker === "customer" && !retellAgentHasSpokenRef.current) continue

            // Check if this exact content is already in messages
            const alreadyExists = next.some(m => m.role === speaker && m.text === content)
            if (alreadyExists) continue

            // If polling gets a finalized update for the same speaker turn,
            // prefer updating the latest message instead of appending duplicates.
            const lastMessage = next[next.length - 1]
            if (lastMessage?.role === speaker) {
              if (shouldReplaceTranscriptText(lastMessage.text, content)) {
                next[next.length - 1] = {
                  ...lastMessage,
                  text: content,
                  timestamp: line.timestamp || now,
                }
              }
              continue
            }

            next.push({ role: speaker, text: content, timestamp: line.timestamp || now })
          }
          return next
        })
      }

      if (data.status === "ended" && retellActive) {
        await stopRetellCall("remote")
      }
    } catch (err) {
      console.error("Failed to poll Retell transcript:", err)
    }
  }

  async function startRetellCallForSelectedCustomer() {
    if (!demoReady || !isVoiceAgentConfigured || !retellReady || !retellClientRef.current) return

    const customerName = `${selectedCustomer?.first_name ?? ""} ${selectedCustomer?.last_name ?? ""}`.trim() || selectedCustomerName
    const conversationHistory = messagesRef.current.map((m) => `${m.role}: ${m.text}`).join("\n")
    const nearest = nearestThreeResults[0]

    const demoLoc = selectedCustomer?.demo_location
    let expressDemoContextJson = ""
    if (demoLoc && stations.length > 0) {
      const catalog = stationRowsToExpressPayloads(stations, demoLoc.lat, demoLoc.lng)
      expressDemoContextJson = JSON.stringify(
        buildExpressDemoContext({
          userLabel: demoLoc.label,
          userLat: demoLoc.lat,
          userLng: demoLoc.lng,
          primaryStationId: selectedStationId,
          customerProfile: selectedCustomer
            ? {
                favorite_product: selectedCustomer.profile?.favorite_product ?? null,
                avg_basket_value: selectedCustomer.profile?.avg_basket_value ?? null,
                preferred_language: selectedCustomer.preferred_language ?? null,
                loyalty_tier: selectedCustomer.loyalty_tier ?? null,
              }
            : undefined,
          upsellOffers: buildUpsellOffers({
            favoriteProduct: selectedCustomer?.profile?.favorite_product ?? null,
          }),
          nearestThree: nearestThreeResults.map((p) => ({
            station_id: p.station.id,
            name: p.station.name,
            station_name: p.station.name,
            distance_km: p.distanceKm,
            traffic_minutes: p.trafficMinutes,
            eta_minutes: p.etaMinutes,
          })),
          stations: catalog,
        })
      )
    }

    const res = await fetch("/api/retell/create-call", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(selectedRetellAgentId ? { agentId: selectedRetellAgentId } : {}),
        profileId: selectedCustomerId,
        scenarioId: activeScenario?.id,
        dynamicVariables: {
          profile_id: selectedCustomerId,
          scenario_id: activeScenario?.id ?? "",
          customer_id: selectedCustomerId,
          customer_name: customerName,
          station_id: selectedStationId,
          station_name: selectedStation?.name ?? "",
          trigger_type: activeTrigger ?? "arrival",
          conversation_history: conversationHistory,
          express_demo_context: expressDemoContextJson,
          express_demo_context_json: expressDemoContextJson,
          primary_station_id: selectedStationId,
          primary_station_name: selectedStation?.name ?? "",
          nearest_station_id: nearest?.station.id ?? "",
          nearest_station_name: nearest?.station.name ?? "",
          nearest_station_distance_km: nearest?.distanceKm ?? null,
          nearest_station_eta_minutes: nearest?.etaMinutes ?? null,
          nearest_three_json:
            nearestThreeResults.length > 0
              ? JSON.stringify(
                  nearestThreeResults.map((pick) => ({
                    station_id: pick.station.id,
                    station_name: pick.station.name,
                    distance_km: pick.distanceKm,
                    eta_minutes: pick.etaMinutes,
                  }))
                )
              : "[]",
        },
        metadata: {
          customer_id: selectedCustomerId,
          customer_name: customerName,
          station_id: selectedStationId,
          station_name: selectedStation?.name ?? "",
          source: "adnoc-demo-chat",
          express_demo_context: expressDemoContextJson,
          express_demo_context_json: expressDemoContextJson,
        },
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(errText || "Failed to create Retell call")
    }

    const data = await res.json() as { accessToken?: string; callId?: string; sessionId?: string }
    if (!data.accessToken || !data.callId) throw new Error("Retell response missing accessToken/callId")

    retellSeenLineIdsRef.current = new Set()
    retellCurrentSpeakerRef.current = null
    retellAgentHasSpokenRef.current = false
    setActiveRoutePreview(null)
    setCoordinationCart(null)
    setCoordinationCheckout(null)
    setActions([])
    setRetellCallId(data.callId)
    setRetellSessionId(data.sessionId ?? null)
    setRetellActive(true)
    setVoiceEnabled(true)
    setVoiceState("listening")

    await retellClientRef.current.startCall?.({ accessToken: data.accessToken })

  }

  async function stopRetellCall(source: "local" | "remote" = "local") {
    try {
      if (source === "local") {
        await retellClientRef.current?.stopCall?.()
      }
    } catch (err) {
      console.error("Failed to stop Retell call:", err)
    } finally {
      setRetellActive(false)
      setRetellCallId(null)
      setRetellSessionId(null)
      setVoiceEnabled(false)
      setVoiceState("idle")
    }
  }

  async function toggleRetellVoice() {
    if (!demoReady || !isVoiceAgentConfigured) return
    if (retellConnecting) return
    if (retellActive) {
      await stopRetellCall()
      return
    }
    setRetellConnecting(true)
    try {
      await startRetellCallForSelectedCustomer()
    } catch (err) {
      console.error("Failed to start Retell call:", err)
      setMessages((prev) => [
        ...prev,
        {
          role: "system",
          text: `Could not start ${selectedCustomerName || "voice"} session. Please check Retell config and try again.`,
          timestamp: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        },
      ])
    } finally {
      setRetellConnecting(false)
    }
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden">
      {/* Header */}
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight">ADNOC Express Demo</h1>
        <p className="text-sm text-muted-foreground">Voice-activated agentic retail assistant</p>
      </div>

      {/* Main Layout: stack on small screens, two columns on large */}
      <div className="grid min-h-0 min-w-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-12 lg:overflow-hidden">
        {/* LEFT COLUMN: Customer + Station + Trigger */}
        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto lg:col-span-4">
          {/* Customer Selector */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Crown className="h-4 w-4 text-primary" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {customers.map((c) => {
                  const tierLabel = displayLoyaltyTier(c.first_name, c.loyalty_tier)
                  const tc = tierLabel ? TIER_CONFIG[tierLabel] ?? TIER_CONFIG.silver : null
                  const persona = CUSTOMER_PERSONAS[c.first_name]
                  const isSelected = c.id === selectedCustomerId
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCustomerId(c.id)}
                      className={cn(
                        "flex flex-col items-start gap-1 rounded-lg border p-2.5 text-left transition-all",
                        isSelected
                          ? "border-primary bg-primary/10 ring-1 ring-primary"
                          : "border-border hover:border-muted-foreground/30 hover:bg-accent/50"
                      )}
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className="text-sm font-medium">{c.first_name}</span>
                        {tc && tierLabel && (
                          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", tc.color)}>
                            {tierLabel}
                          </Badge>
                        )}
                      </div>
                      {persona && (
                        <span className="text-[10px] font-medium text-primary/70">{persona.tag}</span>
                      )}
                      <span className="text-[11px] text-muted-foreground">
                        {c.profile?.favorite_product ?? "—"} · AED {c.profile?.avg_basket_value ?? "—"}/visit
                      </span>
                    </button>
                  )
                })}
              </div>

              {selectedCustomer && profile && (
                <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                  {/* Customer header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-semibold">
                        {selectedCustomer.first_name} {selectedCustomer.last_name}
                      </span>
                      {CUSTOMER_PERSONAS[selectedCustomer.first_name] && (
                        <p className="text-[11px] text-muted-foreground">
                          {CUSTOMER_PERSONAS[selectedCustomer.first_name].description}
                        </p>
                      )}
                    </div>
                    {tierConfig && displayTier && (
                      <Badge variant="outline" className={cn("gap-1", tierConfig.color)}>
                        {tierConfig.icon && <tierConfig.icon className="h-3 w-3" />}
                        {displayTier}
                      </Badge>
                    )}
                  </div>

                  <Separator />

                  {/* Profile details */}
                  <div className="grid grid-cols-2 gap-y-1.5 text-xs">
                    <div className="text-muted-foreground">Language</div>
                    <div className="font-medium">{selectedCustomer.preferred_language === "ar" ? "Arabic" : "English"}</div>
                    <div className="text-muted-foreground">Favorite</div>
                    <div className="font-medium">{profile.favorite_product}</div>
                    <div className="text-muted-foreground">Avg Basket</div>
                    <div className="font-medium">AED {profile.avg_basket_value}</div>
                    <div className="text-muted-foreground">Visits/Week</div>
                    <div className="font-medium">{profile.visits_per_week}x</div>
                  </div>

                  <Separator />

                  {/* Scoring */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Upsell Acceptance</span>
                      <span className={cn(
                        "font-medium",
                        profile.upsell_acceptance_score > 0.7 ? "text-emerald-400" : profile.upsell_acceptance_score > 0.5 ? "text-amber-400" : "text-red-400"
                      )}>
                        {(profile.upsell_acceptance_score * 100).toFixed(0)}%
                        {" "}{profile.upsell_acceptance_score > 0.7 ? "High" : profile.upsell_acceptance_score > 0.5 ? "Med" : "Low"}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-1.5 rounded-full transition-all",
                          profile.upsell_acceptance_score > 0.7 ? "bg-emerald-500" : profile.upsell_acceptance_score > 0.5 ? "bg-amber-500" : "bg-red-500"
                        )}
                        style={{ width: `${profile.upsell_acceptance_score * 100}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Price Sensitivity</span>
                      <span className={cn(
                        "font-medium",
                        profile.price_sensitivity_score > 0.6 ? "text-red-400" : profile.price_sensitivity_score > 0.3 ? "text-amber-400" : "text-emerald-400"
                      )}>
                        {(profile.price_sensitivity_score * 100).toFixed(0)}%
                        {" "}{profile.price_sensitivity_score > 0.6 ? "High" : profile.price_sensitivity_score > 0.3 ? "Med" : "Low"}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-1.5 rounded-full transition-all",
                          profile.price_sensitivity_score > 0.6 ? "bg-red-500" : profile.price_sensitivity_score > 0.3 ? "bg-amber-500" : "bg-emerald-500"
                        )}
                        style={{ width: `${profile.price_sensitivity_score * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Station (deduced location + 3 nearest) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-primary" />
                Station
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedCustomer?.demo_location && (
                <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Your location</span>
                  <p className="text-xs font-medium">{selectedCustomer.demo_location.label}</p>
                  <p className="text-[10px] text-muted-foreground font-mono tabular-nums">
                    {selectedCustomer.demo_location.lat.toFixed(5)}, {selectedCustomer.demo_location.lng.toFixed(5)}
                  </p>
                </div>
              )}

              {deducedLocationError && (
                <p className="text-[11px] text-destructive">{deducedLocationError}</p>
              )}

              {nearestThreeResults.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">3 nearest stations</span>
                  <div className="space-y-2">
                    {nearestThreeResults.map((pick, idx) => {
                      const isPrimary = pick.station.id === selectedStationId
                      return (
                      <div
                        key={pick.station.id}
                        className={cn(
                          "rounded-lg border p-2.5 space-y-1.5",
                          isPrimary ? "border-primary/60 bg-primary/5" : "border-border bg-muted/20"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-semibold leading-tight">{pick.station.name}</span>
                          {isPrimary ? (
                            <Badge variant="default" className="text-[10px] shrink-0">Primary</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] shrink-0">#{idx + 1}</Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                          <span>{pick.distanceKm.toFixed(1)} km</span>
                          <span className="text-border">·</span>
                          <span className="flex items-center gap-1">
                            <Timer className="h-3 w-3" />
                            ETA ~{pick.etaMinutes} min
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {pick.station.ev_charging && (
                            <Badge variant="secondary" className="text-[10px] gap-0.5 px-1.5 py-0">
                              <BatteryCharging className="h-2.5 w-2.5" /> EV
                            </Badge>
                          )}
                          {(pick.station.services ?? []).slice(0, 3).map((s) => (
                            <Badge key={s} variant="outline" className="text-[10px] font-normal px-1.5 py-0">{s}</Badge>
                          ))}
                        </div>
                      </div>
                      )
                    })}
                  </div>
                </div>
              )}
              {nearestLoading && (
                <div className="rounded-lg border border-border bg-muted/20 p-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Calculating nearest stations and route times...
                  </div>
                </div>
              )}

              {!nearestLoading && routeMapPreview && (
                <div className="space-y-2 rounded-lg border border-border overflow-hidden">
                  <div className="px-3 pt-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Route to primary station
                    </span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{routeDestinationName}</p>
                  </div>
                  <>
                    <iframe
                      key={routeMapPreview.src}
                      title={
                        routeMapPreview.showsDrivingRoute ? "Driving route preview" : "Primary station on map"
                      }
                      className="h-80 w-full border-0 bg-muted"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      src={routeMapPreview.src}
                    />
                    {!routeMapPreview.showsDrivingRoute && (
                      <p className="px-3 text-[10px] text-muted-foreground leading-snug">
                        Preview shows the station location. For the full driving route here, set{" "}
                        <code className="rounded bg-muted px-1">NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY</code> (Maps
                        Embed API).
                      </p>
                    )}
                  </>
                  {routeDirectionsHref && (
                    <div className="px-3 pb-2">
                    <a
                      href={routeDirectionsHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open driving directions in Google Maps
                    </a>
                    </div>
                  )}
                </div>
              )}

              {selectedStation && (
                <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
                  {/* Station header */}
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">{selectedStation.name}</span>
                      <Badge variant="outline" className="text-[10px]">{selectedStation.operating_hours ?? "24/7"}</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {selectedStation.address ?? `${selectedStation.city}, ${selectedStation.region}`}
                    </p>
                  </div>

                  {/* Service badges */}
                  <div className="flex flex-wrap gap-1.5">
                    {selectedStation.ev_charging && (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <BatteryCharging className="h-3 w-3" /> EV Charging
                      </Badge>
                    )}
                    {selectedStation.car_care && selectedStation.car_care.length > 0 && (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <Car className="h-3 w-3" /> Car Care
                      </Badge>
                    )}
                    {selectedStation.fnb && selectedStation.fnb.length > 0 && (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <Coffee className="h-3 w-3" /> F&B
                      </Badge>
                    )}
                  </div>

                  <Separator />

                  {/* F&B brands */}
                  {selectedStation.fnb && selectedStation.fnb.length > 0 && (
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Food & Beverage</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedStation.fnb.map((brand) => (
                          <Badge key={brand} variant="outline" className="text-[10px] font-normal">{brand}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Car care */}
                  {selectedStation.car_care && selectedStation.car_care.length > 0 && (
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Car Care</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedStation.car_care.map((svc) => (
                          <Badge key={svc} variant="outline" className="text-[10px] font-normal">{svc}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Facilities */}
                  {selectedStation.facilities && selectedStation.facilities.length > 0 && (
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Facilities</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedStation.facilities.map((fac) => (
                          <Badge key={fac} variant="outline" className="text-[10px] font-normal">{fac}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Real-time operational signals */}
                  {signals && (
                    <>
                      <Separator />
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Live Operations</span>
                        <div className="grid grid-cols-2 gap-2 mt-1.5 text-xs">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Coffee className="h-3 w-3" />
                            Coffee prep: <span className="font-medium text-foreground">{signals.coffee_prep_time_minutes} min</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Car className="h-3 w-3" />
                            Wash queue: <span className="font-medium text-foreground">{signals.car_wash_queue_minutes} min</span>
                          </div>
                          {selectedStation.ev_charging && (
                            <>
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <BatteryCharging className="h-3 w-3" />
                                EV chargers: <span className="font-medium text-foreground">{signals.ev_chargers_available}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Timer className="h-3 w-3" />
                                Charge time: <span className="font-medium text-foreground">{signals.avg_ev_charge_time_minutes} min</span>
                              </div>
                            </>
                          )}
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            Interior clean:
                            <span className={cn("font-medium", signals.interior_cleaning_available ? "text-emerald-400" : "text-red-400")}>
                              {signals.interior_cleaning_available ? "Available" : "Unavailable"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            Cold drinks:
                            <span className={cn("font-medium", signals.cold_beverage_stock_high ? "text-emerald-400" : "text-amber-400")}>
                              {signals.cold_beverage_stock_high ? "Stocked" : "Low"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Visit History */}
          {selectedCustomerId && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <History className="h-4 w-4 text-primary" />
                  Visit History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingVisits ? (
                  <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Loading history...
                  </div>
                ) : visitSummary ? (
                  <div className="space-y-3">
                    {/* KPI row */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-md border border-border bg-muted/30 p-2 text-center">
                        <div className="text-lg font-bold text-primary">{visitSummary.total_visits}</div>
                        <div className="text-[10px] text-muted-foreground">Visits</div>
                      </div>
                      <div className="rounded-md border border-border bg-muted/30 p-2 text-center">
                        <div className="text-lg font-bold text-emerald-400">AED {visitSummary.total_spend.toLocaleString()}</div>
                        <div className="text-[10px] text-muted-foreground">Total Spend</div>
                      </div>
                      <div className="rounded-md border border-border bg-muted/30 p-2 text-center">
                        <div className="text-lg font-bold text-amber-400">{visitSummary.total_loyalty_points.toLocaleString()}</div>
                        <div className="text-[10px] text-muted-foreground">Points</div>
                      </div>
                    </div>

                    {/* Fuel / EV stats */}
                    <div className="flex gap-2">
                      {visitSummary.total_fuel_liters > 0 && (
                        <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 py-1.5 flex-1">
                          <Droplets className="h-3.5 w-3.5 text-amber-400" />
                          <div>
                            <div className="text-xs font-semibold">{visitSummary.total_fuel_liters}L</div>
                            <div className="text-[10px] text-muted-foreground">Fuel</div>
                          </div>
                        </div>
                      )}
                      {visitSummary.total_ev_kwh > 0 && (
                        <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 py-1.5 flex-1">
                          <Zap className="h-3.5 w-3.5 text-emerald-400" />
                          <div>
                            <div className="text-xs font-semibold">{visitSummary.total_ev_kwh} kWh</div>
                            <div className="text-[10px] text-muted-foreground">EV Charged</div>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 py-1.5 flex-1">
                        <TrendingUp className="h-3.5 w-3.5 text-sky-400" />
                        <div>
                          <div className="text-xs font-semibold">AED {visitSummary.avg_visit_amount}</div>
                          <div className="text-[10px] text-muted-foreground">Avg Visit</div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Top purchased items */}
                    {visitSummary.favorite_items.length > 0 && (
                      <div>
                        <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Most Purchased</p>
                        <div className="space-y-1">
                          {visitSummary.favorite_items.map((fi) => (
                            <div key={fi.item} className="flex items-center justify-between text-xs">
                              <span className="truncate">{fi.item}</span>
                              <span className="text-muted-foreground ml-2 shrink-0">{fi.count}x</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Service categories used */}
                    <div>
                      <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Services Used</p>
                      <div className="flex flex-wrap gap-1">
                        {visitSummary.favorite_categories.map((fc) => {
                          const catLabels: Record<string, string> = {
                            fuel: "Fuel", ev_charging: "EV Charging", coffee: "Coffee",
                            food: "Food", beverages: "Beverages", car_wash: "Car Wash",
                            car_care: "Car Care", interior_cleaning: "Interior Clean", shop: "Shop",
                          }
                          return (
                            <Badge key={fc.category} variant="secondary" className="text-[10px] gap-1">
                              {catLabels[fc.category] ?? fc.category}
                              <span className="text-muted-foreground">{fc.count}</span>
                            </Badge>
                          )
                        })}
                      </div>
                    </div>

                    {/* Payment methods */}
                    <div>
                      <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Payment Methods</p>
                      <div className="flex flex-wrap gap-1.5">
                        {visitSummary.payment_breakdown.map((pb) => {
                          const payIcons: Record<string, { icon: typeof CreditCard; label: string }> = {
                            card: { icon: CreditCard, label: "Card" },
                            cash: { icon: Banknote, label: "Cash" },
                            adnoc_wallet: { icon: Wallet, label: "ADNOC Wallet" },
                            apple_pay: { icon: Smartphone, label: "Apple Pay" },
                          }
                          const pi = payIcons[pb.method] ?? payIcons.card
                          return (
                            <div key={pb.method} className="flex items-center gap-1 text-[11px]">
                              <pi.icon className="h-3 w-3 text-muted-foreground" />
                              <span>{pi.label}</span>
                              <span className="text-muted-foreground">({pb.count})</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    <Separator />

                    {/* Recent visits timeline */}
                    <div>
                      <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Recent Visits</p>
                      <div className="space-y-2">
                        {visitSummary.recent_visits.map((rv) => {
                          const d = new Date(rv.visited_at)
                          const dateStr = d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
                          const catLabels: Record<string, string> = {
                            fuel: "Fuel", ev_charging: "EV", coffee: "Coffee",
                            food: "Food", beverages: "Drinks", car_wash: "Wash",
                            car_care: "Car Care", interior_cleaning: "Interior", shop: "Shop",
                          }
                          return (
                            <div key={rv.id} className="rounded-md border border-border bg-muted/20 p-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-medium">{rv.station_name}</span>
                                <span className="text-[10px] text-muted-foreground">{dateStr}</span>
                              </div>
                              <div className="flex items-center justify-between mt-0.5">
                                <div className="flex gap-1 flex-wrap">
                                  {rv.service_categories.map((c: string) => (
                                    <span key={c} className="text-[9px] px-1 py-0.5 rounded bg-muted text-muted-foreground">
                                      {catLabels[c] ?? c}
                                    </span>
                                  ))}
                                </div>
                                <span className="text-[11px] font-semibold text-emerald-400">AED {rv.total_amount}</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground py-2">No visit history found.</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Scenario Context (deterministic by persona) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-primary" />
                Scenario Context
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedStationId || !selectedCustomerId ? (
                <p className="text-xs text-muted-foreground py-2">
                  Select a station and demo profile to load a scenario.
                </p>
              ) : activeScenario ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-1 gap-2">
                    {DEMO_SCENARIOS.map((scenario) => {
                      const isActive = scenario.id === activeScenario.id
                      return (
                        <div
                          key={scenario.id}
                          className={cn(
                            "rounded-lg border p-2.5 transition-all",
                            isActive
                              ? "border-primary bg-primary/10 ring-1 ring-primary"
                              : "border-border bg-muted/20"
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="text-xs font-semibold">{scenario.title}</p>
                              <p className="text-[11px] text-muted-foreground">{scenario.subtitle}</p>
                            </div>
                            <Badge variant="outline" className="text-[10px]">
                              {scenario.primaryPersona}
                            </Badge>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold">{activeScenario.title}</p>
                      <Badge variant="secondary" className="text-[10px]">
                        Trigger: {activeScenario.trigger}
                      </Badge>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {activeScenario.subtitle} · Primary persona: {activeScenario.primaryPersona}
                    </p>
                    <ul className="mt-2 space-y-1">
                      {activeScenario.keyPoints.map((point) => (
                        <li key={point} className="text-[11px] text-muted-foreground">
                          • {point}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-2 rounded-md border border-dashed border-border px-2 py-1.5">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Suggested opener</p>
                      <p className="text-xs">{activeScenario.starterPrompt}</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Deterministic mapping: {selectedCustomer?.first_name} at {selectedStation?.name} runs this scenario.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground py-2">
                  This customer is not in the active demo persona set.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Conversation + Actions */}
        <div className="flex min-h-0 min-w-0 flex-col gap-4 lg:col-span-8 lg:flex-1 lg:overflow-hidden">
          {/* Conversation Panel — cap height on small screens so System Coordination stays in view; lg uses flex fill */}
          <Card className="flex max-h-[min(70dvh,calc(100dvh-15rem))] min-h-0 flex-col overflow-hidden lg:max-h-none lg:flex-1">
            <CardHeader className="shrink-0 flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-primary" />
                ADNOC Express
              </CardTitle>
              <div className="flex items-center gap-2">
                {/* Voice state indicator */}
                {voiceEnabled && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "gap-1.5 text-xs transition-all",
                      voiceState === "listening" && "border-emerald-500/50 text-emerald-400 animate-pulse",
                      voiceState === "speaking" && "border-sky-500/50 text-sky-400",
                      voiceState === "processing" && "border-amber-500/50 text-amber-400 animate-pulse",
                      voiceState === "ready" && "border-violet-500/50 text-violet-400"
                    )}
                  >
                    <span className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      voiceState === "listening" && "bg-emerald-400",
                      voiceState === "speaking" && "bg-sky-400",
                      voiceState === "processing" && "bg-amber-400",
                      voiceState === "ready" && "bg-violet-400",
                      voiceState === "idle" && "bg-muted-foreground"
                    )} />
                    {voiceState === "ready" && 'Say "Hey ADNOC"'}
                    {voiceState === "listening" && "Listening..."}
                    {voiceState === "speaking" && "Speaking..."}
                    {voiceState === "processing" && "Thinking..."}
                    {voiceState === "idle" && "Voice Off"}
                  </Badge>
                )}
                {demoReady && !displayedMessages.length && (
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                    Ready
                  </Badge>
                )}
              </div>
            </CardHeader>
            <Separator />

            {/* Messages */}
            <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto p-4 space-y-3">
              {!demoReady && (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center space-y-2">
                    <Sparkles className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                    <p className="text-sm text-muted-foreground">Select a station and customer to begin</p>
                  </div>
                </div>
              )}

              {demoReady && displayedMessages.length === 0 && (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center space-y-3">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 ring-2 ring-primary/20">
                      <Mic className={cn("h-7 w-7 text-primary", voiceEnabled && voiceState === "ready" && "animate-pulse")} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">ADNOC Express is ready</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {voiceEnabled ? 'Say "Hey ADNOC" to start' : "Type a message or enable voice"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {displayedMessages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex animate-in fade-in-0 duration-300",
                    msg.role === "customer" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[80%] overflow-hidden rounded-xl px-4 py-2.5 animate-in zoom-in-95 duration-300 ease-out",
                      msg.role === "customer"
                        ? "bg-primary text-primary-foreground rounded-br-sm origin-bottom-right"
                        : msg.role === "agent"
                        ? "bg-muted border border-border rounded-bl-sm origin-bottom-left"
                        : "bg-destructive/10 text-destructive border border-destructive/20 origin-bottom-left"
                    )}
                  >
                    <div className="mb-0.5 flex items-center gap-2 animate-in fade-in-0 duration-500 delay-150">
                      <span className="text-[10px] font-semibold uppercase tracking-wider opacity-70">
                        {msg.role === "customer" ? "You" : msg.role === "agent" ? "ADNOC Express" : "System"}
                      </span>
                      <span className="text-[10px] opacity-50">{msg.timestamp}</span>
                    </div>
                    <SmoothRevealText
                      text={msg.text}
                      className="text-sm leading-relaxed"
                    />
                  </div>
                </div>
              ))}

              {/* Interim transcript */}
              {interimText && voiceEnabled && (
                <div className="flex justify-end">
                  <div className="max-w-[80%] rounded-xl px-4 py-2.5 bg-primary/50 text-primary-foreground/70 rounded-br-sm italic">
                    <p className="text-sm">{interimText}...</p>
                  </div>
                </div>
              )}

              {/* Processing indicator */}
              {isProcessing && (
                <div className="flex justify-start">
                  <div className="rounded-xl bg-muted border border-border px-4 py-3 rounded-bl-sm">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider opacity-70">ADNOC Express</span>
                    </div>
                    <div className="flex gap-1 mt-1.5">
                      <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input area */}
            <div className="shrink-0 border-t border-border p-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  sendMessage(textInput)
                }}
                className="flex gap-2"
              >
                <Input
                  placeholder={demoReady ? 'Type a message or say "Hey ADNOC"...' : "Select a station and customer first..."}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  disabled={!demoReady || isProcessing}
                  className="flex-1"
                />
                <Button type="submit" size="icon" disabled={!demoReady || isProcessing || !textInput.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant={retellActive ? "default" : "outline"}
                  onClick={toggleRetellVoice}
                  disabled={!demoReady || !isVoiceAgentConfigured || !retellReady || retellConnecting}
                  title={
                    retellConnecting
                      ? "Connecting voice call..."
                      : isVoiceAgentConfigured
                        ? "Start or stop the Retell voice agent"
                        : "No Retell agent configured for this customer"
                  }
                  className={cn(retellActive && "ring-2 ring-emerald-500/50")}
                >
                  {retellConnecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </Button>
              </form>
              {selectedCustomer && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {retellConnecting
                    ? `Connecting ${selectedCustomerName} voice call...`
                    : retellActive
                    ? `${selectedCustomerName} Retell voice call is live. Transcript lines will stream into this chat.`
                    : isVoiceAgentConfigured
                      ? `Click the mic to start ${selectedCustomerName} with the Retell voice agent.`
                      : `Set NEXT_PUBLIC_RETELL_AGENT_ID or a ${selectedCustomerName} Retell agent env var to enable voice.`}
                </p>
              )}
            </div>
          </Card>

          {/* Actions Feed */}
          <Card className="shrink-0 max-h-48">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <ShoppingCart className="h-4 w-4 text-primary" />
                System Coordination
                {actions.length > 0 && (
                  <Badge variant="secondary" className="text-xs">{actions.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(coordinationCart || coordinationCheckout) && (
                <div className="mb-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs">
                  {coordinationCart && coordinationCart.items.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">Cart</span>
                        <span className="text-muted-foreground">
                          {coordinationCart.totalAed} AED / {coordinationCart.totalPoints} pts
                        </span>
                      </div>
                      <p className="text-muted-foreground">
                        {coordinationCart.items.map((item) => `${item.qty} x ${item.name}`).join(", ")}
                      </p>
                    </div>
                  )}
                  {coordinationCheckout && (
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
                      <span>Status: <span className="font-medium text-foreground">{coordinationCheckout.status}</span></span>
                      {coordinationCheckout.paymentMethod && <span>Payment: {coordinationCheckout.paymentMethod}</span>}
                      {coordinationCheckout.pointsRedeemed > 0 && <span>Points used: {coordinationCheckout.pointsRedeemed}</span>}
                      {coordinationCheckout.remainingAed > 0 && <span>Remaining: {coordinationCheckout.remainingAed} AED</span>}
                      {coordinationCheckout.summary && <span className="basis-full">{coordinationCheckout.summary}</span>}
                    </div>
                  )}
                </div>
              )}
              {actions.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">
                  Actions will appear here as orders are confirmed and services are booked.
                </p>
              ) : (
                <ScrollArea className="max-h-24">
                  <div className="space-y-1.5">
                    {actions.map((action, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-xs">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        <span className="font-medium">{action.label}</span>
                        <span className="text-muted-foreground">{action.detail}</span>
                        <span className="ml-auto text-[10px] text-muted-foreground">{action.timestamp}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  )
}
