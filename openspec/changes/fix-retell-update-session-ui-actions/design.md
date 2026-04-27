## Context

The current Retell action handler supports rich nested actions, but live Retell calls are not reliably producing that structure. In tests, Sarah could see the correct customer/location/station context and could verbally select the next EV station, but `update_session_ui` was invoked with `{}` or with mismatched function routing. As a result, Google Maps did not change and System Coordination only showed the session-start event.

The next implementation should treat Retell custom functions as constrained form submissions, not general JSON builders. The backend can keep richer internal action types, but the Retell-facing schema must be flat, explicit, and hard to call incorrectly.

## Goals / Non-Goals

**Goals:**

- Make `update_session_ui` reliable for Retell by accepting flat parameters for route, station, cart, loyalty, checkout, and coordination-note actions.
- Prioritize route-change correctness: `call_id + active_station_id` should be enough to update active route, map preview, highlighted station, and System Coordination.
- Keep the backend responsible for deriving route origin, station name, route metrics, and event labels where Retell omits them.
- Return Retell-friendly success/rejection payloads with HTTP 200 so failed actions do not cause repetitive voice loops.
- Preserve existing nested action bodies temporarily so current code paths do not break during migration.

**Non-Goals:**

- Rebuild the Express Demo frontend layout.
- Replace Google Maps or Supabase.
- Implement real payment/POS processing.
- Keep supporting arbitrary free-form tool payloads indefinitely.

## Decisions

### Decision: Flat Retell Parameters Are The Public Contract

`update_session_ui` should expose Retell-friendly fields such as `call_id`, `active_station_id`, `reason`, `eta_minutes`, `sku`, `quantity`, `payment_method`, and `points_to_use`. The backend will map these into internal action types.

Alternatives considered:
- Keep `action_type + payload`. This is flexible but Retell repeatedly called it with `{}` or malformed payloads.
- Create many separate Retell tools. This makes the dashboard noisier and increases prompt/tool-selection errors.

### Decision: Route Update Is First-Class

For route changes, the route action should not depend on Sarah generating a nested `origin` object. The backend should find the active demo session by `call_id`, read the session/profile location, validate `active_station_id`, compute route state, persist it, and create a coordination event.

Alternatives considered:
- Require the model to provide origin coordinates. This already proved fragile and duplicates context the backend has.
- Only update a recommendation table. This can highlight a station but does not produce a durable route state or route event.

### Decision: Backend Handles Event Labels

System Coordination should show deterministic labels such as "Route changed to ADNOC Express Palm Jumeirah" and details such as "Sarah asked for the next station." Retell should provide intent/reason, not fully formatted UI copy.

Alternatives considered:
- Let the model write the entire event title/detail. This can produce inconsistent wording or omit critical route/cart fields.

### Decision: Rejections Are Tool Results, Not HTTP Failures

Invalid station IDs, missing `call_id`, unknown SKUs, and insufficient points should return `{ ok: false, status: "rejected", error, missing_fields? }` with HTTP 200. This lets Sarah recover naturally instead of falling into repeated failed tool invocations.

Alternatives considered:
- Continue returning HTTP 400/500. Retell surfaces these as tool errors and the agent tends to retry or apologize without useful state.

## Risks / Trade-offs

- Retell dashboard still misconfigured → Document exact schema/body and add backend tolerance for common body shapes.
- Active session lookup by `call_id` fails → Fall back to latest active session only for demo safety and clearly mark the response as recovered.
- Flat schema becomes too broad → Keep a small `action` enum or infer from provided fields, with route update as the primary happy path.
- UI does not receive realtime update → Persist both session state and coordination event, and add a polling fallback if subscription does not fire.

## Migration Plan

1. Add a flat action parser in `app/api/retell/action/route.ts` before the existing nested parser.
2. Implement route update by `call_id + active_station_id` and persist route/session state.
3. Update System Coordination event payloads and frontend handling for route/cart/checkout event types.
4. Update Sarah prompt and Retell docs with the exact JSON schemas and request bodies.
5. Retest live voice calls for route change, cart add, points checkout, and invalid action rejection.
6. Archive older nested-action guidance after the flat schema is verified.

## Open Questions

- Should the route action infer "next station" server-side when Sarah says next, or should Sarah always pass the selected station ID from context?
- Should `update_session_ui` use a small `action` enum, or separate optional fields that imply the action?
- Should the frontend rely only on coordination-event inserts, or also subscribe to `demo_voice_sessions` updates for active route changes?
