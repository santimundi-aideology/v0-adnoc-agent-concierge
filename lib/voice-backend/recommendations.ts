import { createVoiceBackendClient } from "@/lib/voice-backend/supabase-admin"

export async function upsertCallRecommendation(params: {
  callId: string
  stationId: string
  reason?: string | null
  etaMinutes?: number | null
}) {
  const supabase = createVoiceBackendClient()
  const { error } = await supabase
    .from("express_demo_call_recommendations")
    .upsert(
      {
        call_id: params.callId,
        active_station_id: params.stationId,
        reason: params.reason ?? null,
        eta_minutes: params.etaMinutes == null ? null : Math.round(params.etaMinutes),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "call_id" }
    )

  if (error) throw new Error(error.message)
}

export async function getCallRecommendation(callId: string) {
  const supabase = createVoiceBackendClient()
  const { data, error } = await supabase
    .from("express_demo_call_recommendations")
    .select("call_id, active_station_id, reason, eta_minutes, updated_at")
    .eq("call_id", callId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data
}
