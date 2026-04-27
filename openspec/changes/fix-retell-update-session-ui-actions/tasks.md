## 1. Retell Tool Contract And Documentation

- [x] 1.1 Define the flat `update_session_ui` JSON schema for Retell, including route, cart, loyalty, checkout, and coordination-note fields.
- [x] 1.2 Update Sarah's prompt to use the flat tool fields and avoid nested `payload` unless explicitly falling back.
- [x] 1.3 Update Retell configuration documentation with exact URL, headers, JSON schema, and request body examples for `get_demo_context` and `update_session_ui`.
- [x] 1.4 Remove or demote prompt guidance that encourages repeated tool calls after a rejection.

## 2. Backend Flat Action Parser

- [x] 2.1 Add a flat action parser before the existing nested action parser in `/api/retell/action`.
- [x] 2.2 Map `call_id + active_station_id` into a route update action and resolve the active session from `call_id`.
- [x] 2.3 Map flat `sku`, `quantity`, `remove_sku`, `points_to_use`, and `payment_method` fields into cart, loyalty, and checkout actions.
- [x] 2.4 Preserve compatibility for existing `action_type + payload` request bodies while preferring the flat schema.
- [x] 2.5 Return HTTP 200 structured rejections for missing fields, unknown stations, unknown SKUs, insufficient points, and unsupported actions.

## 3. Route, Map, And Coordination Sync

- [x] 3.1 Derive route origin from the active session/customer location when Retell omits origin coordinates.
- [x] 3.2 Validate `active_station_id`, compute or refresh route state, persist `active_station_id` and `active_route`, and record a route-change event.
- [x] 3.3 Ensure route-change events include destination station name, reason, ETA/distance when available, and stable payload fields for the UI.
- [x] 3.4 Ensure Express Demo updates the highlighted station and Google Maps route preview from accepted route changes without reload.
- [x] 3.5 Ensure System Coordination renders route-change events with clear labels instead of only showing session-start metadata.

## 4. Cart, Loyalty, And Checkout Reliability

- [x] 4.1 Validate flat SKU/quantity cart additions against the seeded catalog and persist cart totals.
- [x] 4.2 Apply loyalty points from flat fields and return points used, remaining points, and remaining AED balance.
- [x] 4.3 Complete checkout with card, wallet, points, or mixed payment using flat fields.
- [x] 4.4 Ensure rejected checkout actions do not mutate state and include recovery details Sarah can speak naturally.
- [x] 4.5 Ensure cart, loyalty, and checkout events appear in System Coordination without repeated failed tool loops.

## 5. Verification

- [x] 5.1 Verify "go to the next station" changes the highlighted station, Google Maps route preview, and System Coordination timeline.
- [ ] 5.2 Verify `update_session_ui` rejects `{}` with a structured Retell-friendly response and no state mutation.
- [x] 5.3 Verify Sarah can quote exact catalog prices for coffee/tea from context before using generic wording.
- [x] 5.4 Verify Sarah can add Iced Latte and Karak Tea, apply points, and complete checkout without repeated failed tool calls.
- [ ] 5.5 Verify invalid station, invalid SKU, missing call ID, malformed body, and insufficient points cases fail gracefully.
- [x] 5.6 Run available lint/type/build checks and fix regressions introduced by this change.
