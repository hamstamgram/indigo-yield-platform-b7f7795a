-- ============================================================================
-- PHASE 3B: Two-Key MFA Reset Protocol (Fixed)
-- MFA resets require user request + Super-Admin Digital Signature
-- ============================================================================

-- Create the MFA Reset Requests table
CREATE TABLE IF NOT EXISTS mfa_reset_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_at timestamptz DEFAULT now() NOT NULL,
  request_reason text NOT NULL,
  requester_ip inet,
  requester_user_agent text,
  status text DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'executed')),
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  approval_signature text,  -- Format: "admin_id:timestamp:sha256_hash"
  rejection_reason text,
  rejected_by uuid REFERENCES auth.users(id),
  rejected_at timestamptz,
  expires_at timestamptz DEFAULT (now() + interval '24 hours') NOT NULL,
  executed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Add RLS
ALTER TABLE mfa_reset_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view own MFA reset requests"
  ON mfa_reset_requests FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all requests (is_admin takes no args, uses auth.uid() internally)
CREATE POLICY "Admins can view all MFA reset requests"
  ON mfa_reset_requests FOR SELECT
  USING (is_admin());

-- Users can insert their own requests
CREATE POLICY "Users can request MFA reset"
  ON mfa_reset_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Only super admins can update (approve/reject)
CREATE POLICY "Super admins can update MFA reset requests"
  ON mfa_reset_requests FOR UPDATE
  USING (is_super_admin(auth.uid()));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mfa_reset_pending 
  ON mfa_reset_requests(user_id, status) 
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_mfa_reset_expires 
  ON mfa_reset_requests(expires_at) 
  WHERE status = 'pending';

-- ============================================================================
-- RPC: Request MFA Reset (called by user)
-- ============================================================================
CREATE OR REPLACE FUNCTION request_mfa_reset(
  p_reason text,
  p_ip inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_existing_pending uuid;
  v_request_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Check for existing pending request
  SELECT id INTO v_existing_pending
  FROM mfa_reset_requests
  WHERE user_id = v_user_id
    AND status = 'pending'
    AND expires_at > now()
  LIMIT 1;
  
  IF v_existing_pending IS NOT NULL THEN
    RAISE EXCEPTION 'You already have a pending MFA reset request. Wait for admin approval or expiration.';
  END IF;
  
  -- Create the request
  INSERT INTO mfa_reset_requests (user_id, request_reason, requester_ip, requester_user_agent)
  VALUES (v_user_id, p_reason, p_ip, p_user_agent)
  RETURNING id INTO v_request_id;
  
  -- Audit log
  INSERT INTO audit_log (action, entity, entity_id, actor_user, new_values, meta)
  VALUES (
    'MFA_RESET_REQUESTED',
    'mfa_reset_requests',
    v_request_id::text,
    v_user_id,
    jsonb_build_object('reason', p_reason, 'expires_at', now() + interval '24 hours'),
    jsonb_build_object('two_key_protocol', true, 'step', 1, 'awaiting', 'super_admin_approval')
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'request_id', v_request_id,
    'status', 'pending',
    'expires_at', now() + interval '24 hours',
    'message', 'Your MFA reset request has been submitted. A Super Administrator must approve it within 24 hours.'
  );
END;
$$;

-- ============================================================================
-- RPC: Approve MFA Reset (called by super_admin)
-- Creates cryptographic signature and burns to audit log
-- ============================================================================
CREATE OR REPLACE FUNCTION approve_mfa_reset(
  p_request_id uuid,
  p_admin_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid;
  v_request RECORD;
  v_signature text;
  v_timestamp timestamptz;
BEGIN
  v_admin_id := COALESCE(p_admin_id, auth.uid());
  
  -- Require super_admin role
  IF NOT is_super_admin(v_admin_id) THEN
    RAISE EXCEPTION 'Only Super Administrators can approve MFA reset requests';
  END IF;
  
  -- Get the request
  SELECT * INTO v_request 
  FROM mfa_reset_requests 
  WHERE id = p_request_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'MFA reset request not found: %', p_request_id;
  END IF;
  
  IF v_request.status != 'pending' THEN
    RAISE EXCEPTION 'Request already processed with status: %', v_request.status;
  END IF;
  
  IF v_request.expires_at < now() THEN
    -- Mark as expired
    UPDATE mfa_reset_requests 
    SET status = 'expired' 
    WHERE id = p_request_id;
    RAISE EXCEPTION 'Request has expired';
  END IF;
  
  -- Prevent self-approval
  IF v_admin_id = v_request.user_id THEN
    RAISE EXCEPTION 'Cannot approve your own MFA reset request. Another Super Admin must approve.';
  END IF;
  
  -- Generate cryptographic approval signature
  -- Format: admin_id:timestamp:sha256(request_id + admin_id + timestamp)
  v_timestamp := now();
  v_signature := v_admin_id::text || ':' || v_timestamp::text || ':' || 
                 encode(sha256((p_request_id::text || v_admin_id::text || v_timestamp::text)::bytea), 'hex');
  
  -- Update the request with approval
  UPDATE mfa_reset_requests SET
    status = 'approved',
    approved_by = v_admin_id,
    approved_at = v_timestamp,
    approval_signature = v_signature
  WHERE id = p_request_id;
  
  -- Burn the approval signature into the immutable audit_log
  INSERT INTO audit_log (action, entity, entity_id, actor_user, new_values, meta)
  VALUES (
    'MFA_RESET_APPROVED',
    'mfa_reset_requests',
    p_request_id::text,
    v_admin_id,
    jsonb_build_object(
      'user_id', v_request.user_id,
      'approval_signature', v_signature,
      'approved_at', v_timestamp
    ),
    jsonb_build_object(
      'two_key_protocol', true,
      'step', 2,
      'requester', v_request.user_id,
      'approver', v_admin_id,
      'signature_burned', true
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'request_id', p_request_id,
    'user_id', v_request.user_id,
    'status', 'approved',
    'signature', v_signature,
    'approved_at', v_timestamp,
    'message', 'MFA reset approved. User can now reset their MFA.'
  );
END;
$$;

-- ============================================================================
-- RPC: Reject MFA Reset (called by super_admin)
-- ============================================================================
CREATE OR REPLACE FUNCTION reject_mfa_reset(
  p_request_id uuid,
  p_reason text,
  p_admin_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid;
  v_request RECORD;
BEGIN
  v_admin_id := COALESCE(p_admin_id, auth.uid());
  
  IF NOT is_super_admin(v_admin_id) THEN
    RAISE EXCEPTION 'Only Super Administrators can reject MFA reset requests';
  END IF;
  
  SELECT * INTO v_request FROM mfa_reset_requests WHERE id = p_request_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'MFA reset request not found';
  END IF;
  
  IF v_request.status != 'pending' THEN
    RAISE EXCEPTION 'Request already processed with status: %', v_request.status;
  END IF;
  
  UPDATE mfa_reset_requests SET
    status = 'rejected',
    rejected_by = v_admin_id,
    rejected_at = now(),
    rejection_reason = p_reason
  WHERE id = p_request_id;
  
  INSERT INTO audit_log (action, entity, entity_id, actor_user, new_values, meta)
  VALUES (
    'MFA_RESET_REJECTED',
    'mfa_reset_requests',
    p_request_id::text,
    v_admin_id,
    jsonb_build_object('reason', p_reason),
    jsonb_build_object('two_key_protocol', true, 'rejected', true)
  );
  
  RETURN jsonb_build_object('success', true, 'status', 'rejected');
END;
$$;

-- ============================================================================
-- RPC: Check if user can reset MFA (has approved request)
-- ============================================================================
CREATE OR REPLACE FUNCTION can_execute_mfa_reset(p_user_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_approved RECORD;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  SELECT * INTO v_approved
  FROM mfa_reset_requests
  WHERE user_id = v_user_id
    AND status = 'approved'
    AND executed_at IS NULL
    AND expires_at > now()
  ORDER BY approved_at DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('can_reset', false, 'reason', 'No approved MFA reset request found');
  END IF;
  
  RETURN jsonb_build_object(
    'can_reset', true,
    'request_id', v_approved.id,
    'approved_by', v_approved.approved_by,
    'approved_at', v_approved.approved_at,
    'signature', v_approved.approval_signature
  );
END;
$$;

-- ============================================================================
-- RPC: Mark MFA reset as executed (called after actual MFA unenroll)
-- ============================================================================
CREATE OR REPLACE FUNCTION mark_mfa_reset_executed(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request RECORD;
BEGIN
  SELECT * INTO v_request FROM mfa_reset_requests WHERE id = p_request_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;
  
  IF v_request.status != 'approved' THEN
    RAISE EXCEPTION 'Can only execute approved requests';
  END IF;
  
  IF auth.uid() != v_request.user_id THEN
    RAISE EXCEPTION 'Can only execute your own approved request';
  END IF;
  
  UPDATE mfa_reset_requests SET
    status = 'executed',
    executed_at = now()
  WHERE id = p_request_id;
  
  INSERT INTO audit_log (action, entity, entity_id, actor_user, new_values, meta)
  VALUES (
    'MFA_RESET_EXECUTED',
    'mfa_reset_requests',
    p_request_id::text,
    auth.uid(),
    jsonb_build_object('executed_at', now()),
    jsonb_build_object('two_key_protocol', true, 'step', 3, 'complete', true)
  );
  
  RETURN jsonb_build_object('success', true, 'executed_at', now());
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION request_mfa_reset(text, inet, text) TO authenticated;
GRANT EXECUTE ON FUNCTION approve_mfa_reset(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION reject_mfa_reset(uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION can_execute_mfa_reset(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_mfa_reset_executed(uuid) TO authenticated;