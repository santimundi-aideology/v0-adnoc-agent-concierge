## ADDED Requirements

### Requirement: Voice Route Update Persistence
The system SHALL persist route changes requested through `update_session_ui` to the active demo session.

#### Scenario: Agent selects next EV station
- **WHEN** Sarah asks to go to the next station and Retell calls `update_session_ui` with `call_id` and `active_station_id`
- **THEN** the backend validates the station, computes or refreshes route state, and stores the station and route as the active session route.

### Requirement: Google Maps Route Preview Sync
The Express Demo SHALL update the Google Maps route preview when a voice route update is accepted.

#### Scenario: Active route changes
- **WHEN** the backend persists a new active route for the current voice session
- **THEN** the Express Demo changes the highlighted station and Google Maps route preview without requiring a full page reload.

### Requirement: Route Coordination Event
Every accepted voice route update SHALL append a clear System Coordination event.

#### Scenario: Route changed to alternate station
- **WHEN** the agent changes the route from one station to another
- **THEN** System Coordination shows a route-change event with the destination station name, reason, ETA or distance when available, and timestamp.

### Requirement: Backend-Derived Route Origin
The backend SHALL derive route origin from persisted session/profile context when Retell does not provide origin coordinates.

#### Scenario: Retell omits origin
- **WHEN** `update_session_ui` receives a valid `call_id` and `active_station_id` but no origin
- **THEN** the backend uses the active session customer location to compute the route update.
