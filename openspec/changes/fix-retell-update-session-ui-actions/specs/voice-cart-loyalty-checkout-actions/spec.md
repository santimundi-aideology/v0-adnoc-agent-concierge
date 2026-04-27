## ADDED Requirements

### Requirement: Flat Cart Item Actions
The system SHALL support flat Retell parameters for adding and removing catalog items.

#### Scenario: Add catalog item with SKU
- **WHEN** Retell calls `update_session_ui` with `call_id`, `sku`, and `quantity`
- **THEN** the backend validates the SKU, updates the persisted cart, and appends a System Coordination cart event.

### Requirement: Flat Loyalty Points Application
The system SHALL support flat Retell parameters for applying loyalty points to the current cart.

#### Scenario: Apply available points
- **WHEN** Retell calls `update_session_ui` with `call_id`, `points_to_use`, and payment intent
- **THEN** the backend validates Sarah's points balance, updates checkout state, and returns points used plus remaining AED balance.

### Requirement: Flat Checkout Completion
The system SHALL support flat Retell parameters for completing checkout by card, wallet, points, or mixed payment.

#### Scenario: Complete points checkout
- **WHEN** Retell calls `update_session_ui` to complete checkout for a cart that can be covered by points
- **THEN** the backend marks checkout as paid, persists the cart/checkout state, and appends a visible System Coordination checkout event.

### Requirement: No Repeated Failed Checkout Loops
The voice agent SHALL receive enough structured feedback after cart or checkout rejection to recover without repeatedly calling the same failed action.

#### Scenario: Insufficient points
- **WHEN** Retell attempts a points checkout that Sarah's balance cannot cover
- **THEN** the backend returns `ok: false`, `status: rejected`, the points shortfall or remaining AED balance, and no checkout completion event.
