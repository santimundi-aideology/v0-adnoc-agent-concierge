import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "./types"

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL")
  }
  return url
}

function getSupabasePublishableKey(): string {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY fallback)"
    )
  }
  return key
}

let client: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createClient() {
  if (client) return client
  client = createBrowserClient<Database>(
    getSupabaseUrl(),
    getSupabasePublishableKey()
  )
  return client
}

// Backwards-compatible singleton client for query helpers.
export const supabase = createClient()
