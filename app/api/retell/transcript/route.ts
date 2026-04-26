import { NextResponse } from "next/server"
import { getCallStatus, getTranscriptLines as getMemoryTranscriptLines } from "@/lib/retell/live-transcripts"
import { getDurableTranscriptLines, logBackendError } from "@/lib/voice-backend"

export const runtime = "nodejs"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const callId = searchParams.get("callId")

  if (!callId) {
    return NextResponse.json({ error: "Missing callId" }, { status: 400 })
  }

  try {
    const durableLines = await getDurableTranscriptLines(callId)
    const memoryLines = getMemoryTranscriptLines(callId)
    const memoryOnlyLines = memoryLines.filter(
      (memoryLine) =>
        !durableLines.some(
          (durableLine) =>
            durableLine.speaker === memoryLine.speaker &&
            durableLine.text.trim().toLowerCase() === memoryLine.text.trim().toLowerCase()
        )
    )

    return NextResponse.json({
      callId,
      status: getCallStatus(callId),
      source: "durable",
      lines: [
        ...durableLines.map((line, index) => ({
          id: line.id ?? `${callId}-db-${index + 1}`,
          speaker: line.speaker,
          text: line.text,
          timestamp: line.timestamp,
        })),
        ...memoryOnlyLines,
      ],
    })
  } catch (error) {
    logBackendError("retell-transcript", "Falling back to memory transcript", error, { callId })
    return NextResponse.json({
      callId,
      status: getCallStatus(callId),
      source: "memory-fallback",
      lines: getMemoryTranscriptLines(callId),
    })
  }
}
