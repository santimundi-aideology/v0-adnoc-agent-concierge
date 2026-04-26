import { NextResponse } from "next/server"
import {
  applyVoiceAgentAction,
  buildRetellSessionContext,
  getSessionState,
  logBackendError,
  recordVoiceAgentAction,
  voiceAgentActionSchema,
} from "@/lib/voice-backend"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const rawBody = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const rawAction = normalizeActionPayload(rawBody)
  const parsed = voiceAgentActionSchema.safeParse(rawAction)

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid voice-agent action",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400 }
    )
  }

  try {
    const event = await applyVoiceAgentAction(parsed.data)
    const [sessionState, sessionContext] = await Promise.all([
      parsed.data.sessionId ? getSessionState(parsed.data.sessionId).catch(() => null) : Promise.resolve(null),
      buildRetellSessionContext({
        sessionId: parsed.data.sessionId,
        dynamicVariables: {
          profile_id: rawBody.profile_id,
          scenario_id: rawBody.scenario_id,
          primary_station_id: parsed.data.type === "route_change" ? parsed.data.stationId : undefined,
        },
        metadata: rawBody.metadata && typeof rawBody.metadata === "object" ? rawBody.metadata : {},
      }).catch(() => null),
    ])

    return NextResponse.json({
      ok: true,
      function_name: "update_session_ui",
      status: "accepted",
      event,
      session_state: sessionState,
      session_context: sessionContext,
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
      { status: 400 }
    )
  }
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
