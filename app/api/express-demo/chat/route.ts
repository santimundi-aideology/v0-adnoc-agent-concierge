import { NextResponse } from "next/server"
import { z } from "zod"

import { tryRunExpressDemoChat } from "@/lib/voice-backend/express-demo-chat"

export const runtime = "nodejs"

const expressDemoChatRequestSchema = z.object({
  customer_id: z.string().min(1),
  station_id: z.string().min(1),
  trigger_type: z.string().optional(),
  available_triggers: z.array(z.string()).optional(),
  distance_km: z.number().nullable().optional(),
  message: z.string().min(1),
  conversation_history: z
    .array(
      z.object({
        role: z.string().optional(),
        text: z.string().optional(),
      })
    )
    .optional(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const parsed = expressDemoChatRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 }
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          reply: "Voice concierge is not configured. Please set OPENAI_API_KEY.",
          actions: [],
        },
        { status: 200 }
      )
    }

    const result = await tryRunExpressDemoChat(parsed.data)
    return NextResponse.json(result)
  } catch (error) {
    const status = error && typeof error === "object" && "statusCode" in error ? Number(error.statusCode) : 500
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json(
      {
        error: status === 500 ? "Internal server error" : message,
        details: status === 500 ? undefined : message,
      },
      { status }
    )
  }
}
