# Sarah Retell Agent Configuration

Use `SARAH_SYSTEM_PROMPT` from `sarah-system-prompt.ts` as the Sarah Retell agent system prompt.

Configure these Retell custom functions for the Express Demo:

- `get_demo_context`
  - Purpose: fetch the latest session context.
  - Inputs: `session_id`, optional `call_id`.
  - Headers: `Content-Type: application/json`.
  - Backend route: `POST /api/retell/session-context`.
  - JSON schema:

```json
{
  "type": "object",
  "properties": {
    "session_id": { "type": "string" },
    "call_id": { "type": "string" }
  },
  "required": ["session_id"]
}
```

  - Request body:

```json
{
  "session_id": "{{session_id}}",
  "call_id": "{{call_id}}"
}
```

- `update_session_ui`
  - Purpose: update UI-visible session state during the call.
  - Inputs: flat action fields such as `call_id`, `active_station_id`, `sku`, `quantity`, `points_to_use`, `payment_method`, `complete_checkout`, and `reason`.
  - Headers: `Content-Type: application/json`.
  - Backend route: `POST /api/retell/action`.
  - JSON schema:

```json
{
  "type": "object",
  "properties": {
    "call_id": { "type": "string" },
    "active_station_id": { "type": "string" },
    "eta_minutes": { "type": "number" },
    "reason": { "type": "string" },
    "sku": { "type": "string" },
    "remove_sku": { "type": "string" },
    "quantity": { "type": "number" },
    "points_to_use": { "type": "number" },
    "payment_method": {
      "type": "string",
      "enum": ["card", "wallet", "loyalty_points", "mixed"]
    },
    "complete_checkout": { "type": "boolean" },
    "coordination_note": { "type": "string" }
  },
  "required": ["call_id"]
}
```

  - Route-change request body:

```json
{
  "call_id": "{{call_id}}",
  "active_station_id": "station-id-from-context",
  "eta_minutes": 6,
  "reason": "Sarah asked for the next station"
}
```

  - Cart and points request body examples:

```json
{
  "call_id": "{{call_id}}",
  "sku": "COF-ICED-LATTE",
  "quantity": 1,
  "reason": "Sarah asked for an iced latte"
}
```

```json
{
  "call_id": "{{call_id}}",
  "points_to_use": 3300,
  "payment_method": "loyalty_points",
  "complete_checkout": true,
  "reason": "Sarah confirmed points checkout"
}
```

Do not configure `update_session_ui` to call `/api/retell/session-context`; it must call `/api/retell/action`.

Environment variable priority for the Express Demo voice agent:

1. `NEXT_PUBLIC_RETELL_AGENT_ID` or server-side `RETELL_AGENT_ID` for the future single-agent setup.
2. `NEXT_PUBLIC_RETELL_AGENT_ID_SARAH` as the current Sarah fallback.
