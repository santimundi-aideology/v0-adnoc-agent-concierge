## ADDED Requirements

### Requirement: Single Retell Agent Context
The system SHALL create Retell web calls through one configured voice agent and SHALL provide all profile, scenario, station, route, and session behavior through backend-built dynamic variables.

#### Scenario: Create call with selected profile context
- **WHEN** a user starts a voice session from the Express Demo with a selected profile and scenario
- **THEN** the backend creates a Retell web call for the single configured agent and includes the selected profile, scenario, station recommendation, route metadata, operational signals, visit history, and allowed agent actions in the dynamic variables.

#### Scenario: Missing profile context
- **WHEN** a call creation request references a missing or invalid profile
- **THEN** the backend rejects the call creation request with a structured error and does not start a Retell call.

### Requirement: Data-Driven Business Profiles
The system SHALL support data-driven business/customer profiles for demo behavior instead of relying on hardcoded persona-only frontend logic.

#### Scenario: Load available demo profiles
- **WHEN** the Express Demo loads
- **THEN** the system returns approximately six available business/customer profiles with persona, loyalty, preference, visit-history, and feature metadata needed by the UI and voice context builder.

#### Scenario: Profile-specific voice behavior
- **WHEN** two different profiles use the same Retell agent and scenario
- **THEN** the generated context differs enough for the voice agent to use profile-specific preferences, offers, route priorities, and service recommendations.

### Requirement: Context Refresh During Session
The system SHALL provide a backend mechanism for Retell custom functions to request the latest session context during an active voice session.

#### Scenario: Agent requests current context
- **WHEN** the voice agent invokes the context custom function during an active session
- **THEN** the backend returns the latest persisted profile, route, station, cart, recommendation, and coordination state for that session.
