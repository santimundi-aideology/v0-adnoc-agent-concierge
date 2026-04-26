import {
  type TranscriptLineRecord,
  speakerSchema,
  transcriptLineSchema,
} from "@/lib/voice-backend/schemas"
import { createVoiceBackendClient } from "@/lib/voice-backend/supabase-admin"

export type RawTranscriptLine = {
  speaker?: unknown
  role?: unknown
  source?: unknown
  sender?: unknown
  text?: unknown
  transcript?: unknown
  content?: unknown
  message?: unknown
  timestamp?: unknown
  id?: unknown
}

export function normalizeSpeaker(value: unknown): "customer" | "agent" | "system" {
  const raw = typeof value === "string" ? value.toLowerCase() : ""
  if (raw.includes("agent") || raw.includes("assistant") || raw.includes("bot")) return "agent"
  if (raw.includes("user") || raw.includes("customer") || raw.includes("human")) return "customer"
  return "system"
}

export function normalizeTranscriptLine(callId: string, raw: RawTranscriptLine, source = "webhook") {
  const speaker = normalizeSpeaker(raw.speaker ?? raw.role ?? raw.source ?? raw.sender)
  const text = stringValue(raw.text ?? raw.transcript ?? raw.content ?? raw.message)
  if (!text) return null

  return transcriptLineSchema.parse({
    callId,
    speaker,
    text,
    timestamp: stringValue(raw.timestamp) || new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
    source,
    retellEventId: stringValue(raw.id),
  })
}

export async function appendDurableTranscriptLines(
  callId: string,
  lines: Array<TranscriptLineRecord | RawTranscriptLine>,
  source = "webhook"
) {
  if (!callId || lines.length === 0) return []

  const normalized = lines
    .map((line) => {
      if ("callId" in line && speakerSchema.safeParse(line.speaker).success) {
        return transcriptLineSchema.parse({ ...line, source })
      }
      return normalizeTranscriptLine(callId, line as RawTranscriptLine, source)
    })
    .filter((line): line is TranscriptLineRecord => Boolean(line))

  if (normalized.length === 0) return []

  const existing = await getDurableTranscriptLines(callId)
  const seen = new Set(existing.map(transcriptDedupeKey))
  const deduped = normalized.filter((line) => {
    const key = transcriptDedupeKey(line)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  if (deduped.length === 0) return []

  const supabase = createVoiceBackendClient()
  const rows = deduped.map((line) => ({
    call_id: line.callId,
    speaker: line.speaker,
    text: line.text,
    timestamp: line.timestamp,
    created_at: new Date().toISOString(),
  }))

  const { error } = await supabase.from("transcript_lines").insert(rows)
  if (error) throw new Error(error.message)
  return deduped
}

export async function getDurableTranscriptLines(callId: string): Promise<TranscriptLineRecord[]> {
  const supabase = createVoiceBackendClient()
  const { data, error } = await supabase
    .from("transcript_lines")
    .select("id, call_id, speaker, text, timestamp, created_at")
    .eq("call_id", callId)
    .order("id", { ascending: true })

  if (error) throw new Error(error.message)
  const rows = Array.isArray(data) ? data : []
  return rows.map((row, index) => {
    const record = row as {
      id?: number | string
      call_id?: string
      speaker?: string
      text?: string
      timestamp?: string | null
      created_at?: string | null
    }
    return transcriptLineSchema.parse({
      id: record.id == null ? undefined : String(record.id),
      callId,
      speaker: normalizeSpeaker(record.speaker),
      text: record.text ?? "",
      timestamp: record.timestamp ?? record.created_at ?? "",
      sequenceNumber: index,
      source: "webhook",
    })
  })
}

function transcriptDedupeKey(line: TranscriptLineRecord) {
  return `${line.callId}|${line.speaker}|${normalizeText(line.text)}`
}

function normalizeText(text: string) {
  return text.trim().replace(/\s+/g, " ").toLowerCase()
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}
