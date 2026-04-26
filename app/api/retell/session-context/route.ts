import { NextResponse } from "next/server"
import {
  buildRetellSessionContext,
  getSessionState,
  logBackendError,
  safePayloadSummary,
} from "@/lib/voice-backend"

export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const args = asRecord(body.args)
    const metadata = asRecord(body.metadata)
    const dynamicVariables = asRecord(body.dynamic_variables ?? body.dynamicVariables)
    const sessionId = firstString([
      body.session_id,
      body.sessionId,
      args.session_id,
      args.sessionId,
      metadata.session_id,
      metadata.sessionId,
      dynamicVariables.session_id,
      dynamicVariables.sessionId,
    ])

    const request = {
      sessionId,
      profileId: firstString([
        body.profile_id,
        body.profileId,
        args.profile_id,
        metadata.profile_id,
        dynamicVariables.profile_id,
        dynamicVariables.customer_id,
      ]),
      scenarioId: firstString([
        body.scenario_id,
        body.scenarioId,
        args.scenario_id,
        metadata.scenario_id,
        dynamicVariables.scenario_id,
      ]),
      dynamicVariables: {
        ...dynamicVariables,
        ...args,
      },
      metadata,
    }

    const [sessionContext, persistedSession] = await Promise.all([
      buildRetellSessionContext(request),
      sessionId ? getSessionState(sessionId).catch(() => null) : Promise.resolve(null),
    ])

    if (!sessionContext) {
      return NextResponse.json(
        {
          error: "Unable to build session context",
          payload_summary: safePayloadSummary(body),
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      ok: true,
      function_name: "get_demo_context",
      session_context: sessionContext,
      context: sessionContext,
      persisted_session: persistedSession,
      response_contract:
        "Use session_context as the latest source of truth for profile, stations, route, catalog, loyalty, cart, checkout, recommendations, and coordination state.",
    })
  } catch (error) {
    logBackendError("retell-session-context", "Failed to build session context", error)
    return NextResponse.json({ error: "Failed to build session context" }, { status: 500 })
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {}
}

function firstString(values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return undefined
}
