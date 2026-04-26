## ADDED Requirements

### Requirement: UI Update Custom Function
The system SHALL expose an `update_session_ui` Retell custom function that lets Sarah's voice agent update persisted demo UI state during the call.

#### Scenario: Agent changes recommendation
- **WHEN** the voice agent decides to switch the recommended station or active route
- **THEN** it calls `update_session_ui` with a structured station/route action and the frontend reflects the accepted change in the map, selected station, and System Coordination.

### Requirement: Supported UI Actions
The `update_session_ui` function SHALL support structured actions for station recommendation, route change, cart item add/remove/set, service reservation, loyalty points application, checkout completion, and coordination notes.

#### Scenario: Agent reserves interior cleaning
- **WHEN** Sarah accepts an interior cleaning offer during charging
- **THEN** the voice agent calls `update_session_ui` with a service reservation action and the backend persists the reservation state plus a System Coordination event.

### Requirement: Action Validation
The system SHALL validate all `update_session_ui` actions before mutating state.

#### Scenario: Invalid SKU submitted
- **WHEN** the voice agent submits an add-cart action for an unknown SKU
- **THEN** the backend rejects the action and returns a structured error without changing cart or checkout state.

### Requirement: Immediate System Coordination Reflection
Every accepted `update_session_ui` action SHALL create a System Coordination event visible in the Express Demo without a full page reload.

#### Scenario: Points applied
- **WHEN** the voice agent applies loyalty points to checkout
- **THEN** the System Coordination panel shows the loyalty redemption event with points used, remaining AED balance, and checkout status.

### Requirement: Updated Context Returned
The `update_session_ui` function SHALL return the updated session context after accepting or rejecting an action.

#### Scenario: Agent continues after update
- **WHEN** the voice agent updates cart, station, route, or checkout state
- **THEN** the function response includes enough updated context for the agent to immediately answer Sarah naturally in the same turn.
