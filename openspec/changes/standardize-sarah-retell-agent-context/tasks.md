## 1. Sarah Prompt And Agent Selection

- [x] 1.1 Create a versioned Sarah system prompt artifact in the repo using the standardized prompt rules from the spec.
- [x] 1.2 Update the prompt to reference dynamic context fields and the two custom functions instead of hardcoded static station/catalog/payment details.
- [x] 1.3 Ensure the Express Demo uses Sarah's Retell agent as the active fallback while still preferring a future single-agent env var when present.
- [x] 1.4 Document the exact prompt and custom-function names to configure in the Retell dashboard.

## 2. Catalog And Loyalty Data

- [x] 2.1 Define catalog item types with SKU, name, category, AED price, points price, availability, and optional station/service constraints.
- [x] 2.2 Seed roughly 30 demo catalog items across coffee, drinks, food, snacks, EV dwell-time offers, wash, interior cleaning, quick lube, tire/AC checks, and reservations.
- [x] 2.3 Define Sarah's loyalty context, including current points balance, redemption rules, and payment preferences.
- [x] 2.4 Add cart and checkout state types that can represent AED total, points total, points redeemed, remaining AED balance, payment method, and completion status.

## 3. Demo Context Payload

- [x] 3.1 Extend the Retell session context builder to include catalog items, Sarah loyalty balance, cart state, checkout state, and action instructions.
- [x] 3.2 Ensure call-start dynamic variables include compact Sarah context, nearest stations, full station catalog, routing hints, catalog, and loyalty data.
- [x] 3.3 Implement or align the `get_demo_context` endpoint/function to return the latest persisted session context with catalog and checkout fields.
- [x] 3.4 Keep context payload compact by trimming station/catalog fields to only what the voice agent needs.

## 4. UI Update Custom Function

- [x] 4.1 Implement or align `update_session_ui` as the Retell custom function for station, route, cart, reservation, loyalty, checkout, and coordination-note actions.
- [x] 4.2 Validate `update_session_ui` payloads for known action types, known station IDs, known SKUs, valid quantities, and sufficient points before mutating state.
- [x] 4.3 Persist accepted UI actions to session state and append System Coordination events with clear labels and details.
- [x] 4.4 Return updated session context from `update_session_ui` so Sarah can answer in the same turn.
- [x] 4.5 Return structured rejections for invalid actions without changing UI/session state.

## 5. Express Demo UI Reflection

- [x] 5.1 Ensure System Coordination renders station, route, cart, service reservation, loyalty redemption, checkout, and coordination-note events clearly.
- [x] 5.2 Ensure accepted station/route updates change the highlighted station and route preview.
- [x] 5.3 Ensure accepted cart and checkout updates are visible in the current demo UI without a full reload.
- [x] 5.4 Ensure loyalty-points checkout shows points used, benefit, remaining AED balance, and completion state.

## 6. Verification

- [x] 6.1 Verify Sarah starts with full context and can identify herself, the selected customer, nearest station, and nearest EV-capable options.
- [ ] 6.2 Verify Sarah can add catalog items/services using AED and points prices without inventing prices.
- [ ] 6.3 Verify Sarah can complete checkout using card, wallet, or loyalty points and summarize the result.
- [x] 6.4 Verify `get_demo_context` returns fresh context during an active call.
- [ ] 6.5 Verify `update_session_ui` updates System Coordination and UI state during an active call.
- [x] 6.6 Run available lint/type/build checks and fix regressions introduced by this change.
