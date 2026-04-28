## 1. Route and Service Setup

- [x] 1.1 Add an internal Next API endpoint for Express demo chat (for example `app/api/express-demo/chat/route.ts`) with request validation and structured error responses.
- [x] 1.2 Extract/implement server utilities for loading customer, profile, station, signals, products, promotions, and recent visits needed by the chat route.
- [x] 1.3 Port prompt/context composition logic from the legacy Supabase function into reusable server-side modules.

## 2. Model Integration and Response Contract

- [x] 2.1 Integrate OpenAI server-side call in the new route and configure the model to `gpt-5.4-nano`.
- [x] 2.2 Preserve existing response contract (`reply`, `actions`) including `[ACTIONS]:[...]` parsing and fallback behavior when parsing fails.
- [x] 2.3 Add route-level logging and failure handling for provider/API errors without leaking secrets.

## 3. Frontend Cutover and Validation

- [x] 3.1 Update `app/(dashboard)/demo/page.tsx` chat submission flow to call the new internal API route instead of `functions/v1/voice-concierge`.
- [x] 3.2 Add or update tests/smoke checks for key scenarios: missing required fields, valid response, action extraction, and unavailable provider key.
- [x] 3.3 Verify Express demo UX parity (chat reply quality, action timeline behavior, and error states) and remove remaining hard dependency on the Supabase Edge Function path.
