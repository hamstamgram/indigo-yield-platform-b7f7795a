-- ============================================================
-- Report Delivery Center - Enhanced Delivery Tracking
-- ============================================================

-- 1) Add missing columns to statement_email_delivery
ALTER TABLE statement_email_delivery
ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'email',
ADD COLUMN IF NOT EXISTS locked_by UUID,
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS provider_message_id TEXT,
ADD COLUMN IF NOT EXISTS error_code TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS created_by UUID,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 2) Add check constraint for channel
DO $$ BEGIN
  ALTER TABLE statement_email_delivery
  ADD CONSTRAINT chk_delivery_channel 
  CHECK (channel IN ('email', 'download_link', 'telegram', 'whatsapp'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3) Add check constraint for status
DO $$ BEGIN
  ALTER TABLE statement_email_delivery
  ADD CONSTRAINT chk_delivery_status 
  CHECK (status IN ('queued', 'sending', 'sent', 'failed', 'cancelled', 'skipped', 'QUEUED', 'SENDING', 'SENT', 'FAILED', 'CANCELLED', 'SKIPPED'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4) Add unique constraint for idempotency
DO $$ BEGIN
  ALTER TABLE statement_email_delivery
  ADD CONSTRAINT unique_statement_channel UNIQUE (statement_id, channel);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 5) Create performance indexes
CREATE INDEX IF NOT EXISTS idx_delivery_status_period ON statement_email_delivery(status, period_id);
CREATE INDEX IF NOT EXISTS idx_delivery_investor_period ON statement_email_delivery(investor_id, period_id);
CREATE INDEX IF NOT EXISTS idx_delivery_sent_at ON statement_email_delivery(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_last_attempt ON statement_email_delivery(last_attempt_at);
CREATE INDEX IF NOT EXISTS idx_delivery_locked ON statement_email_delivery(locked_at) WHERE status = 'sending';

-- 6) Create audit trail table
CREATE TABLE IF NOT EXISTS report_delivery_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES statement_email_delivery(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  actor_id UUID,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on audit table
ALTER TABLE report_delivery_audit ENABLE ROW LEVEL SECURITY;

-- Admin-only policy for audit table
DROP POLICY IF EXISTS "Admins can manage delivery audit" ON report_delivery_audit;
CREATE POLICY "Admins can manage delivery audit" ON report_delivery_audit 
  FOR ALL USING (public.is_admin());

-- 7) Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_delivery_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_delivery_updated_at ON statement_email_delivery;
CREATE TRIGGER trigger_delivery_updated_at
  BEFORE UPDATE ON statement_email_delivery
  FOR EACH ROW EXECUTE FUNCTION update_delivery_updated_at();

-- 8) Create audit trigger function
CREATE OR REPLACE FUNCTION log_delivery_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO report_delivery_audit (delivery_id, from_status, to_status, actor_id, details)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid(), jsonb_build_object(
      'attempt_count', NEW.attempt_count,
      'error_message', NEW.error_message,
      'error_code', NEW.error_code
    ));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create audit trigger
DROP TRIGGER IF EXISTS trigger_log_delivery_status ON statement_email_delivery;
CREATE TRIGGER trigger_log_delivery_status
  AFTER UPDATE ON statement_email_delivery
  FOR EACH ROW EXECUTE FUNCTION log_delivery_status_change();

-- ============================================================
-- RPC Functions for Report Delivery Management
-- ============================================================

-- 9) Queue statement deliveries RPC
CREATE OR REPLACE FUNCTION queue_statement_deliveries(
  p_period_id UUID,
  p_channel TEXT DEFAULT 'email',
  p_investor_ids UUID[] DEFAULT NULL,
  p_fund_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_queued_count INTEGER := 0;
  v_skipped_missing_email INTEGER := 0;
  v_already_exists_count INTEGER := 0;
  rec RECORD;
  v_period_name TEXT;
BEGIN
  -- Verify admin access
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  -- Get period name for subject
  SELECT period_name INTO v_period_name 
  FROM statement_periods WHERE id = p_period_id;
  
  IF v_period_name IS NULL THEN
    RETURN jsonb_build_object('error', 'Period not found');
  END IF;
  
  -- Loop through generated statements for this period
  FOR rec IN
    SELECT 
      gs.id as statement_id,
      gs.investor_id,
      gs.user_id,
      p.email,
      p.first_name,
      p.last_name
    FROM generated_statements gs
    JOIN profiles p ON p.id = gs.investor_id
    WHERE gs.period_id = p_period_id
      AND (p_investor_ids IS NULL OR gs.investor_id = ANY(p_investor_ids))
  LOOP
    -- Check if already exists
    IF EXISTS (
      SELECT 1 FROM statement_email_delivery 
      WHERE statement_id = rec.statement_id 
        AND channel = p_channel
    ) THEN
      v_already_exists_count := v_already_exists_count + 1;
      CONTINUE;
    END IF;
    
    -- Check if missing email for email channel
    IF p_channel = 'email' AND (rec.email IS NULL OR rec.email = '') THEN
      -- Insert with skipped status
      INSERT INTO statement_email_delivery (
        statement_id, investor_id, user_id, period_id, 
        recipient_email, subject, status, channel, 
        error_message, created_by, attempt_count
      ) VALUES (
        rec.statement_id, rec.investor_id, rec.user_id, p_period_id,
        '', 'N/A', 'skipped', p_channel,
        'missing_email', auth.uid(), 0
      );
      v_skipped_missing_email := v_skipped_missing_email + 1;
      CONTINUE;
    END IF;
    
    -- Queue the delivery
    INSERT INTO statement_email_delivery (
      statement_id, investor_id, user_id, period_id,
      recipient_email, subject, status, channel, created_by, attempt_count
    ) VALUES (
      rec.statement_id, rec.investor_id, rec.user_id, p_period_id,
      rec.email, 
      v_period_name || ' Statement - ' || COALESCE(rec.first_name || ' ' || rec.last_name, rec.email),
      'queued', p_channel, auth.uid(), 0
    );
    v_queued_count := v_queued_count + 1;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'queued_count', v_queued_count,
    'skipped_missing_email', v_skipped_missing_email,
    'already_exists_count', v_already_exists_count
  );
END;
$$;

-- 10) Retry failed delivery
CREATE OR REPLACE FUNCTION retry_delivery(p_delivery_id UUID)
RETURNS JSONB 
LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN 
    RAISE EXCEPTION 'Admin required'; 
  END IF;
  
  UPDATE statement_email_delivery
  SET status = 'queued',
      error_message = NULL,
      error_code = NULL,
      failed_at = NULL,
      locked_by = NULL,
      locked_at = NULL,
      updated_at = now()
  WHERE id = p_delivery_id AND status IN ('failed', 'cancelled', 'FAILED', 'CANCELLED');
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Delivery not found or not in retryable state');
  END IF;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- 11) Cancel queued delivery
CREATE OR REPLACE FUNCTION cancel_delivery(p_delivery_id UUID)
RETURNS JSONB 
LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN 
    RAISE EXCEPTION 'Admin required'; 
  END IF;
  
  UPDATE statement_email_delivery
  SET status = 'cancelled',
      updated_at = now()
  WHERE id = p_delivery_id AND status IN ('queued', 'failed', 'QUEUED', 'FAILED');
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Delivery not found or not in cancellable state');
  END IF;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- 12) Mark as sent manually
CREATE OR REPLACE FUNCTION mark_sent_manually(p_delivery_id UUID, p_note TEXT DEFAULT NULL)
RETURNS JSONB 
LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN 
    RAISE EXCEPTION 'Admin required'; 
  END IF;
  
  UPDATE statement_email_delivery
  SET status = 'sent',
      sent_at = now(),
      metadata = metadata || jsonb_build_object(
        'manual_note', COALESCE(p_note, 'Marked sent manually'),
        'marked_by', auth.uid()::text,
        'marked_at', now()::text
      ),
      updated_at = now()
  WHERE id = p_delivery_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Delivery not found');
  END IF;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- 13) Requeue stale sending deliveries
CREATE OR REPLACE FUNCTION requeue_stale_sending(p_period_id UUID, p_minutes INTEGER DEFAULT 15)
RETURNS JSONB 
LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF NOT public.is_admin() THEN 
    RAISE EXCEPTION 'Admin required'; 
  END IF;
  
  UPDATE statement_email_delivery
  SET status = 'queued',
      locked_by = NULL,
      locked_at = NULL,
      metadata = metadata || jsonb_build_object(
        'requeued_reason', 'stale_lock',
        'requeued_at', now()::text
      ),
      updated_at = now()
  WHERE period_id = p_period_id
    AND status IN ('sending', 'SENDING')
    AND locked_at < now() - (p_minutes || ' minutes')::INTERVAL;
    
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  RETURN jsonb_build_object('success', true, 'requeued_count', v_count);
END;
$$;

-- 14) Get delivery statistics for a period
CREATE OR REPLACE FUNCTION get_delivery_stats(p_period_id UUID)
RETURNS JSONB 
LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT public.is_admin() THEN 
    RAISE EXCEPTION 'Admin required'; 
  END IF;
  
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'queued', COUNT(*) FILTER (WHERE UPPER(status) = 'QUEUED'),
    'sending', COUNT(*) FILTER (WHERE UPPER(status) = 'SENDING'),
    'sent', COUNT(*) FILTER (WHERE UPPER(status) = 'SENT'),
    'failed', COUNT(*) FILTER (WHERE UPPER(status) = 'FAILED'),
    'cancelled', COUNT(*) FILTER (WHERE UPPER(status) = 'CANCELLED'),
    'skipped', COUNT(*) FILTER (WHERE UPPER(status) = 'SKIPPED'),
    'statements_generated', (
      SELECT COUNT(*) FROM generated_statements WHERE period_id = p_period_id
    ),
    'investors_in_scope', (
      SELECT COUNT(DISTINCT investor_id) FROM generated_statements WHERE period_id = p_period_id
    ),
    'oldest_queued_at', MIN(created_at) FILTER (WHERE UPPER(status) = 'QUEUED'),
    'stuck_sending', COUNT(*) FILTER (WHERE UPPER(status) = 'SENDING' AND locked_at < now() - interval '15 minutes')
  ) INTO v_result
  FROM statement_email_delivery
  WHERE period_id = p_period_id;
  
  RETURN v_result;
END;
$$;

-- 15) Acquire batch for processing (used by edge function)
CREATE OR REPLACE FUNCTION acquire_delivery_batch(
  p_period_id UUID,
  p_channel TEXT DEFAULT 'email',
  p_batch_size INTEGER DEFAULT 25,
  p_worker_id UUID DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  statement_id UUID,
  investor_id UUID,
  recipient_email TEXT,
  attempt_count INTEGER
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_worker UUID;
BEGIN
  v_worker := COALESCE(p_worker_id, auth.uid());
  
  -- Acquire and lock batch
  RETURN QUERY
  WITH batch AS (
    SELECT sed.id
    FROM statement_email_delivery sed
    WHERE sed.period_id = p_period_id
      AND sed.channel = p_channel
      AND UPPER(sed.status) = 'QUEUED'
      AND sed.attempt_count < 5
    ORDER BY sed.created_at
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  )
  UPDATE statement_email_delivery sed
  SET status = 'sending',
      locked_by = v_worker,
      locked_at = now(),
      attempt_count = sed.attempt_count + 1,
      last_attempt_at = now(),
      updated_at = now()
  FROM batch
  WHERE sed.id = batch.id
  RETURNING sed.id, sed.statement_id, sed.investor_id, sed.recipient_email, sed.attempt_count;
END;
$$;

-- 16) Mark delivery result
CREATE OR REPLACE FUNCTION mark_delivery_result(
  p_delivery_id UUID,
  p_success BOOLEAN,
  p_provider_message_id TEXT DEFAULT NULL,
  p_error_code TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS JSONB 
LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  IF p_success THEN
    UPDATE statement_email_delivery
    SET status = 'sent',
        sent_at = now(),
        provider_message_id = p_provider_message_id,
        locked_by = NULL,
        locked_at = NULL,
        updated_at = now()
    WHERE id = p_delivery_id;
  ELSE
    UPDATE statement_email_delivery
    SET status = 'failed',
        failed_at = now(),
        error_code = p_error_code,
        error_message = p_error_message,
        locked_by = NULL,
        locked_at = NULL,
        updated_at = now()
    WHERE id = p_delivery_id;
  END IF;
  
  RETURN jsonb_build_object('success', true);
END;
$$;