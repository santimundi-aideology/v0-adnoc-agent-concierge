## 1. Backend Model And Service Foundation

- [x] 1.1 Audit current Retell, Supabase, route-metrics, demo, and transcript code paths to confirm all active integration points before editing.
- [x] 1.2 Define shared TypeScript types and validation schemas for demo profiles, scenarios, Retell dynamic context, session coordination events, voice-agent actions, route state, transcript lines, and API responses.
- [x] 1.3 Add service module structure for Retell, profile context, session coordination, route metrics, transcript persistence, call persistence, and recommendations.
- [x] 1.4 Design and add Supabase persistence for active demo sessions, session coordination events, active route state, voice-agent actions, and durable transcript lines.
- [x] 1.5 Seed or map approximately six data-driven business/customer profiles and their scenario metadata.

## 2. Retell Context And Call Creation

- [x] 2.1 Refactor Retell call creation into a service that uses one configured agent ID and builds dynamic variables from the selected profile, scenario, station, route, and current session state.
- [x] 2.2 Update `/api/retell/create-call` to validate requests, create or attach a demo session, delegate to the Retell service, and return call/session identifiers.
- [x] 2.3 Implement a backend context endpoint or function handler that Retell custom functions can call to fetch the latest persisted session context.
- [x] 2.4 Ensure document-search and Express Demo call creation both keep working while sharing the cleaned Retell call creation path where appropriate.

## 3. Durable Transcription And Call Events

- [x] 3.1 Refactor Retell webhook handling to parse common Retell payload shapes safely and persist call status, transcript lines, and tool/event metadata.
- [x] 3.2 Implement transcript normalization for `customer`, `agent`, and `system` speakers.
- [x] 3.3 Implement idempotent transcript deduplication for repeated client/webhook transcript segments.
- [x] 3.4 Update `/api/retell/transcript` to read from durable storage instead of process-local memory as the source of truth.
- [x] 3.5 Add fallback logging for unknown webhook payload shapes without exposing sensitive payload content.

## 4. Voice-Controlled Route And Coordination Updates

- [x] 4.1 Implement a validated backend action handler for voice-agent actions such as route change, recommendation update, cart update, loyalty action, and service reservation.
- [x] 4.2 Implement route-change handling that validates destination station/coordinates, calls route metrics, persists active route state, and records a coordination event.
- [x] 4.3 Update route metrics handling to return a stable route display contract with ETA, distance, source, destination, and fallback metadata.
- [x] 4.4 Ensure accepted voice-agent actions return updated session context for the Retell agent.
- [x] 4.5 Ensure rejected voice-agent actions do not mutate durable session state and return structured errors.

## 5. Frontend Wiring With Current UI Preserved

- [x] 5.1 Wire the Express Demo to load data-driven profiles/scenarios from the backend while preserving the current visual layout.
- [x] 5.2 Wire Express Demo session state to persisted coordination events and active route state with realtime subscription or polling fallback.
- [x] 5.3 Update the system-coordination area to display route changes, recommendations, cart/order changes, and service actions immediately after backend acceptance.
- [x] 5.4 Update the Google route preview/map UI when the persisted active route changes during a voice session.
- [x] 5.5 Update live-call and conversation-detail transcript views to reconcile live client updates with durable transcript data.

## 6. Verification And Hardening

- [x] 6.1 Verify starting an Express Demo Retell call sends the selected profile/scenario context to the single voice agent.
- [x] 6.2 Verify the voice agent can change the active route and the UI updates the route preview plus system-coordination timeline.
- [x] 6.3 Verify transcript lines persist through reloads and appear in live-call and conversation-detail pages without duplicates.
- [ ] 6.4 Verify invalid profile, invalid route, malformed webhook, and unsupported action cases fail gracefully.
- [x] 6.5 Run available lint/type/build checks and fix backend/frontend regressions introduced by the refactor.
