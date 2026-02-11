-- Fix: investor_yield_events.investor_balance, investor_share_pct, fund_yield_pct
-- are hardcoded to 0 in the sync trigger. Pull actual values from yield_allocations.
--
-- The sync_yield_to_investor_yield_events trigger fires on YIELD tx INSERT but
-- doesn't have access to the yield_allocations data. Fix by looking up the
-- allocation record.

-- 1. Modify the sync trigger to pull actual values from yield_allocations
CREATE OR REPLACE FUNCTION public.sync_yield_to_investor_yield_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_fund record;
  v_aum_event record;
  v_alloc record;
  v_dist record;
  v_trigger_type text;
  v_visibility text;
  v_investor_balance numeric := 0;
  v_investor_share_pct numeric := 0;
  v_fund_yield_pct numeric := 0;
  v_fee_pct numeric := 0;
  v_fee_amount numeric := 0;
  v_gross_amount numeric;
BEGIN
  IF NEW.type = 'YIELD'::public.tx_type AND NOT NEW.is_voided THEN
    SELECT * INTO v_fund FROM funds WHERE id = NEW.fund_id;

    SELECT * INTO v_aum_event
    FROM fund_aum_events
    WHERE fund_id = NEW.fund_id AND event_date = NEW.tx_date AND is_voided = false
    ORDER BY event_ts DESC LIMIT 1;

    -- Look up yield_allocations for this investor/fund/date to get accurate values
    -- Match by distribution reference pattern or by investor+fund+date
    -- Note: yield_allocations uses adb_share (not investor_share_pct) and has no is_voided column
    SELECT ya.*, yd.gross_yield_amount as dist_gross, yd.recorded_aum as dist_aum
    INTO v_alloc
    FROM yield_allocations ya
    JOIN yield_distributions yd ON yd.id = ya.distribution_id
    WHERE ya.investor_id = NEW.investor_id
      AND ya.fund_id = NEW.fund_id
      AND yd.effective_date = NEW.tx_date
      AND yd.is_voided = false
    ORDER BY yd.created_at DESC
    LIMIT 1;

    IF v_alloc IS NOT NULL THEN
      -- Use adb_share instead of investor_share_pct (column name in yield_allocations)
      v_investor_share_pct := COALESCE(v_alloc.adb_share, 0);
      v_fee_pct := COALESCE(v_alloc.fee_pct, 0);
      v_fee_amount := COALESCE(v_alloc.fee_amount, 0);
      v_gross_amount := COALESCE(v_alloc.gross_amount, NEW.amount);
      
      -- Calculate fund_yield_pct: gross_yield / recorded_aum
      IF COALESCE(v_alloc.dist_aum, 0) > 0 THEN
        v_fund_yield_pct := COALESCE(v_alloc.dist_gross, 0) / v_alloc.dist_aum;
      END IF;
      
      -- Calculate investor_balance from share allocation
      -- investor_share_pct = investor_adb / total_adb
      -- For simplicity, derive balance from net_amount / (fund_yield_pct * (1 - fee_pct))
      -- Or just use investor_share_pct * recorded_aum as an approximation
      IF v_fund_yield_pct > 0 AND v_investor_share_pct > 0 THEN
        v_investor_balance := v_investor_share_pct * COALESCE(v_alloc.dist_aum, 0);
      END IF;
    ELSE
      v_gross_amount := NEW.amount;
    END IF;

    -- Map trigger_type to allowed values for investor_yield_events
    v_trigger_type := CASE
      WHEN v_aum_event.trigger_type IN ('deposit', 'withdrawal', 'month_end', 'manual')
        THEN v_aum_event.trigger_type
      ELSE 'manual'
    END;

    -- Derive visibility from purpose: reporting yields are investor-visible,
    -- transaction/crystallization yields are admin-only.
    v_visibility := CASE
      WHEN NEW.purpose = 'reporting'::aum_purpose THEN 'investor_visible'
      ELSE 'admin_only'
    END;

    INSERT INTO public.investor_yield_events (
      investor_id, fund_id, event_date, trigger_type, trigger_transaction_id,
      fund_aum_before, fund_aum_after, investor_balance, investor_share_pct,
      fund_yield_pct, gross_yield_amount, fee_pct, fee_amount, net_yield_amount,
      period_start, period_end, days_in_period, visibility_scope, reference_id, created_by
    )
    VALUES (
      NEW.investor_id, NEW.fund_id, NEW.tx_date,
      v_trigger_type,
      NEW.id,
      COALESCE(v_aum_event.opening_aum, 0),
      COALESCE(v_aum_event.closing_aum, 0),
      v_investor_balance,
      v_investor_share_pct,
      v_fund_yield_pct,
      v_gross_amount,
      v_fee_pct,
      v_fee_amount,
      NEW.amount,
      COALESCE(v_aum_event.event_date, NEW.tx_date), NEW.tx_date, 1,
      v_visibility,
      NEW.reference_id, NEW.created_by
    )
    ON CONFLICT (reference_id) WHERE is_voided = false DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

-- 2. Backfill existing investor_yield_events with data from yield_allocations
-- Note: yield_allocations uses adb_share (not investor_share_pct) and has no is_voided column
UPDATE investor_yield_events iye
SET 
  investor_share_pct = COALESCE(ya.adb_share, iye.investor_share_pct),
  fee_pct = COALESCE(ya.fee_pct, iye.fee_pct),
  fee_amount = COALESCE(ya.fee_amount, iye.fee_amount),
  gross_yield_amount = COALESCE(ya.gross_amount, iye.gross_yield_amount),
  fund_yield_pct = CASE 
    WHEN COALESCE(yd.recorded_aum, 0) > 0 
    THEN COALESCE(yd.gross_yield_amount, 0) / yd.recorded_aum 
    ELSE iye.fund_yield_pct 
  END,
  investor_balance = CASE
    WHEN COALESCE(ya.adb_share, 0) > 0 AND COALESCE(yd.recorded_aum, 0) > 0
    THEN ya.adb_share * yd.recorded_aum
    ELSE iye.investor_balance
  END
FROM yield_allocations ya
JOIN yield_distributions yd ON yd.id = ya.distribution_id
WHERE iye.investor_id = ya.investor_id
  AND iye.fund_id = ya.fund_id
  AND iye.event_date = yd.effective_date
  AND yd.is_voided = false
  AND (iye.investor_balance = 0 OR iye.fund_yield_pct = 0 OR iye.investor_share_pct = 0);
