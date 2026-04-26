import { createDirectClient } from "@/lib/supabase/direct-client"

type QueryBuilder = {
  select: (...args: unknown[]) => QueryBuilder
  insert: (...args: unknown[]) => QueryBuilder
  upsert: (...args: unknown[]) => QueryBuilder
  update: (...args: unknown[]) => QueryBuilder
  delete: (...args: unknown[]) => QueryBuilder
  eq: (...args: unknown[]) => QueryBuilder
  in: (...args: unknown[]) => QueryBuilder
  order: (...args: unknown[]) => QueryBuilder
  limit: (...args: unknown[]) => QueryBuilder
  maybeSingle: (...args: unknown[]) => Promise<{ data: unknown; error: { message: string } | null }>
  single: (...args: unknown[]) => Promise<{ data: unknown; error: { message: string } | null }>
  then: PromiseLike<{ data: unknown; error: { message: string } | null }>["then"]
}

export type VoiceBackendSupabaseClient = ReturnType<typeof createDirectClient> & {
  from: (table: string) => QueryBuilder
}

export function createVoiceBackendClient(): VoiceBackendSupabaseClient {
  return createDirectClient() as unknown as VoiceBackendSupabaseClient
}
