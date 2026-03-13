-- ─────────────────────────────────────────────────────────────────────────────
-- GreenWave Database Schema
-- Paste this into: Supabase Dashboard → SQL Editor → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- Emergency Vehicles
CREATE TABLE IF NOT EXISTS vehicles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_sign   TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'standby',  -- standby | dispatched | en_route | arrived
  current_lat FLOAT,
  current_lng FLOAT,
  speed_kmh   FLOAT DEFAULT 0,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Traffic Signals / Intersections
CREATE TABLE IF NOT EXISTS signals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id           INT NOT NULL,
  intersection_name TEXT NOT NULL,
  map_x             FLOAT NOT NULL,
  map_y             FLOAT NOT NULL,
  state             TEXT NOT NULL DEFAULT 'idle',  -- idle | red | green | done
  corridor_active   BOOLEAN DEFAULT FALSE,
  last_changed      TIMESTAMPTZ DEFAULT NOW()
);

-- Emergency Routes
CREATE TABLE IF NOT EXISTS routes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id       UUID REFERENCES vehicles(id),
  origin           TEXT NOT NULL,
  destination      TEXT NOT NULL,
  eta_seconds      INT,
  time_saved_seconds INT DEFAULT 0,
  progress_pct     INT DEFAULT 0,
  status           TEXT DEFAULT 'active',  -- active | completed | cancelled
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  completed_at     TIMESTAMPTZ
);

-- Emergency Alerts / Events
CREATE TABLE IF NOT EXISTS alerts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id    UUID REFERENCES routes(id),
  event_type  TEXT NOT NULL,  -- dispatch | signal_clear | signal_restore | arrived
  message     TEXT NOT NULL,
  severity    TEXT DEFAULT 'info',  -- info | warning | critical
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial vehicle
INSERT INTO vehicles (call_sign, status) VALUES ('AMB-07', 'standby')
ON CONFLICT DO NOTHING;

-- Seed signal nodes
INSERT INTO signals (node_id, intersection_name, map_x, map_y) VALUES
  (1, '5th & Main',    14.0, 76.0),
  (2, '5th & Oak',     26.0, 64.0),
  (3, '7th & Oak',     38.0, 53.0),
  (4, '7th & Elm',     51.0, 43.0),
  (5, '9th & Elm',     62.0, 33.0),
  (6, '9th & Park',    74.0, 23.0),
  (7, 'Hospital Gate', 84.0, 14.0)
ON CONFLICT DO NOTHING;