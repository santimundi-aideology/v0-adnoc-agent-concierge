export function safePayloadSummary(input: Record<string, unknown>) {
  return {
    topLevelKeys: Object.keys(input),
    argsKeys: objectKeys(input.args),
    metadataKeys: objectKeys(input.metadata),
    dynamicVariablesKeys: objectKeys(input.dynamic_variables ?? input.dynamicVariables),
  }
}

export function logBackendInfo(scope: string, message: string, details?: Record<string, unknown>) {
  console.log(`[voice-backend:${scope}] ${message}`, details ? JSON.stringify(details) : "")
}

export function logBackendError(scope: string, message: string, error: unknown, details?: Record<string, unknown>) {
  const errorMessage = error instanceof Error ? error.message : String(error)
  console.error(
    `[voice-backend:${scope}] ${message}`,
    JSON.stringify({ error: errorMessage, ...(details ?? {}) })
  )
}

function objectKeys(value: unknown): string[] {
  return value && typeof value === "object" ? Object.keys(value as Record<string, unknown>) : []
}
