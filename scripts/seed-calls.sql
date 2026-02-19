-- =============================================================
-- Seed: calls, transcript_lines, tool_events
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- =============================================================

-- ── Active calls ─────────────────────────────────────────────

INSERT INTO calls (id, caller, phone, language, station_id, intent, status, agent_state, start_time, duration, avg_latency, loyalty_id, sentiment, outcome)
VALUES
  ('CALL-1001', 'Ahmed Al Mansouri',  '+971-50-123-4567', 'AR', 'STN-001', 'Order Food',      'active',    'Speaking',       '2026-02-13T10:32:00', 184, 820,  'LYL-29384', 'positive', NULL),
  ('CALL-1002', 'Sara Khalifa',       '+971-55-987-6543', 'EN', 'STN-003', 'Book Car Wash',   'active',    'Querying DB',    '2026-02-13T10:35:00', 97,  650,  NULL,        'neutral',  NULL),
  ('CALL-1003', 'Omar Rashed',        '+971-52-555-1234', 'AR', 'STN-002', 'Quick Lube',      'active',    'Retrieving Doc', '2026-02-13T10:37:00', 62,  1100, NULL,        'neutral',  NULL),
  ('CALL-1007', 'Mohammed Tariq',     '+971-52-111-9988', 'AR', 'STN-001', 'Order Food',      'active',    'Listening',      '2026-02-13T10:40:00', 23,  450,  NULL,        'neutral',  NULL),
  ('CALL-1008', 'Layla Bin Rashid',   '+971-55-332-1100', 'EN', 'STN-004', 'EV Charge',       'ringing',   'Listening',      '2026-02-13T10:42:00', 5,   300,  NULL,        'neutral',  NULL),
  ('CALL-1009', 'Ali Hamdan',         '+971-50-888-7766', 'AR', 'STN-006', 'Loyalty Check',   'on-hold',   'Processing',     '2026-02-13T10:38:00', 45,  520,  'LYL-44210', 'neutral',  NULL)
ON CONFLICT (id) DO NOTHING;

-- ── Completed calls (show in Conversations) ─────────────────

INSERT INTO calls (id, caller, phone, language, station_id, intent, status, agent_state, start_time, duration, avg_latency, loyalty_id, sentiment, outcome)
VALUES
  ('CALL-1004', 'Omar Rashed',         '+971-56-222-8899', 'EN', 'STN-004', 'General Inquiry', 'completed', 'Confirming', '2026-02-13T10:15:00', 312, 730,  NULL,        'positive', 'First-visit welcome bundle accepted – 25 AED'),
  ('CALL-1005', 'Khaled Bin Saeed',    '+971-50-777-3344', 'AR', 'STN-005', 'EV Charge',       'completed', 'Confirming', '2026-02-13T09:50:00', 245, 900,  NULL,        'positive', 'EV charge session started – Bay 3'),
  ('CALL-1006', 'Noura Al Ketbi',      '+971-55-444-6677', 'EN', 'STN-006', 'General Inquiry', 'completed', 'Confirming', '2026-02-13T09:30:00', 189, 680,  NULL,        'neutral',  'Info provided – station hours & services'),
  ('CALL-0990', 'Abdullah Saeed',      '+971-52-900-1122', 'AR', 'STN-003', 'Order Food',      'completed', 'Confirming', '2026-02-12T14:20:00', 252, 780,  NULL,        'positive', 'Order completed – 3 items, 48 AED'),
  ('CALL-0991', 'Jennifer Adams',      '+971-56-800-3344', 'EN', 'STN-004', 'Book Car Wash',   'completed', 'Confirming', '2026-02-12T13:10:00', 165, 620,  NULL,        'positive', 'Car wash booked 14:00 – Premium'),
  ('CALL-0992', 'Rashid Al Maktoum',   '+971-50-700-5566', 'AR', 'STN-001', 'Quick Lube',      'completed', 'Confirming', '2026-02-12T11:45:00', 330, 950,  NULL,        'neutral',  'Lube service booked – 10:30 slot'),
  ('CALL-0993', 'Maria Santos',        '+971-55-600-7788', 'EN', 'STN-002', 'EV Charge',       'completed', 'Confirming', '2026-02-12T10:05:00', 115, 550,  NULL,        'positive', 'EV charge started – DC Fast 50kW'),
  ('CALL-0994', 'Hassan Mirza',        '+971-52-500-9900', 'AR', 'STN-005', 'General Inquiry', 'completed', 'Confirming', '2026-02-11T15:30:00', 200, 710,  NULL,        'neutral',  'Info provided – opening hours'),
  ('CALL-0995', 'Emily Chen',          '+971-56-400-2211', 'EN', 'STN-006', 'Loyalty Check',   'completed', 'Confirming', '2026-02-11T14:20:00', 130, 640,  'LYL-55889', 'positive', 'Balance: 2,450 pts – Gold tier'),
  ('CALL-0996', 'Yousef Al Kaabi',     '+971-50-300-4433', 'AR', 'STN-003', 'Order Food',      'completed', 'Confirming', '2026-02-11T12:50:00', 228, 810,  NULL,        'positive', 'Order completed – 2 items, 33 AED'),
  ('CALL-0997', 'Priya Nair',          '+971-55-200-6655', 'EN', 'STN-001', 'Book Car Wash',   'dropped',   'Confirming', '2026-02-10T16:10:00', 142, 1200, NULL,        'negative', 'Escalated to human – slot conflict'),
  ('CALL-0998', 'Saif Al Nuaimi',      '+971-52-100-8877', 'AR', 'STN-002', 'Order Food',      'completed', 'Confirming', '2026-02-10T11:25:00', 195, 690,  'LYL-33012', 'positive', 'Order completed – bundle discount applied'),
  ('CALL-0999', 'Rachel Thompson',     '+971-56-999-0011', 'EN', 'STN-004', 'Quick Lube',      'completed', 'Confirming', '2026-02-10T09:40:00', 280, 870,  NULL,        'neutral',  'Lube + filter replacement booked'),
  ('CALL-0988', 'Maryam Al Hashimi',   '+971-50-888-2233', 'AR', 'STN-005', 'Order Food',      'completed', 'Confirming', '2026-02-09T16:30:00', 210, 750,  NULL,        'positive', 'Order completed – coffee + croissant bundle'),
  ('CALL-0987', 'David Park',          '+971-55-777-4455', 'EN', 'STN-003', 'EV Charge',       'completed', 'Confirming', '2026-02-09T14:15:00', 175, 580,  NULL,        'positive', 'EV charge completed – 42 kWh delivered'),
  ('CALL-0986', 'Aisha Bin Zayed',     '+971-52-666-6677', 'AR', 'STN-006', 'Loyalty Check',   'completed', 'Confirming', '2026-02-09T10:00:00', 98,  490,  'LYL-20145', 'positive', 'Reward redeemed – free car wash voucher'),
  ('CALL-0985', 'Tom Wilson',          '+971-56-555-8899', 'EN', 'STN-001', 'General Inquiry', 'completed', 'Confirming', '2026-02-08T15:45:00', 155, 720,  NULL,        'neutral',  'Info provided – EV charger availability'),
  ('CALL-0984', 'Hind Al Shamsi',      '+971-50-444-0011', 'AR', 'STN-002', 'Book Car Wash',   'completed', 'Confirming', '2026-02-08T13:20:00', 180, 660,  NULL,        'positive', 'Car wash booked 15:30 – Deluxe package'),
  ('CALL-0983', 'James Miller',        '+971-55-333-2233', 'EN', 'STN-004', 'Order Food',      'dropped',   'Confirming', '2026-02-08T11:10:00', 88,  1350, NULL,        'negative', 'Call dropped – network timeout'),
  ('CALL-0982', 'Salma Khalid',        '+971-52-222-4455', 'AR', 'STN-003', 'Quick Lube',      'completed', 'Confirming', '2026-02-07T14:50:00', 305, 920,  NULL,        'neutral',  'Full service lube booked – tomorrow 09:00')
ON CONFLICT (id) DO NOTHING;

-- ── Transcript lines for CALL-1001 ──────────────────────────

INSERT INTO transcript_lines (call_id, speaker, text, timestamp)
VALUES
  ('CALL-1001', 'System',   'Call connected. Station: Al Raha Beach. Language: Arabic.',                                                                '10:32:00'),
  ('CALL-1001', 'Agent',    'Marhaba! Welcome to ADNOC Al Raha Beach station. How can I help you today?',                                               '10:32:02'),
  ('CALL-1001', 'Customer', 'Hi, I''d like to order some coffee and maybe a snack for pickup.',                                                          '10:32:08'),
  ('CALL-1001', 'Agent',    'Of course! Let me check what''s available at your station right now.',                                                       '10:32:12'),
  ('CALL-1001', 'System',   '[SQL Query: SELECT * FROM inventory WHERE station_id=''STN-001'' AND category IN (''Beverages'',''Snacks'') AND stock > 0]', '10:32:13'),
  ('CALL-1001', 'Agent',    'Great news! We have Arabic Coffee (Large) for 12 AED and Cappuccino for 15 AED. For snacks, there''s our popular Zaatar Croissant at 8 AED or a Chicken Shawarma Wrap at 18 AED.', '10:32:15'),
  ('CALL-1001', 'Customer', 'I''ll take a large Arabic Coffee and the Zaatar Croissant please.',                                                         '10:32:22'),
  ('CALL-1001', 'System',   '[RAG Retrieval: Checking active promotions and bundle eligibility]',                                                        '10:32:23'),
  ('CALL-1001', 'Agent',    'Excellent choice! I see you''re eligible for our Coffee + Croissant Bundle promotion – that''s 20% off the combo! Your total would be 16 AED instead of 20 AED.', '10:32:25'),
  ('CALL-1001', 'Customer', 'That sounds great, go ahead with the bundle.',                                                                              '10:32:30'),
  ('CALL-1001', 'Agent',    'Perfect! I''ve applied the bundle discount. Would you also like to add an Express Car Wash while you''re here? It''s only 35 AED and we have slots available.', '10:32:33')
ON CONFLICT DO NOTHING;

-- ── Transcript lines for CALL-1004 ──────────────────────────

INSERT INTO transcript_lines (call_id, speaker, text, timestamp)
VALUES
  ('CALL-1004', 'System',   'Call connected. Station: Jumeirah Village. Language: English.',                '10:15:00'),
  ('CALL-1004', 'Agent',    'Hello! Welcome to ADNOC Jumeirah Village. How may I assist you today?',       '10:15:02'),
  ('CALL-1004', 'Customer', 'Hi, I want to check my loyalty points balance.',                               '10:15:06'),
  ('CALL-1004', 'Agent',    'Of course! Can I have your loyalty card number or registered phone number?',   '10:15:09'),
  ('CALL-1004', 'Customer', 'My loyalty ID is LYL-10293.',                                                  '10:15:14'),
  ('CALL-1004', 'System',   '[SQL Query: SELECT * FROM loyalty_members WHERE id=''LYL-10293'']',           '10:15:15'),
  ('CALL-1004', 'Agent',    'Welcome to ADNOC Express. It helps you plan your stop quickly and delivers selected items to your car.', '10:15:18'),
  ('CALL-1004', 'Customer', 'Great, can I redeem some for a car wash?',                                     '10:15:25'),
  ('CALL-1004', 'Agent',    'Yes! An Express Car Wash is 500 points. Shall I redeem that for you?',        '10:15:28'),
  ('CALL-1004', 'Customer', 'Yes please.',                                                                  '10:15:32'),
  ('CALL-1004', 'Agent',    'Done! Your new balance is 2,700 points. You''ll receive a voucher code via SMS. Is there anything else?', '10:15:36'),
  ('CALL-1004', 'Customer', 'No, that''s all. Thanks!',                                                     '10:15:40'),
  ('CALL-1004', 'Agent',    'Great choice, Omar. Your welcome bundle is confirmed and can be delivered to your car on arrival.', '10:15:43')
ON CONFLICT DO NOTHING;

-- ── Tool events for CALL-1001 ───────────────────────────────

INSERT INTO tool_events (id, call_id, type, title, timestamp, latency, status, details)
VALUES
  ('EVT-001', 'CALL-1001', 'sql',       'Inventory Lookup',          '10:32:13', 320, 'success', '{"query":"SELECT sku, name, price, stock FROM inventory WHERE station_id=''STN-001'' AND category IN (''Beverages'',''Snacks'') AND stock > 0","rows_returned":5}'),
  ('EVT-002', 'CALL-1001', 'rag',       'Promotion Eligibility',     '10:32:23', 480, 'success', '{"query":"Active promotions for Coffee + Snack bundle","chunks_retrieved":2,"doc":"ADNOC_Promotions_Guide_2026.pdf"}'),
  ('EVT-003', 'CALL-1001', 'guardrail', 'Price Confirmation Check',  '10:32:24', 45,  'success', '{"check":"Verify discount calculation","result":"Original: 20 AED, Discount: 20%, Final: 16 AED - CORRECT"}')
ON CONFLICT (id) DO NOTHING;

-- ── Tool events for CALL-1004 ───────────────────────────────

INSERT INTO tool_events (id, call_id, type, title, timestamp, latency, status, details)
VALUES
  ('EVT-010', 'CALL-1004', 'rag',    'First-Visit Offer Lookup',  '10:15:15', 290, 'success', '{"query":"first visit welcome bundle","result":{"bundle":"coffee + snack","price_aed":25}}'),
  ('EVT-011', 'CALL-1004', 'action', 'Create Welcome Order',      '10:15:33', 380, 'success', '{"action":"create_order","order_type":"welcome_bundle","total":25}'),
  ('EVT-012', 'CALL-1004', 'action', 'Send Pickup SMS',           '10:15:35', 620, 'success', '{"action":"send_sms","phone":"+971-56-222-8899","content":"Welcome bundle confirmed. Delivery to car is enabled."}')
ON CONFLICT (id) DO NOTHING;

-- ── Tool events for CALL-1002 ───────────────────────────────

INSERT INTO tool_events (id, call_id, type, title, timestamp, latency, status, details)
VALUES
  ('EVT-020', 'CALL-1002', 'sql', 'Time Slot Query',             '10:35:05', 310, 'success', '{"query":"SELECT time, available FROM time_slots WHERE station_id=''STN-003'' AND service=''car_wash''","rows_returned":6}'),
  ('EVT-021', 'CALL-1002', 'sql', 'Vehicle Type Lookup',         '10:35:12', 180, 'success', '{"query":"SELECT * FROM car_wash_packages WHERE vehicle_type=''sedan''","rows_returned":3}')
ON CONFLICT (id) DO NOTHING;

-- ── Tool events for CALL-0990 ───────────────────────────────

INSERT INTO tool_events (id, call_id, type, title, timestamp, latency, status, details)
VALUES
  ('EVT-030', 'CALL-0990', 'sql',       'Menu Lookup',           '14:20:08', 340, 'success', '{"query":"SELECT * FROM products WHERE category IN (''Beverages'',''Snacks'')","rows_returned":5}'),
  ('EVT-031', 'CALL-0990', 'rag',       'Promotion Check',       '14:20:15', 420, 'success', '{"query":"Bundle promotions available","chunks_retrieved":1}'),
  ('EVT-032', 'CALL-0990', 'guardrail', 'Order Total Validation', '14:20:22', 35, 'success', '{"check":"Verify total calculation","result":"3 items totalling 48 AED - CORRECT"}'),
  ('EVT-033', 'CALL-0990', 'action',    'Create Order',          '14:20:28', 250, 'success', '{"action":"create_order","order_id":"ORD-8891","total":48}'),
  ('EVT-034', 'CALL-0990', 'action',    'Send Payment Link',     '14:20:30', 780, 'success', '{"action":"send_sms_payment_link","phone":"+971-52-900-1122","amount":48}')
ON CONFLICT (id) DO NOTHING;

-- Done! You should now see data in Live Calls and Conversations.
