import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,      // ok
  process.env.SUPABASE_SERVICE_ROLE_KEY!      // server-only
);

function cleanText(s: string) {
  return s
    // smart quotes/dashes/ellipsis mojibake
    .replace(/â€™/g, "’")
    .replace(/â€œ/g, "“")
    .replace(/â€/g, "”")
    .replace(/â€“/g, "–")
    .replace(/â€”/g, "—")
    .replace(/â€¦/g, "…")

    // common broken apostrophe / separator artifacts
    .replace(/â/g, "’")
    .replace(/â/g, "–")
    .replace(/â/g, "—")
    .replace(/â¦/g, "…")

    // your exact current offenders
    .replace(/âs\b/g, "’s")          // Distributionâs -> Distribution’s
    .replace(/â/g, "—")             // interactionsâcreating -> interactions—creating (best guess)

    // stray non-breaking space marker
    .replace(/Â/g, "")
    .replace(/\u00A0/g, " ")

    // strip nulls
    .replace(/\u0000/g, "");
}


function clip(s: string, max = 900) {
  const t = s.trim();
  if (t.length <= max) return t;
  return t.slice(0, max) + "…";
}

function shouldKeep(contentType: string | null, query: string) {
  const q = query.toLowerCase();
  const askingForTable = q.includes("table") || q.includes("percentage") || q.includes("%") || q.includes("breakdown");
  const askingForImage = q.includes("image") || q.includes("figure") || q.includes("photo");

  if (!askingForTable && contentType === "table_html") return false;
  if (!askingForImage && contentType === "figure") return false;
  return true;
}

function stripMojibakeLines(s: string) {
  const lines = s.split("\n");
  const cleaned = lines.filter((line) => {
    const t = line.trim();
    if (!t) return true;

    // common mojibake indicators for mis-decoded Arabic/UTF-8
    const badChars = (t.match(/[ØÙÃâ]/g) || []).length;
    const ratio = badChars / Math.max(t.length, 1);

    // if the line is mostly these chars and short, drop it
    if (t.length <= 40 && ratio > 0.15) return false;

    // also drop lines that are basically "Ø£Ø¯..." etc
    if (/^[ØÙ]+/.test(t) && t.length < 60) return false;

    return true;
  });

  return cleaned.join("\n");
}


export async function POST(req: Request) {
  const t0 = Date.now();
  const body = await req.json();

  const query: string = body.query;
  const top_k: number = body.top_k ?? 5;
  const doc_id: string | null = body.doc_id ?? "adnoc_annual_report_2024_en";

  if (!query || typeof query !== "string") {
    return Response.json({ error: "Missing or invalid `query`" }, { status: 400 });
  }

  const emb = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: query,
  });

  const { data, error } = await supabase.rpc("match_rag_chunks", {
    query_embedding: emb.data[0].embedding,
    match_count: 12,                 // fetch a bit more, then filter to top_k
    filter_doc_id: doc_id,
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const filtered = (data ?? []).filter((r: any) => shouldKeep(r.content_type, query));
  const sliced = filtered.slice(0, Math.min(Math.max(top_k, 1), 5));
  const cleaned = stripMojibakeLines(cleanText(sliced.map((r: any) => r.content).join("\n")));

  return Response.json({
    provider: "supabase-pgvector",
    latency_ms: Date.now() - t0,
    query,
    top_k,
    doc_id,
    matches: sliced.map((r: any) => ({
      similarity: r.similarity,
      text: clip(cleaned, 900),
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
