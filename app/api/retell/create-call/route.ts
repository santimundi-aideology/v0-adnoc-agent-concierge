import { NextResponse } from "next/server"
import {
  buildRetellSessionContext,
  createDemoSession,
  createRetellCallRequestSchema,
  createRetellWebCall,
  ensureCallRecord,
  logBackendError,
  logBackendInfo,
} from "@/lib/voice-backend"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const rawBody = await request.json().catch(() => ({}))
    const parsed = createRetellCallRequestSchema.parse(rawBody)
    const shouldCreateDemoSession = isExpressDemoCall(parsed.dynamicVariables, parsed.metadata)
    const sessionId = shouldCreateDemoSession ? parsed.sessionId ?? crypto.randomUUID() : parsed.sessionId
    const requestWithSession = { ...parsed, sessionId }
    const sessionContext = shouldCreateDemoSession
      ? await buildRetellSessionContext(requestWithSession)
      : null

    logBackendInfo("retell-create-call", "Creating Retell web call", {
      hasSessionContext: Boolean(sessionContext),
      sessionId: sessionId ?? null,
      profileId: parsed.profileId ?? parsed.dynamicVariables.customer_id ?? null,
      scenarioId: parsed.scenarioId ?? parsed.dynamicVariables.scenario_id ?? null,
    })

    const webCallResponse = await createRetellWebCall({
      request: requestWithSession,
      sessionContext,
    })

    if (sessionContext && sessionId) {
      await createDemoSession({
        sessionId,
        callId: webCallResponse.callId,
        profileId: sessionContext.profile.customerId ?? sessionContext.profile.id,
        scenarioId: String(sessionContext.scenario.id),
        initialRoute: sessionContext.activeRoute,
        loyaltyState: sessionContext.loyaltyContext,
      })
      await ensureCallRecord({
        callId: webCallResponse.callId,
        caller: sessionContext.profile.displayName,
        stationId: sessionContext.primaryStation?.stationId ?? null,
        status: "active",
        intent: String(sessionContext.scenario.title ?? "General Inquiry"),
        language: sessionContext.profile.preferredLanguage?.toUpperCase() === "AR" ? "AR" : "EN",
      })
    }

    return NextResponse.json({
      ...webCallResponse,
      sessionId: sessionId ?? webCallResponse.sessionId,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create Retell call"
    logBackendError("retell-create-call", "Failed to create Retell call", error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function isExpressDemoCall(dynamicVariables: Record<string, unknown>, metadata: Record<string, unknown>) {
  const source = String(metadata.source ?? dynamicVariables.source ?? "")
  return Boolean(
    source.includes("adnoc-demo") ||
      dynamicVariables.express_demo_context ||
      dynamicVariables.express_demo_context_json ||
      dynamicVariables.customer_id ||
      dynamicVariables.profile_id ||
      dynamicVariables.scenario_id
  )
}
