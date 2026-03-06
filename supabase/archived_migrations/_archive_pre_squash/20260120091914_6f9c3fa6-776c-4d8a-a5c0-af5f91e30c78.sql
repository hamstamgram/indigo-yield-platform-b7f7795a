-- ============================================================================
-- Migration: Remove Duplicate Writers from Canonical RPCs
-- ============================================================================
-- This migration removes direct investor_positions writes from all canonical
-- RPCs. Position updates are now handled EXCLUSIVELY by the trigger chain:
--   transactions_v2 INSERT/UPDATE → trg_recompute_position_on_tx → recompute_investor_position()
-- ============================================================================

-- ============================================================================
-- PHASE 0: Drop existing function signatures to allow parameter rename
-- ============================================================================

DROP FUNCTION IF EXISTS public.apply_deposit_with_crystallization(uuid, uuid, numeric, numeric, date, uuid, text, public.aum_purpose);
DROP FUNCTION IF EXISTS public.apply_withdrawal_with_crystallization(uuid, uuid, numeric, numeric, date, uuid, text, public.aum_purpose);
DROP FUNCTION IF EXISTS public.void_transaction(uuid, uuid, text);
DROP FUNCTION IF EXISTS public.void_yield_distribution(uuid, uuid, text);
DROP FUNCTION IF EXISTS public.admin_create_transaction(uuid, uuid, text, numeric, date, text, text, uuid);

-- ============================================================================
-- PHASE 1: HIGH PRIORITY - Core Transaction RPCs (no direct position writes)
-- ============================================================================

-- 1.1 apply_deposit_with_crystallization
CREATE OR REPLACE FUNCTION public.apply_deposit_with_crystallization(
  p_fund_id uuid,
  p_investor_id uuid,
  p_amount numeric,
  p_closing_aum numeric,
  p_effective_date date,
  p_admin_id uuid,
  p_notes text DEFAULT NULL,
  p_purpose public.aum_purpose DEFAULT 'transaction'::public.aum_purpose
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
  v_tx_id uuid;
BEGIN
  -- Enable canonical mutation flag for this transaction
  PERFORM public.set_canonical_rpc(true);

  -- Perform crystallization first
  PERFORM public.crystallize_yield_before_flow(
    p_fund_id := p_fund_id,
    p_closing_aum := p_closing_aum,
    p_event_ts := (p_effective_date::timestamp + interval '09:00:00'),
    p_admin_id := p_admin_id,
    p_trigger_type := 'deposit',
    p_trigger_reference := 'deposit:' || p_investor_id::text,
    p_purpose := p_purpose
  );

  -- Create the deposit transaction
  -- The trigger chain handles position updates automatically
  INSERT INTO public.transactions_v2 (
    investor_id,
    fund_id,
    type,
    amount,
    tx_date,
    notes,
    created_by,
    is_system_generated,
    visibility_scope,
    purpose,
    source
  ) VALUES (
    p_investor_id,
    p_fund_id,
    'DEPOSIT'::public.tx_type,
    ABS(p_amount),
    p_effective_date,
    COALESCE(p_notes, 'Deposit via canonical RPC'),
    p_admin_id,
    false,
    'admin',
    p_purpose,
    'rpc_canonical'
  )
  RETURNING id INTO v_tx_id;

  -- NOTE: Position update is handled by trg_recompute_position_on_tx trigger
  -- No direct UPDATE to investor_positions needed

  v_result := json_build_object(
    'success', true,
    'message', 'Deposit applied successfully',
    'amount', p_amount,
    'investor_id', p_investor_id,
    'fund_id', p_fund_id,
    'transaction_id', v_tx_id
  );

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE
    );
END;
$$;

-- 1.2 apply_withdrawal_with_crystallization
CREATE OR REPLACE FUNCTION public.apply_withdrawal_with_crystallization(
  p_fund_id uuid,
  p_investor_id uuid,
  p_amount numeric,
  p_new_total_aum numeric,
  p_tx_date date,
  p_admin_id uuid,
  p_notes text DEFAULT NULL,
  p_purpose public.aum_purpose DEFAULT 'transaction'::public.aum_purpose
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
  v_current_balance numeric;
  v_tx_id uuid;
BEGIN
  -- Enable canonical mutation flag for this transaction
  PERFORM public.set_canonical_rpc(true);

  -- Check available balance
  SELECT current_value INTO v_current_balance
  FROM public.investor_positions
  WHERE investor_id = p_investor_id
    AND fund_id = p_fund_id;

  IF v_current_balance IS NULL OR v_current_balance < ABS(p_amount) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Insufficient balance',
      'available', COALESCE(v_current_balance, 0),
      'requested', ABS(p_amount)
    );
  END IF;

  -- Perform crystallization first
  PERFORM public.crystallize_yield_before_flow(
    p_fund_id := p_fund_id,
    p_closing_aum := p_new_total_aum + ABS(p_amount),
    p_event_ts := (p_tx_date::timestamp + interval '09:00:00'),
    p_admin_id := p_admin_id,
    p_trigger_type := 'withdrawal',
    p_trigger_reference := 'withdrawal:' || p_investor_id::text,
    p_purpose := p_purpose
  );

  -- Create the withdrawal transaction
  INSERT INTO public.transactions_v2 (
    investor_id,
    fund_id,
    type,
    amount,
    tx_date,
    notes,
    created_by,
    is_system_generated,
    visibility_scope,
    purpose,
    source
  ) VALUES (
    p_investor_id,
    p_fund_id,
    'WITHDRAWAL'::public.tx_type,
    -ABS(p_amount),
    p_tx_date,
    COALESCE(p_notes, 'Withdrawal via canonical RPC'),
    p_admin_id,
    false,
    'admin',
    p_purpose,
    'rpc_canonical'
  )
  RETURNING id INTO v_tx_id;

  -- NOTE: Position update is handled by trg_recompute_position_on_tx trigger

  v_result := json_build_object(
    'success', true,
    'message', 'Withdrawal applied successfully',
    'amount', ABS(p_amount),
    'investor_id', p_investor_id,
    'fund_id', p_fund_id,
    'transaction_id', v_tx_id
  );

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE
    );
END;
$$;

-- 1.3 void_transaction
CREATE OR REPLACE FUNCTION public.void_transaction(
  p_transaction_id uuid,
  p_admin_id uuid,
  p_reason text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx RECORD;
  v_result json;
BEGIN
  -- Enable canonical mutation flag
  PERFORM public.set_canonical_rpc(true);

  -- Admin check
  IF NOT public.is_admin(p_admin_id) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Admin privileges required'
    );
  END IF;

  -- Get the transaction to void
  SELECT * INTO v_tx
  FROM public.transactions_v2
  WHERE id = p_transaction_id
    AND is_voided = false;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Transaction not found or already voided'
    );
  END IF;

  -- Mark as voided - trigger handles position update
  UPDATE public.transactions_v2
  SET
    is_voided = true,
    voided_at = NOW(),
    voided_by = p_admin_id,
    void_reason = p_reason
  WHERE id = p_transaction_id;

  -- NOTE: Position update is handled by trg_recompute_on_void trigger

  -- Audit log
  INSERT INTO public.audit_log (action, entity, entity_id, actor_user, old_values, new_values)
  VALUES (
    'VOID_TRANSACTION',
    'transactions_v2',
    p_transaction_id::text,
    p_admin_id,
    jsonb_build_object('is_voided', false, 'amount', v_tx.amount),
    jsonb_build_object('is_voided', true, 'void_reason', p_reason)
  );

  v_result := json_build_object(
    'success', true,
    'message', 'Transaction voided successfully',
    'transaction_id', p_transaction_id,
    'original_amount', v_tx.amount,
    'original_type', v_tx.type
  );

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE
    );
END;
$$;

-- 1.4 void_yield_distribution
CREATE OR REPLACE FUNCTION public.void_yield_distribution(
  p_distribution_id uuid,
  p_admin_id uuid,
  p_reason text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dist RECORD;
  v_result json;
BEGIN
  -- Enable canonical mutation flag
  PERFORM public.set_canonical_rpc(true);

  -- Admin check
  IF NOT public.is_admin(p_admin_id) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Admin privileges required'
    );
  END IF;

  -- Get the distribution to void
  SELECT yd.*, t.id as transaction_id INTO v_dist
  FROM public.yield_distributions yd
  LEFT JOIN public.transactions_v2 t ON t.reference_id = 'yield:' || yd.id::text
  WHERE yd.id = p_distribution_id
    AND yd.is_voided = false;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Yield distribution not found or already voided'
    );
  END IF;

  -- Mark the distribution as voided
  UPDATE public.yield_distributions
  SET
    is_voided = true,
    voided_at = NOW(),
    voided_by = p_admin_id,
    void_reason = p_reason
  WHERE id = p_distribution_id;

  -- Also void the related transaction if exists - trigger handles position
  IF v_dist.transaction_id IS NOT NULL THEN
    UPDATE public.transactions_v2
    SET
      is_voided = true,
      voided_at = NOW(),
      voided_by = p_admin_id,
      void_reason = 'Yield distribution voided: ' || p_reason
    WHERE id = v_dist.transaction_id
      AND is_voided = false;
  END IF;

  -- NOTE: Position update is handled by trg_recompute_on_void trigger

  -- Audit log
  INSERT INTO public.audit_log (action, entity, entity_id, actor_user, old_values, new_values)
  VALUES (
    'VOID_YIELD_DISTRIBUTION',
    'yield_distributions',
    p_distribution_id::text,
    p_admin_id,
    jsonb_build_object('is_voided', false, 'net_yield', v_dist.net_yield),
    jsonb_build_object('is_voided', true, 'void_reason', p_reason)
  );

  v_result := json_build_object(
    'success', true,
    'message', 'Yield distribution voided successfully',
    'distribution_id', p_distribution_id,
    'original_amount', v_dist.net_yield,
    'transaction_voided', v_dist.transaction_id IS NOT NULL
  );

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE
    );
END;
$$;

-- 1.5 admin_create_transaction
CREATE OR REPLACE FUNCTION public.admin_create_transaction(
  p_investor_id uuid,
  p_fund_id uuid,
  p_type text,
  p_amount numeric,
  p_tx_date date,
  p_notes text DEFAULT NULL,
  p_reference_id text DEFAULT NULL,
  p_admin_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx_id uuid;
  v_tx_type public.tx_type;
BEGIN
  -- Enable canonical mutation flag
  PERFORM public.set_canonical_rpc(true);

  -- Admin check
  IF NOT public.is_admin(COALESCE(p_admin_id, auth.uid())) THEN
    RAISE EXCEPTION 'Admin privileges required'
      USING ERRCODE = 'P0001';
  END IF;

  -- Validate transaction type
  BEGIN
    v_tx_type := p_type::public.tx_type;
  EXCEPTION
    WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'Invalid transaction type: %', p_type
        USING ERRCODE = '22P02';
  END;

  -- Create the transaction - trigger handles position
  INSERT INTO public.transactions_v2 (
    investor_id,
    fund_id,
    type,
    amount,
    tx_date,
    notes,
    reference_id,
    created_by,
    is_system_generated,
    visibility_scope,
    source
  ) VALUES (
    p_investor_id,
    p_fund_id,
    v_tx_type,
    p_amount,
    p_tx_date,
    p_notes,
    p_reference_id,
    COALESCE(p_admin_id, auth.uid()),
    false,
    'admin',
    'manual_admin'
  )
  RETURNING id INTO v_tx_id;

  -- NOTE: Position update is handled by trg_recompute_position_on_tx trigger

  RETURN v_tx_id;
END;
$$;

-- ============================================================================
-- PHASE 2: Verify triggers exist
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trg_recompute_position_on_tx'
    AND tgrelid = 'public.transactions_v2'::regclass
  ) THEN
    RAISE EXCEPTION 'CRITICAL: trg_recompute_position_on_tx trigger not found';
  END IF;
END;
$$;

-- ============================================================================
-- PHASE 3: Documentation
-- ============================================================================

COMMENT ON FUNCTION public.apply_deposit_with_crystallization IS
'Canonical deposit RPC. Position updates via trg_recompute_position_on_tx trigger only.';

COMMENT ON FUNCTION public.apply_withdrawal_with_crystallization IS
'Canonical withdrawal RPC. Position updates via trg_recompute_position_on_tx trigger only.';

COMMENT ON FUNCTION public.void_transaction IS
'Canonical void RPC. Position updates via trg_recompute_on_void trigger only.';

COMMENT ON FUNCTION public.void_yield_distribution IS
'Canonical yield void RPC. Position updates via trigger chain only.';

COMMENT ON FUNCTION public.admin_create_transaction IS
'Canonical admin transaction RPC. Position updates via trigger only.';