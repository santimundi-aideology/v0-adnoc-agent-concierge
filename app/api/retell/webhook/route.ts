import { NextResponse } from "next/server"
import { appendTranscriptLines, markCallSystemEvent } from "@/lib/retell/live-transcripts"

type UnknownRecord = Record<string, unknown>

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" ? (value as UnknownRecord) : {}
}

function getCallId(payload: UnknownRecord): string | null {
  const direct = payload.call_id
  if (typeof direct === "string" && direct) return direct

  const call = asRecord(payload.call)
  if (typeof call.call_id === "string" && call.call_id) return call.call_id

  const data = asRecord(payload.data)
  if (typeof data.call_id === "string" && data.call_id) return data.call_id

  const dataCall = asRecord(data.call)
  if (typeof dataCall.call_id === "string" && dataCall.call_id) return dataCall.call_id

  return null
}

function getText(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function parseTranscriptLines(payload: UnknownRecord): Array<{ speaker: "agent" | "customer" | "system"; text: string }> {
  const candidates: unknown[] = []
  if (Array.isArray(payload.transcript)) candidates.push(...payload.transcript)

  const data = asRecord(payload.data)
  if (Array.isArray(data.transcript)) candidates.push(...data.transcript)
  if (Array.isArray(data.transcript_object)) candidates.push(...data.transcript_object)

  const call = asRecord(payload.call)
  if (Array.isArray(call.transcript)) candidates.push(...call.transcript)

  const lines: Array<{ speaker: "agent" | "customer" | "system"; text: string }> = []

  for (const raw of candidates) {
    const row = asRecord(raw)
    const roleRaw = getText(row.role || row.speaker || row.source || row.sender).toLowerCase()
    const text = getText(row.text || row.transcript || row.content || row.message)
    if (!text) continue

    if (roleRaw.includes("agent") || roleRaw.includes("assistant")) {
      lines.push({ speaker: "agent", text })
    } else if (roleRaw.includes("user") || roleRaw.includes("customer") || roleRaw.includes("human")) {
      lines.push({ speaker: "customer", text })
    } else {
      lines.push({ speaker: "system", text })
    }
  }

  return lines
}

export async function POST(req: Request) {
  try {
    const payload = asRecord(await req.json().catch(() => ({})))
    const callId = getCallId(payload)
    if (!callId) {
      return NextResponse.json({ ok: true, ignored: "missing call_id" })
    }

    const eventType = getText(payload.event || payload.event_type || asRecord(payload.data).event || "retell_event")
    if (eventType) {
      markCallSystemEvent(callId, `Retell event: ${eventType}`)
    }

    const transcriptLines = parseTranscriptLines(payload)
    if (transcriptLines.length > 0) {
      appendTranscriptLines(callId, transcriptLines)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: "Failed to process Retell webhook", details: String(error) },
      { status: 500 }
    )
  }
}
