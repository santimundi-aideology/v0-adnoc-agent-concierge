import { NextResponse } from "next/server"
import Retell from "retell-sdk"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const apiKey = process.env.RETELL_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "Missing RETELL_API_KEY" }, { status: 500 })
    }

    const body = (await request.json().catch(() => ({}))) as {
      agentId?: string
      dynamicVariables?: Record<string, unknown>
      metadata?: Record<string, unknown>
    }

    const agentId =
      body?.agentId || process.env.RETELL_AGENT_ID || process.env.NEXT_PUBLIC_RETELL_AGENT_ID
    const dynamicVariables = (body?.dynamicVariables ?? {}) as Record<string, unknown>
    const metadata = (body?.metadata ?? {}) as Record<string, unknown>
    const rawHistory =
      dynamicVariables.conversation_history ??
      dynamicVariables.conversationHistory ??
      metadata.conversation_history ??
      metadata.conversationHistory ??
      ""
    const conversationHistory = typeof rawHistory === "string" ? rawHistory : String(rawHistory)
    const normalizedDynamicVariables = {
      ...dynamicVariables,
      conversation_history: conversationHistory,
      conversationHistory: conversationHistory,
    }

    console.log("[Retell] create-call received dynamicVariables:", JSON.stringify(dynamicVariables))
    console.log("[Retell] conversation_history length:", conversationHistory.length)

    if (!agentId) {
      return NextResponse.json({ error: "Missing agentId" }, { status: 400 })
    }

    const client = new Retell({ apiKey })
    const webCallResponse = await client.call.createWebCall({
      agent_id: agentId,
      metadata,
      retell_llm_dynamic_variables: normalizedDynamicVariables,
    })

    return NextResponse.json({
      accessToken: webCallResponse.access_token,
      callId: webCallResponse.call_id,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create Retell call"
    console.error("[Retell] create-call error:", error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
