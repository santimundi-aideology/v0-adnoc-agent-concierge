import { NextResponse } from "next/server"
import { createDirectClient } from "@/lib/supabase/direct-client"

export const runtime = "nodejs"

const DEFAULT_CUSTOMER_ID = "4e140685-8f38-49ff-aae0-d6109c46873d"

async function fetchData(table: string, value: string, column = "customer_id") {
  const supabase = createDirectClient()
  try {
    const { data, error } = await supabase.from(table).select("*").eq(column, value)
    if (error) {
      console.error(`[retell-context] Error fetching ${table}:`, error.message)
      return []
    }
    return data || []
  } catch (err) {
    console.error(`[retell-context] Exception fetching ${table}:`, err)
    return []
  }
}

async function fetchStationById(stationId: string) {
  if (!stationId) return null
  const supabase = createDirectClient()
  try {
    const { data, error } = await supabase
      .from("stations")
      .select("id, name, city, region")
      .eq("id", stationId)
      .maybeSingle()
    if (error) {
      console.error("[retell-context] Error fetching station:", error.message)
      return null
    }
    return data ?? null
  } catch (err) {
    console.error("[retell-context] Exception fetching station:", err)
    return null
  }
}

function extractUserMessage(body: Record<string, unknown>): string | null {
  const args = (body.args ?? {}) as Record<string, unknown>
  const dynamicVariables = (body.dynamic_variables ?? body.dynamicVariables ?? {}) as Record<string, unknown>
  const metadata = (body.metadata ?? {}) as Record<string, unknown>
  const message = (body.message ?? {}) as Record<string, unknown>

  const candidates = [
    body.user_message,
    message.content,
    body.transcript,
    body.userMessage,
    body.last_user_message,
    body.question,
    body.query,
    body.input,
    args.user_message,
    args.userMessage,
    args.last_user_message,
    args.question,
    args.query,
    dynamicVariables.user_message,
    metadata.user_message,
  ]

  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return null
}

function extractConversationHistory(body: Record<string, unknown>): string | null {
  const args = (body.args ?? {}) as Record<string, unknown>
  const dynamicVariables = (body.dynamic_variables ?? body.dynamicVariables ?? {}) as Record<string, unknown>
  const metadata = (body.metadata ?? {}) as Record<string, unknown>
  const conversation = (body.conversation ?? {}) as Record<string, unknown>
  const argsConversation = (args.conversation ?? {}) as Record<string, unknown>

  const candidates = [
    body.conversation_history,
    body.conversationHistory,
    conversation.history,
    args.conversation_history,
    args.conversationHistory,
    argsConversation.history,
    dynamicVariables.conversation_history,
    metadata.conversation_history,
  ]

  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return null
}

function extractExpressDemoContext(body: Record<string, unknown>): Record<string, unknown> | null {
  const args = (body.args ?? {}) as Record<string, unknown>
  const dynamicVariables = (body.dynamic_variables ?? body.dynamicVariables ?? {}) as Record<string, unknown>
  const metadata = (body.metadata ?? {}) as Record<string, unknown>

  const candidates = [
    dynamicVariables.express_demo_context,
    dynamicVariables.express_demo_context_json,
    args.express_demo_context,
    args.express_demo_context_json,
    metadata.express_demo_context,
    metadata.express_demo_context_json,
    body.express_demo_context,
    body.express_demo_context_json,
  ]

  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      try {
        const parsed = JSON.parse(value) as unknown
        if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>
      } catch {
        // ignore malformed JSON payloads and continue
      }
    } else if (value && typeof value === "object") {
      return value as Record<string, unknown>
    }
  }
  return null
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const userMessage = extractUserMessage(body)
    const conversationHistory = extractConversationHistory(body)
    const expressDemoContext = extractExpressDemoContext(body)
    const args = (body.args ?? {}) as Record<string, unknown>
    const metadata = (body.metadata ?? {}) as Record<string, unknown>
    const dynamicVariables = (body.dynamic_variables ?? body.dynamicVariables ?? {}) as Record<string, unknown>

    const callId =
      body.call_id ||
      body.callId ||
      body.conversation_id ||
      args.call_id ||
      args.callId ||
      metadata.call_id ||
      metadata.callId ||
      null

    const currentPage =
      body.current_page ||
      body.currentPage ||
      args.currentPage ||
      args.current_page ||
      metadata.current_page ||
      metadata.currentPage ||
      "/demo"

    const customerId =
      (metadata.customer_id as string | undefined) ||
      (dynamicVariables.customer_id as string | undefined) ||
      (args.customer_id as string | undefined) ||
      DEFAULT_CUSTOMER_ID

    const stationId =
      (metadata.station_id as string | undefined) ||
      (dynamicVariables.station_id as string | undefined) ||
      (args.station_id as string | undefined) ||
      null

    const contextPrimaryStationId =
      (expressDemoContext?.primary_station_id as string | undefined) ||
      (dynamicVariables.primary_station_id as string | undefined) ||
      null

    const effectiveStationId = contextPrimaryStationId || stationId

    const contextPrimaryStationName =
      (expressDemoContext?.primary_station_name as string | undefined) ||
      (dynamicVariables.primary_station_name as string | undefined) ||
      (dynamicVariables.station_name as string | undefined) ||
      (metadata.station_name as string | undefined) ||
      null

    const debugSummary = {
      topLevelKeys: Object.keys(body || {}),
      argsKeys: Object.keys(args || {}),
      metadataKeys: Object.keys(metadata || {}),
      dynamicVariablesKeys: Object.keys(dynamicVariables || {}),
      hasUserMessage: Boolean(userMessage),
      userMessageLength: typeof userMessage === "string" ? userMessage.length : null,
      hasConversationHistory: Boolean(conversationHistory),
      conversationHistoryLength: typeof conversationHistory === "string" ? conversationHistory.length : null,
      hasExpressDemoContext: Boolean(expressDemoContext),
      callId: callId ?? null,
      currentPage,
      customerId,
      stationId,
      effectiveStationId,
      contextPrimaryStationName,
    }
    console.log("[retell-context] Payload summary:", JSON.stringify(debugSummary))

    const [customers, behaviorProfiles, visits, triggers, promotions, stationSignals] = await Promise.all([
      fetchData("customers", customerId, "id"),
      fetchData("customer_behavior_profiles", customerId),
      fetchData("customer_visits", customerId),
      effectiveStationId ? fetchData("scenario_triggers", customerId) : Promise.resolve([]),
      effectiveStationId ? fetchData("promotions", effectiveStationId, "station_id") : Promise.resolve([]),
      effectiveStationId ? fetchData("station_operational_signals", effectiveStationId, "station_id") : Promise.resolve([]),
    ])

    const nearestThree = Array.isArray(expressDemoContext?.nearest_three)
      ? (expressDemoContext?.nearest_three as Array<Record<string, unknown>>)
      : []
    const nearestPrimary = nearestThree[0] ?? null
    const nearestStationId =
      (dynamicVariables.nearest_station_id as string | undefined) ||
      (nearestPrimary?.station_id as string | undefined) ||
      null
    const nearestStationName =
      (dynamicVariables.nearest_station_name as string | undefined) ||
      (nearestPrimary?.station_name as string | undefined) ||
      (nearestPrimary?.name as string | undefined) ||
      null
    const [effectiveStationRow, nearestStationRow] = await Promise.all([
      effectiveStationId ? fetchStationById(effectiveStationId) : Promise.resolve(null),
      nearestStationId && nearestStationId !== effectiveStationId
        ? fetchStationById(nearestStationId)
        : Promise.resolve(null),
    ])

    const effectiveStationName =
      contextPrimaryStationName ||
      (effectiveStationRow?.name as string | undefined) ||
      effectiveStationId ||
      null
    const resolvedNearestStationName =
      nearestStationName ||
      (nearestStationRow?.name as string | undefined) ||
      null

    let visitItems: unknown[] = []
    const visitIds = (visits as Array<{ id?: string }>).map((v) => v.id).filter(Boolean) as string[]
    if (visitIds.length > 0) {
      const supabase = createDirectClient()
      const { data, error } = await supabase
        .from("customer_visit_items")
        .select("*")
        .in("visit_id", visitIds)
      if (error) {
        console.error("[retell-context] Error fetching customer_visit_items:", error.message)
      } else {
        visitItems = data || []
      }
    }

    return NextResponse.json({
      conversation_context: {
        call_id: callId,
        user_message: userMessage,
        current_page: currentPage,
        conversation_history: conversationHistory,
        express_demo_context: expressDemoContext,
      },
      supabase_context: {
        customer_id: customerId,
        station_id: effectiveStationId,
        station_name: effectiveStationName,
        station: effectiveStationRow,
        nearest_station_name: resolvedNearestStationName,
        nearest_station_id: nearestStationId,
        nearest_station: nearestStationRow,
        nearest_station_preview: nearestPrimary,
        nearest_stations_human_readable: nearestThree.map((row) => ({
          station_id:
            (row.station_id as string | undefined) ||
            null,
          station_name:
            (row.station_name as string | undefined) ||
            (row.name as string | undefined) ||
            null,
          distance_km: typeof row.distance_km === "number" ? row.distance_km : null,
          eta_minutes: typeof row.eta_minutes === "number" ? row.eta_minutes : null,
        })),
        assistant_response_contract:
          "When mentioning a recommended/nearest station, use station_name/nearest_station_name in natural language and avoid raw station_id codes unless explicitly asked.",
        customers,
        behavior_profiles: behaviorProfiles,
        visits,
        visit_items: visitItems,
        scenario_triggers: triggers,
        promotions,
        station_operational_signals: stationSignals,
      },
    })
  } catch (error: unknown) {
    console.error("[retell-context] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    )
  }
}
