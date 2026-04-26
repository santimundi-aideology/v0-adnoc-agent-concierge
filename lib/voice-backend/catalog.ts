export type CatalogCategory =
  | "coffee"
  | "hot_drink"
  | "cold_drink"
  | "food"
  | "snack"
  | "ev_dwell"
  | "car_wash"
  | "interior_cleaning"
  | "car_care"
  | "fuel"
  | "service_reservation"

export type CatalogItem = {
  sku: string
  name: string
  category: CatalogCategory
  priceAed: number
  pointsPrice: number
  available: boolean
  description?: string
  serviceTags?: string[]
  stationConstraints?: string[]
}

export type LoyaltyContext = {
  customerId: string
  tier: string
  pointsBalance: number
  pointsCurrencyName: string
  redemptionRules: string[]
  paymentPreference?: string
}

export type CartLineItem = {
  sku: string
  name: string
  qty: number
  priceAed: number
  pointsPrice: number
}

export type CartState = {
  items: CartLineItem[]
  totalAed: number
  totalPoints: number
}

export type CheckoutState = {
  status: "open" | "awaiting_payment" | "paid" | "failed"
  paymentMethod?: "card" | "wallet" | "loyalty_points" | "mixed"
  totalAed: number
  totalPoints: number
  pointsRedeemed: number
  remainingAed: number
  remainingPointsBalance?: number
  summary?: string
}

export const SARAH_LOYALTY_CONTEXT: LoyaltyContext = {
  customerId: "a1b2c3d4-0002-4000-8000-000000000002",
  tier: "platinum",
  pointsBalance: 18500,
  pointsCurrencyName: "ADNOC Rewards points",
  paymentPreference: "adnoc_wallet",
  redemptionRules: [
    "Use explicit catalog points prices only.",
    "Do not apply more points than Sarah's available balance.",
    "If points do not cover the cart, use points first and quote the remaining AED balance.",
    "Confirm points used, remaining AED balance, and payment completion clearly.",
  ],
}

export const DEMO_CATALOG_ITEMS: CatalogItem[] = [
  { sku: "COF-FLAT-WHITE", name: "Flat White", category: "coffee", priceAed: 18, pointsPrice: 1800, available: true, serviceTags: ["coffee", "oasis"] },
  { sku: "COF-ICED-LATTE", name: "Iced Latte", category: "coffee", priceAed: 25, pointsPrice: 2500, available: true, serviceTags: ["coffee", "cold"] },
  { sku: "COF-LATTE", name: "Latte", category: "coffee", priceAed: 20, pointsPrice: 2000, available: true, serviceTags: ["coffee"] },
  { sku: "COF-CAPPUCCINO", name: "Cappuccino", category: "coffee", priceAed: 19, pointsPrice: 1900, available: true, serviceTags: ["coffee"] },
  { sku: "COF-AMERICANO", name: "Americano", category: "coffee", priceAed: 14, pointsPrice: 1400, available: true, serviceTags: ["coffee"] },
  { sku: "HOT-KARAK", name: "Karak Tea", category: "hot_drink", priceAed: 8, pointsPrice: 800, available: true, serviceTags: ["tea"] },
  { sku: "HOT-GREEN-TEA", name: "Green Tea", category: "hot_drink", priceAed: 9, pointsPrice: 900, available: true, serviceTags: ["tea"] },
  { sku: "DRK-WATER", name: "Mineral Water", category: "cold_drink", priceAed: 4, pointsPrice: 400, available: true, serviceTags: ["cold_drink"] },
  { sku: "DRK-COLD-BUNDLE", name: "Cold Drinks Bundle", category: "cold_drink", priceAed: 16, pointsPrice: 1600, available: true, description: "Two cold beverages for the drive.", serviceTags: ["bundle"] },
  { sku: "DRK-ENERGY", name: "Energy Drink", category: "cold_drink", priceAed: 12, pointsPrice: 1200, available: true, serviceTags: ["cold_drink"] },
  { sku: "FOOD-ZAATAR-CROISSANT", name: "Zaatar Croissant", category: "food", priceAed: 8, pointsPrice: 800, available: true, serviceTags: ["bakery"] },
  { sku: "FOOD-TURKEY-SANDWICH", name: "Turkey Sandwich", category: "food", priceAed: 24, pointsPrice: 2400, available: true, serviceTags: ["sandwich"] },
  { sku: "FOOD-CHICKEN-WRAP", name: "Chicken Wrap", category: "food", priceAed: 22, pointsPrice: 2200, available: true, serviceTags: ["sandwich"] },
  { sku: "FOOD-FALAFEL-WRAP", name: "Falafel Wrap", category: "food", priceAed: 18, pointsPrice: 1800, available: true, serviceTags: ["vegetarian"] },
  { sku: "SNK-PROTEIN-BOX", name: "Protein Snack Box", category: "snack", priceAed: 28, pointsPrice: 2800, available: true, serviceTags: ["healthy", "ev_dwell"] },
  { sku: "SNK-DATES", name: "Dates Pack", category: "snack", priceAed: 10, pointsPrice: 1000, available: true, serviceTags: ["local"] },
  { sku: "SNK-NUTS", name: "Mixed Nuts", category: "snack", priceAed: 13, pointsPrice: 1300, available: true, serviceTags: ["snack"] },
  { sku: "SNK-CHOCOLATE", name: "Chocolate Bar", category: "snack", priceAed: 7, pointsPrice: 700, available: true, serviceTags: ["snack"] },
  { sku: "EV-LOUNGE-PASS", name: "EV Lounge Access", category: "ev_dwell", priceAed: 20, pointsPrice: 2000, available: true, serviceTags: ["ev_charging", "lounge"] },
  { sku: "EV-DWELL-BUNDLE", name: "EV Dwell Coffee + Snack Bundle", category: "ev_dwell", priceAed: 35, pointsPrice: 3500, available: true, serviceTags: ["ev_charging", "bundle"] },
  { sku: "WASH-EXPRESS", name: "Express Wash", category: "car_wash", priceAed: 35, pointsPrice: 3500, available: true, serviceTags: ["car_wash"] },
  { sku: "WASH-PREMIUM", name: "Premium Wash", category: "car_wash", priceAed: 55, pointsPrice: 5500, available: true, serviceTags: ["car_wash"] },
  { sku: "WASH-WAX", name: "Wash + Wax", category: "car_wash", priceAed: 75, pointsPrice: 7500, available: true, serviceTags: ["car_wash", "wax"] },
  { sku: "INT-CLEAN", name: "Interior Cleaning", category: "interior_cleaning", priceAed: 45, pointsPrice: 4500, available: true, serviceTags: ["interior_cleaning"] },
  { sku: "INT-DEEP-CLEAN", name: "Interior Deep Clean", category: "interior_cleaning", priceAed: 85, pointsPrice: 8500, available: true, serviceTags: ["interior_cleaning"] },
  { sku: "CARE-QUICK-LUBE", name: "Quick Lube Service", category: "car_care", priceAed: 120, pointsPrice: 12000, available: true, serviceTags: ["quick_lube"] },
  { sku: "CARE-TIRE-CHECK", name: "Tire Pressure Check", category: "car_care", priceAed: 15, pointsPrice: 1500, available: true, serviceTags: ["tire_check"] },
  { sku: "CARE-AC-CHECK", name: "AC Check", category: "car_care", priceAed: 40, pointsPrice: 4000, available: true, serviceTags: ["ac_check"] },
  { sku: "FUEL-SPECIAL-95", name: "Special 95 Fuel Top-Up", category: "fuel", priceAed: 50, pointsPrice: 5000, available: true, description: "Demo top-up value; per-litre rates remain national monthly prices.", serviceTags: ["fuel"] },
  { sku: "SRV-CHARGER-RESERVE", name: "EV Charger Reservation", category: "service_reservation", priceAed: 0, pointsPrice: 0, available: true, serviceTags: ["ev_charging", "reservation"] },
  { sku: "SRV-STALL-DELIVERY", name: "Delivery to Charging Stall", category: "service_reservation", priceAed: 0, pointsPrice: 0, available: true, serviceTags: ["delivery", "ev_charging"] },
]

export function getCatalogItem(sku: string) {
  return DEMO_CATALOG_ITEMS.find((item) => item.sku === sku)
}

export function emptyCartState(): CartState {
  return { items: [], totalAed: 0, totalPoints: 0 }
}

export function openCheckoutState(): CheckoutState {
  return {
    status: "open",
    totalAed: 0,
    totalPoints: 0,
    pointsRedeemed: 0,
    remainingAed: 0,
    remainingPointsBalance: SARAH_LOYALTY_CONTEXT.pointsBalance,
  }
}

export function normalizeCart(items: CartLineItem[]): CartState {
  const normalizedItems = items
    .filter((item) => item.qty > 0)
    .map((item) => ({
      ...item,
      qty: Math.max(1, Math.round(item.qty)),
      priceAed: Number(item.priceAed),
      pointsPrice: Math.round(item.pointsPrice),
    }))

  return {
    items: normalizedItems,
    totalAed: roundMoney(normalizedItems.reduce((sum, item) => sum + item.priceAed * item.qty, 0)),
    totalPoints: normalizedItems.reduce((sum, item) => sum + item.pointsPrice * item.qty, 0),
  }
}

export function cartLineFromCatalog(sku: string, qty = 1): CartLineItem | null {
  const item = getCatalogItem(sku)
  if (!item || !item.available) return null
  return {
    sku: item.sku,
    name: item.name,
    qty: Math.max(1, Math.round(qty)),
    priceAed: item.priceAed,
    pointsPrice: item.pointsPrice,
  }
}

export function checkoutWithPoints(cart: CartState, pointsToUse?: number): CheckoutState {
  const requestedPoints = pointsToUse ?? cart.totalPoints
  const pointsRedeemed = Math.max(
    0,
    Math.min(SARAH_LOYALTY_CONTEXT.pointsBalance, cart.totalPoints, Math.round(requestedPoints))
  )
  const remainingPointsValueAed = Math.max(0, cart.totalPoints - pointsRedeemed) / 100
  return {
    status: pointsRedeemed >= cart.totalPoints ? "paid" : "awaiting_payment",
    paymentMethod: pointsRedeemed >= cart.totalPoints ? "loyalty_points" : "mixed",
    totalAed: cart.totalAed,
    totalPoints: cart.totalPoints,
    pointsRedeemed,
    remainingAed: roundMoney(remainingPointsValueAed),
    remainingPointsBalance: SARAH_LOYALTY_CONTEXT.pointsBalance - pointsRedeemed,
    summary:
      pointsRedeemed >= cart.totalPoints
        ? `Paid with ${pointsRedeemed} ADNOC Rewards points.`
        : `Applied ${pointsRedeemed} points with ${roundMoney(remainingPointsValueAed)} AED remaining.`,
  }
}

export function checkoutWithPaymentMethod(
  cart: CartState,
  paymentMethod: "card" | "wallet"
): CheckoutState {
  return {
    status: "paid",
    paymentMethod,
    totalAed: cart.totalAed,
    totalPoints: cart.totalPoints,
    pointsRedeemed: 0,
    remainingAed: 0,
    remainingPointsBalance: SARAH_LOYALTY_CONTEXT.pointsBalance,
    summary: `Paid ${cart.totalAed} AED by ${paymentMethod === "wallet" ? "ADNOC wallet" : "card"}.`,
  }
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}
