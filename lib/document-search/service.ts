import OpenAI from "openai"
import { createClient } from "@supabase/supabase-js"

import { logBackendError, logBackendInfo } from "@/lib/voice-backend/logger"

export type DocumentSearchRequest = {
  query: string
  top_k?: number
}

export type DocumentSearchMatch = {
  similarity: number
  score: number
  citation: string
  text: string
  metadata: {
    doc_id: string
    chunk_id: string
    section: string | null
    page_start: number | null
    page_end: number | null
    content_type: string | null
  }
}

export type DocumentSearchResponse = {
  provider: "supabase-pgvector"
  latency_ms: number
  query: string
  top_k: number
  doc_id: string
  matches: DocumentSearchMatch[]
}

type RagRow = {
  similarity: number
  content: string
  doc_id: string
  chunk_id: string
  section: string | null
  page_start: number | null
  page_end: number | null
  content_type: string | null
}

const DOC_ID = "adnoc_annual_report_2024_en"

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null
  return new OpenAI({ apiKey })
}

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRole) {
    throw new Error("Missing Supabase configuration for document search")
  }
  return createClient(url, serviceRole)
}

export function validateDocumentSearchInput(input: unknown): { ok: true; value: DocumentSearchRequest } | { ok: false; error: string } {
  const rawBody = input && typeof input === "object" ? (input as Record<string, unknown>) : {}
  const args = rawBody.args && typeof rawBody.args === "object" ? (rawBody.args as Record<string, unknown>) : {}
  const payload = rawBody.payload && typeof rawBody.payload === "object" ? (rawBody.payload as Record<string, unknown>) : {}
  const body = { ...rawBody, ...args, ...payload }
  const query = typeof body.query === "string" ? body.query.trim() : ""
  if (!query) return { ok: false, error: "Missing or invalid `query`" }
  const topKRaw = typeof body.top_k === "number" ? body.top_k : typeof body.top_k === "string" ? Number(body.top_k) : 3
  const top_k = Math.min(Math.max(Math.round(topKRaw), 1), 5)
  return { ok: true, value: { query, top_k } }
}

export async function runDocumentSearch(params: DocumentSearchRequest): Promise<DocumentSearchResponse> {
  const t0 = Date.now()
  const openai = getOpenAIClient()
  if (!openai) {
    throw Object.assign(new Error("Document search provider is not configured. Please set OPENAI_API_KEY."), {
      statusCode: 503,
      errorCode: "provider_unavailable",
    })
  }

  const supabase = getSupabaseClient()
  const embedding = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: params.query,
  })

  const { data, error } = await supabase.rpc("match_rag_chunks", {
    query_embedding: embedding.data[0].embedding,
    match_count: 30,
    filter_doc_id: DOC_ID,
  })

  if (error) {
    throw Object.assign(new Error(error.message), {
      statusCode: 502,
      errorCode: "retrieval_failed",
    })
  }

  const rows = ((data ?? []) as RagRow[]).map((row) => {
    const cleaned = stripMojibakeLines(cleanText(row.content))
    const lexical = lexicalScore(params.query, cleaned)
    return {
      ...row,
      cleaned,
      score: row.similarity * 0.85 + lexical * 0.15,
    }
  })

  const matches = rows
    .sort((a, b) => b.score - a.score)
    .filter((row) => shouldKeep(row.content_type, params.query))
    .slice(0, params.top_k ?? 3)
    .map((row) => ({
      similarity: row.similarity,
      score: row.score,
      citation: `pp. ${row.page_start}–${row.page_end}`,
      text: clip(row.cleaned, 1400),
      metadata: {
        doc_id: row.doc_id,
        chunk_id: row.chunk_id,
        section: row.section,
        page_start: row.page_start,
        page_end: row.page_end,
        content_type: row.content_type,
      },
    }))

  return {
    provider: "supabase-pgvector",
    latency_ms: Date.now() - t0,
    query: params.query,
    top_k: params.top_k ?? 3,
    doc_id: DOC_ID,
    matches,
  }
}

export async function tryRunDocumentSearch(params: DocumentSearchRequest): Promise<DocumentSearchResponse> {
  try {
    const result = await runDocumentSearch(params)
    logBackendInfo("document-search", "Document search succeeded", {
      queryLength: params.query.length,
      topK: params.top_k ?? 3,
      matchCount: result.matches.length,
    })
    return result
  } catch (error) {
    logBackendError("document-search", "Document search failed", error, {
      queryLength: params.query.length,
      topK: params.top_k ?? 3,
    })
    throw error
  }
}

function cleanText(value: string) {
  return value
    .replace(/â€™/g, "’")
    .replace(/â€œ/g, "“")
    .replace(/â€/g, "”")
    .replace(/â€“/g, "–")
    .replace(/â€”/g, "—")
    .replace(/â€¦/g, "…")
    .replace(/â/g, "’")
    .replace(/â/g, "–")
    .replace(/â/g, "—")
    .replace(/â¦/g, "…")
    .replace(/âs\b/g, "’s")
    .replace(/â/g, "—")
    .replace(/Â/g, "")
    .replace(/\u00A0/g, " ")
    .replace(/\u0000/g, "")
}

function stripMojibakeLines(value: string) {
  return value
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim()
      if (!trimmed) return true
      const badChars = (trimmed.match(/[ØÙÃâ]/g) || []).length
      const ratio = badChars / Math.max(trimmed.length, 1)
      if (trimmed.length <= 60 && ratio > 0.15) return false
      if (/^[ØÙ]+/.test(trimmed) && trimmed.length < 80) return false
      return true
    })
    .join("\n")
}

function clip(value: string, max = 900) {
  const trimmed = value.trim()
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max)}…`
}

function shouldKeep(contentType: string | null, query: string) {
  const q = query.toLowerCase()
  const askingForTable =
    q.includes("table") ||
    q.includes("percentage") ||
    q.includes("%") ||
    q.includes("breakdown") ||
    q.includes("ratio") ||
    q.includes("net debt") ||
    q.includes("ebitda") ||
    q.includes("volume") ||
    q.includes("how many") ||
    q.includes("number of")
  const askingForImage = q.includes("image") || q.includes("figure") || q.includes("photo")
  if (!askingForTable && contentType === "table_html") return false
  if (!askingForImage && contentType === "figure") return false
  if (contentType === "toc") return false
  return true
}

function lexicalScore(query: string, text: string) {
  const lower = text.toLowerCase()
  let score = 0
  for (const n of extractNumbers(query)) {
    if (lower.includes(n)) score += 0.35
  }
  const q = query.toLowerCase()
  if (q.includes("how many") || q.includes("what was") || q.includes("ratio") || q.includes("%")) {
    const countNums = (lower.match(/\d[\d,]*(?:\.\d+)?/g) || []).length
    score += Math.min(countNums, 6) * 0.03
  }
  for (const { term, w } of keywordBoost(query)) {
    if (lower.includes(term)) score += w
  }
  return score
}

function extractNumbers(query: string) {
  const nums = query.match(/\d[\d,]*(?:\.\d+)?/g) || []
  return nums.map((n) => n.replace(/,/g, ""))
}

function keywordBoost(query: string) {
  const q = query.toLowerCase()
  const boosts: { term: string; w: number }[] = []
  if (q.includes("station")) boosts.push({ term: "station", w: 0.18 })
  if (q.includes("uae")) boosts.push({ term: "uae", w: 0.12 })
  if (q.includes("charging") || q.includes("ev")) {
    boosts.push({ term: "charging", w: 0.18 })
    boosts.push({ term: "ev", w: 0.08 })
  }
  if (q.includes("satisfaction")) boosts.push({ term: "satisfaction", w: 0.2 })
  if (q.includes("net debt")) boosts.push({ term: "net debt", w: 0.25 })
  if (q.includes("ebitda")) boosts.push({ term: "ebitda", w: 0.2 })
  if (q.includes("fuel") && q.includes("volume")) boosts.push({ term: "volume", w: 0.16 })
  if (q.includes("highlight")) boosts.push({ term: "highlights", w: 0.08 })
  boosts.push({ term: "at a glance", w: 0.1 })
  boosts.push({ term: "highlights", w: 0.1 })
  return boosts
}
