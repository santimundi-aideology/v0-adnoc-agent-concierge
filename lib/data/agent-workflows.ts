import type { AgentWorkflow } from "@/lib/types"

/**
 * Agent workflow definitions.
 *
 * Each agent handles a specific customer intent and has its own
 * conversation flow (nodes). This acts as the "library" of agents
 * that managers can browse, inspect and edit.
 *
 * In the future this can be backed by a Supabase table; for now the
 * definitions live here so the UI is immediately usable.
 */

export const agentWorkflows: AgentWorkflow[] = [
  /* ──────────── Order Food ──────────── */
  {
    id: "agent-order-food",
    name: "Food Ordering Agent",
    intent: "Order Food",
    description:
      "Handles in-station food & beverage ordering — from menu browsing through payment confirmation.",
    icon: "UtensilsCrossed",
    color: "orange",
    status: "published",
    version: "2.3",
    nodes: [
      {
        id: "OF-01",
        label: "Greet & Identify Station",
        description:
          "Welcome the customer and detect their nearest station via phone number or GPS.",
        confirmations: ["Confirm station with caller"],
        fallback: "Let me look up your nearest station…",
      },
      {
        id: "OF-02",
        label: "Browse Menu",
        description:
          "Query the station's live menu, show available items and categories.",
        confirmations: [],
        fallback: "Here's what's available at your station right now…",
      },
      {
        id: "OF-03",
        label: "Take Order",
        description:
          "Collect item selections, sizes, customizations and quantities.",
        confirmations: ["Customer confirms each item"],
        fallback: "Could you repeat that item for me?",
      },
      {
        id: "OF-04",
        label: "Suggest Upsell",
        description:
          "RAG-powered recommendation based on the current cart, promotions and purchase history.",
        confirmations: ["Customer agrees to recommendation"],
        fallback: "We also have a great combo deal right now…",
      },
      {
        id: "OF-05",
        label: "Confirm Order & Price",
        description:
          "Read back the full order with total price and get final confirmation.",
        confirmations: [
          "Customer confirms order details",
          "Price verification passed",
        ],
        fallback: "Let me confirm your order details…",
      },
      {
        id: "OF-06",
        label: "Process Payment",
        description:
          "Handle payment via loyalty points, card on file, or in-store payment.",
        confirmations: ["Payment method confirmed"],
        fallback: "How would you like to pay today?",
      },
      {
        id: "OF-07",
        label: "Send Confirmation",
        description:
          "Send order confirmation via SMS/push and provide estimated pickup time.",
        confirmations: [],
        fallback: "Your order has been placed! You'll receive a confirmation shortly.",
      },
      {
        id: "OF-08",
        label: "Handoff / Escalation",
        description:
          "Escalate to a human agent if the customer is unhappy or the order fails.",
        confirmations: ["Agent accepts handoff"],
        fallback: "Let me connect you with a team member…",
      },
    ],
  },

  /* ──────────── Book Car Wash ──────────── */
  {
    id: "agent-car-wash",
    name: "Car Wash Booking Agent",
    intent: "Book Car Wash",
    description:
      "Manages car wash reservations — slot selection, vehicle type, package choice and scheduling.",
    icon: "Car",
    color: "blue",
    status: "published",
    version: "1.8",
    nodes: [
      {
        id: "CW-01",
        label: "Greet & Identify Station",
        description:
          "Welcome the customer and confirm their preferred station location.",
        confirmations: ["Confirm station with caller"],
        fallback: "Let me find the nearest car wash for you…",
      },
      {
        id: "CW-02",
        label: "Select Vehicle Type",
        description:
          "Ask for vehicle type (sedan, SUV, truck) to determine pricing and bay availability.",
        confirmations: [],
        fallback: "What type of vehicle will you be bringing in?",
      },
      {
        id: "CW-03",
        label: "Choose Wash Package",
        description:
          "Present available packages (Basic, Premium, Deluxe) with pricing.",
        confirmations: ["Customer selects a package"],
        fallback: "We offer three wash packages — let me walk you through them…",
      },
      {
        id: "CW-04",
        label: "Check Slot Availability",
        description:
          "Query time-slot availability for the selected station and package.",
        confirmations: [],
        fallback: "Let me check available time slots…",
      },
      {
        id: "CW-05",
        label: "Confirm Booking",
        description:
          "Read back booking details (station, package, date/time, price) and confirm.",
        confirmations: [
          "Customer confirms date & time",
          "Customer confirms package & price",
        ],
        fallback: "Let me confirm your booking details…",
      },
      {
        id: "CW-06",
        label: "Send Reminder",
        description:
          "Schedule an SMS/push reminder 1 hour before the appointment.",
        confirmations: [],
        fallback: "You'll receive a reminder before your appointment.",
      },
    ],
  },

  /* ──────────── Quick Lube ──────────── */
  {
    id: "agent-quick-lube",
    name: "Quick Lube Agent",
    intent: "Quick Lube",
    description:
      "Guides customers through oil change and quick lube service bookings with vehicle checks.",
    icon: "Wrench",
    color: "amber",
    status: "published",
    version: "1.4",
    nodes: [
      {
        id: "QL-01",
        label: "Greet & Identify Vehicle",
        description:
          "Welcome the customer and collect vehicle make, model, year and mileage.",
        confirmations: ["Vehicle details confirmed"],
        fallback: "Could you tell me about your vehicle?",
      },
      {
        id: "QL-02",
        label: "Recommend Service",
        description:
          "Based on vehicle data and service history, recommend the right lube package.",
        confirmations: [],
        fallback: "Based on your mileage I'd recommend…",
      },
      {
        id: "QL-03",
        label: "Select Station & Time",
        description:
          "Show nearby stations with bay availability and let the customer pick a slot.",
        confirmations: ["Station and time confirmed"],
        fallback: "Here are the available stations near you…",
      },
      {
        id: "QL-04",
        label: "Add-ons & Inspection",
        description:
          "Offer additional services: filter replacement, tire pressure, fluid top-up.",
        confirmations: ["Customer confirms add-ons"],
        fallback: "Would you also like us to check your tire pressure?",
      },
      {
        id: "QL-05",
        label: "Confirm & Book",
        description:
          "Summarize service, price, date/time and get final confirmation.",
        confirmations: [
          "Customer confirms service details",
          "Price confirmed",
        ],
        fallback: "Let me confirm your service booking…",
      },
      {
        id: "QL-06",
        label: "Post-Service Follow-up",
        description:
          "After service completion, send receipt and schedule next service reminder.",
        confirmations: [],
        fallback: "Your service is complete! Here's your receipt.",
      },
    ],
  },

  /* ──────────── General Inquiry ──────────── */
  {
    id: "agent-general-inquiry",
    name: "General Inquiry Agent",
    intent: "General Inquiry",
    description:
      "Handles general questions about station services, hours, locations and policies.",
    icon: "HelpCircle",
    color: "slate",
    status: "published",
    version: "3.0",
    nodes: [
      {
        id: "GI-01",
        label: "Greet & Classify",
        description:
          "Welcome the customer and use NLU to classify the inquiry topic.",
        confirmations: [],
        fallback: "How can I help you today?",
      },
      {
        id: "GI-02",
        label: "Knowledge Search",
        description:
          "Perform RAG search across the knowledge base to find relevant answers.",
        confirmations: [],
        fallback: "Let me look that up for you…",
      },
      {
        id: "GI-03",
        label: "Provide Answer",
        description:
          "Deliver the answer clearly and ask if the customer needs more information.",
        confirmations: ["Customer confirms answer is helpful"],
        fallback: "Does that answer your question?",
      },
      {
        id: "GI-04",
        label: "Redirect or Escalate",
        description:
          "If the inquiry maps to another agent (e.g. booking), redirect. Otherwise escalate to human.",
        confirmations: [],
        fallback: "Let me transfer you to the right department…",
      },
    ],
  },

  /* ──────────── Loyalty Check ──────────── */
  {
    id: "agent-loyalty",
    name: "Loyalty Program Agent",
    intent: "Loyalty Check",
    description:
      "Handles loyalty balance checks, point redemptions, tier status and reward offers.",
    icon: "Star",
    color: "purple",
    status: "published",
    version: "2.0",
    nodes: [
      {
        id: "LC-01",
        label: "Authenticate Member",
        description:
          "Verify the customer's loyalty ID or phone number against the membership database.",
        confirmations: ["Identity verified"],
        fallback: "Can I have your loyalty card number or registered phone?",
      },
      {
        id: "LC-02",
        label: "Show Balance & Tier",
        description:
          "Retrieve and present current points balance, tier status and expiration dates.",
        confirmations: [],
        fallback: "Here's your current loyalty status…",
      },
      {
        id: "LC-03",
        label: "Browse Rewards",
        description:
          "Show available rewards and redemption options based on balance.",
        confirmations: [],
        fallback: "Let me show you what you can redeem…",
      },
      {
        id: "LC-04",
        label: "Process Redemption",
        description:
          "Handle reward redemption — deduct points, generate voucher or apply discount.",
        confirmations: [
          "Customer confirms reward selection",
          "Points deduction confirmed",
        ],
        fallback: "I'll process that redemption for you now…",
      },
      {
        id: "LC-05",
        label: "Send Summary",
        description:
          "Send updated balance and voucher details via SMS/push.",
        confirmations: [],
        fallback: "You'll receive your reward details shortly!",
      },
    ],
  },

  /* ──────────── EV Charge ──────────── */
  {
    id: "agent-ev-charge",
    name: "EV Charging Agent",
    intent: "EV Charge",
    description:
      "Assists with EV charger availability, session start/stop, and billing for electric vehicle charging.",
    icon: "Zap",
    color: "emerald",
    status: "draft",
    version: "0.9",
    nodes: [
      {
        id: "EV-01",
        label: "Greet & Locate Charger",
        description:
          "Identify the customer's station and show available charger types (Level 2, DC Fast).",
        confirmations: ["Station confirmed"],
        fallback: "Let me find available chargers near you…",
      },
      {
        id: "EV-02",
        label: "Check Compatibility",
        description:
          "Verify vehicle connector type (CCS, CHAdeMO, Type 2) matches the charger.",
        confirmations: [],
        fallback: "What type of EV do you have?",
      },
      {
        id: "EV-03",
        label: "Start Charging Session",
        description:
          "Authenticate the customer and remotely initiate the charging session.",
        confirmations: ["Customer authorizes charge start"],
        fallback: "I'll start the charging session now…",
      },
      {
        id: "EV-04",
        label: "Monitor Session",
        description:
          "Track charging progress, estimated time to full, and current cost.",
        confirmations: [],
        fallback: "Your vehicle is charging — I'll keep you updated.",
      },
      {
        id: "EV-05",
        label: "Complete & Bill",
        description:
          "End the session, calculate the final cost, and process payment.",
        confirmations: ["Customer confirms session end", "Payment processed"],
        fallback: "Your charging session is complete. Here's the summary…",
      },
    ],
  },
]

/** Retrieve a single agent workflow by ID */
export function getAgentWorkflow(id: string): AgentWorkflow | undefined {
  return agentWorkflows.find((a) => a.id === id)
}
