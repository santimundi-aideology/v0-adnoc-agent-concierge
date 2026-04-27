import {
  type BusinessProfile,
  type DemoScenario,
  businessProfileSchema,
  demoScenarioSchema,
} from "@/lib/voice-backend/schemas"
import { createVoiceBackendClient } from "@/lib/voice-backend/supabase-admin"

type CustomerRow = {
  id: string
  first_name: string
  last_name: string
  loyalty_tier: string
  preferred_language: string
  voice_enabled: boolean
}

type BehaviorRow = {
  customer_id: string
  favorite_product: string
  avg_basket_value: number
  visits_per_week: number
  upsell_acceptance_score: number
  price_sensitivity_score: number
}

type LocationRow = {
  customer_id: string
  label: string
  lat: number
  lng: number
}

export const DEFAULT_BUSINESS_PROFILES: BusinessProfile[] = [
  {
    id: "ev-premium",
    displayName: "Sarah Al Mansoori",
    personaTitle: "EV Premium Customer",
    description: "EV driver with a charging dwell window, premium loyalty status, and coffee preferences.",
    loyaltyTier: "platinum",
    preferredLanguage: "en",
    voiceEnabled: true,
    favoriteProducts: ["Iced Latte", "Protein Snack Box"],
    averageBasketValue: 42,
    visitsPerWeek: 3,
    upsellAcceptanceScore: 0.82,
    priceSensitivityScore: 0.2,
    preferredServices: ["ev_charging", "coffee", "shop"],
    paymentPreference: "adnoc_wallet",
    featureFlags: { routePriority: "charging_availability", dwellMinutes: 30 },
  },
  {
    id: "executive-commuter",
    displayName: "Khalid Al Nuaimi",
    personaTitle: "Executive Time-Sensitive Commuter",
    description: "Time-focused commuter who values fast routing, prepared coffee, and minimal queue time.",
    loyaltyTier: "gold",
    preferredLanguage: "en",
    voiceEnabled: true,
    favoriteProducts: ["Flat White"],
    averageBasketValue: 28,
    visitsPerWeek: 5,
    upsellAcceptanceScore: 0.55,
    priceSensitivityScore: 0.15,
    preferredServices: ["fuel", "coffee"],
    paymentPreference: "card",
    featureFlags: { routePriority: "fastest_eta" },
  },
  {
    id: "new-customer",
    displayName: "Omar Haddad",
    personaTitle: "New Customer",
    description: "First-time visitor who needs a warm welcome, loyalty sign-up, and simple service explanation.",
    loyaltyTier: "silver",
    preferredLanguage: "en",
    voiceEnabled: true,
    favoriteProducts: ["Welcome Bundle"],
    averageBasketValue: 25,
    visitsPerWeek: 1,
    upsellAcceptanceScore: 0.48,
    priceSensitivityScore: 0.6,
    preferredServices: ["fuel", "shop", "loyalty_signup"],
    paymentPreference: "card",
    featureFlags: { routePriority: "guided_experience" },
  },
  {
    id: "family-shopper",
    displayName: "Mariam Al Ketbi",
    personaTitle: "Family Convenience Shopper",
    description: "Family trip customer interested in food, drinks, restrooms, and convenient bundles.",
    loyaltyTier: "gold",
    preferredLanguage: "ar",
    voiceEnabled: true,
    favoriteProducts: ["Family Snack Bundle", "Cold Drinks"],
    averageBasketValue: 65,
    visitsPerWeek: 2,
    upsellAcceptanceScore: 0.74,
    priceSensitivityScore: 0.45,
    preferredServices: ["food", "beverages", "facilities"],
    paymentPreference: "apple_pay",
    featureFlags: { routePriority: "family_facilities" },
  },
  {
    id: "fleet-business",
    displayName: "Nasser Fleet Ops",
    personaTitle: "Fleet Business Customer",
    description: "Business user coordinating repeat fuel stops, receipts, and efficient station selection.",
    loyaltyTier: "platinum",
    preferredLanguage: "en",
    voiceEnabled: true,
    favoriteProducts: ["Diesel", "Fleet Receipt"],
    averageBasketValue: 220,
    visitsPerWeek: 8,
    upsellAcceptanceScore: 0.38,
    priceSensitivityScore: 0.35,
    preferredServices: ["fuel", "fleet_receipts", "diesel"],
    paymentPreference: "fleet_account",
    featureFlags: { routePriority: "fleet_efficiency" },
  },
  {
    id: "car-care-focused",
    displayName: "Layla Saeed",
    personaTitle: "Car-Care Focused Customer",
    description: "Customer looking for car wash, interior cleaning, and add-on care services.",
    loyaltyTier: "gold",
    preferredLanguage: "en",
    voiceEnabled: true,
    favoriteProducts: ["Premium Wash", "Interior Clean"],
    averageBasketValue: 80,
    visitsPerWeek: 2,
    upsellAcceptanceScore: 0.79,
    priceSensitivityScore: 0.3,
    preferredServices: ["car_wash", "interior_cleaning", "car_care"],
    paymentPreference: "adnoc_wallet",
    featureFlags: { routePriority: "car_care_availability" },
  },
]

export const DEFAULT_DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: "smart_commute",
    title: "Smart Commute",
    subtitle: "Optimize for ETA, queue, and prepared pickup.",
    trigger: "arrival",
    keyPoints: ["fastest station", "prepared coffee", "minimal queue"],
    starterPrompt: "Help me pick the fastest ADNOC stop on my commute.",
  },
  {
    id: "ev_orchestration",
    title: "EV Charging Orchestration",
    subtitle: "Coordinate charging dwell time and add-on purchases.",
    trigger: "ev_charging_started",
    keyPoints: ["charger availability", "dwell time", "coffee or shop offer"],
    starterPrompt: "Find me a charger and something useful while I wait.",
  },
  {
    id: "new_customer_welcome",
    title: "New Customer Welcome",
    subtitle: "Guide a first-time visitor through services and loyalty.",
    trigger: "arrival",
    keyPoints: ["welcome explanation", "loyalty sign-up", "simple bundle"],
    starterPrompt: "I'm new to ADNOC. What should I do first?",
  },
  {
    id: "coffee_food_preorder",
    title: "Coffee And Food Pre-Order",
    subtitle: "Prepare F&B items before arrival.",
    trigger: "arrival",
    keyPoints: ["favorite product", "upsell bundle", "pickup timing"],
    starterPrompt: "Can you have my usual ready when I arrive?",
  },
  {
    id: "car_care_visit",
    title: "Car Care Visit",
    subtitle: "Find stations with wash or interior cleaning availability.",
    trigger: "arrival",
    keyPoints: ["car care availability", "queue time", "reservation"],
    starterPrompt: "I need a car wash and interior cleaning.",
  },
  {
    id: "fleet_business_visit",
    title: "Fleet Business Visit",
    subtitle: "Support business fueling and receipt-oriented workflows.",
    trigger: "fueling_started",
    keyPoints: ["fleet efficiency", "diesel availability", "receipt handling"],
    starterPrompt: "Plan the best fuel stop for my fleet route.",
  },
]

export async function listBusinessProfiles(): Promise<BusinessProfile[]> {
  const supabase = createVoiceBackendClient()
  const [{ data: customers }, { data: behaviors }, { data: locations }] = await Promise.all([
    supabase.from("customers").select("id, first_name, last_name, loyalty_tier, preferred_language, voice_enabled"),
    supabase.from("customer_behavior_profiles").select("*"),
    supabase.from("customer_demo_locations").select("customer_id, label, lat, lng"),
  ])

  const customerRows = Array.isArray(customers) ? (customers as CustomerRow[]) : []
  if (customerRows.length === 0) return DEFAULT_BUSINESS_PROFILES

  const behaviorMap = new Map(
    (Array.isArray(behaviors) ? (behaviors as BehaviorRow[]) : []).map((row) => [row.customer_id, row])
  )
  const locationMap = new Map(
    (Array.isArray(locations) ? (locations as LocationRow[]) : []).map((row) => [row.customer_id, row])
  )

  const fallbackByFirstName = new Map(DEFAULT_BUSINESS_PROFILES.map((profile) => [firstNameFromDisplayName(profile.displayName), profile]))
  const mapped = customerRows.map((customer, index) => {
    const behavior = behaviorMap.get(customer.id)
    const location = locationMap.get(customer.id)
    const fallback =
      fallbackByFirstName.get(customer.first_name) ??
      DEFAULT_BUSINESS_PROFILES[index % DEFAULT_BUSINESS_PROFILES.length]
    return businessProfileSchema.parse({
      ...fallback,
      id: customer.id,
      customerId: customer.id,
      displayName: `${customer.first_name} ${customer.last_name}`.trim(),
      loyaltyTier: customer.loyalty_tier,
      preferredLanguage: customer.preferred_language,
      voiceEnabled: customer.voice_enabled,
      favoriteProducts: behavior?.favorite_product ? [behavior.favorite_product] : fallback.favoriteProducts,
      averageBasketValue: behavior?.avg_basket_value ?? fallback.averageBasketValue,
      visitsPerWeek: behavior?.visits_per_week ?? fallback.visitsPerWeek,
      upsellAcceptanceScore: behavior?.upsell_acceptance_score ?? fallback.upsellAcceptanceScore,
      priceSensitivityScore: behavior?.price_sensitivity_score ?? fallback.priceSensitivityScore,
      demoLocation: location
        ? { label: location.label, lat: Number(location.lat), lng: Number(location.lng) }
        : fallback.demoLocation,
    })
  })

  const mappedByFirstName = new Map(mapped.map((profile) => [firstNameFromDisplayName(profile.displayName), profile]))
  return DEFAULT_BUSINESS_PROFILES.map((fallback) => mappedByFirstName.get(firstNameFromDisplayName(fallback.displayName)) ?? fallback)
}

export async function getBusinessProfile(profileId?: string): Promise<BusinessProfile | null> {
  const profiles = await listBusinessProfiles()
  if (!profileId) return profiles[0] ?? null
  return profiles.find((profile) => profile.id === profileId || profile.customerId === profileId) ?? null
}

export function listDemoScenarios(): DemoScenario[] {
  return DEFAULT_DEMO_SCENARIOS.map((scenario) => demoScenarioSchema.parse(scenario))
}

export function getDemoScenario(scenarioId?: string): DemoScenario {
  const scenarios = listDemoScenarios()
  return scenarios.find((scenario) => scenario.id === scenarioId) ?? scenarios[0]
}

function firstNameFromDisplayName(displayName: string) {
  return displayName.trim().split(/\s+/)[0] ?? displayName
}
