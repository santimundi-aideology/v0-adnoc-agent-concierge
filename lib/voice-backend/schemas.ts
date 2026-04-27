import { z } from "zod"

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue | undefined }

export const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(jsonValueSchema),
  ])
)

export const optionalStringSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined))

export const speakerSchema = z.enum(["customer", "agent", "system"])

export const demoScenarioIdSchema = z.enum([
  "smart_commute",
  "ev_orchestration",
  "new_customer_welcome",
  "coffee_food_preorder",
  "car_care_visit",
  "fleet_business_visit",
])

export const businessProfileSchema = z.object({
  id: z.string().min(1),
  customerId: z.string().min(1).optional(),
  displayName: z.string().min(1),
  personaTitle: z.string().min(1),
  description: z.string().min(1),
  loyaltyTier: z.enum(["silver", "gold", "platinum"]).or(z.string().min(1)),
  preferredLanguage: z.enum(["en", "ar"]).or(z.string().min(1)).default("en"),
  voiceEnabled: z.boolean().default(true),
  favoriteProducts: z.array(z.string()).default([]),
  averageBasketValue: z.number().nonnegative().optional(),
  visitsPerWeek: z.number().nonnegative().optional(),
  upsellAcceptanceScore: z.number().min(0).max(1).optional(),
  priceSensitivityScore: z.number().min(0).max(1).optional(),
  preferredServices: z.array(z.string()).default([]),
  paymentPreference: z.string().optional(),
  featureFlags: z.record(jsonValueSchema).default({}),
  demoLocation: z
    .object({
      label: z.string(),
      lat: z.number(),
      lng: z.number(),
    })
    .optional(),
})

export const demoScenarioSchema = z.object({
  id: demoScenarioIdSchema.or(z.string().min(1)),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  trigger: z.enum(["arrival", "fueling_started", "ev_charging_started"]).or(z.string().min(1)),
  keyPoints: z.array(z.string()).default([]),
  starterPrompt: z.string().optional(),
})

export const stationContextSchema = z.object({
  stationId: z.string().min(1),
  stationName: z.string().min(1),
  city: z.string().optional(),
  region: z.string().optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  services: z.array(z.string()).default([]),
  facilities: z.array(z.string()).default([]),
  evCharging: z.boolean().optional(),
  operationalSignals: z.record(jsonValueSchema).default({}),
})

export const routeStateSchema = z.object({
  routeId: z.string().optional(),
  source: z.enum(["google_directions", "fallback", "none"]).or(z.string().min(1)),
  origin: z.object({
    label: z.string().optional(),
    lat: z.number(),
    lng: z.number(),
  }),
  destination: z.object({
    stationId: z.string().min(1),
    stationName: z.string().optional(),
    lat: z.number().nullable().optional(),
    lng: z.number().nullable().optional(),
  }),
  etaMinutes: z.number().int().positive().nullable(),
  distanceMeters: z.number().int().nonnegative().nullable(),
  previewUrl: z.string().url().nullable().optional(),
  reason: z.string().nullable().optional(),
  updatedAt: z.string().datetime().optional(),
})

export const catalogItemSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  priceAed: z.number().nonnegative(),
  pointsPrice: z.number().int().nonnegative(),
  available: z.boolean(),
  description: z.string().optional(),
  serviceTags: z.array(z.string()).default([]),
  stationConstraints: z.array(z.string()).default([]),
})

export const loyaltyContextSchema = z.object({
  customerId: z.string().min(1),
  tier: z.string().min(1),
  pointsBalance: z.number().int().nonnegative(),
  pointsCurrencyName: z.string().min(1),
  redemptionRules: z.array(z.string()).default([]),
  paymentPreference: z.string().optional(),
})

export const cartLineItemSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  qty: z.number().int().positive(),
  priceAed: z.number().nonnegative(),
  pointsPrice: z.number().int().nonnegative(),
})

export const cartStateSchema = z.object({
  items: z.array(cartLineItemSchema).default([]),
  totalAed: z.number().nonnegative().default(0),
  totalPoints: z.number().int().nonnegative().default(0),
})

export const checkoutStateSchema = z.object({
  status: z.enum(["open", "awaiting_payment", "paid", "failed"]).default("open"),
  paymentMethod: z.enum(["card", "wallet", "loyalty_points", "mixed"]).optional(),
  totalAed: z.number().nonnegative().default(0),
  totalPoints: z.number().int().nonnegative().default(0),
  pointsRedeemed: z.number().int().nonnegative().default(0),
  remainingAed: z.number().nonnegative().default(0),
  remainingPointsBalance: z.number().int().nonnegative().optional(),
  summary: z.string().optional(),
})

export const transcriptLineSchema = z.object({
  id: z.string().optional(),
  callId: z.string().min(1),
  speaker: speakerSchema,
  text: z.string().trim().min(1),
  timestamp: z.string().min(1),
  sequenceNumber: z.number().int().nonnegative().optional(),
  source: z.enum(["client", "webhook", "seed"]).default("webhook"),
  retellEventId: z.string().optional(),
})

const actionBaseSchema = z.object({
  sessionId: z.string().min(1).optional(),
  callId: z.string().min(1).optional(),
  reason: z.string().optional(),
})

export const routeChangeActionSchema = actionBaseSchema.extend({
  type: z.literal("route_change"),
  stationId: z.string().min(1),
  stationName: z.string().optional(),
  etaMinutes: z.number().int().positive().nullable().optional(),
  origin: z
    .object({
      label: z.string().optional(),
      lat: z.number(),
      lng: z.number(),
    })
    .optional(),
})

export const recommendationUpdateActionSchema = actionBaseSchema.extend({
  type: z.literal("recommendation_update"),
  stationId: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  details: z.string().optional(),
  payload: z.record(jsonValueSchema).default({}),
})

export const cartUpdateActionSchema = actionBaseSchema.extend({
  type: z.literal("cart_update"),
  items: z.array(
    z.object({
      name: z.string().min(1),
      qty: z.number().int().positive().default(1),
      price: z.number().nonnegative().optional(),
    })
  ),
  totalAmount: z.number().nonnegative().optional(),
})

export const serviceReservationActionSchema = actionBaseSchema.extend({
  type: z.literal("service_reservation"),
  service: z.string().min(1),
  stationId: z.string().min(1).optional(),
  timeSlot: z.string().optional(),
  status: z.enum(["requested", "reserved", "failed"]).default("requested"),
})

export const loyaltyActionSchema = actionBaseSchema.extend({
  type: z.literal("loyalty_action"),
  label: z.string().min(1),
  pointsApplied: z.number().int().nonnegative().optional(),
  payload: z.record(jsonValueSchema).default({}),
})

export const setStationRecommendationActionSchema = actionBaseSchema.extend({
  type: z.literal("set_station_recommendation"),
  stationId: z.string().min(1),
  stationName: z.string().optional(),
  etaMinutes: z.number().int().positive().nullable().optional(),
})

export const setRouteActionSchema = actionBaseSchema.extend({
  type: z.literal("set_route"),
  stationId: z.string().min(1),
  stationName: z.string().optional(),
  etaMinutes: z.number().int().positive().nullable().optional(),
  origin: z
    .object({
      label: z.string().optional(),
      lat: z.number(),
      lng: z.number(),
    })
    .optional(),
})

export const addCartItemActionSchema = actionBaseSchema.extend({
  type: z.literal("add_cart_item"),
  sku: z.string().min(1),
  qty: z.number().int().positive().default(1),
})

export const removeCartItemActionSchema = actionBaseSchema.extend({
  type: z.literal("remove_cart_item"),
  sku: z.string().min(1),
})

export const setCartActionSchema = actionBaseSchema.extend({
  type: z.literal("set_cart"),
  items: z.array(z.object({ sku: z.string().min(1), qty: z.number().int().positive().default(1) })),
})

export const reserveServiceActionSchema = actionBaseSchema.extend({
  type: z.literal("reserve_service"),
  sku: z.string().min(1).optional(),
  service: z.string().min(1),
  stationId: z.string().min(1).optional(),
  timeSlot: z.string().optional(),
})

export const applyLoyaltyPointsActionSchema = actionBaseSchema.extend({
  type: z.literal("apply_loyalty_points"),
  points: z.number().int().positive().optional(),
})

export const completeCheckoutActionSchema = actionBaseSchema.extend({
  type: z.literal("complete_checkout"),
  paymentMethod: z.enum(["card", "wallet", "loyalty_points"]).default("wallet"),
  points: z.number().int().positive().optional(),
})

export const addCoordinationNoteActionSchema = actionBaseSchema.extend({
  type: z.literal("add_coordination_note"),
  title: z.string().min(1),
  detail: z.string().optional(),
  payload: z.record(jsonValueSchema).default({}),
})

export const voiceAgentActionSchema = z.discriminatedUnion("type", [
  routeChangeActionSchema,
  recommendationUpdateActionSchema,
  cartUpdateActionSchema,
  serviceReservationActionSchema,
  loyaltyActionSchema,
  setStationRecommendationActionSchema,
  setRouteActionSchema,
  addCartItemActionSchema,
  removeCartItemActionSchema,
  setCartActionSchema,
  reserveServiceActionSchema,
  applyLoyaltyPointsActionSchema,
  completeCheckoutActionSchema,
  addCoordinationNoteActionSchema,
])

export const sessionCoordinationEventSchema = z.object({
  id: z.string().optional(),
  sessionId: z.string().min(1),
  callId: z.string().min(1).optional(),
  sequenceNumber: z.number().int().nonnegative().optional(),
  eventType: z.string().min(1),
  actor: z.enum(["agent", "customer", "system", "operator"]).default("system"),
  title: z.string().min(1),
  detail: z.string().optional(),
  status: z.enum(["pending", "accepted", "rejected", "failed"]).default("accepted"),
  payload: z.record(jsonValueSchema).default({}),
  createdAt: z.string().optional(),
})

export const retellSessionContextSchema = z.object({
  sessionId: z.string().min(1).optional(),
  callId: z.string().min(1).optional(),
  profile: businessProfileSchema,
  scenario: demoScenarioSchema,
  primaryStation: stationContextSchema.optional(),
  nearestStations: z.array(stationContextSchema).default([]),
  stationCatalog: z.array(z.record(jsonValueSchema)).default([]),
  upsellOffers: z.array(z.record(jsonValueSchema)).default([]),
  activeRoute: routeStateSchema.optional(),
  catalogItems: z.array(catalogItemSchema).default([]),
  loyaltyContext: loyaltyContextSchema.optional(),
  cartState: cartStateSchema.default({ items: [], totalAed: 0, totalPoints: 0 }),
  checkoutState: checkoutStateSchema.default({
    status: "open",
    totalAed: 0,
    totalPoints: 0,
    pointsRedeemed: 0,
    remainingAed: 0,
  }),
  actionInstructions: z.array(z.string()).default([]),
  coordinationEvents: z.array(sessionCoordinationEventSchema).default([]),
  allowedActions: z.array(z.string()).default([
    "get_demo_context",
    "update_session_ui",
    "set_station_recommendation",
    "set_route",
    "add_cart_item",
    "remove_cart_item",
    "set_cart",
    "reserve_service",
    "apply_loyalty_points",
    "complete_checkout",
    "add_coordination_note",
  ]),
  conversationHistory: z.string().optional(),
  metadata: z.record(jsonValueSchema).default({}),
})

export const createRetellCallRequestSchema = z.object({
  agentId: z.string().min(1).optional(),
  sessionId: z.string().min(1).optional(),
  profileId: z.string().min(1).optional(),
  scenarioId: z.string().min(1).optional(),
  dynamicVariables: z.record(jsonValueSchema).default({}),
  metadata: z.record(jsonValueSchema).default({}),
})

export const createRetellCallResponseSchema = z.object({
  accessToken: z.string().min(1),
  callId: z.string().min(1),
  sessionId: z.string().min(1).optional(),
})

export const apiErrorResponseSchema = z.object({
  error: z.string(),
  details: z.record(jsonValueSchema).optional(),
})

export type BusinessProfile = z.infer<typeof businessProfileSchema>
export type DemoScenario = z.infer<typeof demoScenarioSchema>
export type StationContext = z.infer<typeof stationContextSchema>
export type RouteState = z.infer<typeof routeStateSchema>
export type CatalogItem = z.infer<typeof catalogItemSchema>
export type LoyaltyContext = z.infer<typeof loyaltyContextSchema>
export type CartLineItem = z.infer<typeof cartLineItemSchema>
export type CartState = z.infer<typeof cartStateSchema>
export type CheckoutState = z.infer<typeof checkoutStateSchema>
export type TranscriptLineRecord = z.infer<typeof transcriptLineSchema>
export type VoiceAgentAction = z.infer<typeof voiceAgentActionSchema>
export type SessionCoordinationEvent = z.infer<typeof sessionCoordinationEventSchema>
export type RetellSessionContext = z.infer<typeof retellSessionContextSchema>
export type CreateRetellCallRequest = z.infer<typeof createRetellCallRequestSchema>
export type CreateRetellCallResponse = z.infer<typeof createRetellCallResponseSchema>
