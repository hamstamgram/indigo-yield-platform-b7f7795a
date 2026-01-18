-- =============================================================================
-- BACKFILL BALANCE CHAIN IN TRANSACTIONS
-- Migration: 20260118100001_backfill_balance_chain.sql
-- Purpose: Repair balance_before/balance_after columns for all transactions
-- =============================================================================

-- 1) Create backfill function for a single investor-fund combination
CREATE OR REPLACE FUNCTION public.backfill_balance_chain(
  p_investor_id UUID,
  p_fund_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r RECORD;
  v_running_balance NUMERIC(28,10) := 0;
  v_expected_after NUMERIC(28,10);
  v_transactions_updated INTEGER := 0;
  v_negative_types TEXT[] := ARRAY['WITHDRAWAL', 'FEE', 'INTERNAL_WITHDRAWAL', 'IB_DEBIT'];
BEGIN
  -- Set canonical RPC flag
  PERFORM set_config('app.canonical_rpc', 'true', true);

  -- Process all non-voided transactions in chronological order
  FOR r IN (
    SELECT id, type, amount, balance_before, balance_after, tx_date, created_at
    FROM transactions_v2
    WHERE investor_id = p_investor_id
      AND fund_id = p_fund_id
      AND is_voided = false
    ORDER BY tx_date ASC, created_at ASC
  ) LOOP
    -- Calculate expected balance_after based on transaction type
    IF r.type = ANY(v_negative_types) THEN
      v_expected_after := v_running_balance - ABS(r.amount);
    ELSE
      v_expected_after := v_running_balance + r.amount;
    END IF;

    -- Update if balance_before or balance_after is wrong
    IF r.balance_before IS DISTINCT FROM v_running_balance
       OR r.balance_after IS DISTINCT FROM v_expected_after THEN
      UPDATE transactions_v2
      SET
        balance_before = v_running_balance,
        balance_after = v_expected_after,
        updated_at = now()
      WHERE id = r.id;

      v_transactions_updated := v_transactions_updated + 1;
    END IF;

    -- Update running balance for next iteration
    v_running_balance := v_expected_after;
  END LOOP;

  RETURN jsonb_build_object(
    'investor_id', p_investor_id,
    'fund_id', p_fund_id,
    'transactions_updated', v_transactions_updated,
    'final_balance', v_running_balance
  );
END;
$$;

-- 2) Create batch backfill function for all investor-fund combinations
CREATE OR REPLACE FUNCTION public.batch_backfill_balance_chain()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r RECORD;
  v_result JSONB;
  v_total_combinations INTEGER := 0;
  v_total_transactions_updated INTEGER := 0;
  v_combination_result JSONB;
BEGIN
  -- Set canonical RPC flag
  PERFORM set_config('app.canonical_rpc', 'true', true);

  -- Process all unique investor-fund combinations with transactions
  FOR r IN (
    SELECT DISTINCT investor_id, fund_id
    FROM transactions_v2
    WHERE is_voided = false
    ORDER BY investor_id, fund_id
  ) LOOP
    v_total_combinations := v_total_combinations + 1;

    SELECT backfill_balance_chain(r.investor_id, r.fund_id)
    INTO v_combination_result;

    v_total_transactions_updated := v_total_transactions_updated +
      COALESCE((v_combination_result->>'transactions_updated')::INTEGER, 0);
  END LOOP;

  v_result := jsonb_build_object(
    'total_investor_fund_combinations', v_total_combinations,
    'total_transactions_updated', v_total_transactions_updated,
    'executed_at', now()
  );

  RETURN v_result;
END;
$$;

-- 3) Execute the batch backfill
DO $$
DECLARE
  v_result JSONB;
BEGIN
  -- Set canonical RPC flag
  PERFORM set_config('app.canonical_rpc', 'true', true);

  SELECT batch_backfill_balance_chain() INTO v_result;

  -- Log the backfill results
  INSERT INTO audit_log (
    action,
    entity_type,
    entity_id,
    details,
    created_at
  ) VALUES (
    'BALANCE_CHAIN_BACKFILL',
    'SYSTEM',
    '20260118100001',
    v_result || jsonb_build_object('migration', '20260118100001_backfill_balance_chain'),
    now()
  );

  RAISE NOTICE 'Balance chain backfill complete: %', v_result;
END;
$$;

-- 4) Create trigger to maintain balance chain on new transactions
CREATE OR REPLACE FUNCTION public.maintain_balance_chain_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_last_balance NUMERIC(28,10);
  v_expected_after NUMERIC(28,10);
  v_negative_types TEXT[] := ARRAY['WITHDRAWAL', 'FEE', 'INTERNAL_WITHDRAWAL', 'IB_DEBIT'];
BEGIN
  -- Get the last balance_after for this investor-fund
  SELECT balance_after INTO v_last_balance
  FROM transactions_v2
  WHERE investor_id = NEW.investor_id
    AND fund_id = NEW.fund_id
    AND is_voided = false
    AND id != NEW.id
  ORDER BY tx_date DESC, created_at DESC
  LIMIT 1;

  -- Default to 0 if no previous transaction
  v_last_balance := COALESCE(v_last_balance, 0);

  -- Calculate expected balance_after
  IF NEW.type = ANY(v_negative_types) THEN
    v_expected_after := v_last_balance - ABS(NEW.amount);
  ELSE
    v_expected_after := v_last_balance + NEW.amount;
  END IF;

  -- Set balance_before and balance_after
  NEW.balance_before := v_last_balance;
  NEW.balance_after := v_expected_after;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trg_maintain_balance_chain ON public.transactions_v2;

-- Create trigger (BEFORE INSERT to modify NEW record)
CREATE TRIGGER trg_maintain_balance_chain
  BEFORE INSERT ON public.transactions_v2
  FOR EACH ROW
  EXECUTE FUNCTION public.maintain_balance_chain_on_insert();

-- 5) Grant permissions
GRANT EXECUTE ON FUNCTION public.backfill_balance_chain TO authenticated;
GRANT EXECUTE ON FUNCTION public.batch_backfill_balance_chain TO authenticated;

-- 6) Log migration
INSERT INTO public.audit_log (
  action,
  entity_type,
  entity_id,
  details,
  created_at
) VALUES (
  'MIGRATION_APPLIED',
  'SYSTEM',
  '20260118100001',
  jsonb_build_object(
    'migration', '20260118100001_backfill_balance_chain',
    'description', 'Backfill and maintain balance_before/balance_after chain',
    'functions_created', ARRAY['backfill_balance_chain', 'batch_backfill_balance_chain', 'maintain_balance_chain_on_insert'],
    'triggers_created', ARRAY['trg_maintain_balance_chain']
  ),
  now()
);
