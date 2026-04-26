## ADDED Requirements

### Requirement: Complete Startup Context
The system SHALL send Sarah's Retell call a complete startup context payload with customer, scenario, station, route, catalog, loyalty, cart, checkout, and allowed-action data.

#### Scenario: Sarah call starts
- **WHEN** the Express Demo starts a Sarah Retell call
- **THEN** the dynamic variables include a compact JSON context containing Sarah's identity, customer ID, display name, language, loyalty tier, points balance, location, selected scenario, primary station, nearest stations, full station catalog, catalog items, upsell offers, cart state, checkout state, and allowed UI actions.

### Requirement: Station Context Availability
The context payload SHALL include nearest station context and the full station catalog so the voice agent can compare services such as EV charging without doing external discovery.

#### Scenario: Nearest EV station needed
- **WHEN** Sarah asks for a nearby station with EV charging
- **THEN** the voice agent can answer using supplied `nearest_three` and `stations_catalog` data without inventing stations or asking the backend to search from scratch.

### Requirement: Context Refresh Function
The system SHALL expose a `get_demo_context` custom function that returns the latest persisted context for the active session.

#### Scenario: Agent needs fresh state
- **WHEN** Sarah's agent needs current station, route, cart, checkout, loyalty, catalog, or coordination state during a call
- **THEN** it can call `get_demo_context` with `session_id` and receive the latest backend state.

### Requirement: Context Size Control
The system SHALL keep the Retell context payload compact enough for reliable voice-agent use while preserving all fields needed for routing, catalog, and checkout.

#### Scenario: Full station catalog included
- **WHEN** the backend includes all demo stations in context
- **THEN** each station entry contains only useful fields such as station ID, station name, city, coordinates, services, facilities, EV availability, car-care options, F&B options, approach traffic, and distance/ETA where available.
