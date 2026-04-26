## ADDED Requirements

### Requirement: Demo Catalog With Points Prices
The system SHALL provide a demo catalog of roughly 30 purchasable products and services with AED prices and loyalty-points prices.

#### Scenario: Catalog sent to Sarah agent
- **WHEN** Sarah's voice session starts or refreshes context
- **THEN** the context includes catalog items with SKU, name, category, AED price, points price, availability, and service/station constraints when applicable.

### Requirement: Catalog Coverage
The demo catalog SHALL cover coffee, hot drinks, cold drinks, food, snacks, EV-adjacent dwell-time offers, car wash, interior cleaning, quick lube, tire/AC checks, and other service reservations relevant to ADNOC Express.

#### Scenario: Sarah asks for coffee and car care
- **WHEN** Sarah asks about coffee, snacks, car wash, or interior cleaning during charging
- **THEN** the voice agent can choose from catalog items that include prices in both AED and points.

### Requirement: Loyalty Balance In Context
The system SHALL include Sarah's loyalty points balance and redemption rules in the context payload.

#### Scenario: Sarah asks to pay with points
- **WHEN** Sarah asks to use loyalty points at checkout
- **THEN** the agent can determine whether her points balance covers the selected cart and can state the points used, benefit, and any remaining AED balance.

### Requirement: Checkout State Persistence
The system SHALL persist cart and checkout state when the agent adds items, reserves services, applies loyalty points, or completes payment.

#### Scenario: Checkout completed with points
- **WHEN** Sarah confirms checkout with loyalty points
- **THEN** the backend records selected items/services, AED total, points total, points redeemed, remaining AED balance, payment method, and a completion summary visible in System Coordination.

### Requirement: No Invented Pricing
The voice agent SHALL NOT invent prices, points values, or loyalty balances outside the supplied catalog and loyalty context.

#### Scenario: Unknown item requested
- **WHEN** Sarah asks for an item not present in the catalog
- **THEN** the agent offers the nearest catalog alternative or says what is available without fabricating a price.
