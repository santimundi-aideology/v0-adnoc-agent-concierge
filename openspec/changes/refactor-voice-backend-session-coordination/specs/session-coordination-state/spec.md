## ADDED Requirements

### Requirement: Persisted Session Coordination State
The system SHALL persist active demo session coordination state, including selected profile, selected scenario, recommended station, active route, cart/order state, recommendations, agent actions, and system messages.

#### Scenario: Session starts
- **WHEN** a user starts a new Express Demo session
- **THEN** the backend creates a durable session record with the selected profile, scenario, initial station recommendation, initial route state, and initial coordination timeline.

#### Scenario: Session resumes after refresh
- **WHEN** the user refreshes the Express Demo during an active session
- **THEN** the UI can reload the latest session coordination state from the backend instead of losing state held only in React memory.

### Requirement: Immediate Coordination Visibility
The system SHALL make session changes visible in the UI immediately after they are accepted by the backend.

#### Scenario: Agent action appears under system coordination
- **WHEN** the voice agent records an action such as route change, recommendation update, cart update, loyalty action, or service reservation
- **THEN** the system coordination area displays the new action without requiring a full page reload.

#### Scenario: Backend rejects invalid action
- **WHEN** a malformed or unauthorized coordination update is submitted
- **THEN** the backend rejects it and the UI does not display it as accepted system state.

### Requirement: Ordered Coordination Timeline
The system SHALL store coordination events with deterministic ordering and enough metadata to render a reliable live timeline.

#### Scenario: Multiple updates arrive quickly
- **WHEN** several voice-agent updates arrive close together
- **THEN** the UI renders them in backend-assigned sequence order with timestamps, event type, actor, and current status.
