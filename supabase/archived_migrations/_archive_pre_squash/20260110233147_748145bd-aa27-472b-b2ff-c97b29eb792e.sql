-- ============================================================================
-- Global Type-Safe Hardening: UUID vs Text Mismatch Resolution
-- ============================================================================

-- Fix 1: log_data_edit - Cast to UUID for data_edit_audit.record_id
CREATE OR REPLACE FUNCTION public.log_data_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.data_edit_audit (
    table_name, 
    record_id,
    operation, 
    old_data, 
    new_data, 
    edited_by,
    edited_at
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id)::uuid,  -- FIXED: Explicit UUID cast
    TG_OP,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    auth.uid(),
    now()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Fix 2: audit_investor_fund_performance_changes - Add UUID cast
CREATE OR REPLACE FUNCTION public.audit_investor_fund_performance_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.data_edit_audit (
    table_name,
    record_id,
    operation,
    old_data,
    new_data,
    edited_by,
    edited_at,
    edit_source
  ) VALUES (
    'investor_fund_performance',
    COALESCE(NEW.id, OLD.id)::uuid,  -- FIXED: Explicit UUID cast
    TG_OP,
    CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END,
    auth.uid(),
    now(),
    'system'
  );
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Fix 3: finalize_statement_period - Use correct audit_log column names
CREATE OR REPLACE FUNCTION public.finalize_statement_period(
  p_period_id uuid,
  p_admin_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_current_status TEXT;
BEGIN
  -- Verify admin status
  SELECT is_admin INTO v_is_admin
  FROM profiles
  WHERE id = p_admin_id;

  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'Only administrators can finalize statement periods';
  END IF;

  -- Check current status
  SELECT status INTO v_current_status
  FROM statement_periods
  WHERE id = p_period_id;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Statement period not found';
  END IF;

  IF v_current_status = 'FINALIZED' THEN
    RAISE EXCEPTION 'Statement period is already finalized';
  END IF;

  -- Update the period status
  UPDATE statement_periods
  SET
    status = 'FINALIZED',
    finalized_at = NOW(),
    finalized_by = p_admin_id,
    updated_at = NOW()
  WHERE id = p_period_id;

  -- FIXED: Use correct audit_log column names
  INSERT INTO audit_log (
    action,
    entity,
    entity_id,
    actor_user,
    new_values,
    meta,
    created_at
  ) VALUES (
    'FINALIZE',
    'statement_periods',
    p_period_id::text,  -- entity_id is TEXT type
    p_admin_id,
    jsonb_build_object(
      'previous_status', v_current_status,
      'new_status', 'FINALIZED'
    ),
    jsonb_build_object('operation', 'period_finalization'),
    NOW()
  );
END;
$$;

-- Fix 4: cascade_void_from_transaction - Explicit UUID comparison
CREATE OR REPLACE FUNCTION public.cascade_void_from_transaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When a transaction is voided, mark related audit entries
  IF NEW.is_voided = true AND (OLD.is_voided IS NULL OR OLD.is_voided = false) THEN
    -- Mark data_edit_audit entries for this transaction as voided_record
    UPDATE data_edit_audit
    SET voided_record = true
    WHERE record_id = NEW.id::uuid  -- EXPLICIT: Ensure UUID comparison
      AND table_name = 'transactions_v2';
    
    -- Void related fee_allocations if this was a fee transaction
    UPDATE fee_allocations
    SET is_voided = true,
        voided_at = now(),
        voided_by = NEW.voided_by
    WHERE (debit_transaction_id = NEW.id OR credit_transaction_id = NEW.id)
      AND is_voided = false;
  END IF;
  
  RETURN NEW;
END;
$$;

-- ============================================================================
-- Add comments documenting the type-safety fixes
-- ============================================================================
COMMENT ON FUNCTION public.log_data_edit() IS 'Audit trigger for data edits. Uses ::uuid cast for record_id (data_edit_audit.record_id is UUID type).';
COMMENT ON FUNCTION public.audit_investor_fund_performance_changes() IS 'Audit trigger for investor_fund_performance. Uses ::uuid cast for record_id.';
COMMENT ON FUNCTION public.finalize_statement_period(uuid, uuid) IS 'Finalizes a statement period. Uses correct audit_log columns (entity, entity_id::text, actor_user).';
COMMENT ON FUNCTION public.cascade_void_from_transaction() IS 'Cascades void status to related records. Uses ::uuid cast for record_id comparisons.';