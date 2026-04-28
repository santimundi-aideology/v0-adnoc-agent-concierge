## Why

The Express demo chat currently depends on an external Supabase Edge Function (`voice-concierge`) for text responses, which adds operational coupling and deployment overhead outside the Next.js app. We need to move chat orchestration into a first-party Next API route to reduce dependencies and standardize backend ownership.

## What Changes

- Add a new server-side Next API route for Express demo chat response generation, replacing browser calls to `functions/v1/voice-concierge`.
- Port the existing prompt-building behavior (customer/station/profile/signals/products/promotions/visits context + action extraction) into app-owned backend code.
- Use `gpt-5.4-nano` for text response generation in the new route.
- Update the demo UI fetch target to the new internal API route and keep response shape compatibility (`reply`, `actions`, optional routing metadata).
- Remove hard dependency on Supabase Edge Function availability for demo chat flow.

## Capabilities

### New Capabilities
- `express-demo-chat-api-route`: First-party Next API endpoint that composes demo context and returns generated assistant reply/actions for the Express demo chat.

### Modified Capabilities
- `backend-service-boundaries`: Express demo text generation boundary changes from external Supabase Edge Function to internal Next API route ownership.

## Impact

- Affected code: `app/(dashboard)/demo/page.tsx`, new `app/api/express-demo/chat/route.ts` (or equivalent), shared context/prompt utilities under `lib/voice-backend` or `lib/express-demo-*`.
- Dependencies: direct OpenAI API usage from Next server runtime with `OPENAI_API_KEY`; no browser-side key exposure.
- APIs: deprecates use of `POST {SUPABASE_URL}/functions/v1/voice-concierge` from the app for chat text responses.
- Operations: deployment and observability for chat logic move fully into the existing Next.js application.
