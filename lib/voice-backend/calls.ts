import { createVoiceBackendClient } from "@/lib/voice-backend/supabase-admin"

export async function ensureCallRecord(params: {
  callId: string
  caller?: string
  stationId?: string | null
  status?: string
  intent?: string | null
  language?: string
}) {
  const supabase = createVoiceBackendClient()
  const { error } = await supabase
    .from("calls")
    .upsert(
      {
        id: params.callId,
        caller: params.caller || "Retell Voice Session",
        station_id: params.stationId ?? null,
        status: params.status ?? "active",
        intent: params.intent ?? "General Inquiry",
        language: params.language ?? "EN",
        agent_state: "Listening",
        start_time: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    )

  if (error) throw new Error(error.message)
}

export async function updateCallStatus(callId: string, status: "active" | "completed" | "dropped") {
  const supabase = createVoiceBackendClient()
  const { error } = await supabase
    .from("calls")
    .update({ status })
    .eq("id", callId)
  if (error) throw new Error(error.message)
}
