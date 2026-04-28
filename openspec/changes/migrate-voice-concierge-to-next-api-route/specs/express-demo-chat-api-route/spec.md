## ADDED Requirements

### Requirement: Express Demo Chat Route Ownership
The system SHALL expose an internal Next.js API endpoint for Express demo text chat generation and SHALL route dashboard chat requests to this endpoint instead of Supabase Edge Functions.

#### Scenario: Frontend sends a demo chat turn
- **WHEN** the Express demo page submits a customer message for processing
- **THEN** it calls the internal Next API route and receives a structured JSON response containing at least `reply` and `actions`.

### Requirement: Express Context Assembly for Chat Completion
The system SHALL assemble customer, profile, station, operational signals, products, promotions, and recent visit context server-side before requesting a model completion.

#### Scenario: Valid customer and station identifiers
- **WHEN** the chat route receives valid `customer_id`, `station_id`, and `message`
- **THEN** it loads required context data from Supabase, composes the prompt/messages payload, and generates a model response.

#### Scenario: Missing required identifiers
- **WHEN** the chat route request omits `customer_id`, `station_id`, or `message`
- **THEN** the route returns a client error response and does not call the model provider.

### Requirement: GPT-5.4 Nano Model Configuration
The system SHALL use `gpt-5.4-nano` as the model for Express demo text response generation in the internal chat route.

#### Scenario: Chat completion request is created
- **WHEN** the route calls the model provider for a response
- **THEN** the request includes `gpt-5.4-nano` as the configured model name.

### Requirement: Action Extraction Compatibility
The system SHALL preserve action extraction behavior from assistant text so existing UI and coordination flows continue to function without contract changes.

#### Scenario: Model reply contains actions marker
- **WHEN** a model reply includes an `[ACTIONS]:[...]` payload suffix
- **THEN** the route parses the JSON actions list, removes the suffix from the user-facing reply text, and returns both fields in the response.
