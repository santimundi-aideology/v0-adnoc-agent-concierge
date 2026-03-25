export interface StationRecommendationEvent {
  call_id: string
  active_station_id: string
  reason?: string | null
  eta_minutes?: number | null
  timestamp: string
}

interface RecommendationStoreEntry {
  updatedAt: number
  last: StationRecommendationEvent | null
}

const store = new Map<string, RecommendationStoreEntry>()

function getOrCreate(callId: string): RecommendationStoreEntry {
  const existing = store.get(callId)
  if (existing) return existing
  const fresh: RecommendationStoreEntry = { updatedAt: Date.now(), last: null }
  store.set(callId, fresh)
  return fresh
}

export function setStationRecommendation(callId: string, evt: Omit<StationRecommendationEvent, "call_id" | "timestamp"> & { timestamp?: string }) {
  if (!callId) return
  const entry = getOrCreate(callId)
  entry.last = {
    call_id: callId,
    active_station_id: evt.active_station_id,
    reason: evt.reason ?? null,
    eta_minutes: evt.eta_minutes ?? null,
    timestamp:
      evt.timestamp ??
      new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
  }
  entry.updatedAt = Date.now()
}

export function getStationRecommendation(callId: string): StationRecommendationEvent | null {
  const entry = store.get(callId)
  return entry?.last ?? null
}

