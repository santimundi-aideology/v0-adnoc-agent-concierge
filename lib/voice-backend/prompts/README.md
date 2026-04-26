# Sarah Retell Agent Configuration

Use `SARAH_SYSTEM_PROMPT` from `sarah-system-prompt.ts` as the Sarah Retell agent system prompt.

Configure these Retell custom functions for the Express Demo:

- `get_demo_context`
  - Purpose: fetch the latest session context.
  - Inputs: `session_id`, optional `call_id`.
  - Backend route: `POST /api/retell/session-context`.

- `update_session_ui`
  - Purpose: update UI-visible session state during the call.
  - Inputs: `session_id`, optional `call_id`, `action_type`, and `payload`.
  - Backend route: `POST /api/retell/action`.

Environment variable priority for the Express Demo voice agent:

1. `NEXT_PUBLIC_RETELL_AGENT_ID` or server-side `RETELL_AGENT_ID` for the future single-agent setup.
2. `NEXT_PUBLIC_RETELL_AGENT_ID_SARAH` as the current Sarah fallback.
