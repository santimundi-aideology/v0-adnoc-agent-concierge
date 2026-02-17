type Speaker = "agent" | "customer" | "system"

export interface TranscriptLine {
  id: string
  speaker: Speaker
  text: string
  timestamp: string
}

interface TranscriptStoreEntry {
  updatedAt: number
  lines: TranscriptLine[]
  seenKeys: Set<string>
}

const store = new Map<string, TranscriptStoreEntry>()

function getOrCreate(callId: string): TranscriptStoreEntry {
  const existing = store.get(callId)
  if (existing) return existing

  const fresh: TranscriptStoreEntry = {
    updatedAt: Date.now(),
    lines: [],
    seenKeys: new Set<string>(),
  }
  store.set(callId, fresh)
  return fresh
}

export function appendTranscriptLines(callId: string, incoming: Array<{ speaker: Speaker; text: string; timestamp?: string }>) {
  if (!callId || incoming.length === 0) return
  const entry = getOrCreate(callId)

  for (const line of incoming) {
    const text = (line.text ?? "").trim()
    if (!text) continue
    const timestamp = line.timestamp ?? new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    const dedupeKey = `${line.speaker}|${timestamp}|${text}`
    if (entry.seenKeys.has(dedupeKey)) continue

    entry.seenKeys.add(dedupeKey)
    entry.lines.push({
      id: `${callId}-${entry.lines.length + 1}`,
      speaker: line.speaker,
      text,
      timestamp,
    })
  }

  entry.updatedAt = Date.now()
}

export function getTranscriptLines(callId: string): TranscriptLine[] {
  const entry = store.get(callId)
  if (!entry) return []
  return entry.lines
}

export function markCallSystemEvent(callId: string, text: string) {
  appendTranscriptLines(callId, [{ speaker: "system", text }])
}
