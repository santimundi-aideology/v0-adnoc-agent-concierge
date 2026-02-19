"use client"

import { useCallback, useEffect, useRef, useState } from "react"
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
  Thermometer,
  Loader2,
  History,
  CreditCard,
  Wallet,
  Smartphone,
  Banknote,
  TrendingUp,
  Droplets,
  Zap,
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

/** Extract lat/lng from various Google Maps URL formats */
function parseGoogleMapsUrl(url: string): { lat: number; lng: number } | null {
  // Format: /@25.0657,55.1713 or @25.0657,55.1713,
  const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/)
  if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) }

  // Format: ?q=25.0657,55.1713
  const qMatch = url.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/)
  if (qMatch) return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) }

  // Format: ?ll=25.0657,55.1713
  const llMatch = url.match(/[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/)
  if (llMatch) return { lat: parseFloat(llMatch[1]), lng: parseFloat(llMatch[2]) }

  // Format: /place/25.0657,55.1713
  const placeMatch = url.match(/\/place\/(-?\d+\.?\d*),(-?\d+\.?\d*)/)
  if (placeMatch) return { lat: parseFloat(placeMatch[1]), lng: parseFloat(placeMatch[2]) }

  // Format: just raw coordinates "25.0657, 55.1713"
  const rawMatch = url.trim().match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/)
  if (rawMatch) return { lat: parseFloat(rawMatch[1]), lng: parseFloat(rawMatch[2]) }

  return null
}

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

/** Find the nearest station to given coordinates */
function findNearestStation(
  lat: number,
  lng: number,
  stations: StationWithSignals[]
): { station: StationWithSignals; distanceKm: number } | null {
  let nearest: { station: StationWithSignals; distanceKm: number } | null = null
  for (const s of stations) {
    if (s.lat == null || s.lng == null) continue
    const d = haversineDistance(lat, lng, s.lat, s.lng)
    if (!nearest || d < nearest.distanceKm) {
      nearest = { station: s, distanceKm: d }
    }
  }
  return nearest
}

// Persona descriptions for demo customers (exactly four)
const CUSTOMER_PERSONAS: Record<string, { tag: string; description: string }> = {
  Ahmed: { tag: "Coffee Regular", description: "Flat white regular (18 dirhams), routine commuter, ideal for predictive visit capture." },
  Sarah: { tag: "EV Premium", description: "EV driver with ~30 minute charging dwell, iced latte preference (25 dirhams)." },
  Khalid: { tag: "Executive Time-Sensitive", description: "Time-focused commuter, flat white preference (18 dirhams), optimize for speed." },
  Omar: { tag: "New Customer", description: "First-time ADNOC visitor who needs quick onboarding and a clear welcome offer." },
}

type DemoScenarioId = "smart_commute" | "ev_orchestration" | "predictive_capture" | "new_customer_welcome"

type DemoScenario = {
  id: DemoScenarioId
  title: string
  subtitle: string
  trigger: TriggerType
  primaryPersona: string
  keyPoints: string[]
  starterPrompt: string
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
    starterPrompt: "I’m charging now for about 30 minutes. What can I get done while I wait?",
  },
  {
    id: "predictive_capture",
    title: "Predictive Visit Capture",
    subtitle: "Influence the Visit Before It Happens",
    trigger: "arrival",
    primaryPersona: "Ahmed",
    keyPoints: [
      "Proactively suggest the best upcoming ADNOC stop on the routine commute.",
      "Explain why it saves time versus alternatives.",
      "Offer to pre-prepare the usual flat white (18 dirhams) and food.",
      "Include delivery to the car as an explicit option.",
    ],
    starterPrompt: "I’m on my normal route. Recommend my best ADNOC stop and prepare my usual order.",
  },
  {
    id: "new_customer_welcome",
    title: "New Customer Welcome & Conversion",
    subtitle: "First-Time Visitor",
    trigger: "arrival",
    primaryPersona: "Omar",
    keyPoints: [
      "Welcome first-time visitors and explain ADNOC Express in one sentence.",
      "Offer a first-visit welcome bundle (coffee + snack) for 25 dirhams.",
      "Offer delivery to the car for the welcome bundle.",
      "Offer quick simulated loyalty enrollment with immediate welcome points/perk.",
    ],
    starterPrompt: "This is my first ADNOC visit. What should I try and how does ADNOC Express work?",
  },
]

const PERSONA_SCENARIO_MAP: Record<string, DemoScenarioId> = {
  Khalid: "smart_commute",
  Sarah: "ev_orchestration",
  Ahmed: "predictive_capture",
  Omar: "new_customer_welcome",
}

const ALLOWED_PERSONAS = new Set(Object.keys(PERSONA_SCENARIO_MAP))

const TIER_CONFIG: Record<string, { color: string; icon: typeof Crown }> = {
  platinum: { color: "bg-violet-500/20 text-violet-400 border-violet-500/30", icon: Crown },
  gold: { color: "bg-amber-500/20 text-amber-400 border-amber-500/30", icon: Star },
  silver: { color: "bg-slate-400/20 text-slate-300 border-slate-400/30", icon: Star },
}

const RETELL_AGENT_IDS_BY_CUSTOMER: Record<string, string | undefined> = {
  Ahmed: process.env.NEXT_PUBLIC_RETELL_AGENT_ID_AHMED,
  Sarah: process.env.NEXT_PUBLIC_RETELL_AGENT_ID_SARAH,
  Omar: process.env.NEXT_PUBLIC_RETELL_AGENT_ID_OMAR,
  Khalid: process.env.NEXT_PUBLIC_RETELL_AGENT_ID_KHALID,
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

  // Location → nearest station
  const [locationInput, setLocationInput] = useState("")
  const [nearestResult, setNearestResult] = useState<{ station: StationWithSignals; distanceKm: number } | null>(null)
  const [locationError, setLocationError] = useState("")

  // Visit history summary
  const [visitSummary, setVisitSummary] = useState<CustomerVisitSummary | null>(null)
  const [loadingVisits, setLoadingVisits] = useState(false)

  // Derived
  const selectedStation = stations.find((s) => s.id === selectedStationId) ?? null
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) ?? null
  const activeScenarioId = selectedCustomer ? PERSONA_SCENARIO_MAP[selectedCustomer.first_name] : null
  const activeScenario = DEMO_SCENARIOS.find((s) => s.id === activeScenarioId) ?? null
  const activeTrigger = activeScenario?.trigger ?? "arrival"

  // Conversation state
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [actions, setActions] = useState<AgentAction[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [textInput, setTextInput] = useState("")
  const [demoReady, setDemoReady] = useState(false)

  // Voice state
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [voiceState, setVoiceState] = useState<"idle" | "ready" | "listening" | "processing" | "speaking">("idle")
  const [interimText, setInterimText] = useState("")
  const [voiceSupported, setVoiceSupported] = useState(false)
  const [retellActive, setRetellActive] = useState(false)
  const [retellCallId, setRetellCallId] = useState<string | null>(null)
  const [retellReady, setRetellReady] = useState(false)

  // Refs
  const scrollRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)
  const wakeDetectedRef = useRef(false)
  const voiceStateRef = useRef(voiceState)
  const messagesRef = useRef(messages)
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

  useEffect(() => {
    voiceStateRef.current = voiceState
  }, [voiceState])

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

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
    const cachedStations = getCached("stationsDemo")
    const cachedCustomers = getCached("customersDemo")
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
          // Station names already loaded in `stations` state — use a quick map
          const sMap = new Map(stations.map((s) => [s.id, s.name]))

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
  }, [messages, actions, interimText])

  // Check if demo is ready
  useEffect(() => {
    setDemoReady(!!selectedStationId && !!selectedCustomerId)
  }, [selectedStationId, selectedCustomerId])

  // ─── Data Loading ─────────────────────────────────────────

  async function loadStations() {
    try {
      const { data: stationData } = await withRetry(() =>
        withTimeout(
          supabase
            .from("stations")
            .select("id, name, city, region, lat, lng, ev_charging, car_care, fnb, services, facilities, address, operating_hours, station_type")
            .order("name")
        )
      )

      const { data: signalData } = await withRetry(() =>
        withTimeout(
          supabase.from("station_operational_signals").select("*")
        )
      )

      const signalMap = new Map((signalData ?? []).map((s) => [s.station_id, s]))

      const list = (stationData ?? []).map((st) => ({
        ...st,
        operational_signals: (signalMap.get(st.id) as StationOperationalSignal) ?? null,
      }))
      setStations(list)
      setCache("stationsDemo", list)
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

      const profileMap = new Map((profileData ?? []).map((p) => [p.customer_id, p]))

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
      }))
      const personaOrder: Record<string, number> = { Ahmed: 0, Sarah: 1, Khalid: 2, Omar: 3 }
      const filtered = list
        .filter((c) => ALLOWED_PERSONAS.has(c.first_name))
        .sort((a, b) => (personaOrder[a.first_name] ?? 999) - (personaOrder[b.first_name] ?? 999))
      setCustomers(filtered)
      setCache("customersDemo", filtered)
    } catch (err) {
      console.error("Failed to load customers:", err)
      setCustomers([])
    }
  }

  // ─── Location → Nearest Station ──────────────────────────

  function handleLocationSubmit(input?: string) {
    const value = (input ?? locationInput).trim()
    if (!value) return

    setLocationError("")
    setNearestResult(null)

    const coords = parseGoogleMapsUrl(value)
    if (!coords) {
      setLocationError("Could not extract coordinates. Paste a Google Maps link or lat,lng.")
      return
    }

    if (stations.length === 0) {
      setLocationError("Stations are still loading. Please try again in a moment.")
      return
    }

    const result = findNearestStation(coords.lat, coords.lng, stations)
    if (!result) {
      setLocationError("No stations with coordinates found.")
      return
    }

    setNearestResult(result)
    setSelectedStationId(result.station.id)
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
              station_id: selectedStationId,
              trigger_type: currentTrigger,
              available_triggers: availableTriggers,
              distance_km: nearestResult?.distanceKm ?? null,
              message: text.trim(),
              conversation_history: history,
            }),
          }
        )

        const data = await res.json()
        const replyTimestamp = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })

        // Add agent response
        const agentMsg: ConversationMessage = {
          role: "agent",
          text: data.reply || "I couldn't process that. Please try again.",
          timestamp: replyTimestamp,
        }
        setMessages((prev) => [...prev, agentMsg])

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
    [selectedStationId, selectedCustomerId, isProcessing, voiceEnabled, activeTrigger, nearestResult?.distanceKm]
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
    setInterimText("")
    wakeDetectedRef.current = false
    if (voiceEnabled) {
      setVoiceState("ready")
    }
  }

  useEffect(() => {
    resetConversation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStationId, selectedCustomerId])

  useEffect(() => {
    const hasAgentForSelectedCustomer = !!RETELL_AGENT_IDS_BY_CUSTOMER[selectedCustomer?.first_name ?? ""]
    if (!hasAgentForSelectedCustomer) {
      if (retellActive) {
        void stopRetellCall()
      }
    }
  }, [retellActive, selectedCustomer])

  useEffect(() => {
    if (!retellCallId) return
    void pollRetellTranscript(retellCallId)
    const interval = window.setInterval(() => {
      void pollRetellTranscript(retellCallId)
    }, 1200)
    return () => window.clearInterval(interval)
  }, [retellCallId])

  // ─── Render ───────────────────────────────────────────────

  const signals = selectedStation?.operational_signals
  const profile = selectedCustomer?.profile
  const tierConfig = TIER_CONFIG[selectedCustomer?.loyalty_tier ?? "silver"]
  const selectedCustomerName = selectedCustomer?.first_name ?? ""
  const selectedRetellAgentId = RETELL_AGENT_IDS_BY_CUSTOMER[selectedCustomerName]
  const isVoiceAgentConfigured = !!selectedRetellAgentId

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
            if (!alreadyExists) {
              next.push({ role: speaker, text: content, timestamp: line.timestamp || now })
            }
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
    if (!demoReady || !isVoiceAgentConfigured || !retellReady || !retellClientRef.current || !selectedRetellAgentId) return

    const customerName = `${selectedCustomer?.first_name ?? ""} ${selectedCustomer?.last_name ?? ""}`.trim() || selectedCustomerName
    const conversationHistory = messagesRef.current.map((m) => `${m.role}: ${m.text}`).join("\n")

    const res = await fetch("/api/retell/create-call", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentId: selectedRetellAgentId,
        dynamicVariables: {
          customer_id: selectedCustomerId,
          customer_name: customerName,
          station_id: selectedStationId,
          trigger_type: activeTrigger ?? "arrival",
          conversation_history: conversationHistory,
        },
        metadata: {
          customer_id: selectedCustomerId,
          customer_name: customerName,
          station_id: selectedStationId,
          source: "adnoc-demo-chat",
        },
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(errText || "Failed to create Retell call")
    }

    const data = await res.json() as { accessToken?: string; callId?: string }
    if (!data.accessToken || !data.callId) throw new Error("Retell response missing accessToken/callId")

    retellSeenLineIdsRef.current = new Set()
    retellCurrentSpeakerRef.current = null
    retellAgentHasSpokenRef.current = false
    setRetellCallId(data.callId)
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
      setVoiceEnabled(false)
      setVoiceState("idle")
    }
  }

  async function toggleRetellVoice() {
    if (!demoReady || !isVoiceAgentConfigured) return
    if (retellActive) {
      await stopRetellCall()
      return
    }
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
    }
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col gap-4 p-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ADNOC Express Demo</h1>
          <p className="text-sm text-muted-foreground">Voice-activated agentic retail assistant</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5">
            <Thermometer className="h-3 w-3" />
            43°C
          </Badge>
        </div>
      </div>

      {/* Main Layout: 3 columns */}
      <div className="grid flex-1 grid-cols-12 gap-4 overflow-hidden">
        {/* LEFT COLUMN: Station + Customer + Trigger */}
        <div className="col-span-4 flex flex-col gap-4 overflow-y-auto">
          {/* Station Selector */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-primary" />
                Station
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <div className="flex gap-2">
                  <Input
                    placeholder="Paste Google Maps link or lat,lng..."
                    value={locationInput}
                    onChange={(e) => setLocationInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleLocationSubmit()
                    }}
                    onPaste={(e) => {
                      const pasted = e.clipboardData.getData("text")
                      if (pasted) {
                        // Defer so the input value updates first
                        setTimeout(() => handleLocationSubmit(pasted), 0)
                      }
                    }}
                    className="flex-1 text-xs"
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleLocationSubmit()}
                    disabled={!locationInput.trim() || stations.length === 0}
                  >
                    <MapPin className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {locationError && (
                  <p className="text-[11px] text-destructive">{locationError}</p>
                )}
                {nearestResult && (
                  <p className="text-[11px] text-emerald-400">
                    Nearest station: <span className="font-semibold">{nearestResult.station.name}</span>{" "}
                    ({nearestResult.distanceKm.toFixed(1)} km away)
                  </p>
                )}
              </div>

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
                  const tc = TIER_CONFIG[c.loyalty_tier] ?? TIER_CONFIG.silver
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
                        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", tc.color)}>
                          {c.loyalty_tier}
                        </Badge>
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
                    <Badge variant="outline" className={cn("gap-1", tierConfig?.color)}>
                      {tierConfig?.icon && <tierConfig.icon className="h-3 w-3" />}
                      {selectedCustomer.loyalty_tier}
                    </Badge>
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
                  Select a station and one of the four demo personas to load a scenario.
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
        <div className="col-span-8 flex flex-col gap-4 overflow-hidden">
          {/* Conversation Panel */}
          <Card className="flex flex-1 flex-col overflow-hidden">
            <CardHeader className="flex-row items-center justify-between pb-3">
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
                {demoReady && !messages.length && (
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                    Ready
                  </Badge>
                )}
              </div>
            </CardHeader>
            <Separator />

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {!demoReady && (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center space-y-2">
                    <Sparkles className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                    <p className="text-sm text-muted-foreground">Select a station and customer to begin</p>
                  </div>
                </div>
              )}

              {demoReady && messages.length === 0 && (
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

              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex",
                    msg.role === "customer" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-xl px-4 py-2.5",
                      msg.role === "customer"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : msg.role === "agent"
                        ? "bg-muted border border-border rounded-bl-sm"
                        : "bg-destructive/10 text-destructive border border-destructive/20"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider opacity-70">
                        {msg.role === "customer" ? "You" : msg.role === "agent" ? "ADNOC Express" : "System"}
                      </span>
                      <span className="text-[10px] opacity-50">{msg.timestamp}</span>
                    </div>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
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
            <div className="border-t border-border p-3">
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
                  disabled={!demoReady || !isVoiceAgentConfigured || !retellReady}
                  title={isVoiceAgentConfigured ? `Start or stop ${selectedCustomerName} voice call` : "No Retell agent configured for selected customer"}
                  className={cn(retellActive && "ring-2 ring-emerald-500/50")}
                >
                  <Mic className="h-4 w-4" />
                </Button>
              </form>
              {selectedCustomer && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {!isVoiceAgentConfigured
                    ? `No Retell agent env var found for ${selectedCustomerName}. Add NEXT_PUBLIC_RETELL_AGENT_ID_${selectedCustomerName.toUpperCase()}.`
                    : retellActive
                    ? `${selectedCustomerName} Retell voice call is live. Transcript lines will stream into this chat.`
                    : `Click the mic to start ${selectedCustomerName} voice call (Retell).`}
                </p>
              )}
            </div>
          </Card>

          {/* Actions Feed */}
          <Card className="max-h-48">
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

      {/* Demo closing message - shown after conversation */}
      {messages.length >= 6 && (
        <div className="text-center py-2 border-t border-border">
          <p className="text-xs text-muted-foreground italic">
            ADNOC Express doesn&apos;t just respond. It orchestrates the entire visit for maximum revenue and maximum convenience.
          </p>
        </div>
      )}
    </div>
  )
}
