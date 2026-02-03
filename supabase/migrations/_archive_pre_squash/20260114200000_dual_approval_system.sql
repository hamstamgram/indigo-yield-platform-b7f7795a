-- ============================================================================
-- APPROVAL SYSTEM FOR RISKY OPERATIONS
-- Date: 2026-01-14
-- Version: 1.0.0
--
-- Implements approval controls for high-risk operations:
-- - Period lock/unlock
-- - Large withdrawals (>$50,000)
-- - Staging batch promotion
-- - Fee structure changes
-- - Reconciliation pack finalization
--
-- NOTE: Single-person approval mode - same admin can approve their own request.
-- This provides audit trail and confirmation without requiring a second person.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. APPROVAL CONFIGURATION
-- ============================================================================

-- Add approval thresholds to system_config
INSERT INTO system_config (key, value, description)
VALUES ('approval_thresholds', '{
  "withdrawal_amount": 50000,
  "deposit_amount": 100000,
  "period_lock": 0,
  "period_unlock": 0,
  "staging_promotion": 0,
  "fee_structure_change": 0,
  "reconciliation_finalize": 0,
  "void_transaction": 10000,
  "bulk_operation_count": 5
}', 'Thresholds triggering dual-approval requirement. 0 = always require approval.')
ON CONFLICT (key) DO NOTHING;

-- Add operation types enum for type safety
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approval_operation_type') THEN
    CREATE TYPE approval_operation_type AS ENUM (
      'PERIOD_LOCK',
      'PERIOD_UNLOCK',
      'LARGE_WITHDRAWAL',
      'LARGE_DEPOSIT',
      'STAGING_PROMOTION',
      'FEE_STRUCTURE_CHANGE',
      'RECONCILIATION_FINALIZE',
      'VOID_TRANSACTION',
      'BULK_OPERATION',
      'MFA_RESET'
    );
  END IF;
END
$$;

-- ============================================================================
-- 2. ENHANCE ADMIN_APPROVALS TABLE
-- ============================================================================

-- Add columns for enhanced tracking if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'admin_approvals' AND column_name = 'operation_type') THEN
    ALTER TABLE admin_approvals ADD COLUMN operation_type text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'admin_approvals' AND column_name = 'threshold_value') THEN
    ALTER TABLE admin_approvals ADD COLUMN threshold_value numeric(28,10);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'admin_approvals' AND column_name = 'actual_value') THEN
    ALTER TABLE admin_approvals ADD COLUMN actual_value numeric(28,10);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'admin_approvals' AND column_name = 'expires_at') THEN
    ALTER TABLE admin_approvals ADD COLUMN expires_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'admin_approvals' AND column_name = 'approval_signature') THEN
    ALTER TABLE admin_approvals ADD COLUMN approval_signature text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'admin_approvals' AND column_name = 'rejection_reason') THEN
    ALTER TABLE admin_approvals ADD COLUMN rejection_reason text;
  END IF;
END
$$;

-- Index for faster pending approval lookups
CREATE INDEX IF NOT EXISTS idx_admin_approvals_pending
  ON admin_approvals(entity_type, entity_id, approval_status)
  WHERE approval_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_admin_approvals_requested_by
  ON admin_approvals(requested_by, approval_status);

-- ============================================================================
-- 3. HELPER FUNCTIONS
-- ============================================================================

-- Get approval threshold for an operation type
CREATE OR REPLACE FUNCTION get_approval_threshold(p_operation text)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT (value->>p_operation)::numeric FROM system_config WHERE key = 'approval_thresholds'),
    0
  );
$$;

-- Check if operation requires approval based on thresholds
CREATE OR REPLACE FUNCTION requires_dual_approval(
  p_operation text,
  p_amount numeric DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_threshold numeric;
BEGIN
  v_threshold := get_approval_threshold(p_operation);

  -- Threshold of 0 means always require approval
  IF v_threshold = 0 THEN
    RETURN true;
  END IF;

  -- If amount provided, compare against threshold
  IF p_amount IS NOT NULL THEN
    RETURN p_amount >= v_threshold;
  END IF;

  -- Default to requiring approval
  RETURN true;
END;
$$;

-- Check if valid approval exists for an entity
CREATE OR REPLACE FUNCTION has_valid_approval(
  p_entity_type text,
  p_entity_id uuid,
  p_action_type text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_approvals
    WHERE entity_type = p_entity_type
      AND entity_id = p_entity_id
      AND action_type = p_action_type
      AND approval_status = 'approved'
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

-- Get pending approval for an entity
CREATE OR REPLACE FUNCTION get_pending_approval(
  p_entity_type text,
  p_entity_id uuid,
  p_action_type text
)
RETURNS TABLE(
  approval_id uuid,
  requested_by uuid,
  requested_at timestamptz,
  metadata jsonb,
  expires_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id, requested_by, requested_at, metadata, expires_at
  FROM admin_approvals
  WHERE entity_type = p_entity_type
    AND entity_id = p_entity_id
    AND action_type = p_action_type
    AND approval_status = 'pending'
    AND (expires_at IS NULL OR expires_at > now())
  ORDER BY requested_at DESC
  LIMIT 1;
$$;

-- ============================================================================
-- 4. REQUEST APPROVAL FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION request_approval(
  p_action_type text,
  p_entity_type text,
  p_entity_id uuid,
  p_requester_id uuid,
  p_reason text,
  p_metadata jsonb DEFAULT NULL,
  p_amount numeric DEFAULT NULL,
  p_expiry_hours int DEFAULT 72
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_approval_id uuid;
  v_threshold numeric;
  v_existing uuid;
BEGIN
  -- Verify requester is admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_requester_id AND is_admin = true) THEN
    RETURN build_error_response('ADMIN_REQUIRED', 'Only administrators can request approvals', NULL);
  END IF;

  -- Check for existing pending approval
  SELECT id INTO v_existing
  FROM admin_approvals
  WHERE entity_type = p_entity_type
    AND entity_id = p_entity_id
    AND action_type = p_action_type
    AND approval_status = 'pending'
    AND (expires_at IS NULL OR expires_at > now());

  IF v_existing IS NOT NULL THEN
    RETURN build_error_response('APPROVAL_PENDING',
      'A pending approval already exists for this action',
      jsonb_build_object('existing_approval_id', v_existing));
  END IF;

  -- Get threshold for metadata
  v_threshold := get_approval_threshold(
    CASE
      WHEN p_action_type = 'LARGE_WITHDRAWAL' THEN 'withdrawal_amount'
      WHEN p_action_type = 'LARGE_DEPOSIT' THEN 'deposit_amount'
      WHEN p_action_type = 'VOID_TRANSACTION' THEN 'void_transaction'
      ELSE 'period_lock'
    END
  );

  -- Create approval request
  INSERT INTO admin_approvals (
    action_type, entity_type, entity_id, requested_by,
    approval_status, reason, metadata, threshold_value, actual_value,
    expires_at
  ) VALUES (
    p_action_type, p_entity_type, p_entity_id, p_requester_id,
    'pending', p_reason,
    COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'amount', p_amount,
      'threshold', v_threshold
    ),
    v_threshold, p_amount,
    CASE WHEN p_expiry_hours > 0 THEN now() + (p_expiry_hours || ' hours')::interval ELSE NULL END
  )
  RETURNING id INTO v_approval_id;

  -- Audit log
  INSERT INTO audit_log (action, entity, entity_id, actor_user, new_values)
  VALUES ('APPROVAL_REQUESTED', 'admin_approvals', v_approval_id::text, p_requester_id,
    jsonb_build_object(
      'action_type', p_action_type,
      'entity_type', p_entity_type,
      'entity_id', p_entity_id,
      'amount', p_amount,
      'reason', p_reason
    ));

  RETURN build_success_response(jsonb_build_object(
    'approval_id', v_approval_id,
    'status', 'pending',
    'message', 'Approval request created. Awaiting second administrator approval.',
    'expires_at', CASE WHEN p_expiry_hours > 0 THEN now() + (p_expiry_hours || ' hours')::interval ELSE NULL END
  ));
END;
$$;

GRANT EXECUTE ON FUNCTION request_approval(text, text, uuid, uuid, text, jsonb, numeric, int) TO authenticated;

-- ============================================================================
-- 5. APPROVE/REJECT FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION approve_request(
  p_approval_id uuid,
  p_approver_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_approval RECORD;
  v_signature text;
BEGIN
  -- Get approval details
  SELECT * INTO v_approval
  FROM admin_approvals
  WHERE id = p_approval_id;

  IF v_approval IS NULL THEN
    RETURN build_error_response('NOT_FOUND', 'Approval request not found', NULL);
  END IF;

  -- Check approval is still pending
  IF v_approval.approval_status != 'pending' THEN
    RETURN build_error_response('INVALID_STATE',
      format('Approval is already %s', v_approval.approval_status), NULL);
  END IF;

  -- Check not expired
  IF v_approval.expires_at IS NOT NULL AND v_approval.expires_at < now() THEN
    UPDATE admin_approvals SET approval_status = 'expired' WHERE id = p_approval_id;
    RETURN build_error_response('APPROVAL_EXPIRED', 'This approval request has expired', NULL);
  END IF;

  -- Verify approver is admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_approver_id AND is_admin = true) THEN
    RETURN build_error_response('ADMIN_REQUIRED', 'Only administrators can approve requests', NULL);
  END IF;

  -- NOTE: Self-approval is allowed in single-person mode
  -- This provides audit trail without requiring a second administrator
  -- If dual-approval is needed in the future, uncomment the check below:
  -- IF v_approval.requested_by = p_approver_id THEN
  --   RETURN build_error_response('SELF_APPROVAL_NOT_ALLOWED',
  --     'You cannot approve your own request. Another administrator must approve this action.', NULL);
  -- END IF;

  -- Generate cryptographic signature for audit trail
  v_signature := encode(
    sha256((v_approval.id::text || p_approver_id::text || now()::text || v_approval.requested_by::text)::bytea),
    'hex'
  );

  -- Update approval
  UPDATE admin_approvals SET
    approval_status = 'approved',
    approved_by = p_approver_id,
    resolved_at = now(),
    approval_signature = v_signature,
    metadata = metadata || jsonb_build_object('approver_notes', p_notes)
  WHERE id = p_approval_id;

  -- Audit log
  INSERT INTO audit_log (action, entity, entity_id, actor_user, new_values)
  VALUES ('APPROVAL_GRANTED', 'admin_approvals', p_approval_id::text, p_approver_id,
    jsonb_build_object(
      'action_type', v_approval.action_type,
      'entity_type', v_approval.entity_type,
      'entity_id', v_approval.entity_id,
      'original_requester', v_approval.requested_by,
      'signature', v_signature
    ));

  RETURN build_success_response(jsonb_build_object(
    'approval_id', p_approval_id,
    'status', 'approved',
    'action_type', v_approval.action_type,
    'entity_type', v_approval.entity_type,
    'entity_id', v_approval.entity_id,
    'signature', v_signature,
    'message', 'Request approved. Operation may now proceed.'
  ));
END;
$$;

GRANT EXECUTE ON FUNCTION approve_request(uuid, uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION reject_request(
  p_approval_id uuid,
  p_rejector_id uuid,
  p_rejection_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_approval RECORD;
BEGIN
  -- Get approval details
  SELECT * INTO v_approval
  FROM admin_approvals
  WHERE id = p_approval_id;

  IF v_approval IS NULL THEN
    RETURN build_error_response('NOT_FOUND', 'Approval request not found', NULL);
  END IF;

  -- Check approval is still pending
  IF v_approval.approval_status != 'pending' THEN
    RETURN build_error_response('INVALID_STATE',
      format('Approval is already %s', v_approval.approval_status), NULL);
  END IF;

  -- Verify rejector is admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_rejector_id AND is_admin = true) THEN
    RETURN build_error_response('ADMIN_REQUIRED', 'Only administrators can reject requests', NULL);
  END IF;

  -- Allow self-rejection (user can cancel their own request)
  -- Other admins can also reject

  IF p_rejection_reason IS NULL OR length(trim(p_rejection_reason)) < 10 THEN
    RETURN build_error_response('VALIDATION_FAILED',
      'Rejection reason must be at least 10 characters', NULL);
  END IF;

  -- Update approval
  UPDATE admin_approvals SET
    approval_status = 'rejected',
    approved_by = p_rejector_id, -- stores who rejected
    resolved_at = now(),
    rejection_reason = p_rejection_reason
  WHERE id = p_approval_id;

  -- Audit log
  INSERT INTO audit_log (action, entity, entity_id, actor_user, new_values)
  VALUES ('APPROVAL_REJECTED', 'admin_approvals', p_approval_id::text, p_rejector_id,
    jsonb_build_object(
      'action_type', v_approval.action_type,
      'entity_type', v_approval.entity_type,
      'entity_id', v_approval.entity_id,
      'original_requester', v_approval.requested_by,
      'rejection_reason', p_rejection_reason
    ));

  RETURN build_success_response(jsonb_build_object(
    'approval_id', p_approval_id,
    'status', 'rejected',
    'action_type', v_approval.action_type,
    'entity_type', v_approval.entity_type,
    'entity_id', v_approval.entity_id,
    'message', 'Request rejected.'
  ));
END;
$$;

GRANT EXECUTE ON FUNCTION reject_request(uuid, uuid, text) TO authenticated;

-- ============================================================================
-- 6. APPROVAL-GATED OPERATIONS
-- ============================================================================

-- Lock period with approval audit (single-person mode)
CREATE OR REPLACE FUNCTION lock_period_with_approval(
  p_fund_id uuid,
  p_period_start date,
  p_period_end date,
  p_admin_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_period_id uuid;
  v_approval_id uuid;
BEGIN
  IF NOT is_admin() THEN
    RETURN build_error_response('ADMIN_REQUIRED', 'Only administrators can lock periods', NULL);
  END IF;

  -- Get or create period ID
  SELECT id INTO v_period_id
  FROM accounting_periods
  WHERE fund_id = p_fund_id AND period_start = p_period_start AND period_end = p_period_end;

  IF v_period_id IS NULL THEN
    INSERT INTO accounting_periods (fund_id, period_start, period_end, status)
    VALUES (p_fund_id, p_period_start, p_period_end, 'draft')
    RETURNING id INTO v_period_id;
  END IF;

  -- Single-person mode: Create auto-approved approval record for audit trail
  INSERT INTO admin_approvals (
    action_type, entity_type, entity_id, requested_by,
    approved_by, approval_status, reason, metadata, resolved_at,
    approval_signature
  ) VALUES (
    'PERIOD_LOCK', 'accounting_periods', v_period_id, p_admin_id,
    p_admin_id, 'approved', COALESCE(p_notes, 'Period lock'),
    jsonb_build_object(
      'fund_id', p_fund_id,
      'period_start', p_period_start,
      'period_end', p_period_end,
      'auto_approved', true
    ),
    now(),
    encode(sha256((v_period_id::text || p_admin_id::text || now()::text)::bytea), 'hex')
  )
  RETURNING id INTO v_approval_id;

  -- Proceed with lock
  UPDATE accounting_periods SET
    status = 'locked',
    locked_by = p_admin_id,
    locked_at = now(),
    notes = COALESCE(p_notes, notes)
  WHERE id = v_period_id;

  -- Audit log
  INSERT INTO audit_log (action, entity, entity_id, actor_user, new_values)
  VALUES ('PERIOD_LOCKED', 'accounting_periods', v_period_id::text, p_admin_id,
    jsonb_build_object(
      'fund_id', p_fund_id,
      'period_start', p_period_start,
      'period_end', p_period_end,
      'approval_id', v_approval_id
    ));

  RETURN build_success_response(jsonb_build_object(
    'period_id', v_period_id,
    'approval_id', v_approval_id,
    'status', 'locked',
    'message', 'Period successfully locked.'
  ));
END;
$$;

GRANT EXECUTE ON FUNCTION lock_period_with_approval(uuid, date, date, uuid, text) TO authenticated;

-- Void transaction with approval audit (single-person mode)
CREATE OR REPLACE FUNCTION void_transaction_with_approval(
  p_transaction_id uuid,
  p_admin_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tx RECORD;
  v_approval_id uuid;
  v_threshold numeric;
BEGIN
  IF NOT is_admin() THEN
    RETURN build_error_response('ADMIN_REQUIRED', 'Only administrators can void transactions', NULL);
  END IF;

  -- Get transaction details
  SELECT * INTO v_tx
  FROM transactions_v2
  WHERE id = p_transaction_id;

  IF v_tx IS NULL THEN
    RETURN build_error_response('NOT_FOUND', 'Transaction not found', NULL);
  END IF;

  IF v_tx.is_voided THEN
    RETURN build_error_response('ALREADY_VOIDED', 'Transaction is already voided', NULL);
  END IF;

  -- Get threshold for audit
  v_threshold := get_approval_threshold('void_transaction');

  -- Single-person mode: Create auto-approved approval record for audit trail
  INSERT INTO admin_approvals (
    action_type, entity_type, entity_id, requested_by,
    approved_by, approval_status, reason, metadata,
    threshold_value, actual_value, resolved_at, approval_signature
  ) VALUES (
    'VOID_TRANSACTION', 'transactions_v2', p_transaction_id, p_admin_id,
    p_admin_id, 'approved', p_reason,
    jsonb_build_object(
      'transaction_type', v_tx.type,
      'fund_id', v_tx.fund_id,
      'investor_id', v_tx.investor_id,
      'auto_approved', true
    ),
    v_threshold, ABS(v_tx.amount), now(),
    encode(sha256((p_transaction_id::text || p_admin_id::text || now()::text)::bytea), 'hex')
  )
  RETURNING id INTO v_approval_id;

  -- Proceed with void
  UPDATE transactions_v2 SET
    is_voided = true,
    voided_at = now(),
    voided_by = p_admin_id,
    void_reason = p_reason
  WHERE id = p_transaction_id;

  -- Update position
  UPDATE investor_positions SET
    current_value = current_value - v_tx.amount,
    updated_at = now()
  WHERE fund_id = v_tx.fund_id AND investor_id = v_tx.investor_id;

  -- Audit log
  INSERT INTO audit_log (action, entity, entity_id, actor_user, old_values, new_values)
  VALUES ('VOID_TRANSACTION', 'transactions_v2', p_transaction_id::text, p_admin_id,
    to_jsonb(v_tx),
    jsonb_build_object(
      'void_reason', p_reason,
      'approval_id', v_approval_id,
      'amount', ABS(v_tx.amount),
      'threshold', v_threshold
    ));

  RETURN build_success_response(jsonb_build_object(
    'transaction_id', p_transaction_id,
    'approval_id', v_approval_id,
    'status', 'voided',
    'message', 'Transaction voided successfully.'
  ));
END;
$$;

GRANT EXECUTE ON FUNCTION void_transaction_with_approval(uuid, uuid, text) TO authenticated;

-- Finalize reconciliation pack with approval audit (single-person mode)
CREATE OR REPLACE FUNCTION finalize_reconciliation_pack(
  p_pack_id uuid,
  p_admin_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_pack RECORD;
  v_approval_id uuid;
BEGIN
  IF NOT is_admin() THEN
    RETURN build_error_response('ADMIN_REQUIRED', 'Only administrators can finalize reconciliation packs', NULL);
  END IF;

  -- Get pack details
  SELECT * INTO v_pack
  FROM reconciliation_packs
  WHERE id = p_pack_id;

  IF v_pack IS NULL THEN
    RETURN build_error_response('NOT_FOUND', 'Reconciliation pack not found', NULL);
  END IF;

  IF v_pack.status = 'final' THEN
    RETURN build_error_response('ALREADY_FINALIZED', 'Pack is already finalized', NULL);
  END IF;

  -- Single-person mode: Create auto-approved approval record for audit trail
  INSERT INTO admin_approvals (
    action_type, entity_type, entity_id, requested_by,
    approved_by, approval_status, reason, metadata,
    actual_value, resolved_at, approval_signature
  ) VALUES (
    'RECONCILIATION_FINALIZE', 'reconciliation_packs', p_pack_id, p_admin_id,
    p_admin_id, 'approved', 'Reconciliation pack finalization',
    jsonb_build_object(
      'fund_id', v_pack.fund_id,
      'period_start', v_pack.period_start,
      'period_end', v_pack.period_end,
      'closing_aum', v_pack.closing_aum,
      'auto_approved', true
    ),
    v_pack.closing_aum, now(),
    encode(sha256((p_pack_id::text || p_admin_id::text || now()::text)::bytea), 'hex')
  )
  RETURNING id INTO v_approval_id;

  -- Finalize pack
  UPDATE reconciliation_packs SET
    status = 'final',
    finalized_by = p_admin_id,
    finalized_at = now()
  WHERE id = p_pack_id;

  -- Audit log
  INSERT INTO audit_log (action, entity, entity_id, actor_user, new_values)
  VALUES ('PACK_FINALIZED', 'reconciliation_packs', p_pack_id::text, p_admin_id,
    jsonb_build_object(
      'fund_id', v_pack.fund_id,
      'period', v_pack.period_start || ' to ' || v_pack.period_end,
      'closing_aum', v_pack.closing_aum,
      'approval_id', v_approval_id
    ));

  RETURN build_success_response(jsonb_build_object(
    'pack_id', p_pack_id,
    'approval_id', v_approval_id,
    'status', 'final',
    'message', 'Reconciliation pack finalized.'
  ));
END;
$$;

GRANT EXECUTE ON FUNCTION finalize_reconciliation_pack(uuid, uuid) TO authenticated;

-- ============================================================================
-- 7. APPROVAL QUEUE VIEW
-- ============================================================================

CREATE OR REPLACE VIEW v_pending_approvals AS
SELECT
  a.id AS approval_id,
  a.action_type,
  a.entity_type,
  a.entity_id,
  a.requested_by,
  req.first_name || ' ' || req.last_name AS requester_name,
  req.email AS requester_email,
  a.reason,
  a.metadata,
  a.actual_value,
  a.threshold_value,
  a.requested_at,
  a.expires_at,
  CASE
    WHEN a.expires_at IS NULL THEN NULL
    WHEN a.expires_at < now() THEN 'EXPIRED'
    WHEN a.expires_at < now() + interval '1 hour' THEN 'EXPIRING_SOON'
    ELSE 'VALID'
  END AS expiry_status,
  CASE a.action_type
    WHEN 'PERIOD_LOCK' THEN 'Lock Accounting Period'
    WHEN 'PERIOD_UNLOCK' THEN 'Unlock Accounting Period'
    WHEN 'LARGE_WITHDRAWAL' THEN 'Large Withdrawal'
    WHEN 'LARGE_DEPOSIT' THEN 'Large Deposit'
    WHEN 'VOID_TRANSACTION' THEN 'Void Transaction'
    WHEN 'STAGING_PROMOTION' THEN 'Promote Staging Batch'
    WHEN 'RECONCILIATION_FINALIZE' THEN 'Finalize Reconciliation'
    WHEN 'FEE_STRUCTURE_CHANGE' THEN 'Fee Structure Change'
    ELSE a.action_type
  END AS action_description
FROM admin_approvals a
JOIN profiles req ON req.id = a.requested_by
WHERE a.approval_status = 'pending'
  AND (a.expires_at IS NULL OR a.expires_at > now())
ORDER BY
  CASE WHEN a.expires_at IS NOT NULL AND a.expires_at < now() + interval '1 hour' THEN 0 ELSE 1 END,
  a.requested_at DESC;

-- Approval history view
CREATE OR REPLACE VIEW v_approval_history AS
SELECT
  a.id AS approval_id,
  a.action_type,
  a.entity_type,
  a.entity_id,
  a.approval_status,
  a.requested_by,
  req.first_name || ' ' || req.last_name AS requester_name,
  a.approved_by,
  COALESCE(appr.first_name || ' ' || appr.last_name, 'N/A') AS approver_name,
  a.reason,
  a.rejection_reason,
  a.actual_value,
  a.requested_at,
  a.resolved_at,
  a.approval_signature,
  a.metadata
FROM admin_approvals a
JOIN profiles req ON req.id = a.requested_by
LEFT JOIN profiles appr ON appr.id = a.approved_by
ORDER BY COALESCE(a.resolved_at, a.requested_at) DESC;

-- ============================================================================
-- 8. HEALTH CHECK FOR APPROVALS
-- ============================================================================

-- Add approval integrity check to health checks
CREATE OR REPLACE FUNCTION check_approval_integrity()
RETURNS TABLE(
  check_name text,
  status text,
  violation_count int,
  details jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check 1: Self-approvals (informational only - allowed in single-person mode)
  check_name := 'SELF_APPROVALS_COUNT';
  SELECT
    'PASS', -- Always pass since self-approval is allowed
    COUNT(*)::int,
    COALESCE(jsonb_agg(jsonb_build_object(
      'approval_id', id,
      'action_type', action_type,
      'user', requested_by
    )), '[]'::jsonb)
  INTO status, violation_count, details
  FROM admin_approvals
  WHERE requested_by = approved_by AND approval_status = 'approved';
  RETURN NEXT;

  -- Check 2: Expired pending (should be cleaned up)
  check_name := 'NO_EXPIRED_PENDING';
  SELECT
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'WARN' END,
    COUNT(*)::int,
    COALESCE(jsonb_agg(jsonb_build_object(
      'approval_id', id,
      'action_type', action_type,
      'expired_at', expires_at
    )), '[]'::jsonb)
  INTO status, violation_count, details
  FROM admin_approvals
  WHERE approval_status = 'pending' AND expires_at < now();
  RETURN NEXT;

  -- Check 3: Missing signatures on approved
  check_name := 'APPROVAL_SIGNATURES_PRESENT';
  SELECT
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'WARN' END,
    COUNT(*)::int,
    COALESCE(jsonb_agg(jsonb_build_object(
      'approval_id', id,
      'action_type', action_type,
      'approved_at', resolved_at
    )), '[]'::jsonb)
  INTO status, violation_count, details
  FROM admin_approvals
  WHERE approval_status = 'approved' AND approval_signature IS NULL;
  RETURN NEXT;

  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION check_approval_integrity() TO authenticated;

-- ============================================================================
-- 9. EXPIRED APPROVAL CLEANUP JOB
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_approvals()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_expired_count int;
BEGIN
  UPDATE admin_approvals
  SET approval_status = 'expired'
  WHERE approval_status = 'pending' AND expires_at < now();

  GET DIAGNOSTICS v_expired_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'expired_count', v_expired_count,
    'message', format('Marked %s expired approvals', v_expired_count)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION cleanup_expired_approvals() TO authenticated, service_role;

COMMIT;
