## Context

The demo now treats Sarah as the Retell voice agent/profile that will be used for live voice interactions. Her current prompt contains useful behavior but mixes fixed Sarah-specific text, routing rules, checkout behavior, tool policy, fuel facts, and context parsing instructions in one large block. The backend already sends dynamic session context and can persist UI-visible coordination events, but the agent needs a stable prompt and two clear custom functions to use that backend reliably.

The implementation should keep using Retell and the current Express Demo UI. It should not rebuild the frontend. It should make Sarah's agent behavior reliable by standardizing what the agent is told, what context is sent, what catalog/loyalty data exists, and how the agent changes UI state.

## Goals / Non-Goals

**Goals:**

- Use Sarah as the active Retell voice agent for the Express Demo.
- Provide a standard Sarah system prompt that can be pasted into Retell and maintained in the repo.
- Send complete dynamic context at call start and via `get_demo_context`.
- Include all station context the agent needs: customer location, nearest stations, full station catalog, current recommended station, route hints, and service availability.
- Include a catalog of roughly 30 products/services with AED prices and loyalty-points prices.
- Include Sarah's loyalty points balance and checkout rules so the agent can pay with card, wallet, or points.
- Provide one custom function for context retrieval and one custom function for UI/session updates.
- Persist every accepted UI update as a System Coordination event.

**Non-Goals:**

- Create multiple Retell agents for each customer or scenario.
- Remove existing Google Maps, Supabase, or Retell dependencies.
- Build a complete POS/payment integration; checkout remains demo-stateful but must be explicit and visible.
- Let the voice agent invent catalog items, station IDs, prices, or points balances.

## Decisions

### Decision: Sarah Agent Prompt Lives As A Versioned Artifact

Create a standard Sarah system prompt in the repo, for example under `lib/voice-backend/prompts/sarah-system-prompt.ts` or a markdown file. The prompt should be usable as the Retell system prompt and should reference dynamic fields instead of hardcoding customer tastes or station choices.

Alternatives considered:
- Keep only the prompt in the Retell dashboard. This makes changes hard to review and reproduce.
- Generate the entire prompt dynamically per call. This increases risk and makes Retell debugging harder.

### Decision: Two Retell Functions Only

Expose exactly two Retell custom functions for the Express Demo:

1. `get_demo_context`
   - Input: `session_id` and optionally `call_id`.
   - Output: latest customer, station, route, catalog, loyalty, cart, checkout, and coordination context.

2. `update_session_ui`
   - Input: `session_id`, optional `call_id`, `action_type`, and action payload.
   - Output: accepted/rejected status plus updated session context.

Alternatives considered:
- Separate functions for every UI action. This makes Retell tool configuration noisy and harder to maintain.
- No update tool, only transcript interpretation. This is unreliable and cannot deterministically update the UI.

### Decision: Catalog And Loyalty Are Backend Data, Not Prompt Text

The agent prompt should explain how to use catalog and loyalty data, but item names, AED prices, points prices, and Sarah's points balance should come from backend context. The catalog can start as a seeded backend data module/table and later move fully into Supabase.

Alternatives considered:
- Put the catalog directly in the prompt. This bloats the prompt and makes price changes risky.
- Let the agent infer points prices from AED prices. This can produce inconsistent checkout behavior.

### Decision: UI Updates Are Structured Actions

`update_session_ui` should accept structured action types such as:

- `set_station_recommendation`
- `set_route`
- `add_cart_item`
- `remove_cart_item`
- `set_cart`
- `reserve_service`
- `apply_loyalty_points`
- `complete_checkout`
- `add_coordination_note`

Each accepted action should update persisted session state and append a coordination event. The frontend should react through realtime or polling and render updates under System Coordination.

Alternatives considered:
- A single free-form note field. This would display text but would not reliably update station, route, cart, or checkout state.
- Client-only state updates. This breaks if the call/webhook/server state differs from the browser.

### Decision: Startup Context Is Compact But Complete

At call start, send a compact context payload with:

- Sarah identity/profile and loyalty balance.
- User/demo location.
- Current scenario.
- Primary station.
- Nearest stations with distance/ETA/service flags.
- Full station catalog with relevant service/facility fields.
- Catalog items with `sku`, name, category, AED price, points price, availability, and station/service constraints.
- Upsell offers.
- Cart and checkout state.
- Allowed actions and tool-use rules.

The agent should call `get_demo_context` if it needs fresh state or if a tool result changes routing/cart/checkout.

## Risks / Trade-offs

- Prompt becomes too long for stable behavior → Keep the prompt rules concise and move data into JSON context.
- Catalog context becomes too large → Send roughly 30 demo items and compact fields only; avoid verbose descriptions unless needed.
- Agent updates UI incorrectly → Validate `update_session_ui` payloads and reject unknown station IDs, SKUs, impossible quantities, or insufficient points.
- Points checkout becomes confusing in voice → Require concise spoken confirmation: selected items, AED total, points used, remaining balance, and next step.
- Sarah-specific fallback conflicts with future single-agent setup → Prefer `NEXT_PUBLIC_RETELL_AGENT_ID` / `RETELL_AGENT_ID` when present, but keep Sarah fallback until the Retell dashboard is consolidated.

## Migration Plan

1. Add the standard Sarah prompt artifact to the repo.
2. Add catalog/loyalty context types and a seeded catalog of about 30 items/services.
3. Extend the Retell context builder to include catalog, points balance, cart, checkout, and action instructions.
4. Add or align `get_demo_context` and `update_session_ui` API routes with the names configured in Retell.
5. Update the Express Demo call creation payload to identify Sarah/session context consistently.
6. Update System Coordination rendering if needed to show checkout, points redemption, route, station, and service-reservation updates.
7. Test Sarah voice flow end to end: context loaded, station/route known, catalog item selected, points checkout completed, UI updated.

## Open Questions

- What exact Retell custom-function names are already configured in the dashboard, if any?
- Should points pricing use a fixed demo conversion rate, or explicit per-item point prices only?
- Should the catalog live in Supabase immediately, or start as a typed seed module and sync later?
