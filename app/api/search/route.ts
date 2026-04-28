// app/api/search/route.ts
import { NextResponse } from "next/server"
import { validateDocumentSearchInput, tryRunDocumentSearch } from "@/lib/document-search/service"
import { logBackendError, logBackendInfo } from "@/lib/voice-backend/logger"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const parsed = validateDocumentSearchInput(body)
    if (!parsed.ok) {
      logBackendInfo("document-search-route", "Validation failed", { reason: parsed.error })
      return NextResponse.json({ error: parsed.error, code: "validation_failed" }, { status: 400 })
    }

    const result = await tryRunDocumentSearch(parsed.value)
    return NextResponse.json(result)
  } catch (error) {
    const statusCode =
      error && typeof error === "object" && "statusCode" in error ? Number((error as { statusCode: unknown }).statusCode) : 500
    const errorCode =
      error && typeof error === "object" && "errorCode" in error ? String((error as { errorCode: unknown }).errorCode) : "route_failed"
    const message = error instanceof Error ? error.message : "Failed to process search request"
    logBackendError("document-search-route", "Route failed", error, { statusCode, errorCode })
    return NextResponse.json({ error: message, code: errorCode }, { status: statusCode })
  }
}
