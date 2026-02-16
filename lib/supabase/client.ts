import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "./types"
import { getSupabasePublishableKey, getSupabaseUrl } from "./env"

let client: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createClient() {
  if (client) return client
  client = createBrowserClient<Database>(
    getSupabaseUrl(),
    getSupabasePublishableKey()
  )
  return client
}

/**
 * Backwards-compatible alias used by lib/data/queries.ts.
 * It lazily creates the browser client on first property access.
 */
export const supabase = new Proxy(
  {} as ReturnType<typeof createBrowserClient<Database>>,
  {
    get(_target, prop, receiver) {
      return Reflect.get(createClient(), prop, receiver)
    },
  }
)
