## Why

The current frontend is valuable enough to keep, but the backend/session architecture is blocking reliable demos: Retell context, route updates, transcript persistence, and live system-coordination state are scattered and not durable enough. This change refactors the backend around a single Retell voice agent, data-driven business profiles, and persisted session state so the existing UI can behave predictably during live demos.

## What Changes

- Refactor the Retell integration so all voice sessions use one configured voice agent with dynamic variables/custom-function context instead of scenario-specific agent behavior.
- Add a backend context contract for business/customer profiles, scenarios, station recommendations, route/ETA data, operational signals, cart/order state, and available agent actions.
- Support roughly six data-driven business/customer profiles instead of only three hardcoded personas.
- Persist voice-session changes, transcript lines, route changes, recommendations, and agent actions so they are visible immediately in the UI, especially under the Express Demo system-coordination area.
- Allow the voice agent/custom function to update the active Google Maps route/recommended destination during a session.
- Replace process-local transcript/session state as the source of truth with durable Supabase-backed call, transcript, tool-event, and session-coordination state.
- Clean up backend API boundaries while preserving the current frontend look and route structure.
- Keep the existing online service model: Retell, Supabase, Google Maps/Directions, and document/RAG services remain in use.

## Capabilities

### New Capabilities

- `retell-session-context`: Defines how a single Retell voice agent receives dynamic business profile, scenario, route, station, and session context.
- `session-coordination-state`: Defines persisted real-time state changes that the UI must display during an active demo session.
- `voice-route-control`: Defines how voice-agent actions can update the active route, destination, and route metadata shown in the demo.
- `durable-voice-transcription`: Defines durable transcript ingestion, normalization, deduplication, and retrieval for live and historical calls.
- `backend-service-boundaries`: Defines expected backend API/service organization for reliable calls, context building, session updates, and observability.

### Modified Capabilities

- None.

## Impact

- Affected frontend integration points: `app/(dashboard)/demo/page.tsx`, `app/(dashboard)/document-search-agent/page.tsx`, `app/(dashboard)/live-calls/[id]/page.tsx`, `app/(dashboard)/live-calls/page.tsx`, `app/(dashboard)/conversations/[id]/page.tsx`, and manager/demo widgets that display session or station context.
- Affected backend/API routes: `app/api/retell/create-call/route.ts`, `app/api/retell/webhook/route.ts`, `app/api/retell/transcript/route.ts`, `app/api/retell/context/route.ts`, `app/api/retell/station-display-context/route.ts`, `app/api/retell/recommendation/route.ts`, and `app/api/express-demo/route-metrics/route.ts`.
- Affected data layer: Supabase tables and query helpers for calls, transcript lines, tool events, customer/business profiles, station context, recommendations, route/session state, and coordination events.
- External dependencies remain Retell, Supabase, Google Maps/Directions, and any existing document/RAG provider.
