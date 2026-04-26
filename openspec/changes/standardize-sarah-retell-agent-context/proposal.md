## Why

Sarah is now the Retell voice agent/profile used for the demo, but her current prompt and backend context contract are too ad hoc for a reliable voice flow. We need a standard Sarah agent prompt plus a clear context/action contract so the agent knows the customer, stations, catalog, loyalty points, checkout options, and can update the UI during the call.

## What Changes

- Standardize Sarah as the active Retell demo agent while preserving support for dynamic backend-provided context.
- Create a reusable Sarah system prompt that keeps the ADNOC voice concise, demo-safe, language-aware, and tool-aware.
- Send a complete startup context payload when the Retell call starts, including customer identity, location, nearest stations, all available stations, routing hints, catalog items, AED prices, loyalty-points prices, customer points balance, and checkout rules.
- Add or expose a catalog of roughly 30 purchasable products/services, including coffee, food, snacks, beverages, EV-related services, washing, interior cleaning, car care, and service reservations.
- Add loyalty checkout behavior so the agent can quote points prices, see Sarah's points balance, and confirm points redemption or remaining AED balance.
- Define exactly two Retell custom functions:
  - `get_demo_context`: fetches/refreshes current context for the active session.
  - `update_session_ui`: changes UI-visible session state such as selected station, route, cart, reservation, checkout, loyalty redemption, and system-coordination timeline.
- Ensure every accepted voice-agent update appears immediately under System Coordination in the current UI.

## Capabilities

### New Capabilities

- `sarah-agent-system-prompt`: Defines the standard Sarah Retell system prompt and behavioral constraints.
- `demo-context-payload`: Defines the startup/refresh context sent to Sarah, including customer, stations, routing, catalog, and loyalty data.
- `catalog-loyalty-checkout`: Defines product/service catalog requirements, AED/points pricing, cart behavior, and loyalty-points checkout.
- `retell-ui-action-function`: Defines the UI update custom function that the voice agent uses to mutate session state and System Coordination.

### Modified Capabilities

- None.

## Impact

- Affected Retell configuration: Sarah voice agent prompt and custom function/tool definitions.
- Affected backend/API code: Retell call creation, session context endpoint/function, UI action endpoint/function, profile/station/catalog/loyalty context builders, and session coordination persistence.
- Affected frontend code: Express Demo call start payload, System Coordination updates, active station/route display, cart/checkout display, and voice-state messaging.
- Affected data: product/service catalog, AED pricing, loyalty-points pricing, Sarah loyalty balance, cart/reservation state, and session coordination events.
