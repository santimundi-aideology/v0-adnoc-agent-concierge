import { NextResponse } from "next/server"
import { appendTranscriptLines, setCallStatus } from "@/lib/retell/live-transcripts"

export const runtime = "nodejs"

type UnknownRecord = Record<string, unknown>

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" ? (value as UnknownRecord) : {}
}

function getCallId(payload: UnknownRecord): string | null {
  const candidates = [
    payload.call_id,
    payload.callId,
    payload.conversation_id,
    asRecord(payload.args).call_id,
    asRecord(payload.args).callId,
    asRecord(payload.metadata).call_id,
    asRecord(payload.metadata).callId,
    asRecord(payload.data).call_id,
  ]
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim()
  }

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

function extractUserMessage(payload: UnknownRecord): string | null {
  const args = asRecord(payload.args)
  const dynamicVariables = asRecord(payload.dynamic_variables ?? payload.dynamicVariables)
  const metadata = asRecord(payload.metadata)
  const message = asRecord(payload.message)

  const candidates = [
    payload.user_message,
    message.content,
    payload.transcript,
    payload.userMessage,
    payload.last_user_message,
    payload.question,
    payload.query,
    payload.input,
    args.user_message,
    args.userMessage,
    args.last_user_message,
    args.question,
    args.query,
    dynamicVariables.user_message,
    metadata.user_message,
  ]

  for (const c of candidates) {
    const text = getText(c)
    if (text) return text
  }
  return null
}

function extractConversationHistory(payload: UnknownRecord): string | null {
  const args = asRecord(payload.args)
  const dynamicVariables = asRecord(payload.dynamic_variables ?? payload.dynamicVariables)
  const metadata = asRecord(payload.metadata)
  const conversation = asRecord(payload.conversation)
  const argsConversation = asRecord(args.conversation)

  const candidates = [
    payload.conversation_history,
    payload.conversationHistory,
    conversation.history,
    args.conversation_history,
    args.conversationHistory,
    argsConversation.history,
    dynamicVariables.conversation_history,
    metadata.conversation_history,
  ]

  for (const c of candidates) {
    const text = getText(c)
    if (text) return text
  }
  return null
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
    const payload = asRecord(await req.json())
    const eventType = getText(
      payload.event || payload.event_type || payload.type || asRecord(payload.data).event || "unknown"
    )
    const callId = getCallId(payload)
    const userMessage = extractUserMessage(payload)
    const conversationHistory = extractConversationHistory(payload)

    const debugSummary = {
      topLevelKeys: Object.keys(payload || {}),
      argsKeys: Object.keys(asRecord(payload.args)),
      metadataKeys: Object.keys(asRecord(payload.metadata)),
      dynamicVariablesKeys: Object.keys(asRecord(payload.dynamic_variables ?? payload.dynamicVariables)),
      hasUserMessage: Boolean(userMessage),
      userMessageLength: userMessage ? userMessage.length : null,
      hasConversationHistory: Boolean(conversationHistory),
      conversationHistoryLength: conversationHistory ? conversationHistory.length : null,
      callId: callId ?? null,
      eventType,
    }

    console.log("[Retell Webhook] Event:", eventType, "Call:", callId)
    console.log("[Retell Webhook] Payload summary:", JSON.stringify(debugSummary))

    if (!callId) return NextResponse.json({ ok: true })

    const normalizedEventType = eventType.toLowerCase()
    const isDisconnected =
      normalizedEventType.includes("disconnect") ||
      normalizedEventType.includes("hangup") ||
      normalizedEventType.includes("end") ||
      normalizedEventType.includes("complete") ||
      normalizedEventType.includes("terminate")
    if (isDisconnected) {
      setCallStatus(callId, "ended")
    }

    const transcriptLines = parseTranscriptLines(payload)
    if (transcriptLines.length > 0) {
      appendTranscriptLines(callId, transcriptLines)
    } else if (userMessage) {
      // Fallback: some webhook payloads only contain latest user message.
      const fallbackLines = [{ speaker: "customer" as const, text: userMessage }]
      appendTranscriptLines(callId, fallbackLines)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[Retell Webhook] Invalid payload:", error)
    return NextResponse.json({ ok: false }, { status: 400 })
  }
}
