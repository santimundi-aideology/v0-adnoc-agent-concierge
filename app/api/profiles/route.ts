import { NextResponse } from "next/server"
import { listBusinessProfiles } from "@/lib/voice-backend"

export const runtime = "nodejs"

export async function GET() {
  const profiles = await listBusinessProfiles()
  return NextResponse.json({ profiles })
}
