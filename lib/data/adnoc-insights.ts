export interface AdnocInsightMetric {
  id: string
  label: string
  value: string
  yoy?: string
  note?: string
}

export interface AdnocMissingDataDimension {
  id: string
  title: string
  whyItMatters: string
  suggestedSource: string
}

// Extracted from ADNOC Distribution Annual Report 2024.
export const ADNOC_REPORT_2024_METRICS: AdnocInsightMetric[] = [
  { id: "network", label: "Total Station Network", value: "896", yoy: "+7%", note: "UAE, KSA, Egypt combined" },
  { id: "non_fuel_txn", label: "Non-fuel Transactions", value: "49.3M", yoy: "+10.2%", note: "UAE" },
  { id: "fuel_txn", label: "Fuel Transactions", value: "189.2M", yoy: "+5.3%", note: "UAE" },
  { id: "conv_rate", label: "Convenience Conversion", value: "26.1%", yoy: "+140 bps", note: "Five-year high" },
  { id: "ev_points", label: "EV Charging Points", value: "220", yoy: "4x vs 2023", note: "Fast and super-fast in UAE" },
  { id: "customer_sat", label: "Customer Satisfaction", value: "96%", note: "2024 highlight" },
  { id: "retail_fuel_vol", label: "Retail Fuel Volumes", value: "10.35B liters", yoy: "+8.4%", note: "Retail segment" },
  { id: "retail_gp", label: "Retail Gross Profit", value: "AED 4,704M", yoy: "+4.6%", note: "Retail segment" },
  { id: "non_fuel_gp", label: "Non-fuel Gross Profit Growth", value: "Double-digit", yoy: "+12.5%", note: "Retail segment" },
  { id: "car_wash", label: "Car Wash Transactions", value: "1.1x growth", note: "Highest YoY GP growth among non-fuel verticals" },
  { id: "hse_trir", label: "TRIR", value: "0.04", note: "2024 HSE performance highlight" },
  { id: "hse_fatal", label: "Fatalities", value: "0", note: "2024 HSE performance highlight" },
]

// High-value analytics dimensions not currently in this dashboard dataset.
export const ADNOC_MISSING_DIMENSIONS: AdnocMissingDataDimension[] = [
  {
    id: "sku_sales_mix",
    title: "SKU Sales Mix by Station and Daypart",
    whyItMatters: "Enables answers like top-selling items, attach rate, and margin mix by location/time.",
    suggestedSource: "POS line-items and basket transactions",
  },
  {
    id: "basket_profitability",
    title: "Basket Margin and Category Profitability",
    whyItMatters: "Revenue alone misses profit quality and promotion leakage.",
    suggestedSource: "POS + COGS + promotion-discount tables",
  },
  {
    id: "loyalty_cohorts",
    title: "Loyalty Cohorts and Redemption Behavior",
    whyItMatters: "Shows retention quality, point liability risk, and incremental spend by tier.",
    suggestedSource: "ADNOC Rewards membership and redemption events",
  },
  {
    id: "ev_utilization",
    title: "EV Charger Utilization and Dwell Time",
    whyItMatters: "Critical to optimize capex rollout and station throughput.",
    suggestedSource: "Charger telemetry (session start/end, kWh, queue time)",
  },
  {
    id: "cx_nps_csat",
    title: "NPS/CSAT and Complaint Resolution SLA",
    whyItMatters: "Links customer sentiment to operational fixes and repeat usage.",
    suggestedSource: "CRM tickets, survey platform, QA monitoring",
  },
  {
    id: "hse_ops",
    title: "Operational Safety by Site (TRIR/LTIF leading indicators)",
    whyItMatters: "Helps reduce risk and prioritize training/interventions per station.",
    suggestedSource: "HSE audits, incidents, observations, training logs",
  },
]
