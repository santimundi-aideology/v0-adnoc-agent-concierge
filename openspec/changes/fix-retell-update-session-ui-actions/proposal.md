## Why

`update_session_ui` is currently too flexible for Retell to call reliably. In live testing the agent had the right context, but route, cart, and loyalty actions either invoked the wrong endpoint, sent `{}`, or failed to update Google Maps and System Coordination.

## What Changes

- Replace the Retell-facing `update_session_ui` contract with deterministic flat parameters for common actions instead of requiring the agent to build nested `action_type + payload` objects.
- Add a first-class route update path using `call_id`, `active_station_id`, optional `eta_minutes`, and `reason`.
- Make accepted route updates persist the active session route, change the highlighted station, update the Google Maps route preview, and append a clear System Coordination event.
- Add deterministic cart and loyalty checkout actions using flat SKU, quantity, payment, and points fields so Sarah can complete checkout without repeated failed tool calls.
- Keep backwards compatibility for the existing nested body during the transition, but document and prefer the flat Retell schema.
- Update Sarah's prompt and Retell configuration documentation to match the actual JSON schema Retell should generate.
- Ensure rejected actions return Retell-friendly structured responses without mutating session state.

## Capabilities

### New Capabilities

- `retell-flat-ui-actions`: Defines the Retell-facing flat parameter contract for `update_session_ui` and required validation/rejection behavior.
- `voice-route-map-sync`: Defines how voice-selected stations update active route state, Google Maps preview, highlighted station, and System Coordination.
- `voice-cart-loyalty-checkout-actions`: Defines deterministic cart, loyalty points, and checkout actions that Sarah can call from Retell.

### Modified Capabilities

- None.

## Impact

- Affected Retell configuration: `update_session_ui` JSON schema, request body, and Sarah prompt guidance.
- Affected backend/API code: `app/api/retell/action/route.ts`, `lib/voice-backend/session-coordination.ts`, action schemas, route-state persistence, and context refresh response.
- Affected frontend code: Express Demo route preview, selected station handling, and System Coordination rendering.
- Affected verification: route-change, cart, points checkout, rejected action handling, and transcript/session continuity tests.
