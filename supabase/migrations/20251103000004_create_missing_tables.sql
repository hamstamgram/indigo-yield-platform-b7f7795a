-- ========================================
-- EMERGENCY MIGRATION: CREATE MISSING TABLES
-- Date: November 3, 2025
-- Priority: P0 - CRITICAL (Missing Features)
-- Time to execute: ~1 minute
-- ========================================

-- CRITICAL: Platform is missing essential tables for:
-- 1. Withdrawal requests (separate from transactions)
-- 2. Audit logging (compliance requirement)
-- 3. Fee tracking (transparency)
-- 4. Email queue (notifications)

BEGIN;

-- ==========================================
-- TABLE 1: WITHDRAWAL REQUESTS
-- ==========================================
-- Separate from transactions for multi-step approval workflow

CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  asset_symbol TEXT NOT NULL,
  amount NUMERIC(20,8) NOT NULL CHECK (amount > 0),
  destination TEXT NOT NULL CHECK (length(destination) > 0),
  destination_type TEXT NOT NULL DEFAULT 'WALLET' CHECK (destination_type IN ('WALLET', 'BANK', 'OTHER')),

  -- Status workflow
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (
    status IN ('PENDING', 'APPROVED', 'REJECTED', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'FAILED')
  ),

  -- Approval tracking
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Rejection tracking
  rejection_reason TEXT,

  -- Admin notes
  admin_notes TEXT,

  -- Blockchain transaction
  tx_hash TEXT,
  confirmation_count INT DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_approval CHECK (
    (status IN ('APPROVED', 'PROCESSING', 'COMPLETED') AND approved_by IS NOT NULL) OR
    status NOT IN ('APPROVED', 'PROCESSING', 'COMPLETED')
  ),
  CONSTRAINT valid_rejection CHECK (
    (status = 'REJECTED' AND rejection_reason IS NOT NULL) OR
    status != 'REJECTED'
  ),
  CONSTRAINT valid_completion CHECK (
    (status = 'COMPLETED' AND tx_hash IS NOT NULL) OR
    status != 'COMPLETED'
  )
);

-- Indexes for withdrawal_requests
CREATE INDEX idx_withdrawal_requests_user_id ON withdrawal_requests(user_id);
CREATE INDEX idx_withdrawal_requests_status ON withdrawal_requests(status);
CREATE INDEX idx_withdrawal_requests_requested_at ON withdrawal_requests(requested_at DESC);
CREATE INDEX idx_withdrawal_requests_user_status ON withdrawal_requests(user_id, status);

-- RLS for withdrawal_requests
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view own withdrawal requests"
  ON withdrawal_requests FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own requests
CREATE POLICY "Users can create withdrawal requests"
  ON withdrawal_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id AND status = 'PENDING');

-- Users can cancel their pending requests
CREATE POLICY "Users can cancel pending requests"
  ON withdrawal_requests FOR UPDATE
  USING (auth.uid() = user_id AND status = 'PENDING')
  WITH CHECK (status = 'CANCELLED');

-- Admins can view all requests
CREATE POLICY "Admins can view all withdrawal requests"
  ON withdrawal_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Admins can update requests (approve/reject)
CREATE POLICY "Admins can manage withdrawal requests"
  ON withdrawal_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- ==========================================
-- TABLE 2: AUDIT LOG
-- ==========================================
-- Compliance requirement: track all sensitive operations

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who
  user_id UUID REFERENCES profiles(id),
  actor_email TEXT,

  -- What
  action TEXT NOT NULL CHECK (length(action) > 0),
  resource_type TEXT NOT NULL CHECK (length(resource_type) > 0),
  resource_id TEXT,

  -- Changes
  old_value JSONB,
  new_value JSONB,

  -- Context
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,

  -- When
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Metadata
  metadata JSONB,

  -- Severity for filtering
  severity TEXT DEFAULT 'INFO' CHECK (severity IN ('DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'))
);

-- Indexes for audit_log
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_resource_type ON audit_log(resource_type);
CREATE INDEX idx_audit_log_severity ON audit_log(severity);

-- Composite index for common queries
CREATE INDEX idx_audit_log_user_created ON audit_log(user_id, created_at DESC);

-- RLS for audit_log
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Users can view their own audit logs
CREATE POLICY "Users can view own audit logs"
  ON audit_log FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all audit logs
CREATE POLICY "Admins can view all audit logs"
  ON audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Service role can insert audit logs (application code)
CREATE POLICY "Service role can insert audit logs"
  ON audit_log FOR INSERT
  WITH CHECK (true);

-- ==========================================
-- TABLE 3: FEE TRANSACTIONS
-- ==========================================
-- Track performance fees charged to investors

CREATE TABLE IF NOT EXISTS fee_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL CHECK (period_end > period_start),

  -- AUM (Assets Under Management)
  aum_start NUMERIC(20,8) NOT NULL CHECK (aum_start >= 0),
  aum_end NUMERIC(20,8) NOT NULL CHECK (aum_end >= 0),
  aum_average NUMERIC(20,8) NOT NULL CHECK (aum_average >= 0),
  aum_high_water_mark NUMERIC(20,8),

  -- Fee calculation
  fee_percentage NUMERIC(5,2) NOT NULL CHECK (fee_percentage >= 0 AND fee_percentage <= 100),
  fee_amount NUMERIC(20,8) NOT NULL CHECK (fee_amount >= 0),
  fee_type TEXT DEFAULT 'PERFORMANCE' CHECK (fee_type IN ('MANAGEMENT', 'PERFORMANCE', 'WITHDRAWAL', 'OTHER')),

  -- Status
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (
    status IN ('PENDING', 'PROCESSED', 'WAIVED', 'DISPUTED')
  ),

  -- Processing
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES profiles(id),

  -- Reference to transaction (if fee was charged)
  transaction_id UUID REFERENCES transactions(id),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Metadata
  notes TEXT,
  metadata JSONB
);

-- Indexes for fee_transactions
CREATE INDEX idx_fee_transactions_user_id ON fee_transactions(user_id);
CREATE INDEX idx_fee_transactions_period_end ON fee_transactions(period_end DESC);
CREATE INDEX idx_fee_transactions_status ON fee_transactions(status);
CREATE INDEX idx_fee_transactions_user_period ON fee_transactions(user_id, period_end DESC);

-- RLS for fee_transactions
ALTER TABLE fee_transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own fee transactions
CREATE POLICY "Users can view own fee transactions"
  ON fee_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all fee transactions
CREATE POLICY "Admins can view all fee transactions"
  ON fee_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Admins can create and manage fees
CREATE POLICY "Admins can manage fee transactions"
  ON fee_transactions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- ==========================================
-- TABLE 4: EMAIL QUEUE
-- ==========================================
-- Asynchronous email sending via Supabase Edge Functions

CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Recipient
  user_id UUID REFERENCES profiles(id),
  to_email TEXT NOT NULL CHECK (to_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
  cc_email TEXT[],
  bcc_email TEXT[],

  -- Content
  template TEXT NOT NULL CHECK (length(template) > 0),
  subject TEXT NOT NULL CHECK (length(subject) > 0),
  variables JSONB,

  -- Priority
  priority INT DEFAULT 5 CHECK (priority BETWEEN 1 AND 10), -- 1=highest, 10=lowest

  -- Status
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (
    status IN ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED')
  ),

  -- Processing
  sent_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,

  -- Error tracking
  error TEXT,
  error_details JSONB,

  -- External IDs (from email provider)
  message_id TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scheduled_for TIMESTAMPTZ DEFAULT NOW(),

  -- Metadata
  metadata JSONB
);

-- Indexes for email_queue
CREATE INDEX idx_email_queue_user_id ON email_queue(user_id);
CREATE INDEX idx_email_queue_status ON email_queue(status);
CREATE INDEX idx_email_queue_scheduled_for ON email_queue(scheduled_for);
CREATE INDEX idx_email_queue_priority ON email_queue(priority);

-- Composite index for processing queue
CREATE INDEX idx_email_queue_processing ON email_queue(status, priority, scheduled_for)
  WHERE status = 'PENDING';

-- RLS for email_queue
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

-- Users can view their own emails
CREATE POLICY "Users can view own emails"
  ON email_queue FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can manage email queue
CREATE POLICY "Service role can manage email queue"
  ON email_queue FOR ALL
  USING (true);

-- ==========================================
-- TABLE 5: USER SESSIONS
-- ==========================================
-- Track active sessions for security

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Session info
  session_token TEXT NOT NULL UNIQUE,
  refresh_token TEXT UNIQUE,

  -- Device info
  device_name TEXT,
  device_type TEXT CHECK (device_type IN ('WEB', 'IOS', 'ANDROID', 'API')),
  user_agent TEXT,
  ip_address INET,

  -- Location (optional)
  country TEXT,
  city TEXT,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,

  -- Metadata
  metadata JSONB
);

-- Indexes for user_sessions
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_session_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_is_active ON user_sessions(is_active);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);

-- Composite index for active sessions
CREATE INDEX idx_user_sessions_active ON user_sessions(user_id, is_active, last_active_at DESC)
  WHERE is_active = true;

-- RLS for user_sessions
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view their own sessions
CREATE POLICY "Users can view own sessions"
  ON user_sessions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can delete their own sessions (logout)
CREATE POLICY "Users can delete own sessions"
  ON user_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can manage sessions
CREATE POLICY "Service role can manage sessions"
  ON user_sessions FOR ALL
  USING (true);

COMMIT;

-- ==========================================
-- VERIFICATION QUERIES
-- ==========================================

-- Check all new tables were created
SELECT
  table_name,
  CASE
    WHEN table_name IN ('withdrawal_requests', 'audit_log', 'fee_transactions', 'email_queue', 'user_sessions')
    THEN '✅ CREATED'
    ELSE '⚠️ MISSING'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('withdrawal_requests', 'audit_log', 'fee_transactions', 'email_queue', 'user_sessions')
ORDER BY table_name;

-- Expected: 5 tables with ✅ CREATED

-- Check RLS is enabled on new tables
SELECT
  tablename,
  rowsecurity as rls_enabled,
  CASE
    WHEN rowsecurity THEN '✅ ENABLED'
    ELSE '❌ DISABLED'
  END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('withdrawal_requests', 'audit_log', 'fee_transactions', 'email_queue', 'user_sessions')
ORDER BY tablename;

-- Expected: All 5 tables show rls_enabled = true

-- ==========================================
-- HELPER FUNCTIONS
-- ==========================================

-- Function to log audit events
CREATE OR REPLACE FUNCTION log_audit_event(
  p_user_id UUID,
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id TEXT DEFAULT NULL,
  p_old_value JSONB DEFAULT NULL,
  p_new_value JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_audit_id UUID;
BEGIN
  INSERT INTO audit_log (
    user_id,
    action,
    resource_type,
    resource_id,
    old_value,
    new_value,
    metadata,
    actor_email
  )
  SELECT
    p_user_id,
    p_action,
    p_resource_type,
    p_resource_id,
    p_old_value,
    p_new_value,
    p_metadata,
    email
  FROM profiles
  WHERE id = p_user_id
  RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INT AS $$
DECLARE
  v_deleted_count INT;
BEGIN
  WITH deleted AS (
    DELETE FROM user_sessions
    WHERE expires_at < NOW()
    RETURNING id
  )
  SELECT COUNT(*) INTO v_deleted_count FROM deleted;

  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule session cleanup (daily at 2am)
-- SELECT cron.schedule(
--   'cleanup-expired-sessions',
--   '0 2 * * *',
--   'SELECT cleanup_expired_sessions();'
-- );
