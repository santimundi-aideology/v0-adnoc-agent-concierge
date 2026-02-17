import { NextResponse } from "next/server"
import { getCallStatus, getTranscriptLines } from "@/lib/retell/live-transcripts"

export const runtime = "nodejs"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const callId = searchParams.get("callId")

  if (!callId) {
    return NextResponse.json({ error: "Missing callId" }, { status: 400 })
  }

  return NextResponse.json({
    callId,
    status: getCallStatus(callId),
    lines: getTranscriptLines(callId),
  })
}
