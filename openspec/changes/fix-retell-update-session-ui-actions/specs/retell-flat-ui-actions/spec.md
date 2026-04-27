## ADDED Requirements

### Requirement: Flat Retell UI Action Contract
The system SHALL expose `update_session_ui` with a Retell-friendly flat parameter contract for common UI updates.

#### Scenario: Retell submits route fields
- **WHEN** Retell calls `update_session_ui` with `call_id`, `active_station_id`, optional `eta_minutes`, and optional `reason`
- **THEN** the backend accepts the request as a route update without requiring nested `payload` or generated origin coordinates.

### Requirement: Backwards-Compatible Nested Action Handling
The system SHALL continue accepting the existing nested `action_type + payload` shape during the migration to flat parameters.

#### Scenario: Existing nested action submitted
- **WHEN** Retell or existing code calls `update_session_ui` with `action_type` and `payload`
- **THEN** the backend maps the nested request into the same validated action path used by flat parameters.

### Requirement: Retell-Friendly Rejections
The system SHALL return structured rejection responses with HTTP 200 for invalid or incomplete `update_session_ui` requests.

#### Scenario: Missing required route fields
- **WHEN** Retell calls `update_session_ui` without enough fields to determine an action
- **THEN** the response includes `ok: false`, `status: rejected`, a clear error message, and no durable session mutation.

### Requirement: Deterministic Action Validation
The system SHALL validate action fields before mutating state.

#### Scenario: Unknown station submitted
- **WHEN** Retell submits an `active_station_id` that does not match a known station
- **THEN** the backend rejects the action and returns a structured error without changing the active route or System Coordination timeline.
