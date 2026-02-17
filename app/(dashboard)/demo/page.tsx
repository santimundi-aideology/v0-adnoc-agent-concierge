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

function withTimeout<T>(promise: Promise<T>, ms = 10000): Promise<T> {
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

// Persona descriptions for demo customers
const CUSTOMER_PERSONAS: Record<string, { tag: string; description: string }> = {
  Ahmed: { tag: "Coffee Regular", description: "Heavy coffee buyer, visits 5x/week, Arabic-speaking" },
  Sarah: { tag: "EV Premium", description: "EV driver, platinum loyalty, high-value buyer" },
  Omar: { tag: "Snack Buyer", description: "Budget-conscious snack buyer, price-sensitive" },
  Fatima: { tag: "Family Shopper", description: "Mom persona, moderate spender, coffee + bakery" },
  Raj: { tag: "Daily Commuter", description: "6x/week commuter, low basket, price-driven" },
  Khalid: { tag: "EV Executive", description: "Platinum EV driver, premium coffee, high basket" },
}

const TRIGGER_DISPLAY: Record<string, { label: string; icon: typeof Fuel; color: string }> = {
  arrival: { label: "Arrival", icon: MapPin, color: "text-sky-400 border-sky-500/30 bg-sky-500/10" },
  fueling_started: { label: "Fueling", icon: Fuel, color: "text-amber-400 border-amber-500/30 bg-amber-500/10" },
  ev_charging_started: { label: "EV Charging", icon: BatteryCharging, color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" },
}

const TIER_CONFIG: Record<string, { color: string; icon: typeof Crown }> = {
  platinum: { color: "bg-violet-500/20 text-violet-400 border-violet-500/30", icon: Crown },
  gold: { color: "bg-amber-500/20 text-amber-400 border-amber-500/30", icon: Star },
  silver: { color: "bg-slate-400/20 text-slate-300 border-slate-400/30", icon: Star },
}

const RETELL_AGENT_IDS_BY_CUSTOMER: Record<string, string | undefined> = {
  Ahmed: process.env.NEXT_PUBLIC_RETELL_AGENT_ID_AHMED,
  Sarah: process.env.NEXT_PUBLIC_RETELL_AGENT_ID_SARAH,
  Omar: process.env.NEXT_PUBLIC_RETELL_AGENT_ID_OMAR,
  Fatima: process.env.NEXT_PUBLIC_RETELL_AGENT_ID_FATIMA,
  Raj: process.env.NEXT_PUBLIC_RETELL_AGENT_ID_RAJ,
  Khalid: process.env.NEXT_PUBLIC_RETELL_AGENT_ID_KHALID,
}

// ─── Component ──────────────────────────────────────────────

export default function DemoPage() {
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

  // Auto-resolved triggers from scenario_triggers table
  const [resolvedTriggers, setResolvedTriggers] = useState<TriggerType[]>([])
  const [loadingTriggers, setLoadingTriggers] = useState(false)

  // Derived
  const selectedStation = stations.find((s) => s.id === selectedStationId) ?? null
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) ?? null
  const activeTrigger = resolvedTriggers[0] ?? null // primary trigger for the edge function

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
  const resolvedTriggersRef = useRef(resolvedTriggers)
  const retellActiveRef = useRef(retellActive)
  const retellClientRef = useRef<{
    startCall?: (params: { accessToken: string }) => Promise<void> | void
    stopCall?: () => Promise<void> | void
    on?: (event: string, handler: (...args: unknown[]) => void) => void
  } | null>(null)
  const retellSeenLineIdsRef = useRef<Set<string>>(new Set())
  const retellSeenLineKeysRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    voiceStateRef.current = voiceState
  }, [voiceState])

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(() => {
    resolvedTriggersRef.current = resolvedTriggers
  }, [resolvedTriggers])

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
            const lines = parseRetellLiveUpdate(event)
            if (lines.length === 0) return
            appendRetellLinesToChat(lines)
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

  // Load data
  useEffect(() => {
    loadStations()
    loadCustomers()
  }, [])

  // Load visit history + resolve triggers in ONE parallel batch
  useEffect(() => {
    if (!selectedCustomerId) {
      setVisitSummary(null)
      setLoadingVisits(false)
      setResolvedTriggers([])
      setLoadingTriggers(false)
      setDemoReady(false)
      return
    }

    let cancelled = false
    setLoadingVisits(true)
    if (selectedStationId) setLoadingTriggers(true)

    ;(async () => {
      try {
        // Single parallel batch: visits (with nested items), triggers, station ev_charging
        const queries: Promise<unknown>[] = [
          supabase
            .from("customer_visits")
            .select("*, customer_visit_items(*)")
            .eq("customer_id", selectedCustomerId)
            .order("visited_at", { ascending: false }),
        ]

        if (selectedStationId) {
          queries.push(
            supabase
              .from("scenario_triggers")
              .select("trigger_type")
              .eq("customer_id", selectedCustomerId)
              .eq("station_id", selectedStationId)
              .order("created_at", { ascending: false }),
            supabase
              .from("stations")
              .select("ev_charging")
              .eq("id", selectedStationId)
              .single(),
          )
        }

        const results = await withTimeout(Promise.all(queries), 12000)
        if (cancelled) return

        // --- Visit history ---
        const visitsResult = results[0] as { data: Record<string, unknown>[] | null }
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

        // --- Triggers ---
        if (selectedStationId && results.length >= 3) {
          const triggersResult = results[1] as { data: { trigger_type: string }[] | null }
          const stationResult = results[2] as { data: { ev_charging: boolean } | null }

          if (triggersResult.data && triggersResult.data.length > 0) {
            setResolvedTriggers(triggersResult.data.map((d) => d.trigger_type as TriggerType))
          } else if (stationResult.data?.ev_charging) {
            setResolvedTriggers(["arrival", "ev_charging_started"])
          } else {
            setResolvedTriggers(["arrival", "fueling_started"])
          }
        }
      } catch (err) {
        console.error("Failed to load context:", err)
        setVisitSummary(null)
        setResolvedTriggers(["arrival"])
      } finally {
        if (!cancelled) {
          setLoadingVisits(false)
          setLoadingTriggers(false)
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
    setDemoReady(!!selectedStationId && !!selectedCustomerId && !loadingTriggers)
  }, [selectedStationId, selectedCustomerId, loadingTriggers])

  // ─── Data Loading ─────────────────────────────────────────

  async function loadStations() {
    try {
      const { data: stationData } = await withTimeout(
        supabase
          .from("stations")
          .select("id, name, city, region, lat, lng, ev_charging, car_care, fnb, services, facilities, address, operating_hours, station_type")
          .order("name")
      )

      const { data: signalData } = await withTimeout(
        supabase.from("station_operational_signals").select("*")
      )

      const signalMap = new Map((signalData ?? []).map((s) => [s.station_id, s]))

      setStations(
        (stationData ?? []).map((st) => ({
          ...st,
          operational_signals: (signalMap.get(st.id) as StationOperationalSignal) ?? null,
        }))
      )
    } catch (err) {
      console.error("Failed to load stations:", err)
      setStations([])
    }
  }

  async function loadCustomers() {
    try {
      const { data: custData } = await withTimeout(
        supabase
          .from("customers")
          .select("id, first_name, last_name, loyalty_tier, preferred_language, voice_enabled, created_at")
          .order("first_name")
      )

      const { data: profileData } = await withTimeout(
        supabase.from("customer_behavior_profiles").select("*")
      )

      const profileMap = new Map((profileData ?? []).map((p) => [p.customer_id, p]))

      setCustomers(
        (custData ?? []).map((c) => ({
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
      )
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

      const triggers = resolvedTriggersRef.current
      const currentTrigger = triggers[0] ?? "arrival"

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
              available_triggers: triggers,
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
    [selectedStationId, selectedCustomerId, isProcessing, voiceEnabled]
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

  function buildRetellLineKey(speaker: "agent" | "customer" | "system", text: string): string {
    return `${speaker}|${text.trim().toLowerCase()}`
  }

  function parseRetellLiveUpdate(event: Record<string, unknown>): Array<{
    speaker: "agent" | "customer" | "system"
    text: string
    timestamp: string
  }> {
    const now = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    const out: Array<{ speaker: "agent" | "customer" | "system"; text: string; timestamp: string }> = []
    const pushIfValid = (speaker: "agent" | "customer" | "system", textValue: unknown) => {
      const text = typeof textValue === "string" ? textValue.trim() : ""
      if (!text) return
      out.push({ speaker, text, timestamp: now })
    }

    const transcriptObject = Array.isArray(event.transcript_object) ? event.transcript_object : []
    for (const raw of transcriptObject) {
      const row = (raw ?? {}) as Record<string, unknown>
      const role = typeof row.role === "string" ? row.role.toLowerCase() : ""
      const speaker = role.includes("agent") ? "agent" : role.includes("user") ? "customer" : "system"
      pushIfValid(speaker, row.content ?? row.text)
    }

    if (out.length === 0) {
      const roleRaw = typeof event.role === "string" ? event.role.toLowerCase() : ""
      const speaker = roleRaw.includes("agent") ? "agent" : roleRaw.includes("user") ? "customer" : "system"
      pushIfValid(speaker, event.content ?? event.transcript ?? event.text)
    }

    return out
  }

  function appendRetellLinesToChat(
    lines: Array<{ speaker: "agent" | "customer" | "system"; text: string; timestamp: string }>
  ) {
    const visibleLines = lines.filter((line) => line.speaker !== "system")
    if (visibleLines.length === 0) return
    const uniqueLines = visibleLines.filter((line) => {
      const key = buildRetellLineKey(line.speaker, line.text)
      if (retellSeenLineKeysRef.current.has(key)) return false
      retellSeenLineKeysRef.current.add(key)
      return true
    })
    if (uniqueLines.length === 0) return
    setMessages((prev) => [
      ...prev,
      ...uniqueLines.map((line) => ({
        role: line.speaker === "agent" ? "agent" : line.speaker === "customer" ? "customer" : "system",
        text: line.text,
        timestamp: line.timestamp,
      })),
    ])
  }

  async function pollRetellTranscript(callId: string) {
    try {
      const res = await fetch(`/api/retell/transcript?callId=${encodeURIComponent(callId)}`)
      if (!res.ok) return
      const data = await res.json() as {
        status?: "active" | "ended"
        lines?: Array<{ id: string; speaker: "agent" | "customer" | "system"; text: string; timestamp: string }>
      }
      const newLines = (data.lines ?? []).filter((line) => !retellSeenLineIdsRef.current.has(line.id))

      if (newLines.length > 0) {
        for (const line of newLines) {
          retellSeenLineIdsRef.current.add(line.id)
        }
        appendRetellLinesToChat(newLines)
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
    retellSeenLineKeysRef.current = new Set()
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

          {/* Scenario Context (auto-resolved) */}
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
                  Select a station and customer to auto-detect the scenario.
                </p>
              ) : loadingTriggers ? (
                <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Resolving scenario...
                </div>
              ) : resolvedTriggers.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {resolvedTriggers.map((t) => {
                      const display = TRIGGER_DISPLAY[t]
                      if (!display) return null
                      const Icon = display.icon
                      const isPrimary = t === activeTrigger
                      return (
                        <div
                          key={t}
                          className={cn(
                            "flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all",
                            isPrimary
                              ? cn(display.color, "ring-1 ring-current/20")
                              : "border-border text-muted-foreground"
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {display.label}
                          {isPrimary && resolvedTriggers.length > 1 && (
                            <span className="text-[9px] opacity-60 ml-0.5">primary</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Auto-detected from {selectedCustomer?.first_name}&apos;s profile at {selectedStation?.name}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground py-2">
                  No scenario triggers found for this combination. Using default arrival context.
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
