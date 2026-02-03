-- P1-02: Consolidate Withdrawal Pipeline
-- Unifies the withdrawal state machine with consistent transition validation

-- ============================================================
-- 1. Create State Transition Validator Helper
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_withdrawal_transition(
  p_current_status text,
  p_new_status text
) RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
/*
 * Validates withdrawal state transitions according to the canonical state machine:
 *
 *   pending → approved | rejected | cancelled
 *   approved → processing | cancelled
 *   processing → completed | cancelled
 *   rejected → (terminal)
 *   completed → (terminal)
 *   cancelled → (terminal)
 */
BEGIN
  RETURN CASE 
    WHEN p_current_status = 'pending' AND p_new_status IN ('approved', 'rejected', 'cancelled') THEN true
    WHEN p_current_status = 'approved' AND p_new_status IN ('processing', 'cancelled') THEN true
    WHEN p_current_status = 'processing' AND p_new_status IN ('completed', 'cancelled') THEN true
    ELSE false
  END;
END;
$$;

COMMENT ON FUNCTION public.validate_withdrawal_transition(text, text) IS 
'Validates withdrawal state transitions. Returns true if the transition is valid per the state machine. Terminal states (rejected, completed, cancelled) cannot transition.';

-- ============================================================
-- 2. Drop the duplicate 2-param overload of start_processing_withdrawal
-- ============================================================
DROP FUNCTION IF EXISTS public.start_processing_withdrawal(uuid, uuid);

-- ============================================================
-- 3. Enhance the canonical start_processing_withdrawal function
-- ============================================================
CREATE OR REPLACE FUNCTION public.start_processing_withdrawal(
  p_request_id uuid,
  p_processed_amount numeric DEFAULT NULL,
  p_tx_hash text DEFAULT NULL,
  p_settlement_date date DEFAULT NULL,
  p_admin_notes text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
/*
 * Transitions a withdrawal from 'approved' to 'processing' state.
 * 
 * State Machine: approved → processing
 * 
 * Security: Requires super_admin role (consistent with complete_withdrawal)
 * Concurrency: Uses advisory lock to prevent race conditions
 * Audit: Logs action to withdrawal_audit_logs via log_withdrawal_action()
 */
DECLARE
  v_admin_id uuid;
  v_request record;
  v_lock_acquired boolean;
BEGIN
  -- Require super_admin for processing operations
  v_admin_id := require_super_admin();
  
  -- Acquire advisory lock to prevent concurrent processing
  v_lock_acquired := acquire_withdrawal_lock(p_request_id);
  IF NOT v_lock_acquired THEN
    RAISE EXCEPTION 'WITHDRAWAL_LOCKED: Another operation is in progress for this withdrawal';
  END IF;
  
  -- Fetch and lock the request
  SELECT * INTO v_request
  FROM withdrawal_requests
  WHERE id = p_request_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'WITHDRAWAL_NOT_FOUND: Withdrawal request % not found', p_request_id;
  END IF;
  
  -- Validate state transition using canonical validator
  IF NOT validate_withdrawal_transition(v_request.status, 'processing') THEN
    RAISE EXCEPTION 'INVALID_STATE_TRANSITION: Cannot transition from % to processing', v_request.status;
  END IF;
  
  -- Update the request
  UPDATE withdrawal_requests
  SET 
    status = 'processing',
    processed_amount = COALESCE(p_processed_amount, requested_amount),
    tx_hash = COALESCE(p_tx_hash, tx_hash),
    admin_notes = COALESCE(p_admin_notes, admin_notes),
    updated_at = now()
  WHERE id = p_request_id;
  
  -- Log the action
  PERFORM log_withdrawal_action(
    p_request_id,
    'processing',
    jsonb_build_object(
      'processed_amount', COALESCE(p_processed_amount, v_request.requested_amount),
      'tx_hash', p_tx_hash,
      'settlement_date', p_settlement_date,
      'admin_notes', p_admin_notes,
      'actor_id', v_admin_id
    )
  );
  
  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.start_processing_withdrawal(uuid, numeric, text, date, text) IS 
'Transitions withdrawal from approved→processing. Requires super_admin. Uses advisory lock for concurrency safety. Logs to withdrawal_audit_logs.';

-- ============================================================
-- 4. Fix cancel_withdrawal_by_admin to allow processing state
-- ============================================================
CREATE OR REPLACE FUNCTION public.cancel_withdrawal_by_admin(
  p_request_id uuid,
  p_reason text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
/*
 * Cancels a withdrawal request by admin.
 * 
 * State Machine: pending | approved | processing → cancelled
 * 
 * Security: Requires admin role (is_admin check)
 * Note: Cancellation from 'processing' is allowed because no ledger changes
 *       occur until complete_withdrawal is called.
 * Audit: Logs action to withdrawal_audit_logs via log_withdrawal_action()
 */
DECLARE
  v_admin_id uuid;
  v_request record;
BEGIN
  -- Require admin for cancellation
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Admin access required';
  END IF;
  
  v_admin_id := auth.uid();
  
  -- Fetch and lock the request
  SELECT * INTO v_request
  FROM withdrawal_requests
  WHERE id = p_request_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'WITHDRAWAL_NOT_FOUND: Withdrawal request % not found', p_request_id;
  END IF;
  
  -- Validate state transition - now allows processing state
  IF NOT validate_withdrawal_transition(v_request.status, 'cancelled') THEN
    RAISE EXCEPTION 'INVALID_STATE_TRANSITION: Cannot cancel withdrawal in % state', v_request.status;
  END IF;
  
  -- Update the request
  UPDATE withdrawal_requests
  SET 
    status = 'cancelled',
    cancellation_reason = COALESCE(p_reason, 'Cancelled by admin'),
    cancelled_by = v_admin_id,
    updated_at = now()
  WHERE id = p_request_id;
  
  -- Log the action
  PERFORM log_withdrawal_action(
    p_request_id,
    'cancel',
    jsonb_build_object(
      'previous_status', v_request.status,
      'reason', COALESCE(p_reason, 'Cancelled by admin'),
      'actor_id', v_admin_id
    )
  );
  
  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.cancel_withdrawal_by_admin(uuid, text) IS 
'Cancels a withdrawal from pending/approved/processing states. No ledger impact as funds are only moved on complete. Logs to withdrawal_audit_logs.';

-- ============================================================
-- 5. Add comments to other withdrawal functions for completeness
-- ============================================================
COMMENT ON FUNCTION public.approve_withdrawal(uuid, numeric, text) IS 
'Transitions withdrawal from pending→approved. Requires admin. Uses advisory lock and validates available balance. Logs to withdrawal_audit_logs.';

COMMENT ON FUNCTION public.reject_withdrawal(uuid, text, text) IS 
'Transitions withdrawal from pending→rejected. Requires admin. Logs to withdrawal_audit_logs.';

COMMENT ON FUNCTION public.complete_withdrawal(uuid, numeric, timestamp with time zone, text, text) IS 
'Transitions withdrawal from processing→completed. Requires super_admin. Calls apply_withdrawal_with_crystallization for ledger impact. Logs to withdrawal_audit_logs.';

COMMENT ON FUNCTION public.create_withdrawal_request(uuid, uuid, numeric, text, text) IS 
'Creates a new withdrawal request in pending state. Validates available balance. Triggers automatic audit logging.';

COMMENT ON FUNCTION public.update_withdrawal(uuid, numeric, text, text, text) IS 
'Updates a pending withdrawal request. Only amount, type, and notes can be modified. Logs to withdrawal_audit_logs.';

COMMENT ON FUNCTION public.delete_withdrawal(uuid, text, boolean) IS 
'Soft or hard deletes a withdrawal request. Soft delete sets status to cancelled. Hard delete removes the record (GDPR). Logs to withdrawal_audit_logs.';

COMMENT ON FUNCTION public.route_withdrawal_to_fees(uuid, text) IS 
'Routes a withdrawal to the INDIGO FEES account instead of external payout. Used for fee crystallization. Logs to withdrawal_audit_logs.';

COMMENT ON FUNCTION public.log_withdrawal_action(uuid, withdrawal_action, jsonb) IS 
'Helper function to insert audit entries into withdrawal_audit_logs table. Used by all state transition functions.';

COMMENT ON FUNCTION public.acquire_withdrawal_lock(uuid) IS 
'Acquires a PostgreSQL advisory lock for a withdrawal request to prevent concurrent modifications. Returns true if lock acquired.';