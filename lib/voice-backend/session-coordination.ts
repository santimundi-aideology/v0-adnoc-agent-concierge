import {
  type CartState,
  type CheckoutState,
  type JsonValue,
  type RouteState,
  type SessionCoordinationEvent,
  type VoiceAgentAction,
  cartStateSchema,
  checkoutStateSchema,
  sessionCoordinationEventSchema,
  voiceAgentActionSchema,
} from "@/lib/voice-backend/schemas"
import {
  SARAH_LOYALTY_CONTEXT,
  cartLineFromCatalog,
  checkoutWithPaymentMethod,
  checkoutWithPoints,
  emptyCartState,
  getCatalogItem,
  normalizeCart,
  openCheckoutState,
} from "@/lib/voice-backend/catalog"
import { buildRouteState, resolveStationDestination } from "@/lib/voice-backend/route-metrics"
import { createVoiceBackendClient } from "@/lib/voice-backend/supabase-admin"

export async function createDemoSession(params: {
  sessionId?: string
  profileId: string
  scenarioId: string
  callId?: string
  initialRoute?: RouteState
}) {
  const supabase = createVoiceBackendClient()
  const sessionId = params.sessionId ?? (params.callId ? `session-${params.callId}` : crypto.randomUUID())
  const now = new Date().toISOString()

  const { error } = await supabase
    .from("demo_voice_sessions")
    .upsert(
      {
        id: sessionId,
        call_id: params.callId ?? null,
        profile_id: params.profileId,
        scenario_id: params.scenarioId,
        active_route: (params.initialRoute ?? null) as JsonValue,
        status: "active",
        updated_at: now,
        created_at: now,
      },
      { onConflict: "id" }
    )

  if (error) throw new Error(error.message)
  await recordCoordinationEvent({
    sessionId,
    callId: params.callId,
    eventType: "session_started",
    actor: "system",
    title: "Demo session started",
    detail: `Profile ${params.profileId} started scenario ${params.scenarioId}.`,
    payload: { profile_id: params.profileId, scenario_id: params.scenarioId },
  })

  return sessionId
}

export async function getSessionState(sessionId: string) {
  const supabase = createVoiceBackendClient()
  const [{ data: session, error: sessionError }, events] = await Promise.all([
    supabase.from("demo_voice_sessions").select("*").eq("id", sessionId).maybeSingle(),
    listCoordinationEvents(sessionId),
  ])
  if (sessionError) throw new Error(sessionError.message)
  return { session, events }
}

type CoordinationEventInput =
  Omit<SessionCoordinationEvent, "sequenceNumber" | "status" | "payload" | "actor"> &
  Partial<Pick<SessionCoordinationEvent, "status" | "payload" | "actor">>

export async function recordCoordinationEvent(input: CoordinationEventInput) {
  const event = sessionCoordinationEventSchema.parse(input)
  const supabase = createVoiceBackendClient()
  const existing = await listCoordinationEvents(event.sessionId)
  const sequenceNumber = existing.length
  const row = {
    session_id: event.sessionId,
    call_id: event.callId ?? null,
    sequence_number: sequenceNumber,
    event_type: event.eventType,
    actor: event.actor,
    title: event.title,
    detail: event.detail ?? null,
    status: event.status,
    payload: event.payload as JsonValue,
    created_at: new Date().toISOString(),
  }

  const { error } = await supabase.from("demo_session_coordination_events").insert(row)
  if (error) throw new Error(error.message)
  return sessionCoordinationEventSchema.parse({ ...event, sequenceNumber })
}

export async function listCoordinationEvents(sessionId: string): Promise<SessionCoordinationEvent[]> {
  const supabase = createVoiceBackendClient()
  const { data, error } = await supabase
    .from("demo_session_coordination_events")
    .select("*")
    .eq("session_id", sessionId)
    .order("sequence_number", { ascending: true })

  if (error) throw new Error(error.message)
  return (Array.isArray(data) ? data : []).map((row) => {
    const record = row as Record<string, unknown>
    return sessionCoordinationEventSchema.parse({
      id: stringValue(record.id),
      sessionId,
      callId: stringValue(record.call_id),
      sequenceNumber: numberValue(record.sequence_number),
      eventType: String(record.event_type ?? "event"),
      actor: record.actor ?? "system",
      title: String(record.title ?? "Session update"),
      detail: stringValue(record.detail),
      status: record.status ?? "accepted",
      payload: objectValue(record.payload),
      createdAt: stringValue(record.created_at),
    })
  })
}

export async function applyVoiceAgentAction(rawAction: unknown) {
  const action = voiceAgentActionSchema.parse(rawAction)
  const sessionId = action.sessionId
  if (!sessionId) throw new Error("Missing sessionId")

  try {
    const event = await applyAcceptedVoiceAgentAction(action)
    await recordVoiceAgentAction(action, "accepted")
    return event
  } catch (error) {
    await recordVoiceAgentAction(action, "rejected", error instanceof Error ? error.message : String(error)).catch(
      () => {}
    )
    throw error
  }
}

async function applyAcceptedVoiceAgentAction(action: VoiceAgentAction) {
  if (action.type === "route_change" || action.type === "set_route") {
    return applyRouteChange(action)
  }

  if (action.type === "set_station_recommendation") {
    return applyStationRecommendation(action)
  }

  if (action.type === "add_cart_item" || action.type === "remove_cart_item" || action.type === "set_cart") {
    return applyCartAction(action)
  }

  if (action.type === "reserve_service") {
    return applyServiceReservation(action)
  }

  if (action.type === "apply_loyalty_points") {
    return applyLoyaltyPoints(action)
  }

  if (action.type === "complete_checkout") {
    return applyCheckoutCompletion(action)
  }

  if (action.type === "add_coordination_note") {
    return recordCoordinationEvent({
      sessionId: action.sessionId!,
      callId: action.callId,
      eventType: "coordination_note",
      actor: "agent",
      title: action.title,
      detail: action.detail,
      payload: action.payload,
    })
  }

  return recordCoordinationEvent({
    sessionId: action.sessionId!,
    callId: action.callId,
    eventType: action.type,
    actor: "agent",
    title: titleForAction(action),
    detail: action.reason,
    payload: action as unknown as Record<string, JsonValue>,
  })
}

export async function recordVoiceAgentAction(
  action: VoiceAgentAction,
  status: "accepted" | "rejected" | "failed",
  errorMessage?: string
) {
  const supabase = createVoiceBackendClient()
  const { error } = await supabase.from("voice_agent_actions").insert({
    session_id: action.sessionId ?? null,
    call_id: action.callId ?? null,
    action_type: action.type,
    status,
    payload: action as unknown as Record<string, JsonValue>,
    error_message: errorMessage ?? null,
    created_at: new Date().toISOString(),
  })
  if (error) throw new Error(error.message)
}

async function applyRouteChange(
  action: Extract<VoiceAgentAction, { type: "route_change" | "set_route" }>
) {
  const sessionId = action.sessionId
  if (!sessionId) throw new Error("Missing sessionId")

  const destination = await resolveStationDestination(action.stationId)
  if (!destination) throw new Error("Invalid route destination")
  if (!action.origin) throw new Error("Missing route origin")

  const routeState = await buildRouteState({
    origin: action.origin,
    destination: {
      ...destination,
      stationName: action.stationName ?? destination.stationName,
    },
    reason: action.reason,
  })

  const supabase = createVoiceBackendClient()
  const { error } = await supabase
    .from("demo_voice_sessions")
    .update({
      active_route: routeState as unknown as JsonValue,
      active_station_id: destination.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
  if (error) throw new Error(error.message)

  return recordCoordinationEvent({
    sessionId,
    callId: action.callId,
    eventType: "route_change",
    actor: "agent",
    title: `Route changed to ${routeState.destination.stationName ?? destination.id}`,
    detail: action.reason,
    payload: routeState as unknown as Record<string, JsonValue>,
  })
}

async function applyStationRecommendation(
  action: Extract<VoiceAgentAction, { type: "set_station_recommendation" }>
) {
  const sessionId = action.sessionId
  if (!sessionId) throw new Error("Missing sessionId")
  const destination = await resolveStationDestination(action.stationId)
  if (!destination) throw new Error("Invalid station recommendation")

  const recommendation = {
    active_station_id: destination.id,
    station_name: action.stationName ?? destination.stationName,
    eta_minutes: action.etaMinutes ?? null,
    reason: action.reason ?? null,
    updated_at: new Date().toISOString(),
  }

  const supabase = createVoiceBackendClient()
  const { error } = await supabase
    .from("demo_voice_sessions")
    .update({
      active_station_id: destination.id,
      recommendation_state: recommendation as unknown as JsonValue,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
  if (error) throw new Error(error.message)

  if (action.callId) {
    const { error: recommendationError } = await supabase
      .from("express_demo_call_recommendations")
      .upsert(
        {
          call_id: action.callId,
          active_station_id: destination.id,
          reason: action.reason ?? null,
          eta_minutes: action.etaMinutes ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "call_id" }
      )
    if (recommendationError) throw new Error(recommendationError.message)
  }

  return recordCoordinationEvent({
    sessionId,
    callId: action.callId,
    eventType: "station_recommendation",
    actor: "agent",
    title: `Recommended ${action.stationName ?? destination.stationName ?? destination.id}`,
    detail: action.reason,
    payload: recommendation as unknown as Record<string, JsonValue>,
  })
}

async function applyCartAction(
  action: Extract<VoiceAgentAction, { type: "add_cart_item" | "remove_cart_item" | "set_cart" }>
) {
  const sessionId = action.sessionId
  if (!sessionId) throw new Error("Missing sessionId")
  const current = await readCartState(sessionId)
  let nextCart: CartState

  if (action.type === "add_cart_item") {
    const item = cartLineFromCatalog(action.sku, action.qty)
    if (!item) throw new Error(`Unknown or unavailable SKU: ${action.sku}`)
    const existing = current.items.find((line) => line.sku === action.sku)
    nextCart = normalizeCart(
      existing
        ? current.items.map((line) =>
            line.sku === action.sku ? { ...line, qty: line.qty + item.qty } : line
          )
        : [...current.items, item]
    )
  } else if (action.type === "remove_cart_item") {
    if (!getCatalogItem(action.sku)) throw new Error(`Unknown SKU: ${action.sku}`)
    nextCart = normalizeCart(current.items.filter((line) => line.sku !== action.sku))
  } else {
    const lines = action.items.map((item) => {
      const line = cartLineFromCatalog(item.sku, item.qty)
      if (!line) throw new Error(`Unknown or unavailable SKU: ${item.sku}`)
      return line
    })
    nextCart = normalizeCart(lines)
  }

  const checkout = { ...openCheckoutState(), totalAed: nextCart.totalAed, totalPoints: nextCart.totalPoints }
  await persistCommerceState(sessionId, nextCart, checkout)

  return recordCoordinationEvent({
    sessionId,
    callId: action.callId,
    eventType: "cart_update",
    actor: "agent",
    title: "Cart updated",
    detail: cartSummary(nextCart),
    payload: { cart_state: nextCart as unknown as JsonValue, checkout_state: checkout as unknown as JsonValue },
  })
}

async function applyServiceReservation(action: Extract<VoiceAgentAction, { type: "reserve_service" }>) {
  const sessionId = action.sessionId
  if (!sessionId) throw new Error("Missing sessionId")
  if (action.stationId) {
    const destination = await resolveStationDestination(action.stationId)
    if (!destination) throw new Error("Invalid reservation station")
  }
  if (action.sku && !getCatalogItem(action.sku)) throw new Error(`Unknown SKU: ${action.sku}`)

  const reservation = {
    service: action.service,
    sku: action.sku ?? null,
    station_id: action.stationId ?? null,
    time_slot: action.timeSlot ?? "next available",
    status: "reserved",
    updated_at: new Date().toISOString(),
  }

  const supabase = createVoiceBackendClient()
  const { error } = await supabase
    .from("demo_voice_sessions")
    .update({
      recommendation_state: reservation as unknown as JsonValue,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
  if (error) throw new Error(error.message)

  return recordCoordinationEvent({
    sessionId,
    callId: action.callId,
    eventType: "service_reservation",
    actor: "agent",
    title: `${action.service} reserved`,
    detail: action.reason ?? `Reserved for ${reservation.time_slot}.`,
    payload: reservation as unknown as Record<string, JsonValue>,
  })
}

async function applyLoyaltyPoints(action: Extract<VoiceAgentAction, { type: "apply_loyalty_points" }>) {
  const sessionId = action.sessionId
  if (!sessionId) throw new Error("Missing sessionId")
  const cart = await readCartState(sessionId)
  if (cart.items.length === 0) throw new Error("Cannot apply loyalty points to an empty cart")
  const checkout = checkoutWithPoints(cart, action.points)
  if (checkout.pointsRedeemed <= 0) throw new Error("No loyalty points could be applied")
  await persistCommerceState(sessionId, cart, checkout)

  return recordCoordinationEvent({
    sessionId,
    callId: action.callId,
    eventType: "loyalty_redemption",
    actor: "agent",
    title: "Loyalty points applied",
    detail: `${checkout.pointsRedeemed} points used. ${checkout.remainingAed} AED remaining.`,
    payload: { checkout_state: checkout as unknown as JsonValue },
  })
}

async function applyCheckoutCompletion(action: Extract<VoiceAgentAction, { type: "complete_checkout" }>) {
  const sessionId = action.sessionId
  if (!sessionId) throw new Error("Missing sessionId")
  const cart = await readCartState(sessionId)
  if (cart.items.length === 0) throw new Error("Cannot complete checkout with an empty cart")
  const checkout =
    action.paymentMethod === "loyalty_points"
      ? checkoutWithPoints(cart, action.points)
      : checkoutWithPaymentMethod(cart, action.paymentMethod)

  if (checkout.status !== "paid") {
    throw new Error("Insufficient points to complete checkout")
  }

  await persistCommerceState(sessionId, cart, checkout)

  return recordCoordinationEvent({
    sessionId,
    callId: action.callId,
    eventType: "checkout_completed",
    actor: "agent",
    title: "Checkout completed",
    detail: checkout.summary,
    payload: { cart_state: cart as unknown as JsonValue, checkout_state: checkout as unknown as JsonValue },
  })
}

async function readCartState(sessionId: string): Promise<CartState> {
  const supabase = createVoiceBackendClient()
  const { data, error } = await supabase
    .from("demo_voice_sessions")
    .select("cart_state")
    .eq("id", sessionId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return cartStateSchema.catch(emptyCartState()).parse((data as { cart_state?: unknown } | null)?.cart_state)
}

async function persistCommerceState(sessionId: string, cart: CartState, checkout: CheckoutState) {
  const parsedCart = cartStateSchema.parse(cart)
  const parsedCheckout = checkoutStateSchema.parse(checkout)
  const supabase = createVoiceBackendClient()
  const { error } = await supabase
    .from("demo_voice_sessions")
    .update({
      cart_state: parsedCart as unknown as JsonValue,
      checkout_state: parsedCheckout as unknown as JsonValue,
      loyalty_state: SARAH_LOYALTY_CONTEXT as unknown as JsonValue,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
  if (error) throw new Error(error.message)
}

function cartSummary(cart: CartState) {
  if (cart.items.length === 0) return "Cart is empty."
  const itemSummary = cart.items.map((item) => `${item.qty} x ${item.name}`).join(", ")
  return `${itemSummary}. Total ${cart.totalAed} AED or ${cart.totalPoints} points.`
}

function titleForAction(action: VoiceAgentAction) {
  switch (action.type) {
    case "recommendation_update":
      return action.title ?? "Recommendation updated"
    case "cart_update":
      return "Cart updated"
    case "service_reservation":
      return `${action.service} reservation ${action.status}`
    case "loyalty_action":
      return action.label
    default:
      return "Session updated"
  }
}

function objectValue(value: unknown): Record<string, JsonValue> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, JsonValue>)
    : {}
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}
