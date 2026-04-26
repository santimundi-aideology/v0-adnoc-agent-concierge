## Context

The existing application has a strong dashboard/demo surface, but backend behavior is spread across large client pages, direct Supabase calls, Retell API routes, and process-local transcript storage. The refactor should preserve the current frontend routes and visual design while making the backend dependable enough for live demos.

The target model remains online and hosted: Retell provides browser voice calls, Supabase stores operational data/auth/session records, Google Maps/Directions provides route metrics, and document/RAG providers remain available where already used. The main behavioral change is using one Retell voice agent that receives dynamic profile/session context and can update live session state through backend APIs/custom functions.

## Goals / Non-Goals

**Goals:**

- Preserve the current frontend shell, pages, visual style, and demo intent.
- Centralize Retell call creation, dynamic variable construction, webhook ingestion, transcript persistence, and custom-function handling behind backend services.
- Make business/customer profiles data-driven, with support for roughly six demo profiles and scenario-specific context.
- Persist live session state so profile selections, recommended station, active route, cart/order state, recommendations, agent actions, and system-coordination messages are visible immediately.
- Allow the voice agent to update the current Google Maps route/destination via a backend-controlled action.
- Make transcript storage durable in Supabase and usable by live-call and conversation-detail pages.

**Non-Goals:**

- Rebuild the frontend from scratch or redesign the UI.
- Remove Retell, Supabase, Google Maps, or the existing hosted API model.
- Implement a fully offline/on-prem architecture.
- Replace all data loading in one pass if a narrower backend contract can stabilize the demo first.

## Decisions

### Decision: Introduce Backend Service Modules Behind Existing Routes

Create service modules for Retell, session coordination, transcript persistence, profile context, station recommendations, route metrics, and call/event persistence. Existing Next.js route handlers should become thin request/response adapters.

Alternatives considered:
- Keep logic inside route handlers and pages. This is faster initially but repeats the current failure mode.
- Move everything to Supabase Edge Functions. This could work, but would make local iteration harder and spread behavior across more runtimes.

### Decision: Use Supabase as the Source of Truth for Active Session State

Add or normalize tables for demo sessions, session coordination events, route state, transcript lines, calls, tool events, profile selections, and agent actions. Client state can optimistically update the UI, but the durable state must come from Supabase reads, polling, or realtime subscriptions.

Alternatives considered:
- Keep process-local maps for live transcript/session state. This fails across reloads, serverless instances, and webhook timing.
- Keep all state in React. This makes the demo look live but loses backend correctness.

### Decision: Use One Retell Agent with Dynamic Context

The backend builds a single context payload for Retell call creation and custom-function responses. The payload includes selected profile, scenario, station recommendation, route metrics, operational signals, visit history, cart/order state, and allowed actions. The same Retell agent adapts behavior based on that payload.

Alternatives considered:
- Multiple Retell agents per profile/scenario. This makes tuning fragmented and increases operational complexity.
- Put all branching behavior in the frontend prompt. This does not help when the voice agent needs fresh backend state during a call.

### Decision: Treat Voice Agent Updates as Structured Actions

When the Retell agent/custom function changes route, selected station, recommendation, cart, loyalty action, or system-coordination state, it must call a backend action endpoint with structured fields. The backend validates the action, persists it, and returns updated session context.

Alternatives considered:
- Parse free-form transcript text to infer changes. This is brittle and hard to verify.
- Let the client mutate route/session state directly. This bypasses the source of truth and can diverge from the voice agent.

### Decision: Durable Transcript Ingestion Uses Webhooks, Live UI Uses Client Events

Retell browser events provide immediate transcript feedback, while webhook events are normalized and persisted as the source of truth. Deduplication should use call ID, speaker, normalized text, sequence/timestamp, source, and Retell identifiers when available.

Alternatives considered:
- Only use client events. This misses server-side final events and breaks historical replay.
- Only use webhooks. This can feel laggy during a live demo.

### Decision: Route Updates Flow Through the Backend

The voice agent should not directly manipulate Google Maps embed URLs in the browser. Instead, it requests a route update with origin/destination/station identifiers. The backend recomputes or stores route metrics, persists active route state, and the frontend renders the latest route.

Alternatives considered:
- Keep route URLs fully client-side. This prevents the voice agent from reliably changing routes.
- Skip Google Maps and use approximate distance only. This loses the current route-preview behavior the demo needs.

## Risks / Trade-offs

- Retell webhook payload variations can cause duplicate or missing transcript lines → Mitigate with tolerant parsing, idempotent inserts, and visible debug logging for unknown payload shapes.
- Supabase realtime may be unreliable or overkill for the demo timeline → Mitigate by supporting both realtime subscription and short polling fallback.
- New session tables may require migration/seed work before UI changes are useful → Mitigate by adding minimal tables first and backfilling from existing call/profile data where possible.
- Voice-agent action contracts can drift from the Retell prompt/tools configuration → Mitigate by documenting action schemas and validating every action with Zod/server-side checks.
- Google Maps API failures can block route updates → Mitigate by preserving the previous route and returning a structured fallback ETA/source field.

## Migration Plan

1. Add backend service modules and types without changing UI behavior.
2. Add Supabase persistence for sessions, coordination events, route state, transcript lines, and agent actions.
3. Update Retell call creation to use the single agent and dynamic context builder.
4. Update webhook/transcript routes to persist normalized transcript and call events.
5. Add voice-agent/custom-function action handling for route/session updates.
6. Wire the Express Demo and live-call views to persisted session state while preserving existing visual layout.
7. Seed six business/customer profiles and scenarios.
8. Verify end-to-end voice call creation, transcript display, route update, and session coordination visibility.

Rollback: keep existing API routes callable during the transition where possible. If the new session/action layer fails, disable new action handling and fall back to existing route/context responses while preserving UI availability.

## Open Questions

- Should active session state use Supabase Realtime, polling, or both for the first implementation pass?
- Which exact Retell custom-function names and schemas are already configured in the Retell dashboard?
- Should business profiles be added to existing `customers`/`customer_behavior_profiles` tables or modeled as a new `business_profiles` table linked to customers?
- Should Google route previews use embedded map URLs only, or also persist polyline/directions metadata?
