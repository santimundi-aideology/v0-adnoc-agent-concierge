## ADDED Requirements

### Requirement: Document Search Agent Route Availability
The system SHALL provide a stable internal API route for Document Search Agent queries and SHALL ensure frontend requests are sent to that route.

#### Scenario: User submits a document-search query
- **WHEN** a user sends a query from the Document Search Agent page
- **THEN** the frontend sends the request to the configured internal API route and receives a structured JSON response.

### Requirement: Request Validation and Structured Errors
The document-search API route SHALL validate required inputs and return structured client errors when input is invalid.

#### Scenario: Missing query input
- **WHEN** a document-search request omits the required `query` input
- **THEN** the route returns a client error response with a machine-readable error payload and does not run retrieval/model calls.

### Requirement: Server-Side Retrieval and Model Orchestration
The document-search API route SHALL execute retrieval and model orchestration server-side and keep provider credentials out of client code.

#### Scenario: Valid retrieval request
- **WHEN** a valid query request is received
- **THEN** the route performs retrieval/model operations on the server and returns a successful response payload containing result content.

### Requirement: Provider-Unavailable Fallback Behavior
The document-search route SHALL return a controlled fallback response when required provider configuration is unavailable.

#### Scenario: Missing provider API key
- **WHEN** the route is invoked and required provider configuration is missing
- **THEN** the route returns a non-crashing fallback response that clearly indicates configuration is unavailable.
