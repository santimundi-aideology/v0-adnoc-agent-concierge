import { NextResponse } from "next/server"
import { createDirectClient } from "@/lib/supabase/direct-client"

export const runtime = "nodejs"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const callId = searchParams.get("callId") || ""
  if (!callId) return NextResponse.json({ error: "Missing callId" }, { status: 400 })
  const supabase = createDirectClient()
  const { data } = await supabase
    .from("express_demo_call_recommendations")
    .select("call_id, active_station_id, reason, eta_minutes, updated_at")
    .eq("call_id", callId)
    .maybeSingle()
  return NextResponse.json({ callId, recommendation: data ?? null })
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    call_id?: string
    callId?: string
    active_station_id?: string
    station_id?: string
    reason?: string
    eta_minutes?: number
  }

  const callId = String(body.call_id || body.callId || "").trim()
  const stationId = String(body.active_station_id || body.station_id || "").trim()
  if (!callId || !stationId) {
    return NextResponse.json({ error: "Missing call_id/active_station_id" }, { status: 400 })
  }

  const supabase = createDirectClient()
  const eta = typeof body.eta_minutes === "number" ? Math.round(body.eta_minutes) : null
  const { error } = await supabase
    .from("express_demo_call_recommendations")
    .upsert(
      {
        call_id: callId,
        active_station_id: stationId,
        reason: body.reason ?? null,
        eta_minutes: eta,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "call_id" }
    )
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

