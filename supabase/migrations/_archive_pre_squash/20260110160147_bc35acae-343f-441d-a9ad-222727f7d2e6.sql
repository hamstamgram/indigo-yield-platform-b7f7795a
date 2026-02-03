-- =============================================================================
-- TOTAL SYSTEM HARDENING MIGRATION - CORRECTED
-- Fixes: Search-path protection, Advisory locking, Auto-logging reconciliation
-- =============================================================================

-- ============================================================================
-- PHASE 1: SEARCH-PATH PROTECTION FOR SECURITY DEFINER FUNCTIONS
-- Drop and recreate functions with parameter name conflicts
-- ============================================================================

-- Drop functions that have parameter name conflicts
DROP FUNCTION IF EXISTS public.can_access_investor(uuid);

-- Fix: can_access_investor (correct parameter name)
CREATE OR REPLACE FUNCTION public.can_access_investor(investor_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin_for_jwt() THEN RETURN true; END IF;
  IF auth.uid() = investor_uuid THEN RETURN true; END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = investor_uuid AND ib_parent_id = auth.uid()
  );
END;
$$;

-- Fix: get_available_balance
CREATE OR REPLACE FUNCTION public.get_available_balance(
  p_investor_id uuid,
  p_fund_id uuid
)
RETURNS numeric(28,10)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance numeric(28,10);
  v_pending numeric(28,10);
BEGIN
  SELECT COALESCE(current_value, 0) INTO v_balance
  FROM public.investor_positions
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id;

  SELECT COALESCE(SUM(amount), 0) INTO v_pending
  FROM public.withdrawal_requests
  WHERE investor_id = p_investor_id
    AND fund_id = p_fund_id
    AND status IN ('pending', 'approved', 'processing');

  RETURN GREATEST(COALESCE(v_balance, 0) - COALESCE(v_pending, 0), 0);
END;
$$;

-- Fix: log_audit_event
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_log (action, entity, entity_id, actor_user, old_values, new_values)
  VALUES (
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id::text, OLD.id::text),
    auth.uid(),
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Fix: log_data_edit
CREATE OR REPLACE FUNCTION public.log_data_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.data_edit_audit (
    table_name, record_id, operation, old_data, new_data, edited_by
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id::text, OLD.id::text),
    TG_OP,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    auth.uid()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Fix: protect_transaction_immutable_fields
CREATE OR REPLACE FUNCTION public.protect_transaction_immutable_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.created_at IS DISTINCT FROM NEW.created_at THEN
    RAISE EXCEPTION 'Cannot modify immutable field: created_at';
  END IF;
  IF OLD.reference_id IS NOT NULL AND OLD.reference_id IS DISTINCT FROM NEW.reference_id THEN
    RAISE EXCEPTION 'Cannot modify immutable field: reference_id';
  END IF;
  RETURN NEW;
END;
$$;

-- Fix: protect_audit_log_immutable_fields
CREATE OR REPLACE FUNCTION public.protect_audit_log_immutable_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.created_at IS DISTINCT FROM NEW.created_at THEN
    RAISE EXCEPTION 'Cannot modify immutable field: created_at';
  END IF;
  IF OLD.actor_user IS DISTINCT FROM NEW.actor_user THEN
    RAISE EXCEPTION 'Cannot modify immutable field: actor_user';
  END IF;
  RETURN NEW;
END;
$$;

-- Fix: protect_allocation_immutable_fields
CREATE OR REPLACE FUNCTION public.protect_allocation_immutable_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.created_at IS DISTINCT FROM NEW.created_at THEN
    RAISE EXCEPTION 'Cannot modify immutable field: created_at';
  END IF;
  IF OLD.created_by IS DISTINCT FROM NEW.created_by THEN
    RAISE EXCEPTION 'Cannot modify immutable field: created_by';
  END IF;
  IF OLD.distribution_id IS DISTINCT FROM NEW.distribution_id THEN
    RAISE EXCEPTION 'Cannot modify immutable field: distribution_id';
  END IF;
  RETURN NEW;
END;
$$;

-- Fix: protect_audit_immutable_fields  
CREATE OR REPLACE FUNCTION public.protect_audit_immutable_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.created_at IS DISTINCT FROM NEW.created_at THEN
    RAISE EXCEPTION 'Cannot modify immutable field: created_at';
  END IF;
  IF OLD.edited_by IS DISTINCT FROM NEW.edited_by THEN
    RAISE EXCEPTION 'Cannot modify immutable field: edited_by';
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================================
-- PHASE 2: ADVISORY LOCKING FOR RACE CONDITION PREVENTION
-- ============================================================================

-- Create wrapper function for advisory locking on yield operations
CREATE OR REPLACE FUNCTION public.acquire_yield_lock(
  p_fund_id uuid,
  p_yield_date date
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtext('yield_distribution'),
    hashtext(p_fund_id::text || p_yield_date::text)
  );
END;
$$;

-- Create wrapper function for advisory locking on withdrawal operations
CREATE OR REPLACE FUNCTION public.acquire_withdrawal_lock(
  p_request_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtext('withdrawal'),
    hashtext(p_request_id::text)
  );
END;
$$;

-- Create wrapper function for position update locking
CREATE OR REPLACE FUNCTION public.acquire_position_lock(
  p_investor_id uuid,
  p_fund_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtext('position'),
    hashtext(p_investor_id::text || p_fund_id::text)
  );
END;
$$;

-- ============================================================================
-- PHASE 3: AUTO-LOGGING RECONCILIATION MISMATCHES
-- ============================================================================

-- Create function to check and log ledger mismatches
CREATE OR REPLACE FUNCTION public.log_ledger_mismatches()
RETURNS TABLE(mismatch_count int, logged boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mismatch_count int;
  v_details jsonb;
BEGIN
  SELECT COUNT(*), jsonb_agg(
    jsonb_build_object(
      'investor_id', m.investor_id,
      'fund_id', m.fund_id,
      'position_value', m.position_value,
      'ledger_balance', m.ledger_balance,
      'difference', m.difference
    )
  )
  INTO v_mismatch_count, v_details
  FROM public.investor_position_ledger_mismatch m
  LIMIT 10;

  IF v_mismatch_count > 0 THEN
    INSERT INTO public.system_health_checks (
      check_type, 
      check_name, 
      status, 
      details,
      checked_at
    ) VALUES (
      'ledger_reconciliation',
      'investor_position_ledger_mismatch',
      'critical',
      jsonb_build_object(
        'mismatch_count', v_mismatch_count, 
        'samples', COALESCE(v_details, '[]'::jsonb),
        'threshold', 0.00000001,
        'action_required', true
      ),
      now()
    );
    
    RETURN QUERY SELECT v_mismatch_count, true;
  ELSE
    RETURN QUERY SELECT 0, false;
  END IF;
END;
$$;

-- ============================================================================
-- PHASE 4: ENHANCED LEDGER RECONCILIATION VIEW
-- ============================================================================

DROP VIEW IF EXISTS public.v_ledger_reconciliation;

CREATE OR REPLACE VIEW public.v_ledger_reconciliation AS
WITH position_totals AS (
  SELECT 
    ip.investor_id,
    ip.fund_id,
    ip.current_value as position_value,
    f.asset,
    f.name as fund_name
  FROM public.investor_positions ip
  JOIN public.funds f ON f.id = ip.fund_id
  WHERE ip.current_value != 0
),
ledger_totals AS (
  SELECT 
    t.investor_id,
    t.fund_id,
    SUM(
      CASE
        WHEN t.type IN ('DEPOSIT', 'INTEREST', 'YIELD', 'IB_CREDIT', 'INTERNAL_CREDIT', 'FEE_CREDIT', 'ADJUSTMENT') THEN t.amount
        WHEN t.type IN ('WITHDRAWAL', 'FEE', 'INTERNAL_WITHDRAWAL') THEN -ABS(t.amount)
        ELSE 0
      END
    ) as ledger_balance
  FROM public.transactions_v2 t
  WHERE t.is_voided = false
  GROUP BY t.investor_id, t.fund_id
)
SELECT 
  COALESCE(p.investor_id, l.investor_id) as investor_id,
  COALESCE(p.fund_id, l.fund_id) as fund_id,
  p.fund_name,
  p.asset,
  COALESCE(p.position_value, 0) as position_value,
  COALESCE(l.ledger_balance, 0) as ledger_balance,
  ABS(COALESCE(p.position_value, 0) - COALESCE(l.ledger_balance, 0)) as difference,
  CASE 
    WHEN ABS(COALESCE(p.position_value, 0) - COALESCE(l.ledger_balance, 0)) > 0.00000001 
    THEN 'MISMATCH'
    ELSE 'OK'
  END as status,
  CASE 
    WHEN ABS(COALESCE(p.position_value, 0) - COALESCE(l.ledger_balance, 0)) > 1 THEN 'critical'
    WHEN ABS(COALESCE(p.position_value, 0) - COALESCE(l.ledger_balance, 0)) > 0.00000001 THEN 'warning'
    ELSE 'ok'
  END as severity
FROM position_totals p
FULL OUTER JOIN ledger_totals l 
  ON p.investor_id = l.investor_id AND p.fund_id = l.fund_id
WHERE ABS(COALESCE(p.position_value, 0) - COALESCE(l.ledger_balance, 0)) > 0.00000001;

GRANT SELECT ON public.v_ledger_reconciliation TO authenticated;