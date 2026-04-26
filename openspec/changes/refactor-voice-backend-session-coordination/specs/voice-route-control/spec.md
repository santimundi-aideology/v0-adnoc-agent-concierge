## ADDED Requirements

### Requirement: Voice-Controlled Route Updates
The system SHALL allow the voice agent to update the active route, destination station, and route metadata through a validated backend action.

#### Scenario: Agent changes destination station
- **WHEN** the voice agent selects a different recommended station during a session
- **THEN** the backend validates the station, recomputes or retrieves route metrics, persists the active route change, and returns the updated route state.

#### Scenario: Invalid route destination
- **WHEN** the voice agent submits a route update for an unknown station or invalid coordinates
- **THEN** the backend rejects the route update and preserves the previous active route.

### Requirement: Google Route Rendering Contract
The system SHALL expose active route state in a frontend-friendly format that can update the Google Maps route preview or equivalent map display.

#### Scenario: Route state changes
- **WHEN** the persisted active route changes during an Express Demo session
- **THEN** the frontend receives or fetches route preview data, destination details, ETA, distance, and source metadata needed to update the map display.

#### Scenario: Google Directions unavailable
- **WHEN** Google Directions fails or is not available for a route update
- **THEN** the backend stores a fallback route state with a clear source value and does not break the active voice session.

### Requirement: Route Changes Are Coordination Events
The system SHALL record accepted route changes as system coordination events.

#### Scenario: Accepted route update
- **WHEN** the backend accepts a route update from the voice agent
- **THEN** the system coordination timeline includes the previous destination, new destination, ETA, distance, and reason when provided.
