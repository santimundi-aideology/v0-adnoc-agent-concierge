## Context

The Express demo currently posts chat turns from the dashboard page to a Supabase Edge Function (`functions/v1/voice-concierge`), which then loads customer/station context from Supabase and calls OpenAI. This creates an extra service boundary and deployment surface outside the Next.js app, while the rest of voice/session orchestration already lives in app-owned API routes and `lib/voice-backend` utilities.

The requested change is to move this chat orchestration into a first-party Next route and use `gpt-5.4-nano` for text generation.

## Goals / Non-Goals

**Goals:**
- Replace frontend dependency on Supabase Edge Function with an internal Next API route.
- Preserve existing response contract consumed by the demo UI (`reply`, `actions`, optional route metadata).
- Keep sensitive provider keys server-side and centralize logging/error handling in app backend.
- Use `gpt-5.4-nano` as the configured model for this route.

**Non-Goals:**
- Redesigning prompt style, customer personas, or upsell strategy beyond portability needs.
- Changing Retell voice-call architecture.
- Reworking unrelated dashboard pages or session coordination schemas.

## Decisions

1. **Create a dedicated Next route for Express chat (`/api/express-demo/chat`).**  
   - **Why:** Keeps Express demo text flow in the same codebase/runtime as other backend routes, reduces external operational dependency, and simplifies local debugging.  
   - **Alternative considered:** Keep Supabase Edge Function and optimize latency. Rejected because dependency reduction and ownership are higher priority than micro-latency tuning.

2. **Move Supabase data composition into shared server utilities, not inline route logic.**  
   - **Why:** Maintains thin-route pattern and consistency with current backend-service boundaries specs.  
   - **Alternative considered:** One large route file with all queries + prompt construction. Rejected due to reduced maintainability/testability.

3. **Use OpenAI from server runtime with explicit `gpt-5.4-nano` model configuration.**  
   - **Why:** Meets requested model target and keeps model selection centralized for future tuning.  
   - **Alternative considered:** Continue with `gpt-4o-mini` default. Rejected per product request.

4. **Preserve action extraction protocol (`[ACTIONS]:[...]`) for compatibility.**  
   - **Why:** Avoids immediate UI and downstream contract changes; enables low-risk migration.  
   - **Alternative considered:** Switch to structured tool-calling in this change. Deferred to a follow-up change.

5. **Use phased rollout with fallback flag during migration.**  
   - **Why:** Allows safe cutover and quick rollback if behavior differs in production-like demos.  
   - **Alternative considered:** Hard switch in one step. Rejected due to avoidable rollout risk.

## Risks / Trade-offs

- **[Risk] Model output behavior drift moving from current call settings to `gpt-5.4-nano`** -> **Mitigation:** keep prompt parity, temperature/token guards, and regression test scripts over representative demo conversations.
- **[Risk] Route latency regressions from server-side data fan-out** -> **Mitigation:** keep parallelized queries and reuse existing direct-client/database access patterns.
- **[Risk] Contract mismatch with current UI assumptions** -> **Mitigation:** enforce response schema and add route-level integration tests.
- **[Trade-off] Reduced external dependency but tighter coupling to app runtime scale** -> **Mitigation:** isolate route/service modules and keep observability fields compatible with current logs.

## Migration Plan

1. Introduce new backend route and supporting service utilities in parallel with existing Edge Function path.
2. Add compatibility tests comparing old/new response shape for core scenarios (customer/station missing, normal reply, actions parsing).
3. Switch dashboard fetch target to internal route behind a temporary feature flag (default enabled in local/staging).
4. Validate logs, latency, and UX behavior in staging demos.
5. Remove fallback path and deprecate function dependency once stable.

Rollback: revert frontend fetch target to prior function endpoint and disable new route via feature flag.

## Open Questions

- Should route-level auth/abuse protections be required for demo endpoints beyond current environment-based controls?
- Do we want to store prompt/model metadata for each generated reply for traceability?
