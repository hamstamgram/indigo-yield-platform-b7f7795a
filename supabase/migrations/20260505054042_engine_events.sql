-- Engine Events Table — append-only event sourcing for yield calculations
--
-- Every financial operation (deposit, yield record, withdrawal, void/reverse)
-- is recorded as an immutable event. Current fund state is derived by replaying
-- events in sequence order.

-- Core events table
CREATE TABLE IF NOT EXISTS engine_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id UUID NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('DEPOSIT', 'YIELD_RECORD', 'WITHDRAW', 'REVERSE')),
  sequence INTEGER NOT NULL,
  event_date DATE NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Enforce unique sequence per fund
  UNIQUE (fund_id, sequence)
);

-- Index for fast replay (ordered by fund + sequence)
CREATE INDEX IF NOT EXISTS idx_engine_events_replay
  ON engine_events (fund_id, sequence);

-- Index for date-based queries
CREATE INDEX IF NOT EXISTS idx_engine_events_date
  ON engine_events (fund_id, event_date);

-- Materialized state table (computed from events, updated on write)
CREATE TABLE IF NOT EXISTS engine_state (
  fund_id UUID PRIMARY KEY REFERENCES funds(id) ON DELETE CASCADE,
  total_aum NUMERIC(38,18) NOT NULL DEFAULT 0,
  last_sequence INTEGER NOT NULL DEFAULT 0,
  last_event_date DATE,
  state_hash TEXT, -- hash of investor balances for reconciliation
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Individual investor balances within engine state
CREATE TABLE IF NOT EXISTS engine_investor_balances (
  fund_id UUID NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
  investor_id TEXT NOT NULL,
  investor_name TEXT NOT NULL,
  balance NUMERIC(38,18) NOT NULL DEFAULT 0,
  fee_pct NUMERIC(10,8) NOT NULL DEFAULT 0,
  ib_pct NUMERIC(10,8) NOT NULL DEFAULT 0,
  ib_id TEXT,
  ib_name TEXT,
  account_type TEXT NOT NULL DEFAULT 'investor' 
    CHECK (account_type IN ('investor', 'indigo_fees', 'ib')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  PRIMARY KEY (fund_id, investor_id)
);

-- Unique investor names per fund
CREATE UNIQUE INDEX IF NOT EXISTS idx_engine_balances_lookup
  ON engine_investor_balances (fund_id, investor_id);

-- Enable RLS
ALTER TABLE engine_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE engine_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE engine_investor_balances ENABLE ROW LEVEL SECURITY;

-- Admin-only access (these are internal tables)
CREATE POLICY "Admin access to engine_events"
  ON engine_events FOR ALL
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admin access to engine_state"
  ON engine_state FOR ALL
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admin access to engine_balances"
  ON engine_investor_balances FOR ALL
  TO authenticated
  USING (is_admin());
