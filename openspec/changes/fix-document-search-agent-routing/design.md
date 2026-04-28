## Context

The Document Search Agent is currently not working reliably, and user-facing requests fail before producing usable retrieval answers. The implementation spans frontend query submission, backend route validation/orchestration, vector retrieval integration, and model response shaping, so failures can occur at route-contract and data-orchestration boundaries.

This change focuses on making Document Search Agent routing and backend execution robust using app-owned routes and stable contracts.

## Goals / Non-Goals

**Goals:**
- Ensure Document Search Agent frontend requests consistently reach a working internal API route.
- Standardize request validation and response contract (`matches`/answer payloads plus clear errors).
- Keep retrieval/model invocation server-side with reliable fallback behavior and observability.
- Add practical smoke checks for common failure modes and successful query flow.

**Non-Goals:**
- Rebuilding the entire RAG ranking strategy or changing embedding/storage architecture.
- Reworking unrelated Express demo voice orchestration.
- Large UX redesign of the Document Search page.

## Decisions

1. **Treat route contract stability as the primary fix surface.**  
   - **Why:** current symptom is “not working” at runtime; most user-blocking issues are request/response mismatches or route failures.  
   - **Alternative considered:** tune retrieval heuristics first. Deferred until baseline route reliability is restored.

2. **Keep orchestration in first-party Next API route(s) with server-side keys only.**  
   - **Why:** aligns with backend ownership model, avoids client-side provider exposure, and centralizes error handling/logging.  
   - **Alternative considered:** provider calls from client. Rejected for security/operational reasons.

3. **Add explicit guardrails for missing/invalid inputs and provider-unavailable states.**  
   - **Why:** these are common demo breakpoints; controlled responses reduce hard failures.  
   - **Alternative considered:** allow unhandled backend exceptions. Rejected due to poor diagnosability.

4. **Add route smoke checks as acceptance gates.**  
   - **Why:** enables fast verification in environments where full E2E coverage is unavailable.  
   - **Alternative considered:** manual ad hoc testing only. Rejected due to repeated regressions.

## Risks / Trade-offs

- **[Risk] Partial fix if issue is in upstream data quality rather than route flow** → **Mitigation:** include diagnostics in route output/logs to isolate retrieval vs transport failures.
- **[Risk] Stricter validation may reject previously tolerated malformed requests** → **Mitigation:** keep validation focused on required fields and return actionable error messages.
- **[Trade-off] Additional smoke checks add maintenance overhead** → **Mitigation:** keep checks minimal and contract-focused.

## Migration Plan

1. Identify and normalize Document Search Agent frontend -> backend route usage.
2. Implement/fix backend route validation and response-shaping behavior.
3. Verify server-side retrieval/model execution path and fallback errors.
4. Add and run smoke checks for missing fields, valid responses, and provider-unavailable behavior.
5. Deploy and validate in demo environment; monitor route logs for remaining failures.

Rollback: restore previous route wiring and disable new contract enforcement if unexpected production regression occurs.

## Open Questions

- Should Document Search Agent expose a single “answer” field in addition to raw `matches` for easier UI rendering consistency?
- Do we want route-level feature flags to switch retrieval strategies without code redeploy?
