import { NextResponse } from "next/server"
import {
  applyVoiceAgentAction,
  createVoiceBackendClient,
  logBackendError,
  recordVoiceAgentAction,
  voiceAgentActionSchema,
} from "@/lib/voice-backend"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const rawBody = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const rawAction = await withFallbackSession(normalizeFlatActionPayload(rawBody) ?? normalizeActionPayload(rawBody))
  const parsed = voiceAgentActionSchema.safeParse(rawAction)

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        function_name: "update_session_ui",
        status: "rejected",
        error: "Invalid voice-agent action",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 200 }
    )
  }

  try {
    const event = await applyVoiceAgentAction(parsed.data)
    const compactEvent = compactCoordinationEvent(event)

    return NextResponse.json({
      ok: true,
      function_name: "update_session_ui",
      status: "accepted",
      event: compactEvent,
      state_delta: compactEvent.payload,
      speak_now: true,
      response_instruction: "Acknowledge this update to the customer now in one short sentence.",
    })
  } catch (error) {
    await recordVoiceAgentAction(parsed.data, "failed", error instanceof Error ? error.message : String(error)).catch(
      () => {}
    )
    logBackendError("retell-action", "Failed to apply voice-agent action", error, {
      actionType: parsed.data.type,
      sessionId: parsed.data.sessionId ?? null,
      callId: parsed.data.callId ?? null,
    })
    return NextResponse.json(
      {
        ok: false,
        function_name: "update_session_ui",
        status: "rejected",
        error: error instanceof Error ? error.message : "Failed to apply voice-agent action",
      },
      { status: 200 }
    )
  }
}

function normalizeFlatActionPayload(rawBody: Record<string, unknown>) {
  const args = asRecord(rawBody.args)
  const payload = asRecord(rawBody.payload)
  const source = { ...rawBody, ...args, ...payload }
  const callId = firstString([source.call_id, source.callId, rawBody.call_id, rawBody.callId])
  const sessionId = firstString([source.session_id, source.sessionId, rawBody.session_id, rawBody.sessionId])
  const reason = firstString([source.reason, source.detail])
  const activeStationId = firstString([
    source.active_station_id,
    source.activeStationId,
    source.station_id,
    source.stationId,
  ])

  if (activeStationId) {
    return {
      type: "set_route",
      sessionId,
      callId,
      stationId: activeStationId,
      stationName: firstString([source.station_name, source.stationName]),
      etaMinutes: numberValue(source.eta_minutes ?? source.etaMinutes),
      reason,
    }
  }

  const removeSku = firstString([source.remove_sku, source.removeSku])
  if (removeSku) {
    return {
      type: "remove_cart_item",
      sessionId,
      callId,
      sku: removeSku,
      reason,
    }
  }

  const sku = firstString([source.sku])
  if (sku) {
    return {
      type: "add_cart_item",
      sessionId,
      callId,
      sku,
      qty: positiveInteger(source.quantity ?? source.qty) ?? 1,
      reason,
    }
  }

  const points = positiveInteger(source.points_to_use ?? source.pointsToUse ?? source.points)
  const paymentMethod = normalizePaymentMethod(firstString([source.payment_method, source.paymentMethod]))
  const completeCheckout = booleanValue(source.complete_checkout ?? source.completeCheckout)
  if (completeCheckout || paymentMethod) {
    return {
      type: "complete_checkout",
      sessionId,
      callId,
      paymentMethod: paymentMethod === "mixed" ? "loyalty_points" : paymentMethod ?? "wallet",
      points,
      reason,
    }
  }

  if (points) {
    return {
      type: "apply_loyalty_points",
      sessionId,
      callId,
      points,
      reason,
    }
  }

  const note = firstString([source.coordination_note, source.coordinationNote, source.note])
  if (note) {
    return {
      type: "add_coordination_note",
      sessionId,
      callId,
      title: firstString([source.title]) ?? "Session note",
      detail: note,
      reason,
      payload: {},
    }
  }

  return null
}

function normalizeActionPayload(rawBody: Record<string, unknown>) {
  const action = asRecord(rawBody.action)
  const args = asRecord(rawBody.args)
  const payload = asRecord(rawBody.payload ?? action.payload ?? args.payload)
  const source = Object.keys(action).length > 0 ? action : rawBody
  const actionType = firstString([
    source.type,
    source.action_type,
    source.actionType,
    args.type,
    args.action_type,
    args.actionType,
  ])

  if (!actionType) return source

  return {
    ...payload,
    ...source,
    ...args,
    ...payload,
    type: actionType,
    sessionId: firstString([
      source.sessionId,
      source.session_id,
      args.sessionId,
      args.session_id,
      rawBody.sessionId,
      rawBody.session_id,
    ]),
    callId: firstString([
      source.callId,
      source.call_id,
      args.callId,
      args.call_id,
      rawBody.callId,
      rawBody.call_id,
    ]),
    stationId: firstString([payload.stationId, payload.station_id, source.stationId, source.station_id, args.stationId, args.station_id]),
    stationName: firstString([payload.stationName, payload.station_name, source.stationName, source.station_name, args.stationName, args.station_name]),
    timeSlot: firstString([payload.timeSlot, payload.time_slot, source.timeSlot, source.time_slot, args.timeSlot, args.time_slot]),
    paymentMethod:
      firstString([payload.paymentMethod, payload.payment_method, source.paymentMethod, source.payment_method, args.paymentMethod, args.payment_method]) ??
      undefined,
    items: payload.items ?? source.items ?? args.items,
    origin: payload.origin ?? source.origin ?? args.origin,
    title: firstString([payload.title, source.title, args.title]),
    detail: firstString([payload.detail, source.detail, args.detail]),
    reason: firstString([payload.reason, source.reason, args.reason]),
    payload,
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function firstString(values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return undefined
}

function numberValue(value: unknown): number | undefined {
  const num = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN
  return Number.isFinite(num) ? num : undefined
}

function positiveInteger(value: unknown): number | undefined {
  const num = numberValue(value)
  return num && num > 0 ? Math.round(num) : undefined
}

function booleanValue(value: unknown): boolean {
  if (typeof value === "boolean") return value
  if (typeof value === "string") return ["true", "yes", "1"].includes(value.toLowerCase())
  return false
}

function normalizePaymentMethod(value?: string) {
  if (!value) return undefined
  const normalized = value.toLowerCase()
  if (normalized === "adnoc_wallet") return "wallet"
  if (normalized === "card" || normalized === "wallet" || normalized === "loyalty_points" || normalized === "mixed") {
    return normalized
  }
  return undefined
}

function compactCoordinationEvent(event: {
  sessionId?: string
  callId?: string
  sequenceNumber?: number
  eventType: string
  title: string
  detail?: string
  payload?: Record<string, unknown>
}) {
  const payload = event.payload ?? {}
  return {
    sessionId: event.sessionId,
    callId: event.callId,
    sequenceNumber: event.sequenceNumber,
    eventType: event.eventType,
    title: event.title,
    detail: event.detail,
    payload: compactEventPayload(payload),
  }
}

function compactEventPayload(payload: Record<string, unknown>) {
  return {
    active_station_id: payload.active_station_id,
    station_name: payload.station_name,
    eta_minutes: payload.eta_minutes,
    distance_meters: payload.distance_meters,
    cart_state: payload.cart_state,
    checkout_state: payload.checkout_state,
    route_state: payload.route_state,
  }
}

async function withFallbackSession(action: Record<string, unknown>) {
  if (firstString([action.sessionId, action.session_id])) return action
  const callId = firstString([action.callId, action.call_id])
  const session =
    (callId ? await getDemoSessionByCallId(callId).catch(() => null) : null) ??
    (await getLatestActiveDemoSession().catch(() => null))
  if (!session?.id) return action
  return {
    ...action,
    sessionId: session.id,
    profile_id: firstString([action.profile_id]) ?? session.profile_id,
    scenario_id: firstString([action.scenario_id]) ?? session.scenario_id,
  }
}

async function getDemoSessionByCallId(callId: string) {
  const supabase = createVoiceBackendClient()
  const { data, error } = await supabase
    .from("demo_voice_sessions")
    .select("id, profile_id, scenario_id")
    .eq("call_id", callId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as { id?: string; profile_id?: string; scenario_id?: string } | null
}

async function getLatestActiveDemoSession() {
  const supabase = createVoiceBackendClient()
  const { data, error } = await supabase
    .from("demo_voice_sessions")
    .select("id, profile_id, scenario_id")
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as { id?: string; profile_id?: string; scenario_id?: string } | null
}
