## ADDED Requirements

### Requirement: Durable Transcript Storage
The system SHALL persist Retell transcript lines in Supabase and SHALL NOT use process-local memory as the source of truth for live or historical transcripts.

#### Scenario: Webhook transcript event received
- **WHEN** Retell sends a webhook containing transcript content for a call
- **THEN** the backend normalizes and stores transcript lines with call ID, speaker, text, timestamp, sequence number, source, and creation time.

#### Scenario: Live call detail opens
- **WHEN** a user opens a live call detail page
- **THEN** the page loads transcript lines from durable storage and can continue receiving new lines during the session.

### Requirement: Transcript Speaker Normalization
The system SHALL normalize Retell transcript speakers into `customer`, `agent`, or `system`.

#### Scenario: Retell role variants
- **WHEN** a transcript payload uses role values such as user, human, assistant, agent, or system
- **THEN** the backend maps each line to the normalized speaker value before storage.

### Requirement: Transcript Deduplication
The system SHALL deduplicate repeated partial/final transcript entries from client events and webhook payloads.

#### Scenario: Duplicate transcript update
- **WHEN** Retell sends the same transcript segment more than once
- **THEN** the backend stores only one durable transcript line for that segment while preserving legitimate later revisions or new lines.

### Requirement: Live Feedback and Durable Truth
The system SHALL support immediate live transcript feedback from Retell client events while treating webhook-persisted transcript data as the durable source of truth.

#### Scenario: Browser receives live transcript first
- **WHEN** the browser receives a Retell live transcript update before the webhook is persisted
- **THEN** the UI can show the line optimistically and later reconcile with the persisted transcript without displaying duplicate messages.
