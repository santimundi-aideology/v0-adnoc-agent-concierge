// app/api/search/route.ts
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ---- clients at module scope (faster on warm invocations) ----
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, // ok to be NEXT_PUBLIC for URL
  process.env.SUPABASE_SERVICE_ROLE_KEY! // server-only secret
);

// ---- text cleanup ----
function cleanText(s: string) {
  return s
    // smart quotes/dashes/ellipsis mojibake
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
    // very common offenders in your output
    .replace(/âs\b/g, "’s") // Distributionâs -> Distribution’s
    .replace(/â/g, "—") // interactionsâcreating -> interactions—creating
    // NBSP / stray markers
    .replace(/Â/g, "")
    .replace(/\u00A0/g, " ")
    .replace(/\u0000/g, "");
}

function stripMojibakeLines(s: string) {
  const lines = s.split("\n");
  const cleaned = lines.filter((line) => {
    const t = line.trim();
    if (!t) return true;

    // common mojibake indicators for mis-decoded UTF/Arabic
    const badChars = (t.match(/[ØÙÃâ]/g) || []).length;
    const ratio = badChars / Math.max(t.length, 1);

    // short lines dominated by those chars are junk (e.g., Ø£Ø¯Ù…)
    if (t.length <= 60 && ratio > 0.15) return false;
    if (/^[ØÙ]+/.test(t) && t.length < 80) return false;

    return true;
  });

  return cleaned.join("\n");
}

function clip(s: string, max = 900) {
  const t = s.trim();
  if (t.length <= max) return t;
  return t.slice(0, max) + "…";
}

// ---- lightweight content-type filtering (keeps voice answers clean) ----
function shouldKeep(contentType: string | null, query: string) {
  const q = query.toLowerCase();
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
    q.includes("number of");

  const askingForImage = q.includes("image") || q.includes("figure") || q.includes("photo");

  if (!askingForTable && contentType === "table_html") return false;
  if (!askingForImage && contentType === "figure") return false;
  if (contentType === "toc") return false;

  return true;
}

// ---- hybrid rerank (vector-first + lexical rescue) ----
function extractNumbers(q: string): string[] {
  const nums = q.match(/\d[\d,]*(?:\.\d+)?/g) || [];
  return nums.map((n) => n.replace(/,/g, ""));
}

function keywordBoost(query: string) {
  const q = query.toLowerCase();
  const boosts: { term: string; w: number }[] = [];

  // Metrics that showed failures in your smoke test
  if (q.includes("station")) boosts.push({ term: "station", w: 0.18 });
  if (q.includes("uae")) boosts.push({ term: "uae", w: 0.12 });

  if (q.includes("charging") || q.includes("ev")) {
    boosts.push({ term: "charging", w: 0.18 });
    boosts.push({ term: "ev", w: 0.08 });
  }

  if (q.includes("satisfaction")) boosts.push({ term: "satisfaction", w: 0.20 });
  if (q.includes("net debt")) boosts.push({ term: "net debt", w: 0.25 });
  if (q.includes("ebitda")) boosts.push({ term: "ebitda", w: 0.20 });
  if (q.includes("fuel") && q.includes("volume")) boosts.push({ term: "volume", w: 0.16 });
  if (q.includes("highlight")) boosts.push({ term: "highlights", w: 0.08 });

  // “at a glance” / “highlights” often contain the numbers
  boosts.push({ term: "at a glance", w: 0.10 });
  boosts.push({ term: "highlights", w: 0.10 });

  return boosts;
}

function lexicalScore(query: string, text: string): number {
  const t = text.toLowerCase();
  let score = 0;

  // Strong signal: the question includes a number and the chunk contains it
  const nums = extractNumbers(query);
  for (const n of nums) {
    if (t.includes(n)) score += 0.35;
  }

  // If query is “how many / what was”, numbers in the chunk are helpful
  const q = query.toLowerCase();
  if (q.includes("how many") || q.includes("what was") || q.includes("ratio") || q.includes("%")) {
    const countNums = (t.match(/\d[\d,]*(?:\.\d+)?/g) || []).length;
    score += Math.min(countNums, 6) * 0.03; // small bump
  }

  for (const { term, w } of keywordBoost(query)) {
    if (t.includes(term)) score += w;
  }

  return score;
}

export async function POST(req: Request) {
  const t0 = Date.now();
  const body = await req.json().catch(() => ({} as any));

  const query: string = body.query;
  const top_k: number = body.top_k ?? 3; // ✅ default 3
  const doc_id: string | null = body.doc_id ?? "adnoc_annual_report_2024_en";

  if (!query || typeof query !== "string") {
    return Response.json({ error: "Missing or invalid `query`" }, { status: 400 });
  }

  // ---- embed the query ----
  const emb = await openai.embeddings.create({
    model: "text-embedding-3-small", // 1536 dims (fits pgvector indexes)
    input: query,
  });

  // ---- vector retrieve more candidates, then hybrid re-score ----
  const { data, error } = await supabase.rpc("match_rag_chunks", {
    query_embedding: emb.data[0].embedding,
    match_count: 30, // fetch more, then filter to top_k
    filter_doc_id: doc_id,
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const candidates = (data ?? []).map((r: any) => {
    const cleaned = stripMojibakeLines(cleanText(r.content));
    const lex = lexicalScore(query, cleaned);

    // r.similarity is higher=better (from RPC)
    // Combine: mostly semantic + a bit of lexical bias (helps numbers/metrics)
    const combined = r.similarity * 0.85 + lex * 0.15;

    return { ...r, _cleaned: cleaned, _combined: combined };
  });

  candidates.sort((a: any, b: any) => b._combined - a._combined);

  const filtered = candidates.filter((r: any) => shouldKeep(r.content_type, query));

  // clamp top_k to 1..5
  const k = Math.min(Math.max(top_k, 1), 5);
  const sliced = filtered.slice(0, k);

  return Response.json({
    provider: "supabase-pgvector",
    latency_ms: Date.now() - t0,
    query,
    top_k: k,
    doc_id,
    matches: sliced.map((r: any) => ({
      similarity: r.similarity, // keep raw vector similarity for transparency
      score: r._combined, // debug-friendly combined score
      text: clip(r._cleaned, 900),
      metadata: {
        doc_id: r.doc_id,
        chunk_id: r.chunk_id,
        section: r.section,
        page_start: r.page_start,
        page_end: r.page_end,
        content_type: r.content_type,
      },
    })),
  });
}
