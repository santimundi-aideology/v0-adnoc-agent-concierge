## MODIFIED Requirements

### Requirement: Thin API Route Handlers
The system SHALL keep Next.js API route handlers thin by delegating Retell, profile context, route metrics, transcript, session coordination, call persistence, and Express demo chat orchestration logic to service modules.

#### Scenario: Retell create-call route
- **WHEN** `/api/retell/create-call` handles a request
- **THEN** the route validates input, delegates context construction and Retell web-call creation to services, and returns a structured response without embedding business logic directly in the route.

#### Scenario: Express demo chat route
- **WHEN** `/api/express-demo/chat` handles a request
- **THEN** the route validates payload shape, delegates context/prompt/model orchestration to backend services, and returns structured chat output without embedding cross-domain business logic directly in the route.
