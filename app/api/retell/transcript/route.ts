import { NextResponse } from "next/server"
import { getTranscriptLines } from "@/lib/retell/live-transcripts"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const callId = searchParams.get("callId")

  if (!callId) {
    return NextResponse.json({ error: "Missing callId" }, { status: 400 })
  }

  return NextResponse.json({
    callId,
    lines: getTranscriptLines(callId),
  })
}
