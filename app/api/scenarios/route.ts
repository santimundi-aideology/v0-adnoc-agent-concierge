import { NextResponse } from "next/server"
import { listDemoScenarios } from "@/lib/voice-backend"

export const runtime = "nodejs"

export async function GET() {
  return NextResponse.json({ scenarios: listDemoScenarios() })
}
