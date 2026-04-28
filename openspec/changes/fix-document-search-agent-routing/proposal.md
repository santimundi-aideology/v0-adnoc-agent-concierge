## Why

The Document Search Agent flow is currently failing in practice, which blocks retrieval-based answers and breaks the demo experience. We need a reliable, app-owned backend route and stable request/response contract so document search works consistently in local and deployed environments.

## What Changes

- Add or standardize a first-party Next.js API route for Document Search Agent query execution and response shaping.
- Ensure server-side model invocation and retrieval orchestration are robust, with clear validation and fallback error handling.
- Align frontend Document Search Agent calls to the internal route contract and remove brittle runtime assumptions causing failures.
- Add smoke/integration checks for missing-input, successful retrieval, and provider-unavailable scenarios.

## Capabilities

### New Capabilities
- `document-search-agent-route-reliability`: Reliable internal API contract and backend orchestration for document-search chat/query requests.

### Modified Capabilities
- `backend-service-boundaries`: Extend thin-route/backend-service boundary requirements to explicitly cover Document Search Agent orchestration paths.

## Impact

- Affected code: `app/(dashboard)/document-search-agent/page.tsx`, `app/api/search/route.ts` (or equivalent route), and supporting backend utilities under `lib/`.
- APIs: frontend document-search requests standardize on app-owned route contract.
- Dependencies: server-side OpenAI/retrieval usage remains backend-only (no client key exposure), with improved request validation and observability.
- Quality: introduces explicit smoke checks so regressions in document-search routing are caught earlier.
