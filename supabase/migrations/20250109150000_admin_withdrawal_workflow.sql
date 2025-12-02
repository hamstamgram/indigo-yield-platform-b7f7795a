-- Migration: 012_admin_withdrawal_workflow.sql
-- Date: 2025-01-09
-- Description: Complete admin withdrawal workflow with audit logging and status transitions

-- ========================================
-- 1. ADMIN CHECK HELPER
-- ========================================
CREATE OR REPLACE FUNCTION public.ensure_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = TRUE
  ) THEN
    RAISE EXCEPTION 'Admin only operation';
  END IF;
END;
$$;
-- ========================================
-- 2. AUTO-UPDATE TIMESTAMP TRIGGER
-- ========================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
-- Apply trigger to withdrawal_requests
DROP TRIGGER IF EXISTS trg_withdrawals_updated_at ON public.withdrawal_requests;
CREATE TRIGGER trg_withdrawals_updated_at
  BEFORE UPDATE ON public.withdrawal_requests
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_updated_at();
-- ========================================
-- 3. AUDIT LOG TABLE AND ENUM
-- ========================================
DO $$ 
BEGIN 
  CREATE TYPE withdrawal_action AS ENUM (
    'create',
    'approve',
    'reject', 
    'processing',
    'complete',
    'cancel',
    'update'
  );
EXCEPTION 
  WHEN duplicate_object THEN NULL;
END $$;
CREATE TABLE IF NOT EXISTS public.withdrawal_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.withdrawal_requests(id) ON DELETE CASCADE,
  action withdrawal_action NOT NULL,
  actor_id UUID REFERENCES public.profiles(id),
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_withdrawal_audit_logs_request 
  ON public.withdrawal_audit_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_audit_logs_actor 
  ON public.withdrawal_audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_audit_logs_created 
  ON public.withdrawal_audit_logs(created_at DESC);
-- Enable RLS
ALTER TABLE public.withdrawal_audit_logs ENABLE ROW LEVEL SECURITY;
-- Admins can see all logs
CREATE POLICY "withdrawal_audit_logs_admin_select" ON public.withdrawal_audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );
-- Revoke direct write access (logs only written by functions)
REVOKE ALL ON public.withdrawal_audit_logs FROM authenticated;
GRANT SELECT ON public.withdrawal_audit_logs TO authenticated;
-- ========================================
-- 4. AUDIT LOGGING HELPER
-- ========================================
CREATE OR REPLACE FUNCTION public.log_withdrawal_action(
  p_request_id UUID,
  p_action withdrawal_action,
  p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.withdrawal_audit_logs (request_id, action, actor_id, details)
  VALUES (p_request_id, p_action, auth.uid(), p_details);
END;
$$;
-- ========================================
-- 5. ENHANCED APPROVE FUNCTION
-- ========================================
CREATE OR REPLACE FUNCTION public.approve_withdrawal(
  p_request_id UUID,
  p_approved_amount NUMERIC(28,10) DEFAULT NULL,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request RECORD;
  v_final_amount NUMERIC(28,10);
BEGIN
  -- Ensure admin privileges
  PERFORM public.ensure_admin();

  -- Get request details
  SELECT * INTO v_request 
  FROM public.withdrawal_requests 
  WHERE id = p_request_id;
  
  IF v_request IS NULL THEN 
    RAISE EXCEPTION 'Withdrawal request not found';
  END IF;
  
  IF v_request.status != 'pending' THEN 
    RAISE EXCEPTION 'Can only approve pending requests. Current status: %', v_request.status;
  END IF;

  -- Determine approval amount
  v_final_amount := COALESCE(p_approved_amount, v_request.requested_amount);
  
  -- Validate amount
  IF v_final_amount <= 0 THEN 
    RAISE EXCEPTION 'Approved amount must be greater than zero';
  END IF;
  
  IF v_final_amount > v_request.requested_amount THEN 
    RAISE EXCEPTION 'Approved amount cannot exceed requested amount';
  END IF;

  -- Update request
  UPDATE public.withdrawal_requests
  SET 
    status = 'approved',
    approved_amount = v_final_amount,
    approved_by = auth.uid(),
    approved_at = NOW(),
    admin_notes = COALESCE(p_admin_notes, admin_notes)
  WHERE id = p_request_id;

  -- Log action
  PERFORM public.log_withdrawal_action(
    p_request_id, 
    'approve', 
    jsonb_build_object(
      'approved_amount', v_final_amount,
      'requested_amount', v_request.requested_amount,
      'admin_notes', p_admin_notes
    )
  );
  
  RETURN TRUE;
END;
$$;
-- ========================================
-- 6. REJECT WITHDRAWAL FUNCTION
-- ========================================
CREATE OR REPLACE FUNCTION public.reject_withdrawal(
  p_request_id UUID,
  p_reason TEXT,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE 
  v_request RECORD;
BEGIN
  -- Ensure admin privileges
  PERFORM public.ensure_admin();
  
  -- Validate rejection reason
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN 
    RAISE EXCEPTION 'Rejection reason is required';
  END IF;

  -- Get request details
  SELECT * INTO v_request 
  FROM public.withdrawal_requests 
  WHERE id = p_request_id;
  
  IF v_request IS NULL THEN 
    RAISE EXCEPTION 'Withdrawal request not found';
  END IF;
  
  IF v_request.status != 'pending' THEN 
    RAISE EXCEPTION 'Can only reject pending requests. Current status: %', v_request.status;
  END IF;

  -- Update request
  UPDATE public.withdrawal_requests
  SET 
    status = 'rejected',
    rejection_reason = p_reason,
    rejected_by = auth.uid(),
    rejected_at = NOW(),
    admin_notes = COALESCE(p_admin_notes, admin_notes)
  WHERE id = p_request_id;

  -- Log action
  PERFORM public.log_withdrawal_action(
    p_request_id,
    'reject',
    jsonb_build_object(
      'reason', p_reason,
      'admin_notes', p_admin_notes
    )
  );
  
  RETURN TRUE;
END;
$$;
-- ========================================
-- 7. START PROCESSING FUNCTION
-- ========================================
CREATE OR REPLACE FUNCTION public.start_processing_withdrawal(
  p_request_id UUID,
  p_processed_amount NUMERIC(28,10) DEFAULT NULL,
  p_tx_hash TEXT DEFAULT NULL,
  p_settlement_date DATE DEFAULT NULL,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE 
  v_request RECORD;
  v_amount NUMERIC(28,10);
BEGIN
  -- Ensure admin privileges
  PERFORM public.ensure_admin();
  
  -- Get request details
  SELECT * INTO v_request 
  FROM public.withdrawal_requests 
  WHERE id = p_request_id;
  
  IF v_request IS NULL THEN 
    RAISE EXCEPTION 'Withdrawal request not found';
  END IF;
  
  IF v_request.status != 'approved' THEN 
    RAISE EXCEPTION 'Can only process approved requests. Current status: %', v_request.status;
  END IF;

  -- Determine processing amount
  v_amount := COALESCE(p_processed_amount, v_request.approved_amount);
  
  -- Validate amount
  IF v_amount <= 0 THEN 
    RAISE EXCEPTION 'Processed amount must be greater than zero';
  END IF;
  
  IF v_amount > v_request.approved_amount THEN 
    RAISE EXCEPTION 'Processed amount cannot exceed approved amount';
  END IF;

  -- Update request
  UPDATE public.withdrawal_requests
  SET 
    status = 'processing',
    processed_amount = v_amount,
    processed_at = NOW(),
    settlement_date = p_settlement_date,
    tx_hash = p_tx_hash,
    admin_notes = COALESCE(p_admin_notes, admin_notes)
  WHERE id = p_request_id;

  -- Log action
  PERFORM public.log_withdrawal_action(
    p_request_id,
    'processing',
    jsonb_build_object(
      'processed_amount', v_amount,
      'approved_amount', v_request.approved_amount,
      'tx_hash', p_tx_hash,
      'settlement_date', p_settlement_date,
      'admin_notes', p_admin_notes
    )
  );
  
  RETURN TRUE;
END;
$$;
-- ========================================
-- 8. COMPLETE WITHDRAWAL FUNCTION
-- ========================================
CREATE OR REPLACE FUNCTION public.complete_withdrawal(
  p_request_id UUID,
  p_tx_hash TEXT DEFAULT NULL,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE 
  v_request RECORD;
BEGIN
  -- Ensure admin privileges
  PERFORM public.ensure_admin();
  
  -- Get request details
  SELECT * INTO v_request 
  FROM public.withdrawal_requests 
  WHERE id = p_request_id;
  
  IF v_request IS NULL THEN 
    RAISE EXCEPTION 'Withdrawal request not found';
  END IF;
  
  IF v_request.status != 'processing' THEN 
    RAISE EXCEPTION 'Can only complete requests in processing. Current status: %', v_request.status;
  END IF;

  -- Update request
  UPDATE public.withdrawal_requests
  SET 
    status = 'completed',
    tx_hash = COALESCE(p_tx_hash, tx_hash),
    admin_notes = COALESCE(p_admin_notes, admin_notes)
  WHERE id = p_request_id;

  -- Log action
  PERFORM public.log_withdrawal_action(
    p_request_id,
    'complete',
    jsonb_build_object(
      'tx_hash', COALESCE(p_tx_hash, v_request.tx_hash),
      'processed_amount', v_request.processed_amount,
      'admin_notes', p_admin_notes
    )
  );
  
  RETURN TRUE;
END;
$$;
-- ========================================
-- 9. ADMIN CANCEL FUNCTION
-- ========================================
CREATE OR REPLACE FUNCTION public.cancel_withdrawal_by_admin(
  p_request_id UUID,
  p_reason TEXT,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE 
  v_request RECORD;
BEGIN
  -- Ensure admin privileges
  PERFORM public.ensure_admin();
  
  -- Validate cancellation reason
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN 
    RAISE EXCEPTION 'Cancellation reason is required';
  END IF;

  -- Get request details
  SELECT * INTO v_request 
  FROM public.withdrawal_requests 
  WHERE id = p_request_id;
  
  IF v_request IS NULL THEN 
    RAISE EXCEPTION 'Withdrawal request not found';
  END IF;
  
  IF v_request.status NOT IN ('pending', 'approved') THEN 
    RAISE EXCEPTION 'Can only cancel pending or approved requests. Current status: %', v_request.status;
  END IF;

  -- Update request
  UPDATE public.withdrawal_requests
  SET 
    status = 'cancelled',
    cancellation_reason = p_reason,
    cancelled_by = auth.uid(),
    cancelled_at = NOW(),
    admin_notes = COALESCE(p_admin_notes, admin_notes)
  WHERE id = p_request_id;

  -- Log action
  PERFORM public.log_withdrawal_action(
    p_request_id,
    'cancel',
    jsonb_build_object(
      'reason', p_reason,
      'previous_status', v_request.status,
      'admin_notes', p_admin_notes
    )
  );
  
  RETURN TRUE;
END;
$$;
-- ========================================
-- 10. LOG INVESTOR-DRIVEN CANCELLATIONS
-- ========================================
CREATE OR REPLACE FUNCTION public.log_cancel_on_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only log if this is an investor-driven cancellation (not by admin)
  IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM NEW.status THEN
    -- Check if cancelled_by is not set (meaning investor cancelled)
    IF NEW.cancelled_by IS NULL THEN
      PERFORM public.log_withdrawal_action(
        NEW.id,
        'cancel',
        jsonb_build_object(
          'reason', NEW.cancellation_reason,
          'cancelled_by', 'investor',
          'previous_status', OLD.status
        )
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
-- Apply trigger for investor cancellations
DROP TRIGGER IF EXISTS trg_withdrawals_cancel_log ON public.withdrawal_requests;
CREATE TRIGGER trg_withdrawals_cancel_log
  AFTER UPDATE OF status ON public.withdrawal_requests
  FOR EACH ROW
  WHEN (NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE PROCEDURE public.log_cancel_on_status_change();
-- ========================================
-- 11. LOG CREATION OF NEW REQUESTS
-- ========================================
CREATE OR REPLACE FUNCTION public.log_withdrawal_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.log_withdrawal_action(
    NEW.id,
    'create',
    jsonb_build_object(
      'requested_amount', NEW.requested_amount,
      'fund_id', NEW.fund_id,
      'fund_class', NEW.fund_class,
      'withdrawal_type', NEW.withdrawal_type,
      'notes', NEW.notes
    )
  );
  RETURN NEW;
END;
$$;
-- Apply trigger for new requests
DROP TRIGGER IF EXISTS trg_withdrawals_create_log ON public.withdrawal_requests;
CREATE TRIGGER trg_withdrawals_create_log
  AFTER INSERT ON public.withdrawal_requests
  FOR EACH ROW
  EXECUTE PROCEDURE public.log_withdrawal_creation();
-- ========================================
-- 12. ENHANCED WITHDRAWAL QUEUE VIEW
-- ========================================
-- Drop and recreate with more comprehensive fields
DROP VIEW IF EXISTS public.withdrawal_queue CASCADE;
CREATE VIEW public.withdrawal_queue AS
SELECT 
  wr.id,
  wr.request_date,
  wr.status,
  wr.requested_amount,
  wr.approved_amount,
  wr.processed_amount,
  wr.fund_class,
  wr.withdrawal_type,
  wr.settlement_date,
  wr.tx_hash,
  wr.notes,
  wr.admin_notes,
  wr.rejection_reason,
  wr.cancellation_reason,
  i.id as investor_id,
  i.name as investor_name,
  i.email as investor_email,
  f.id as fund_id,
  f.name as fund_name,
  f.code as fund_code,
  ip.current_value as current_position_value,
  ip.shares as current_shares,
  CASE 
    WHEN wr.withdrawal_type = 'full' THEN ip.current_value
    ELSE wr.requested_amount
  END as expected_withdrawal,
  -- Admin who approved
  ap.email as approved_by_email,
  ap.first_name || ' ' || ap.last_name as approved_by_name,
  wr.approved_at,
  -- Admin who rejected
  rp.email as rejected_by_email,
  rp.first_name || ' ' || rp.last_name as rejected_by_name,
  wr.rejected_at,
  -- Admin who cancelled
  cp.email as cancelled_by_email,
  cp.first_name || ' ' || cp.last_name as cancelled_by_name,
  wr.cancelled_at,
  -- Processing info
  wr.processed_at,
  wr.updated_at
FROM public.withdrawal_requests wr
JOIN public.investors i ON wr.investor_id = i.id
JOIN public.funds f ON wr.fund_id = f.id
LEFT JOIN public.investor_positions ip 
  ON wr.investor_id = ip.investor_id 
  AND wr.fund_id = ip.fund_id
LEFT JOIN public.profiles ap ON wr.approved_by = ap.id
LEFT JOIN public.profiles rp ON wr.rejected_by = rp.id
LEFT JOIN public.profiles cp ON wr.cancelled_by = cp.id;
-- ========================================
-- 13. GRANT PERMISSIONS
-- ========================================
-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.ensure_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_withdrawal_action(UUID, withdrawal_action, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_withdrawal(UUID, NUMERIC, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_withdrawal(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_processing_withdrawal(UUID, NUMERIC, TEXT, DATE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_withdrawal(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_withdrawal_by_admin(UUID, TEXT, TEXT) TO authenticated;
-- Grant select on view (RLS will filter appropriately)
GRANT SELECT ON public.withdrawal_queue TO authenticated;
-- ========================================
-- 14. ADD COMMENTS FOR DOCUMENTATION
-- ========================================
COMMENT ON TABLE public.withdrawal_audit_logs IS 'Audit trail for all withdrawal request actions';
COMMENT ON FUNCTION public.ensure_admin IS 'Verifies current user has admin privileges';
COMMENT ON FUNCTION public.approve_withdrawal IS 'Admin function to approve a withdrawal request';
COMMENT ON FUNCTION public.reject_withdrawal IS 'Admin function to reject a withdrawal request';
COMMENT ON FUNCTION public.start_processing_withdrawal IS 'Admin function to begin processing an approved withdrawal';
COMMENT ON FUNCTION public.complete_withdrawal IS 'Admin function to mark a withdrawal as completed';
COMMENT ON FUNCTION public.cancel_withdrawal_by_admin IS 'Admin function to cancel a pending or approved withdrawal';
COMMENT ON VIEW public.withdrawal_queue IS 'Comprehensive view of withdrawal requests with related data';
-- ========================================
-- MIGRATION COMPLETE
-- ========================================;
