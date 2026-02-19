// Stations
export const stations = [
  { id: "STN-001", name: "Al Raha Beach", city: "Abu Dhabi", region: "Western" },
  { id: "STN-002", name: "Khalifa City A", city: "Abu Dhabi", region: "Western" },
  { id: "STN-003", name: "Dubai Marina", city: "Dubai", region: "Central" },
  { id: "STN-004", name: "Jumeirah Village", city: "Dubai", region: "Central" },
  { id: "STN-005", name: "Sharjah Industrial", city: "Sharjah", region: "Northern" },
  { id: "STN-006", name: "Al Ain Central", city: "Al Ain", region: "Eastern" },
]

// Products / SKUs
export const products = [
  { sku: "COF-001", name: "Arabic Coffee (Large)", category: "Beverages", price: 12, stock: 45 },
  { sku: "COF-002", name: "Cappuccino (Regular)", category: "Beverages", price: 15, stock: 32 },
  { sku: "SNK-001", name: "Zaatar Croissant", category: "Snacks", price: 8, stock: 28 },
  { sku: "SNK-002", name: "Chicken Shawarma Wrap", category: "Snacks", price: 18, stock: 15 },
  { sku: "SNK-003", name: "Mixed Nuts Pack", category: "Snacks", price: 10, stock: 50 },
  { sku: "WAS-001", name: "Express Car Wash", category: "Services", price: 35, stock: 99 },
  { sku: "WAS-002", name: "Premium Car Wash + Wax", category: "Services", price: 65, stock: 99 },
  { sku: "LUB-001", name: "Quick Lube Change", category: "Services", price: 120, stock: 99 },
  { sku: "EV-001", name: "EV Fast Charge (30 min)", category: "Services", price: 25, stock: 99 },
]

// Promotions
export const promotions = [
  { id: "PROMO-01", name: "Coffee + Croissant Bundle", discount: "20%", validUntil: "2026-03-15", skus: ["COF-001", "SNK-001"] },
  { id: "PROMO-02", name: "Wash & Go Combo", discount: "15 AED off", validUntil: "2026-02-28", skus: ["WAS-001", "COF-002"] },
  { id: "PROMO-03", name: "Loyalty Double Points", discount: "2x points", validUntil: "2026-04-01", skus: [] },
]

// Time slots for services
export const timeSlots = [
  { time: "09:00", available: true },
  { time: "09:30", available: true },
  { time: "10:00", available: false },
  { time: "10:30", available: true },
  { time: "11:00", available: true },
  { time: "11:30", available: false },
  { time: "12:00", available: true },
  { time: "14:00", available: true },
  { time: "14:30", available: true },
  { time: "15:00", available: true },
]

export type CallStatus = "active" | "ringing" | "on-hold" | "completed" | "dropped"
export type AgentState = "Listening" | "Speaking" | "Querying DB" | "Retrieving Doc" | "Confirming" | "Processing"
export type Language = "EN" | "AR"
export type Intent = "Order Food" | "Book Car Wash" | "Quick Lube" | "General Inquiry" | "Loyalty Check" | "EV Charge"

export interface Call {
  id: string
  caller: string
  phone: string
  language: Language
  station: string
  stationId: string
  intent: Intent
  status: CallStatus
  agentState: AgentState
  startTime: string
  duration: number
  avgLatency: number
  outcome?: string
  loyaltyId?: string
  sentiment?: "positive" | "neutral" | "negative"
}

export const calls: Call[] = [
  {
    id: "CALL-1001",
    caller: "Ahmed Al Mansouri",
    phone: "+971-50-123-4567",
    language: "AR",
    station: "Al Raha Beach",
    stationId: "STN-001",
    intent: "Order Food",
    status: "active",
    agentState: "Speaking",
    startTime: "2026-02-13T10:32:00",
    duration: 184,
    avgLatency: 820,
    loyaltyId: "LYL-29384",
    sentiment: "positive",
  },
  {
    id: "CALL-1002",
    caller: "Sara Khalifa",
    phone: "+971-55-987-6543",
    language: "EN",
    station: "Dubai Marina",
    stationId: "STN-003",
    intent: "Book Car Wash",
    status: "active",
    agentState: "Querying DB",
    startTime: "2026-02-13T10:35:00",
    duration: 97,
    avgLatency: 650,
    sentiment: "neutral",
  },
  {
    id: "CALL-1003",
    caller: "Omar Rashed",
    phone: "+971-52-555-1234",
    language: "AR",
    station: "Khalifa City A",
    stationId: "STN-002",
    intent: "Quick Lube",
    status: "active",
    agentState: "Retrieving Doc",
    startTime: "2026-02-13T10:37:00",
    duration: 62,
    avgLatency: 1100,
    sentiment: "neutral",
  },
  {
    id: "CALL-1004",
    caller: "Omar Rashed",
    phone: "+971-56-222-8899",
    language: "EN",
    station: "Jumeirah Village",
    stationId: "STN-004",
    intent: "General Inquiry",
    status: "completed",
    agentState: "Confirming",
    startTime: "2026-02-13T10:15:00",
    duration: 312,
    avgLatency: 730,
    outcome: "First-visit welcome bundle accepted",
    sentiment: "positive",
  },
  {
    id: "CALL-1005",
    caller: "Khaled Bin Saeed",
    phone: "+971-50-777-3344",
    language: "AR",
    station: "Sharjah Industrial",
    stationId: "STN-005",
    intent: "EV Charge",
    status: "completed",
    agentState: "Confirming",
    startTime: "2026-02-13T09:50:00",
    duration: 245,
    avgLatency: 900,
    outcome: "EV charge booked",
    sentiment: "positive",
  },
  {
    id: "CALL-1006",
    caller: "Noura Al Ketbi",
    phone: "+971-55-444-6677",
    language: "EN",
    station: "Al Ain Central",
    stationId: "STN-006",
    intent: "General Inquiry",
    status: "completed",
    agentState: "Confirming",
    startTime: "2026-02-13T09:30:00",
    duration: 189,
    avgLatency: 680,
    outcome: "Info provided",
    sentiment: "neutral",
  },
  {
    id: "CALL-1007",
    caller: "Mohammed Tariq",
    phone: "+971-52-111-9988",
    language: "AR",
    station: "Al Raha Beach",
    stationId: "STN-001",
    intent: "Order Food",
    status: "active",
    agentState: "Listening",
    startTime: "2026-02-13T10:40:00",
    duration: 23,
    avgLatency: 450,
    sentiment: "neutral",
  },
]

export interface TranscriptLine {
  speaker: "Customer" | "Agent" | "System"
  text: string
  timestamp: string
}

export const transcriptLines: TranscriptLine[] = [
  { speaker: "System", text: "Call connected. Station: Al Raha Beach. Language: Arabic.", timestamp: "10:32:00" },
  { speaker: "Agent", text: "Marhaba! Welcome to ADNOC Al Raha Beach station. How can I help you today?", timestamp: "10:32:02" },
  { speaker: "Customer", text: "Hi, I'd like to order some coffee and maybe a snack for pickup.", timestamp: "10:32:08" },
  { speaker: "Agent", text: "Of course! Let me check what's available at your station right now.", timestamp: "10:32:12" },
  { speaker: "System", text: "[SQL Query: SELECT * FROM inventory WHERE station_id='STN-001' AND category IN ('Beverages','Snacks') AND stock > 0]", timestamp: "10:32:13" },
  { speaker: "Agent", text: "Great news! We have Arabic Coffee (Large) for 12 AED and Cappuccino for 15 AED. For snacks, there's our popular Zaatar Croissant at 8 AED or a Chicken Shawarma Wrap at 18 AED.", timestamp: "10:32:15" },
  { speaker: "Customer", text: "I'll take a large Arabic Coffee and the Zaatar Croissant please.", timestamp: "10:32:22" },
  { speaker: "System", text: "[RAG Retrieval: Checking active promotions and bundle eligibility]", timestamp: "10:32:23" },
  { speaker: "Agent", text: "Excellent choice! I see you're eligible for our Coffee + Croissant Bundle promotion - that's 20% off the combo! Your total would be 16 AED instead of 20 AED.", timestamp: "10:32:25" },
  { speaker: "Customer", text: "That sounds great, go ahead with the bundle.", timestamp: "10:32:30" },
  { speaker: "Agent", text: "Perfect! I've applied the bundle discount. Would you also like to add an Express Car Wash while you're here? It's only 35 AED and we have slots available in the next 30 minutes.", timestamp: "10:32:33" },
]

export const simulationLines: TranscriptLine[] = [
  { speaker: "Customer", text: "Hmm, actually yes, let me add the car wash too.", timestamp: "10:35:10" },
  { speaker: "System", text: "[SQL Query: SELECT * FROM time_slots WHERE station_id='STN-001' AND service='car_wash' AND date=CURRENT_DATE AND available=true]", timestamp: "10:35:11" },
  { speaker: "Agent", text: "Let me check the available car wash slots for you right now.", timestamp: "10:35:12" },
  { speaker: "Agent", text: "I have slots at 11:00, 11:30, and 12:00. Which works best for you?", timestamp: "10:35:15" },
  { speaker: "Customer", text: "11:00 would be perfect.", timestamp: "10:35:20" },
  { speaker: "System", text: "[Action: reserve_slot(service='car_wash', time='11:00', station='STN-001')]", timestamp: "10:35:21" },
  { speaker: "Agent", text: "Done! I've booked the 11:00 Express Car Wash. Your order summary: Arabic Coffee + Zaatar Croissant bundle at 16 AED, plus Express Car Wash at 35 AED. Total: 51 AED.", timestamp: "10:35:23" },
  { speaker: "Customer", text: "Sounds good. Can you send me the payment link?", timestamp: "10:35:28" },
  { speaker: "System", text: "[Action: send_sms_payment_link(phone='+971-50-123-4567', amount=51, order_id='ORD-7823')]", timestamp: "10:35:29" },
  { speaker: "Agent", text: "Payment link sent to your phone! Once paid, you'll receive a pickup code. Is there anything else I can help with?", timestamp: "10:35:31" },
  { speaker: "Customer", text: "No that's everything, thank you!", timestamp: "10:35:35" },
  { speaker: "System", text: "[Action: generate_pickup_code(order_id='ORD-7823') -> Code: ADNOC-7823]", timestamp: "10:35:36" },
  { speaker: "Agent", text: "Your pickup code is ADNOC-7823. Drive safely and enjoy your visit! Shukran!", timestamp: "10:35:38" },
]

export interface ToolEvent {
  id: string
  type: "sql" | "rag" | "action" | "guardrail" | "escalation"
  title: string
  timestamp: string
  latency: number
  status: "success" | "pending" | "error"
  details: Record<string, unknown>
}

export const toolEvents: ToolEvent[] = [
  {
    id: "EVT-001",
    type: "sql",
    title: "Inventory Lookup",
    timestamp: "10:32:13",
    latency: 320,
    status: "success",
    details: {
      query: "SELECT sku, name, price, stock FROM inventory WHERE station_id='STN-001' AND category IN ('Beverages','Snacks') AND stock > 0 ORDER BY category, name",
      rows: [
        { sku: "COF-001", name: "Arabic Coffee (Large)", price: 12, stock: 45 },
        { sku: "COF-002", name: "Cappuccino (Regular)", price: 15, stock: 32 },
        { sku: "SNK-001", name: "Zaatar Croissant", price: 8, stock: 28 },
        { sku: "SNK-002", name: "Chicken Shawarma Wrap", price: 18, stock: 15 },
        { sku: "SNK-003", name: "Mixed Nuts Pack", price: 10, stock: 50 },
      ],
    },
  },
  {
    id: "EVT-002",
    type: "rag",
    title: "Promotion Eligibility Check",
    timestamp: "10:32:23",
    latency: 480,
    status: "success",
    details: {
      query: "Active promotions for Coffee + Snack bundle",
      chunks: [
        {
          doc: "ADNOC_Promotions_Guide_2026.pdf",
          page: 12,
          text: "Coffee + Croissant Bundle: Customers purchasing any coffee beverage with a Zaatar Croissant receive 20% off the combined total. Valid at all stations through March 15, 2026.",
          used: true,
        },
        {
          doc: "ADNOC_Promotions_Guide_2026.pdf",
          page: 14,
          text: "Loyalty members earn double points on all bundled purchases during the promotional period.",
          used: false,
        },
      ],
    },
  },
  {
    id: "EVT-003",
    type: "guardrail",
    title: "Price Confirmation Check",
    timestamp: "10:32:24",
    latency: 45,
    status: "success",
    details: {
      check: "Verify discount calculation",
      result: "Original: 20 AED, Discount: 20%, Final: 16 AED - CORRECT",
    },
  },
]

export const simulationToolEvents: ToolEvent[] = [
  {
    id: "EVT-004",
    type: "sql",
    title: "Car Wash Slot Query",
    timestamp: "10:35:11",
    latency: 280,
    status: "success",
    details: {
      query: "SELECT time_slot, available FROM time_slots WHERE station_id='STN-001' AND service='car_wash' AND date=CURRENT_DATE AND available=true",
      rows: [
        { time: "11:00", available: true },
        { time: "11:30", available: true },
        { time: "12:00", available: true },
      ],
    },
  },
  {
    id: "EVT-005",
    type: "action",
    title: "Reserve Car Wash Slot",
    timestamp: "10:35:21",
    latency: 150,
    status: "success",
    details: {
      action: "reserve_slot",
      payload: { service: "Express Car Wash", time: "11:00", station: "STN-001", duration: "20 min" },
      status: "confirmed",
    },
  },
  {
    id: "EVT-006",
    type: "action",
    title: "Send SMS Payment Link",
    timestamp: "10:35:29",
    latency: 890,
    status: "success",
    details: {
      action: "send_sms_payment_link",
      payload: { phone: "+971-50-123-4567", amount: 51, currency: "AED", orderId: "ORD-7823" },
      status: "sent",
    },
  },
  {
    id: "EVT-007",
    type: "action",
    title: "Generate Pickup Code",
    timestamp: "10:35:36",
    latency: 120,
    status: "success",
    details: {
      action: "generate_pickup_code",
      payload: { orderId: "ORD-7823", code: "ADNOC-7823" },
      status: "confirmed",
    },
  },
]

// Dashboard KPIs
export const dashboardKPIs = {
  callsToday: 247,
  conversionRate: 68.5,
  avgHandleTime: "3m 42s",
  avgToolLatency: "820ms",
  ordersCreated: 169,
  deflectionRate: 82.3,
}

// Chart data
export const callsOverTime = [
  { time: "06:00", calls: 8 },
  { time: "07:00", calls: 22 },
  { time: "08:00", calls: 35 },
  { time: "09:00", calls: 48 },
  { time: "10:00", calls: 42 },
  { time: "11:00", calls: 31 },
  { time: "12:00", calls: 25 },
  { time: "13:00", calls: 18 },
  { time: "14:00", calls: 28 },
  { time: "15:00", calls: 15 },
]

export const conversionFunnel = [
  { stage: "Calls Received", value: 247 },
  { stage: "Intent Identified", value: 231 },
  { stage: "Product Offered", value: 198 },
  { stage: "Order Created", value: 169 },
  { stage: "Payment Sent", value: 152 },
  { stage: "Collected", value: 138 },
]

export const topIntents = [
  { intent: "Order Food", count: 89 },
  { intent: "Book Car Wash", count: 52 },
  { intent: "Quick Lube", count: 38 },
  { intent: "EV Charge", count: 28 },
  { intent: "Loyalty Check", count: 24 },
  { intent: "General Inquiry", count: 16 },
]

// Knowledge Base documents
export const documents = [
  { id: "DOC-001", name: "ADNOC_Promotions_Guide_2026.pdf", type: "PDF", size: "2.4 MB", chunks: 128, lastIndexed: "2026-02-12T14:30:00", status: "complete" as const },
  { id: "DOC-002", name: "Service_Station_Policies.pdf", type: "PDF", size: "1.8 MB", chunks: 96, lastIndexed: "2026-02-11T09:15:00", status: "complete" as const },
  { id: "DOC-003", name: "Loyalty_Program_Terms.pdf", type: "PDF", size: "890 KB", chunks: 52, lastIndexed: "2026-02-10T16:45:00", status: "complete" as const },
  { id: "DOC-004", name: "EV_Charging_Guide.pdf", type: "PDF", size: "1.2 MB", chunks: 74, lastIndexed: "2026-02-13T08:00:00", status: "running" as const },
  { id: "DOC-005", name: "Quick_Lube_Procedures.pdf", type: "PDF", size: "3.1 MB", chunks: 0, lastIndexed: "-", status: "queued" as const },
]

// Data source schemas
export const dbSchemas = [
  {
    table: "inventory",
    columns: [
      { name: "sku", type: "VARCHAR(20)", pk: true },
      { name: "station_id", type: "VARCHAR(10)", pk: false },
      { name: "name", type: "VARCHAR(100)", pk: false },
      { name: "category", type: "VARCHAR(50)", pk: false },
      { name: "price", type: "DECIMAL(10,2)", pk: false },
      { name: "stock", type: "INTEGER", pk: false },
      { name: "updated_at", type: "TIMESTAMP", pk: false },
    ],
  },
  {
    table: "stations",
    columns: [
      { name: "id", type: "VARCHAR(10)", pk: true },
      { name: "name", type: "VARCHAR(100)", pk: false },
      { name: "city", type: "VARCHAR(50)", pk: false },
      { name: "region", type: "VARCHAR(50)", pk: false },
      { name: "lat", type: "DECIMAL(10,6)", pk: false },
      { name: "lng", type: "DECIMAL(10,6)", pk: false },
    ],
  },
  {
    table: "promotions",
    columns: [
      { name: "id", type: "VARCHAR(20)", pk: true },
      { name: "name", type: "VARCHAR(100)", pk: false },
      { name: "discount", type: "VARCHAR(50)", pk: false },
      { name: "valid_until", type: "DATE", pk: false },
      { name: "sku_list", type: "TEXT[]", pk: false },
    ],
  },
  {
    table: "bookings",
    columns: [
      { name: "id", type: "SERIAL", pk: true },
      { name: "station_id", type: "VARCHAR(10)", pk: false },
      { name: "service", type: "VARCHAR(50)", pk: false },
      { name: "time_slot", type: "TIMESTAMP", pk: false },
      { name: "customer_phone", type: "VARCHAR(20)", pk: false },
      { name: "status", type: "VARCHAR(20)", pk: false },
    ],
  },
  {
    table: "loyalty",
    columns: [
      { name: "id", type: "VARCHAR(20)", pk: true },
      { name: "customer_name", type: "VARCHAR(100)", pk: false },
      { name: "phone", type: "VARCHAR(20)", pk: false },
      { name: "points", type: "INTEGER", pk: false },
      { name: "tier", type: "VARCHAR(20)", pk: false },
    ],
  },
]

// Workflow nodes
export const workflowNodes = [
  { id: "WF-01", label: "Identify Station", description: "Detect caller's nearest station via phone number or GPS", confirmations: ["Confirm station with caller"], fallback: "Let me look up your nearest station..." },
  { id: "WF-02", label: "Check Inventory", description: "Query station inventory for available products/services", confirmations: [], fallback: "Just a moment while I check availability..." },
  { id: "WF-03", label: "Suggest Upsell", description: "RAG-powered recommendation based on cart + promotions", confirmations: ["Customer agrees to recommendation"], fallback: "We also have some great offers..." },
  { id: "WF-04", label: "Confirm Order", description: "Read back order details and get customer confirmation", confirmations: ["Customer confirms order details", "Price verification passed"], fallback: "Let me confirm your order details..." },
  { id: "WF-05", label: "Reserve Items", description: "Lock inventory and reserve service slots", confirmations: [], fallback: "Reserving your items now..." },
  { id: "WF-06", label: "Book Time Slot", description: "Book service appointment if applicable", confirmations: ["Time slot confirmed"], fallback: "Let me find available times for you..." },
  { id: "WF-07", label: "Send SMS", description: "Send payment link and/or pickup code via SMS", confirmations: [], fallback: "Sending details to your phone..." },
  { id: "WF-08", label: "Handoff Rules", description: "Escalate to human agent if needed based on thresholds", confirmations: ["Agent accepts handoff"], fallback: "Let me connect you with a team member..." },
]

// Analytics station data
export const stationAnalytics = [
  { station: "Al Raha Beach", calls: 52, conversion: 72.1, aht: "3m 18s", revenue: 4280 },
  { station: "Khalifa City A", calls: 41, conversion: 65.8, aht: "4m 02s", revenue: 3150 },
  { station: "Dubai Marina", calls: 48, conversion: 70.3, aht: "3m 25s", revenue: 3890 },
  { station: "Jumeirah Village", calls: 38, conversion: 63.2, aht: "3m 55s", revenue: 2740 },
  { station: "Sharjah Industrial", calls: 35, conversion: 68.5, aht: "3m 40s", revenue: 2560 },
  { station: "Al Ain Central", calls: 33, conversion: 66.7, aht: "4m 10s", revenue: 2210 },
]

// Historical conversations
export const historicalCalls = [
  { id: "CALL-0990", caller: "Abdullah Saeed", station: "Dubai Marina", intent: "Order Food" as Intent, language: "AR" as Language, date: "2026-02-12", duration: "4m 12s", outcome: "Order completed - 3 items", status: "completed" as CallStatus },
  { id: "CALL-0991", caller: "Jennifer Adams", station: "Jumeirah Village", intent: "Book Car Wash" as Intent, language: "EN" as Language, date: "2026-02-12", duration: "2m 45s", outcome: "Car wash booked 14:00", status: "completed" as CallStatus },
  { id: "CALL-0992", caller: "Rashid Al Maktoum", station: "Al Raha Beach", intent: "Quick Lube" as Intent, language: "AR" as Language, date: "2026-02-12", duration: "5m 30s", outcome: "Lube service booked", status: "completed" as CallStatus },
  { id: "CALL-0993", caller: "Maria Santos", station: "Khalifa City A", intent: "EV Charge" as Intent, language: "EN" as Language, date: "2026-02-12", duration: "1m 55s", outcome: "EV charge started", status: "completed" as CallStatus },
  { id: "CALL-0994", caller: "Hassan Mirza", station: "Sharjah Industrial", intent: "General Inquiry" as Intent, language: "AR" as Language, date: "2026-02-11", duration: "3m 20s", outcome: "Info provided", status: "completed" as CallStatus },
  { id: "CALL-0995", caller: "Emily Chen", station: "Al Ain Central", intent: "Loyalty Check" as Intent, language: "EN" as Language, date: "2026-02-11", duration: "2m 10s", outcome: "Balance: 2,450 pts", status: "completed" as CallStatus },
  { id: "CALL-0996", caller: "Yousef Al Kaabi", station: "Dubai Marina", intent: "Order Food" as Intent, language: "AR" as Language, date: "2026-02-11", duration: "3m 48s", outcome: "Order completed - 2 items", status: "completed" as CallStatus },
  { id: "CALL-0997", caller: "Priya Nair", station: "Al Raha Beach", intent: "Book Car Wash" as Intent, language: "EN" as Language, date: "2026-02-10", duration: "2m 22s", outcome: "Escalated to human", status: "dropped" as CallStatus },
]
