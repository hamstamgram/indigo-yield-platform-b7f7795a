-- Cleanup: Drop stale function overloads and fix remaining fund_aum_events references
-- Applied after the main eliminate_fund_aum_events migration

-- 1. Drop old V5 overload (param order: purpose before admin_id)
DROP FUNCTION IF EXISTS public.apply_segmented_yield_distribution_v5(uuid, date, numeric, aum_purpose, uuid, date);

-- 2. Drop remaining ensure_preflow_aum overload (different param order)
DROP FUNCTION IF EXISTS public.ensure_preflow_aum(uuid, date, aum_purpose, numeric, uuid);

-- 3. Fix apply_deposit_with_crystallization: remove fund_aum_events UPDATE block
DO $fix$
DECLARE
  v_src text;
  v_new_src text;
BEGIN
  SELECT prosrc INTO v_src
  FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' AND p.proname = 'apply_deposit_with_crystallization'
  LIMIT 1;

  IF v_src IS NOT NULL AND v_src LIKE '%UPDATE fund_aum_events%' THEN
    v_new_src := regexp_replace(
      v_src,
      'UPDATE fund_aum_events[^;]*SET post_flow_aum[^;]*;',
      '-- fund_aum_events removed: post_flow_aum tracking eliminated',
      'g'
    );
    IF v_new_src IS DISTINCT FROM v_src THEN
      EXECUTE format(
        'CREATE OR REPLACE FUNCTION public.apply_deposit_with_crystallization(' ||
        (SELECT pg_get_function_arguments(p.oid)
         FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
         WHERE n.nspname = 'public' AND p.proname = 'apply_deposit_with_crystallization' LIMIT 1) ||
        ') RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''public'' AS $fn$%s$fn$',
        v_new_src
      );
      RAISE NOTICE 'Fixed apply_deposit_with_crystallization';
    END IF;
  ELSE
    RAISE NOTICE 'apply_deposit_with_crystallization: no fund_aum_events reference found (already clean)';
  END IF;
END $fix$;

-- 4. Fix apply_withdrawal_with_crystallization: remove fund_aum_events UPDATE block
DO $fix2$
DECLARE
  v_src text;
  v_new_src text;
BEGIN
  SELECT prosrc INTO v_src
  FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' AND p.proname = 'apply_withdrawal_with_crystallization'
  LIMIT 1;

  IF v_src IS NOT NULL AND v_src LIKE '%UPDATE fund_aum_events%' THEN
    v_new_src := regexp_replace(
      v_src,
      'UPDATE fund_aum_events[^;]*SET post_flow_aum[^;]*;',
      '-- fund_aum_events removed: post_flow_aum tracking eliminated',
      'g'
    );
    IF v_new_src IS DISTINCT FROM v_src THEN
      EXECUTE format(
        'CREATE OR REPLACE FUNCTION public.apply_withdrawal_with_crystallization(' ||
        (SELECT pg_get_function_arguments(p.oid)
         FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
         WHERE n.nspname = 'public' AND p.proname = 'apply_withdrawal_with_crystallization' LIMIT 1) ||
        ') RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''public'' AS $fn$%s$fn$',
        v_new_src
      );
      RAISE NOTICE 'Fixed apply_withdrawal_with_crystallization';
    END IF;
  ELSE
    RAISE NOTICE 'apply_withdrawal_with_crystallization: no fund_aum_events reference found (already clean)';
  END IF;
END $fix2$;

-- 5. Rewrite sync_yield_to_investor_yield_events trigger function
-- Remove fund_aum_events lookup, use zeros for fund_aum_before/after
CREATE OR REPLACE FUNCTION sync_yield_to_investor_yield_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_distribution RECORD;
  v_fund RECORD;
  v_visibility text;
BEGIN
  IF NEW.type NOT IN ('YIELD', 'FEE_CREDIT', 'IB_CREDIT') THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_distribution
  FROM yield_distributions
  WHERE id = NEW.distribution_id;

  SELECT * INTO v_fund FROM funds WHERE id = NEW.fund_id;

  IF NEW.purpose IS NOT NULL THEN
    v_visibility := CASE WHEN NEW.purpose = 'reporting' THEN 'investor_visible' ELSE 'admin_only' END;
  ELSE
    v_visibility := CASE WHEN v_distribution.purpose = 'reporting' THEN 'investor_visible' ELSE 'admin_only' END;
  END IF;

  INSERT INTO investor_yield_events (
    distribution_id, investor_id, fund_id, event_type,
    trigger_type, trigger_transaction_id,
    yield_amount, net_amount, fee_amount,
    fund_aum_before, fund_aum_after,
    investor_balance_before, investor_balance_after,
    visibility_scope, created_at
  ) VALUES (
    NEW.distribution_id, NEW.investor_id, NEW.fund_id, NEW.type,
    COALESCE(v_distribution.distribution_type, 'month_end'),
    NEW.id,
    CASE WHEN NEW.type = 'YIELD' THEN NEW.amount ELSE 0 END,
    CASE WHEN NEW.type = 'YIELD' THEN NEW.amount ELSE 0 END,
    CASE WHEN NEW.type = 'FEE_CREDIT' THEN NEW.amount ELSE 0 END,
    0, 0,
    COALESCE(NEW.balance_before, 0),
    COALESCE(NEW.balance_after, 0),
    v_visibility,
    NOW()
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$fn$;
