-- =============================================================
-- Migration + Seed: Enriched ADNOC Station Data
-- Tables: station_sales, station_loyalty, station_ev_sessions,
--         station_hse
-- Run in Supabase SQL Editor (Dashboard → SQL Editor)
-- =============================================================

-- ══════════════════════════════════════════════════════════════
-- 1. STATION SALES (SKU-level daily sales by station + daypart)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS station_sales (
  id            SERIAL PRIMARY KEY,
  station_id    TEXT NOT NULL REFERENCES stations(id),
  date          DATE NOT NULL DEFAULT CURRENT_DATE,
  daypart       TEXT NOT NULL CHECK (daypart IN ('morning','afternoon','evening')),
  sku           TEXT NOT NULL,
  product_name  TEXT NOT NULL,
  category      TEXT NOT NULL,
  qty_sold      INT NOT NULL DEFAULT 0,
  revenue       NUMERIC(12,2) NOT NULL DEFAULT 0,
  cost          NUMERIC(12,2) NOT NULL DEFAULT 0,
  margin        NUMERIC(12,2) GENERATED ALWAYS AS (revenue - cost) STORED
);

ALTER TABLE station_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read station_sales" ON station_sales
  FOR SELECT TO authenticated USING (true);

-- Seed: ~6 stations × 3 dayparts × ~5 SKUs = ~90 rows
INSERT INTO station_sales (station_id, date, daypart, sku, product_name, category, qty_sold, revenue, cost) VALUES
-- STN-001 Al Raha Beach
('STN-001','2026-02-13','morning','COF-001','Arabic Coffee (Large)','Beverages',38,456,190),
('STN-001','2026-02-13','morning','SNK-001','Zaatar Croissant','Snacks',25,200,100),
('STN-001','2026-02-13','morning','COF-002','Cappuccino (Regular)','Beverages',18,270,108),
('STN-001','2026-02-13','afternoon','SNK-002','Chicken Shawarma Wrap','Snacks',22,396,176),
('STN-001','2026-02-13','afternoon','COF-001','Arabic Coffee (Large)','Beverages',15,180,75),
('STN-001','2026-02-13','afternoon','WAS-001','Express Car Wash','Services',12,420,168),
('STN-001','2026-02-13','evening','SNK-003','Mixed Nuts Pack','Snacks',30,300,150),
('STN-001','2026-02-13','evening','LUB-001','Quick Lube Change','Services',5,600,300),
('STN-001','2026-02-13','evening','EV-001','EV Fast Charge (30 min)','Services',8,200,80),
-- STN-002 Khalifa City A
('STN-002','2026-02-13','morning','COF-001','Arabic Coffee (Large)','Beverages',32,384,160),
('STN-002','2026-02-13','morning','COF-002','Cappuccino (Regular)','Beverages',14,210,84),
('STN-002','2026-02-13','morning','SNK-001','Zaatar Croissant','Snacks',20,160,80),
('STN-002','2026-02-13','afternoon','SNK-002','Chicken Shawarma Wrap','Snacks',18,324,144),
('STN-002','2026-02-13','afternoon','WAS-002','Premium Car Wash + Wax','Services',8,520,208),
('STN-002','2026-02-13','afternoon','LUB-001','Quick Lube Change','Services',4,480,240),
('STN-002','2026-02-13','evening','SNK-003','Mixed Nuts Pack','Snacks',22,220,110),
('STN-002','2026-02-13','evening','EV-001','EV Fast Charge (30 min)','Services',6,150,60),
-- STN-003 Dubai Marina
('STN-003','2026-02-13','morning','COF-001','Arabic Coffee (Large)','Beverages',45,540,225),
('STN-003','2026-02-13','morning','COF-002','Cappuccino (Regular)','Beverages',35,525,210),
('STN-003','2026-02-13','morning','SNK-001','Zaatar Croissant','Snacks',28,224,112),
('STN-003','2026-02-13','afternoon','SNK-002','Chicken Shawarma Wrap','Snacks',30,540,240),
('STN-003','2026-02-13','afternoon','COF-001','Arabic Coffee (Large)','Beverages',20,240,100),
('STN-003','2026-02-13','afternoon','WAS-001','Express Car Wash','Services',15,525,210),
('STN-003','2026-02-13','afternoon','WAS-002','Premium Car Wash + Wax','Services',10,650,260),
('STN-003','2026-02-13','evening','SNK-003','Mixed Nuts Pack','Snacks',35,350,175),
('STN-003','2026-02-13','evening','EV-001','EV Fast Charge (30 min)','Services',14,350,140),
('STN-003','2026-02-13','evening','LUB-001','Quick Lube Change','Services',7,840,420),
-- STN-004 Jumeirah Village
('STN-004','2026-02-13','morning','COF-001','Arabic Coffee (Large)','Beverages',28,336,140),
('STN-004','2026-02-13','morning','SNK-001','Zaatar Croissant','Snacks',15,120,60),
('STN-004','2026-02-13','afternoon','SNK-002','Chicken Shawarma Wrap','Snacks',16,288,128),
('STN-004','2026-02-13','afternoon','WAS-001','Express Car Wash','Services',9,315,126),
('STN-004','2026-02-13','evening','COF-002','Cappuccino (Regular)','Beverages',12,180,72),
('STN-004','2026-02-13','evening','SNK-003','Mixed Nuts Pack','Snacks',18,180,90),
('STN-004','2026-02-13','evening','EV-001','EV Fast Charge (30 min)','Services',10,250,100),
-- STN-005 Sharjah Industrial
('STN-005','2026-02-13','morning','COF-001','Arabic Coffee (Large)','Beverages',22,264,110),
('STN-005','2026-02-13','morning','SNK-001','Zaatar Croissant','Snacks',12,96,48),
('STN-005','2026-02-13','afternoon','SNK-002','Chicken Shawarma Wrap','Snacks',14,252,112),
('STN-005','2026-02-13','afternoon','LUB-001','Quick Lube Change','Services',6,720,360),
('STN-005','2026-02-13','afternoon','WAS-001','Express Car Wash','Services',8,280,112),
('STN-005','2026-02-13','evening','SNK-003','Mixed Nuts Pack','Snacks',15,150,75),
-- STN-006 Al Ain Central
('STN-006','2026-02-13','morning','COF-001','Arabic Coffee (Large)','Beverages',18,216,90),
('STN-006','2026-02-13','morning','SNK-001','Zaatar Croissant','Snacks',10,80,40),
('STN-006','2026-02-13','afternoon','SNK-002','Chicken Shawarma Wrap','Snacks',11,198,88),
('STN-006','2026-02-13','afternoon','WAS-002','Premium Car Wash + Wax','Services',5,325,130),
('STN-006','2026-02-13','evening','COF-002','Cappuccino (Regular)','Beverages',8,120,48),
('STN-006','2026-02-13','evening','SNK-003','Mixed Nuts Pack','Snacks',12,120,60),
('STN-006','2026-02-13','evening','EV-001','EV Fast Charge (30 min)','Services',3,75,30)
ON CONFLICT DO NOTHING;

-- ══════════════════════════════════════════════════════════════
-- 2. STATION LOYALTY (aggregated loyalty metrics per station)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS station_loyalty (
  id              SERIAL PRIMARY KEY,
  station_id      TEXT NOT NULL REFERENCES stations(id),
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  active_members  INT NOT NULL DEFAULT 0,
  new_signups     INT NOT NULL DEFAULT 0,
  points_earned   INT NOT NULL DEFAULT 0,
  points_redeemed INT NOT NULL DEFAULT 0,
  redemption_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  avg_basket_aed  NUMERIC(8,2) NOT NULL DEFAULT 0,
  tier_gold       INT NOT NULL DEFAULT 0,
  tier_silver     INT NOT NULL DEFAULT 0,
  tier_bronze     INT NOT NULL DEFAULT 0
);

ALTER TABLE station_loyalty ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read station_loyalty" ON station_loyalty
  FOR SELECT TO authenticated USING (true);

INSERT INTO station_loyalty (station_id, date, active_members, new_signups, points_earned, points_redeemed, redemption_rate, avg_basket_aed, tier_gold, tier_silver, tier_bronze) VALUES
('STN-001','2026-02-13',1240,18,62000,28400,45.8,32.50,180,420,640),
('STN-002','2026-02-13',980,12,48200,19800,41.1,28.70,120,310,550),
('STN-003','2026-02-13',1850,32,94500,48200,51.0,38.20,310,580,960),
('STN-004','2026-02-13',890,9,41800,16500,39.5,26.80,95,265,530),
('STN-005','2026-02-13',720,7,33600,11200,33.3,24.10,68,210,442),
('STN-006','2026-02-13',650,5,28900,10100,34.9,22.40,52,185,413)
ON CONFLICT DO NOTHING;

-- ══════════════════════════════════════════════════════════════
-- 3. STATION EV SESSIONS (charger utilization per station)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS station_ev_sessions (
  id              SERIAL PRIMARY KEY,
  station_id      TEXT NOT NULL REFERENCES stations(id),
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  charger_type    TEXT NOT NULL CHECK (charger_type IN ('fast','super_fast')),
  total_sessions  INT NOT NULL DEFAULT 0,
  total_kwh       NUMERIC(10,2) NOT NULL DEFAULT 0,
  avg_duration_min INT NOT NULL DEFAULT 0,
  avg_queue_min   INT NOT NULL DEFAULT 0,
  utilization_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  revenue         NUMERIC(10,2) NOT NULL DEFAULT 0
);

ALTER TABLE station_ev_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read station_ev_sessions" ON station_ev_sessions
  FOR SELECT TO authenticated USING (true);

INSERT INTO station_ev_sessions (station_id, date, charger_type, total_sessions, total_kwh, avg_duration_min, avg_queue_min, utilization_pct, revenue) VALUES
-- STN-001 Al Raha Beach (2 fast, 1 super-fast)
('STN-001','2026-02-13','fast',18,612,34,4,62.5,918),
('STN-001','2026-02-13','super_fast',12,540,22,2,78.3,810),
-- STN-002 Khalifa City A (2 fast)
('STN-002','2026-02-13','fast',14,476,33,6,55.0,714),
-- STN-003 Dubai Marina (3 fast, 2 super-fast)
('STN-003','2026-02-13','fast',28,952,32,8,72.4,1428),
('STN-003','2026-02-13','super_fast',22,990,20,3,85.1,1485),
-- STN-004 Jumeirah Village (2 fast, 1 super-fast)
('STN-004','2026-02-13','fast',16,544,35,5,58.8,816),
('STN-004','2026-02-13','super_fast',10,450,21,2,71.2,675),
-- STN-005 Sharjah Industrial (1 fast)
('STN-005','2026-02-13','fast',8,272,36,3,42.5,408),
-- STN-006 Al Ain Central (1 fast, 1 super-fast)
('STN-006','2026-02-13','fast',6,204,38,2,35.0,306),
('STN-006','2026-02-13','super_fast',4,180,23,1,45.0,270)
ON CONFLICT DO NOTHING;

-- ══════════════════════════════════════════════════════════════
-- 4. STATION HSE (safety metrics per station per month)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS station_hse (
  id                   SERIAL PRIMARY KEY,
  station_id           TEXT NOT NULL REFERENCES stations(id),
  month                DATE NOT NULL,
  trir                 NUMERIC(6,4) NOT NULL DEFAULT 0,
  ltif                 NUMERIC(6,4) NOT NULL DEFAULT 0,
  near_misses          INT NOT NULL DEFAULT 0,
  safety_observations  INT NOT NULL DEFAULT 0,
  audit_score_pct      NUMERIC(5,2) NOT NULL DEFAULT 0,
  training_hours       INT NOT NULL DEFAULT 0,
  open_actions         INT NOT NULL DEFAULT 0,
  fatalities           INT NOT NULL DEFAULT 0
);

ALTER TABLE station_hse ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read station_hse" ON station_hse
  FOR SELECT TO authenticated USING (true);

INSERT INTO station_hse (station_id, month, trir, ltif, near_misses, safety_observations, audit_score_pct, training_hours, open_actions, fatalities) VALUES
-- January 2026
('STN-001','2026-01-01',0.00,0.00,2,18,96.5,42,1,0),
('STN-002','2026-01-01',0.00,0.00,1,15,94.2,38,2,0),
('STN-003','2026-01-01',0.04,0.02,3,22,92.8,48,3,0),
('STN-004','2026-01-01',0.00,0.00,1,12,95.0,35,1,0),
('STN-005','2026-01-01',0.00,0.00,2,14,93.5,32,2,0),
('STN-006','2026-01-01',0.00,0.00,0,10,97.1,28,0,0),
-- February 2026
('STN-001','2026-02-01',0.00,0.00,1,20,97.0,45,0,0),
('STN-002','2026-02-01',0.00,0.00,2,16,95.0,40,1,0),
('STN-003','2026-02-01',0.02,0.00,2,25,93.5,52,2,0),
('STN-004','2026-02-01',0.00,0.00,0,14,96.2,36,0,0),
('STN-005','2026-02-01',0.04,0.02,3,12,91.8,30,3,0),
('STN-006','2026-02-01',0.00,0.00,1,11,97.5,30,0,0)
ON CONFLICT DO NOTHING;

-- Done! New tables: station_sales, station_loyalty, station_ev_sessions, station_hse
