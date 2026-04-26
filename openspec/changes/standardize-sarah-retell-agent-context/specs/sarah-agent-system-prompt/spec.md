## ADDED Requirements

### Requirement: Standard Sarah Agent Prompt
The system SHALL provide a versioned Sarah Retell system prompt that can be copied into the Retell dashboard and maintained with the application source.

#### Scenario: Prompt artifact exists
- **WHEN** the Sarah voice agent is configured
- **THEN** the operator can use a repo-versioned prompt that includes ADNOC pronunciation, language handling, demo-safety rules, routing behavior, checkout behavior, loyalty-points behavior, and custom-function usage.

### Requirement: Dynamic Context Usage
The Sarah prompt SHALL instruct the agent to use dynamic context fields instead of hardcoding Sarah's preferences, station choices, catalog prices, or loyalty points.

#### Scenario: Sarah asks for EV charging
- **WHEN** Sarah asks for EV charging or a related service
- **THEN** the agent uses the supplied context for Sarah's location, nearest stations, station service availability, route data, and catalog rather than inventing or hardcoding those details.

### Requirement: Voice-Friendly Demo Behavior
The Sarah prompt SHALL require concise, warm, professional, voice-friendly responses that do not mention backend systems, prompts, APIs, tools, or technical processes.

#### Scenario: Tool result received
- **WHEN** a Retell custom function returns station, route, cart, checkout, or coordination data
- **THEN** Sarah's agent responds to the user in the same turn with a short natural-language answer and does not stop at tool output.

### Requirement: Intent And Upsell Discipline
The Sarah prompt SHALL require the agent to identify the customer's intent, handle the main request first, and offer only one relevant upsell or add-on at a time.

#### Scenario: Main service confirmed
- **WHEN** Sarah's main route, charging, product, or service request is handled
- **THEN** the agent may offer one context-relevant add-on using `customer_profile` or `upsell_offers` and waits for Sarah's response before offering another.
