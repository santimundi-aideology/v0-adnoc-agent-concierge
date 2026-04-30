import Retell from "retell-sdk"

import {
  type CreateRetellCallRequest,
  type CreateRetellCallResponse,
  type RetellSessionContext,
  createRetellCallRequestSchema,
  createRetellCallResponseSchema,
} from "@/lib/voice-backend/schemas"

export function toRetellStringMap(input: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(input)) {
    if (value == null) {
      out[key] = ""
    } else if (typeof value === "string") {
      out[key] = value
    } else if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
      out[key] = String(value)
    } else {
      out[key] = JSON.stringify(value)
    }
  }
  return out
}

export function getSingleRetellAgentId(
  requestedAgentId?: string,
  context?: { customerName?: string; profileId?: string; customerId?: string; forceSharedDemoAgent?: boolean }
) {
  const sharedDemoAgentId =
    process.env.RETELL_AGENT_ID ||
    process.env.NEXT_PUBLIC_RETELL_AGENT_ID ||
    process.env.NEXT_PUBLIC_RETELL_AGENT_ID_SARAH

  if (context?.forceSharedDemoAgent) {
    return sharedDemoAgentId || requestedAgentId || getLegacyCustomerAgentId(context) || ""
  }

  return (
    requestedAgentId ||
    sharedDemoAgentId ||
    getLegacyCustomerAgentId(context) ||
    ""
  )
}

export function buildRetellDynamicVariables(params: {
  request: CreateRetellCallRequest
  sessionContext?: RetellSessionContext | null
}) {
  const rawHistory =
    params.request.dynamicVariables.conversation_history ??
    params.request.dynamicVariables.conversationHistory ??
    params.request.metadata.conversation_history ??
    params.request.metadata.conversationHistory ??
    ""
  const conversationHistory = typeof rawHistory === "string" ? rawHistory : String(rawHistory)

  const compactContext = params.sessionContext ? buildCompactSessionContext(params.sessionContext) : null
  const contextPayload = compactContext ? JSON.stringify(compactContext) : undefined
  const userLocationJson = compactContext?.user_location ? JSON.stringify(compactContext.user_location) : ""
  const nearestThreeJson = compactContext?.nearest_three ? JSON.stringify(compactContext.nearest_three) : "[]"
  const nearestEvStationsJson = compactContext?.nearest_ev_stations
    ? JSON.stringify(compactContext.nearest_ev_stations)
    : "[]"
  return toRetellStringMap({
    session_id: params.request.sessionId ?? params.sessionContext?.sessionId ?? "",
    sessionId: params.request.sessionId ?? params.sessionContext?.sessionId ?? "",
    call_id: params.sessionContext?.callId ?? "",
    callId: params.sessionContext?.callId ?? "",
    profile_id: params.sessionContext?.profile.id ?? params.request.profileId ?? stringValue(params.request.dynamicVariables.profile_id),
    customer_id:
      params.sessionContext?.profile.customerId ??
      params.sessionContext?.profile.id ??
      stringValue(params.request.dynamicVariables.customer_id),
    customer_name:
      params.sessionContext?.profile.displayName ??
      stringValue(params.request.dynamicVariables.customer_name),
    scenario_id: params.sessionContext?.scenario.id ?? params.request.scenarioId ?? stringValue(params.request.dynamicVariables.scenario_id),
    scenario_title: params.sessionContext?.scenario.title ?? "",
    station_id:
      params.sessionContext?.primaryStation?.stationId ??
      stringValue(params.request.dynamicVariables.station_id) ??
      stringValue(params.request.dynamicVariables.primary_station_id),
    station_name:
      params.sessionContext?.primaryStation?.stationName ??
      stringValue(params.request.dynamicVariables.station_name) ??
      stringValue(params.request.dynamicVariables.primary_station_name),
    preferred_language: params.sessionContext?.profile.preferredLanguage ?? "",
    loyalty_tier: String(params.sessionContext?.profile.loyaltyTier ?? ""),
    loyalty_points_balance: params.sessionContext?.loyaltyContext?.pointsBalance ?? "",
    favorite_products: params.sessionContext?.profile.favoriteProducts?.join(", ") ?? "",
    preferred_services: params.sessionContext?.profile.preferredServices?.join(", ") ?? "",
    user_location_json: userLocationJson,
    nearest_three_json: nearestThreeJson,
    nearest_ev_stations_json: nearestEvStationsJson,
    catalog_items_count: params.sessionContext?.catalogItems.length ?? "",
    allowed_actions: params.sessionContext?.allowedActions?.join(", ") ?? "",
    retell_function_get_context: "get_demo_context",
    retell_function_update_ui: "update_session_ui",
    conversation_history: conversationHistory,
    conversationHistory: conversationHistory,
    ...(contextPayload
      ? {
          session_context: contextPayload,
          session_context_json: contextPayload,
          express_demo_context: contextPayload,
          express_demo_context_json: contextPayload,
        }
      : {}),
    session_context_instruction:
      "Use the compact session_context_json for this call. For fresh route, cart, recommendation, or coordination state, call the session context custom function with session_id.",
  })
}

export async function createRetellWebCall(params: {
  request: unknown
  sessionContext?: RetellSessionContext | null
}): Promise<CreateRetellCallResponse> {
  const apiKey = process.env.RETELL_API_KEY
  if (!apiKey) throw new Error("Missing RETELL_API_KEY")

  const request = createRetellCallRequestSchema.parse(params.request)
  const agentId = getSingleRetellAgentId(request.agentId, {
    forceSharedDemoAgent: Boolean(params.sessionContext),
    customerName:
      params.sessionContext?.profile.displayName ??
      stringValue(request.dynamicVariables.customer_name) ??
      stringValue(request.metadata.customer_name),
    profileId: params.sessionContext?.profile.id ?? request.profileId,
    customerId:
      params.sessionContext?.profile.customerId ??
      stringValue(request.dynamicVariables.customer_id) ??
      stringValue(request.metadata.customer_id),
  })
  if (!agentId) throw new Error("Missing Retell agent ID")

  const client = new Retell({ apiKey })
  const webCallResponse = await client.call.createWebCall({
    agent_id: agentId,
    metadata: buildRetellMetadata(request, params.sessionContext),
    retell_llm_dynamic_variables: buildRetellDynamicVariables({
      request,
      sessionContext: params.sessionContext,
    }),
  })

  return createRetellCallResponseSchema.parse({
    accessToken: webCallResponse.access_token,
    callId: webCallResponse.call_id,
    sessionId: request.sessionId,
  })
}

function buildCompactSessionContext(context: RetellSessionContext) {
  return {
    sessionId: context.sessionId,
    callId: context.callId,
    profile: {
      id: context.profile.id,
      customerId: context.profile.customerId,
      displayName: context.profile.displayName,
      personaTitle: context.profile.personaTitle,
      loyaltyTier: context.profile.loyaltyTier,
      preferredLanguage: context.profile.preferredLanguage,
      favoriteProducts: context.profile.favoriteProducts,
      preferredServices: context.profile.preferredServices,
      paymentPreference: context.profile.paymentPreference,
      featureFlags: context.profile.featureFlags,
      demoLocation: context.profile.demoLocation,
    },
    customer_profile: {
      id: context.profile.customerId ?? context.profile.id,
      display_name: context.profile.displayName,
      tier: context.profile.loyaltyTier,
      preferred_language: context.profile.preferredLanguage,
      favorite_products: context.profile.favoriteProducts,
      preferred_services: context.profile.preferredServices,
      payment_preference: context.profile.paymentPreference,
    },
    user_location: context.profile.demoLocation,
    scenario: context.scenario,
    primaryStation: context.primaryStation,
    primary_station_id: context.primaryStation?.stationId,
    nearestStations: context.nearestStations.slice(0, 3),
    nearest_three: jsonArray(context.metadata.nearest_three) ?? context.nearestStations.slice(0, 3),
    nearest_ev_stations: jsonArray(context.metadata.nearest_ev_stations) ?? [],
    stations_catalog: context.stationCatalog,
    routing_hints: stringValue(context.metadata.routing_hints) ?? "",
    catalog_items: context.catalogItems,
    loyalty_context: context.loyaltyContext,
    cart_state: context.cartState,
    checkout_state: context.checkoutState,
    upsell_offers: context.upsellOffers,
    activeRoute: context.activeRoute,
    allowedActions: context.allowedActions,
    action_instructions: context.actionInstructions,
    coordinationEvents: context.coordinationEvents.slice(-6),
  }
}

function jsonArray(value: unknown) {
  return Array.isArray(value) ? value : undefined
}

function buildRetellMetadata(
  request: CreateRetellCallRequest,
  context?: RetellSessionContext | null
) {
  return {
    source: stringValue(request.metadata.source) ?? "adnoc-demo-chat",
    session_id: request.sessionId ?? context?.sessionId ?? "",
    profile_id: context?.profile.id ?? request.profileId ?? stringValue(request.metadata.profile_id) ?? "",
    customer_id:
      context?.profile.customerId ??
      context?.profile.id ??
      stringValue(request.metadata.customer_id) ??
      "",
    customer_name:
      context?.profile.displayName ??
      stringValue(request.metadata.customer_name) ??
      "",
    scenario_id: context?.scenario.id ?? request.scenarioId ?? stringValue(request.metadata.scenario_id) ?? "",
    station_id:
      context?.primaryStation?.stationId ??
      stringValue(request.metadata.station_id) ??
      "",
    station_name:
      context?.primaryStation?.stationName ??
      stringValue(request.metadata.station_name) ??
      "",
  }
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function getLegacyCustomerAgentId(context?: {
  customerName?: string
  profileId?: string
  customerId?: string
}) {
  const firstName = context?.customerName?.trim().split(/\s+/)[0]?.toUpperCase()
  if (firstName) {
    const byName = process.env[`NEXT_PUBLIC_RETELL_AGENT_ID_${firstName}`]
    if (byName) return byName
  }

  const profileKey = context?.profileId ? profileIdToLegacyKey(context.profileId) : undefined
  const customerKey = context?.customerId ? profileIdToLegacyKey(context.customerId) : undefined
  const key = profileKey ?? customerKey
  return key ? process.env[`NEXT_PUBLIC_RETELL_AGENT_ID_${key}`] : undefined
}

function profileIdToLegacyKey(id: string) {
  if (id.endsWith("000000000001")) return "KHALID"
  if (id.endsWith("000000000002")) return "SARAH"
  if (id.endsWith("000000000003")) return "OMAR"
  return undefined
}
