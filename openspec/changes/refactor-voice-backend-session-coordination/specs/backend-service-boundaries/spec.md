## ADDED Requirements

### Requirement: Thin API Route Handlers
The system SHALL keep Next.js API route handlers thin by delegating Retell, profile context, route metrics, transcript, session coordination, and call persistence logic to service modules.

#### Scenario: Retell create-call route
- **WHEN** `/api/retell/create-call` handles a request
- **THEN** the route validates input, delegates context construction and Retell web-call creation to services, and returns a structured response without embedding business logic directly in the route.

### Requirement: Validated Backend Action Contracts
The system SHALL validate all backend actions initiated by Retell custom functions or the frontend before mutating durable session state.

#### Scenario: Valid voice-agent action
- **WHEN** the voice agent submits a supported structured action
- **THEN** the backend validates the payload, persists the mutation, records a coordination event, and returns updated session context.

#### Scenario: Unsupported voice-agent action
- **WHEN** the voice agent submits an unsupported action type or invalid payload
- **THEN** the backend rejects the action with a structured error and does not mutate session state.

### Requirement: Backend Observability for Demo-Critical Flows
The system SHALL expose enough structured logging and error information to diagnose Retell call creation, webhook ingestion, route updates, transcript persistence, and session coordination failures.

#### Scenario: Retell webhook parse issue
- **WHEN** the backend receives an unknown or partially supported Retell webhook payload
- **THEN** it logs a safe structured summary of payload shape and returns a controlled response without crashing the route.

### Requirement: Existing Frontend Compatibility
The system SHALL preserve existing frontend routes and visual behavior while backend contracts are refactored.

#### Scenario: Backend refactor complete
- **WHEN** the backend refactor is implemented
- **THEN** the existing dashboard, Express Demo, live calls, conversations, document search, manager, analytics, and settings pages remain available with their current visual structure.
