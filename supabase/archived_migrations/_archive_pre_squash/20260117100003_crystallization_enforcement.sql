-- ============================================================================
-- Migration: Crystallization Sequencing Enforcement
-- ============================================================================
-- This migration enforces the "crystallize-before-flow" accounting rule:
-- Yield must be crystallized BEFORE any capital flow (deposit/withdrawal).
--
-- This prevents incorrect yield allocation by ensuring:
-- 1. Pre-flow AUM is recorded before the flow
-- 2. Yield is allocated to the pre-flow ownership percentages
-- 3. Only then is the capital flow applied
--
-- The canonical RPC functions handle this automatically, but this
-- migration adds validation triggers as a safety net.
-- ============================================================================

-- ============================================================================
-- HELPER: Check if crystallization exists for a flow
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_crystallization_for_flow(
  p_fund_id uuid,
  p_flow_date date,
  p_flow_type text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_crystallization_exists boolean;
BEGIN
  -- Check if there's a pre-flow AUM event for this date
  SELECT EXISTS (
    SELECT 1
    FROM public.fund_aum_events fae
    WHERE fae.fund_id = p_fund_id
      AND DATE(fae.event_ts) = p_flow_date
      AND fae.event_type IN ('yield_crystallization', 'pre_flow_snapshot')
      AND fae.is_voided = false
  ) INTO v_crystallization_exists;

  RETURN v_crystallization_exists;
END;
$$;

COMMENT ON FUNCTION public.check_crystallization_for_flow IS
'Checks if yield crystallization exists for a given fund and date. Used by flow validation triggers.';

-- ============================================================================
-- VALIDATION FUNCTION: Enforce crystallization before flow
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_flow_sequencing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_capital_flow boolean;
  v_has_crystallization boolean;
  v_allow_bypass boolean;
BEGIN
  -- Only validate INSERT operations
  IF TG_OP != 'INSERT' THEN
    RETURN NEW;
  END IF;

  -- Check if this is a capital flow transaction
  v_is_capital_flow := NEW.type IN ('DEPOSIT', 'WITHDRAWAL');

  IF NOT v_is_capital_flow THEN
    RETURN NEW;
  END IF;

  -- Check if bypass is allowed (canonical RPC already handles crystallization)
  -- When the canonical RPC flag is set, we trust the RPC has done crystallization
  IF public.is_canonical_rpc() THEN
    RETURN NEW;
  END IF;

  -- Check if crystallization exists for this flow
  v_has_crystallization := public.check_crystallization_for_flow(
    NEW.fund_id,
    NEW.tx_date,
    NEW.type::text
  );

  -- Allow if there are no other investors (first investment doesn't need crystallization)
  IF NOT v_has_crystallization THEN
    DECLARE
      v_other_positions integer;
    BEGIN
      SELECT COUNT(*) INTO v_other_positions
      FROM public.investor_positions
      WHERE fund_id = NEW.fund_id
        AND investor_id != NEW.investor_id
        AND current_value > 0;

      -- First investment: no other positions, no crystallization needed
      IF v_other_positions = 0 THEN
        RETURN NEW;
      END IF;
    END;
  END IF;

  -- If we got here and there's no crystallization, block the operation
  IF NOT v_has_crystallization THEN
    RAISE EXCEPTION 'CRYSTALLIZATION_REQUIRED: Capital flow (%) on fund % requires yield crystallization before application. Use canonical RPC functions: apply_deposit_with_crystallization or apply_withdrawal_with_crystallization.',
      NEW.type, NEW.fund_id
      USING HINT = 'Ensure crystallize_yield_before_flow() is called before the capital flow.',
            ERRCODE = 'P0002';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.validate_flow_sequencing() IS
'Validates that yield crystallization has occurred before capital flows. Safety net for the crystallize-before-flow rule.';

-- ============================================================================
-- CREATE TRIGGER FOR FLOW SEQUENCING VALIDATION
-- ============================================================================

DROP TRIGGER IF EXISTS trg_validate_flow_sequencing ON public.transactions_v2;

CREATE TRIGGER trg_validate_flow_sequencing
  BEFORE INSERT ON public.transactions_v2
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_flow_sequencing();

COMMENT ON TRIGGER trg_validate_flow_sequencing ON public.transactions_v2 IS
'Ensures yield crystallization occurs before capital flows. Use canonical RPCs to automatically handle crystallization.';

-- ============================================================================
-- VIEW: Flows without crystallization (audit view)
-- ============================================================================

CREATE OR REPLACE VIEW public.v_integrity_flows_without_crystallization AS
SELECT
  t.id as transaction_id,
  t.type::text as flow_type,
  t.fund_id,
  t.investor_id,
  t.amount,
  t.tx_date,
  t.created_at,
  i.name as investor_name,
  f.name as fund_name,
  f.code as fund_code,
  COALESCE(
    (SELECT TRUE FROM public.fund_aum_events fae
     WHERE fae.fund_id = t.fund_id
       AND DATE(fae.event_ts) = t.tx_date
       AND fae.event_type IN ('yield_crystallization', 'pre_flow_snapshot')
       AND fae.is_voided = false
     LIMIT 1),
    FALSE
  ) as has_crystallization
FROM public.transactions_v2 t
JOIN public.investors i ON i.id = t.investor_id
JOIN public.funds f ON f.id = t.fund_id
WHERE t.type IN ('DEPOSIT', 'WITHDRAWAL')
  AND t.is_voided = false
  AND NOT EXISTS (
    SELECT 1 FROM public.fund_aum_events fae
    WHERE fae.fund_id = t.fund_id
      AND DATE(fae.event_ts) = t.tx_date
      AND fae.event_type IN ('yield_crystallization', 'pre_flow_snapshot')
      AND fae.is_voided = false
  );

COMMENT ON VIEW public.v_integrity_flows_without_crystallization IS
'Lists capital flows that may not have proper crystallization. Use for auditing sequencing compliance.';

-- ============================================================================
-- CRYSTALLIZATION SEQUENCING INTEGRITY CHECK
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_crystallization_integrity()
RETURNS TABLE (
  fund_id uuid,
  fund_name text,
  flow_date date,
  flow_count integer,
  crystallization_count integer,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH flow_dates AS (
    SELECT
      t.fund_id,
      t.tx_date as flow_date,
      COUNT(*) as flow_count
    FROM public.transactions_v2 t
    WHERE t.type IN ('DEPOSIT', 'WITHDRAWAL')
      AND t.is_voided = false
    GROUP BY t.fund_id, t.tx_date
  ),
  crystallization_dates AS (
    SELECT
      fae.fund_id,
      DATE(fae.event_ts) as crystal_date,
      COUNT(*) as crystal_count
    FROM public.fund_aum_events fae
    WHERE fae.event_type IN ('yield_crystallization', 'pre_flow_snapshot')
      AND fae.is_voided = false
    GROUP BY fae.fund_id, DATE(fae.event_ts)
  )
  SELECT
    fd.fund_id,
    f.name as fund_name,
    fd.flow_date,
    fd.flow_count::integer,
    COALESCE(cd.crystal_count, 0)::integer as crystallization_count,
    CASE
      WHEN COALESCE(cd.crystal_count, 0) > 0 THEN 'OK'
      ELSE 'MISSING_CRYSTALLIZATION'
    END as status
  FROM flow_dates fd
  JOIN public.funds f ON f.id = fd.fund_id
  LEFT JOIN crystallization_dates cd
    ON cd.fund_id = fd.fund_id AND cd.crystal_date = fd.flow_date
  WHERE COALESCE(cd.crystal_count, 0) = 0
  ORDER BY fd.flow_date DESC;
END;
$$;

COMMENT ON FUNCTION public.check_crystallization_integrity() IS
'Returns flow dates that are missing crystallization events. Used for auditing.';

-- ============================================================================
-- HELPER: Pre-flight check for flows
-- ============================================================================

CREATE OR REPLACE FUNCTION public.preflight_flow_check(
  p_fund_id uuid,
  p_investor_id uuid,
  p_amount numeric,
  p_flow_type text,
  p_flow_date date
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
  v_has_crystallization boolean;
  v_current_balance numeric;
  v_fund_aum numeric;
  v_other_investors integer;
  v_issues text[] := '{}';
BEGIN
  -- Check crystallization
  v_has_crystallization := public.check_crystallization_for_flow(
    p_fund_id, p_flow_date, p_flow_type
  );

  -- Check current balance (for withdrawals)
  SELECT current_value INTO v_current_balance
  FROM public.investor_positions
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id;

  -- Check fund AUM
  SELECT total_aum INTO v_fund_aum
  FROM public.fund_daily_aum
  WHERE fund_id = p_fund_id
  ORDER BY aum_date DESC
  LIMIT 1;

  -- Check other investors
  SELECT COUNT(*) INTO v_other_investors
  FROM public.investor_positions
  WHERE fund_id = p_fund_id
    AND investor_id != p_investor_id
    AND current_value > 0;

  -- Validate
  IF p_flow_type = 'WITHDRAWAL' THEN
    IF COALESCE(v_current_balance, 0) < p_amount THEN
      v_issues := array_append(v_issues, 'INSUFFICIENT_BALANCE');
    END IF;
  END IF;

  IF NOT v_has_crystallization AND v_other_investors > 0 THEN
    v_issues := array_append(v_issues, 'CRYSTALLIZATION_REQUIRED');
  END IF;

  IF v_fund_aum IS NULL THEN
    v_issues := array_append(v_issues, 'NO_FUND_AUM');
  END IF;

  v_result := json_build_object(
    'can_proceed', array_length(v_issues, 1) IS NULL,
    'has_crystallization', v_has_crystallization,
    'current_balance', COALESCE(v_current_balance, 0),
    'fund_aum', COALESCE(v_fund_aum, 0),
    'other_investors', v_other_investors,
    'issues', v_issues
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.preflight_flow_check IS
'Pre-flight check for capital flows. Validates crystallization, balance, and AUM before proceeding.';

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.check_crystallization_for_flow(uuid, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_crystallization_integrity() TO authenticated;
GRANT EXECUTE ON FUNCTION public.preflight_flow_check(uuid, uuid, numeric, text, date) TO authenticated;
GRANT SELECT ON public.v_integrity_flows_without_crystallization TO authenticated;
