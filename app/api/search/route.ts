import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs"; // important for some SDKs
export const dynamic = "force-dynamic"; // avoid caching

export async function POST(req: Request) {
  const t0 = Date.now();

  const { query, top_k = 5, doc_id = "adnoc_annual_report_2024_en" } = await req.json();

  if (!query || typeof query !== "string") {
    return Response.json({ error: "Missing or invalid `query`" }, { status: 400 });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Embed query (must match your DB dim = 1536)
  const emb = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: query,
  });

  const query_embedding = emb.data[0].embedding;

  const { data, error } = await supabase.rpc("match_rag_chunks", {
    query_embedding,
    match_count: Math.min(Math.max(top_k, 1), 10),
    filter_doc_id: doc_id,
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  function cleanText(s: string) {
    return s
      .replace(/â€™/g, "’")
      .replace(/â€œ/g, "“")
      .replace(/â€/g, "”")
      .replace(/â€“/g, "–")
      .replace(/â€”/g, "—")
      .replace(/Â/g, "");
  }  

  return Response.json({
    provider: "supabase-pgvector",
    latency_ms: Date.now() - t0,
    query,
    top_k,
    doc_id,
    matches: (data ?? []).map((r: any) => ({
      similarity: r.similarity,
      text: cleanText(r.content),
      metadata: {
        section: r.section,
        page_start: r.page_start,
        page_end: r.page_end,
        content_type: r.content_type,
        chunk_id: r.chunk_id,
        doc_id: r.doc_id,
      },
    })),
  });
}
