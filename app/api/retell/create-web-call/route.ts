import { NextResponse } from "next/server"
import { markCallSystemEvent } from "@/lib/retell/live-transcripts"

export async function POST(req: Request) {
  try {
    const apiKey = process.env.RETELL_API_KEY
    const agentId = process.env.NEXT_PUBLIC_RETELL_AGENT_ID_AHMED

    if (!apiKey) {
      return NextResponse.json({ error: "RETELL_API_KEY is not configured" }, { status: 500 })
    }
    if (!agentId) {
      return NextResponse.json({ error: "NEXT_PUBLIC_RETELL_AGENT_ID_AHMED is not configured" }, { status: 500 })
    }

    const body = (await req.json().catch(() => ({}))) as {
      customer_name?: string
      customer_id?: string
      station_id?: string
    }

    const retellRes = await fetch("https://api.retellai.com/v2/create-web-call", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        agent_id: agentId,
        metadata: {
          customer_name: body.customer_name ?? "Ahmed",
          customer_id: body.customer_id ?? null,
          station_id: body.station_id ?? null,
          source: "adnoc-demo-chat",
        },
      }),
    })

    const retellData = await retellRes.json().catch(() => ({}))
    if (!retellRes.ok) {
      return NextResponse.json(
        { error: "Retell create-web-call failed", details: retellData },
        { status: retellRes.status }
      )
    }

    const accessToken = (retellData as { access_token?: string }).access_token
    const callId = (retellData as { call_id?: string }).call_id

    if (!accessToken || !callId) {
      return NextResponse.json(
        { error: "Retell response missing access_token/call_id", details: retellData },
        { status: 502 }
      )
    }

    markCallSystemEvent(callId, "Retell call created.")

    return NextResponse.json({
      access_token: accessToken,
      call_id: callId,
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Unexpected error creating Retell call", details: String(error) },
      { status: 500 }
    )
  }
}
