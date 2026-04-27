import { NextResponse } from "next/server"
import {
  buildRetellSessionContext,
  createVoiceBackendClient,
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
    const requestedSessionId = firstString([
      body.session_id,
      body.sessionId,
      args.session_id,
      args.sessionId,
      metadata.session_id,
      metadata.sessionId,
      dynamicVariables.session_id,
      dynamicVariables.sessionId,
    ])
    const fallbackSession = requestedSessionId ? null : await getLatestActiveDemoSession().catch(() => null)
    const sessionId = requestedSessionId ?? fallbackSession?.id

    const request = {
      sessionId,
      profileId: firstString([
        body.profile_id,
        body.profileId,
        args.profile_id,
        metadata.profile_id,
        dynamicVariables.profile_id,
        dynamicVariables.customer_id,
      ]) ?? fallbackSession?.profile_id,
      scenarioId: firstString([
        body.scenario_id,
        body.scenarioId,
        args.scenario_id,
        metadata.scenario_id,
        dynamicVariables.scenario_id,
      ]) ?? fallbackSession?.scenario_id,
      dynamicVariables: {
        ...(fallbackSession?.active_station_id ? { primary_station_id: fallbackSession.active_station_id } : {}),
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
      recovered_from_latest_active_session: !requestedSessionId && Boolean(fallbackSession),
      response_contract:
        "Use session_context as the latest source of truth for profile, stations, route, catalog, loyalty, cart, checkout, recommendations, and coordination state.",
    })
  } catch (error) {
    logBackendError("retell-session-context", "Failed to build session context", error)
    return NextResponse.json(
      {
        ok: false,
        function_name: "get_demo_context",
        status: "rejected",
        error: "Failed to build session context",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 200 }
    )
  }
}

async function getLatestActiveDemoSession() {
  const supabase = createVoiceBackendClient()
  const { data, error } = await supabase
    .from("demo_voice_sessions")
    .select("id, profile_id, scenario_id, active_station_id")
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as {
    id?: string
    profile_id?: string
    scenario_id?: string
    active_station_id?: string | null
  } | null
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
