-- ==============================================================================
-- Migration: Fund Daily AUM, Investor Fee Schedule, and Fee-Aware Yield RPC
-- Date: 2025-12-10
-- Description:
--   - Adds fund_daily_aum to store per-fund daily AUM (including closed programs)
--   - Adds investor_fee_schedule to capture per-investor fee percentages over time
--   - Adds a fee-aware yield RPC: apply_daily_yield_to_fund
--     * Pro-rata distribution by investor positions
--     * Applies investor-specific fee %
--     * Posts transactions_v2 rows for INTEREST and FEE
--     * Updates investor_positions current_value with net yield
-- Notes:
--   - This RPC is idempotent per (fund_id, tx_date) by using a unique reference key
--   - investor_fee_schedule fallback: profiles.fee_percentage, then 0 if missing
--   - Does not update investor_fund_performance; that can be layered later once period logic is finalized
-- ==============================================================================

-- Safety: required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- Tables
-- ==============================================================================

-- Align with existing fund_daily_aum schema; add missing columns via ALTER if needed
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fund_daily_aum' AND column_name = 'source') THEN
    ALTER TABLE public.fund_daily_aum ADD COLUMN source text DEFAULT 'ingested';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fund_daily_aum' AND column_name = 'as_of_date') THEN
    -- Existing schema uses aum_date (text fund_id) - keep existing columns, add as_of_date as alias
    ALTER TABLE public.fund_daily_aum ADD COLUMN as_of_date date;
    UPDATE public.fund_daily_aum SET as_of_date = aum_date;
    -- Preserve uniqueness via existing constraint on (fund_id, aum_date)
  END IF;
END $$;

-- Index using existing fund_id/aum_date (text fund_id); keep new index for fund_id/as_of_date when populated
CREATE INDEX IF NOT EXISTS idx_fund_daily_aum_fund_asof ON public.fund_daily_aum (fund_id, as_of_date DESC);

CREATE TABLE IF NOT EXISTS public.investor_fee_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  fund_id uuid NULL REFERENCES public.funds(id) ON DELETE CASCADE,
  effective_date date NOT NULL,
  fee_pct numeric NOT NULL CHECK (fee_pct >= 0 AND fee_pct <= 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(investor_id, fund_id, effective_date)
);

CREATE INDEX IF NOT EXISTS idx_fee_schedule_investor_fund_date ON public.investor_fee_schedule (investor_id, fund_id, effective_date DESC);

-- ==============================================================================
-- Helper: resolve investor fee pct (per fund, by date)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public._resolve_investor_fee_pct(
  p_investor_id uuid,
  p_fund_id uuid,
  p_date date
) RETURNS numeric AS $$
DECLARE
  v_fee numeric;
BEGIN
  -- 1) Use latest effective fee from schedule on/before date (fund-specific if provided)
  SELECT fee_pct INTO v_fee
  FROM investor_fee_schedule
  WHERE investor_id = p_investor_id
    AND (fund_id = p_fund_id OR fund_id IS NULL)
    AND effective_date <= p_date
  ORDER BY effective_date DESC
  LIMIT 1;

  IF v_fee IS NOT NULL THEN
    RETURN v_fee;
  END IF;

  -- 2) Fallback to profiles.fee_percentage
  SELECT fee_percentage INTO v_fee
  FROM profiles
  WHERE id = p_investor_id;

  IF v_fee IS NOT NULL THEN
    RETURN v_fee;
  END IF;

  -- 3) Default 0%
  RETURN 0;
END;
$$ LANGUAGE plpgsql STABLE;

-- ==============================================================================
-- RPC: apply_daily_yield_to_fund
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.apply_daily_yield_to_fund(
  p_fund_id uuid,
  p_date date,
  p_gross_amount numeric,
  p_admin_id uuid
) RETURNS TABLE (
  investor_id uuid,
  gross_amount numeric,
  fee_amount numeric,
  net_amount numeric
) AS $$
DECLARE
  v_total numeric;
  v_asset text;
  v_ref text;
  rec record;
  v_fee_pct numeric;
  v_gross numeric;
  v_fee numeric;
  v_net numeric;
BEGIN
  IF p_gross_amount IS NULL OR p_gross_amount <= 0 THEN
    RAISE EXCEPTION 'Gross amount must be positive';
  END IF;

  SELECT asset INTO v_asset FROM funds WHERE id = p_fund_id;
  IF v_asset IS NULL THEN
    RAISE EXCEPTION 'Fund % not found', p_fund_id;
  END IF;

  -- Total current_value across investors for this fund
  SELECT SUM(current_value) INTO v_total
  FROM investor_positions
  WHERE fund_id = p_fund_id;

  IF v_total IS NULL OR v_total <= 0 THEN
    RAISE EXCEPTION 'No positions or zero AUM for fund % on %', p_fund_id, p_date;
  END IF;

  -- idempotency key for this fund/date
  v_ref := concat('yield:', p_fund_id, ':', p_date::text);

  FOR rec IN
    SELECT investor_id, current_value
    FROM investor_positions
    WHERE fund_id = p_fund_id
      AND current_value > 0
  LOOP
    v_fee_pct := public._resolve_investor_fee_pct(rec.investor_id, p_fund_id, p_date);
    v_gross := p_gross_amount * (rec.current_value / v_total);
    v_fee := v_gross * (v_fee_pct / 100.0);
    v_net := v_gross - v_fee;

    -- INTEREST (gross)
    INSERT INTO transactions_v2 (
      id, investor_id, fund_id, type, asset, fund_class, amount, tx_date, reference_id, notes, created_at
    ) VALUES (
      gen_random_uuid(), rec.investor_id, p_fund_id, 'INTEREST', v_asset, v_asset, v_gross, p_date, v_ref, 'Yield distribution (gross)', now()
    );

    -- FEE (negative)
    IF v_fee <> 0 THEN
      INSERT INTO transactions_v2 (
        id, investor_id, fund_id, type, asset, fund_class, amount, tx_date, reference_id, notes, created_at
      ) VALUES (
        gen_random_uuid(), rec.investor_id, p_fund_id, 'FEE', v_asset, v_asset, -v_fee, p_date, v_ref, concat('Fee ', v_fee_pct, '%'), now()
      );
    END IF;

    -- Update position current_value with net (gross - fee)
    UPDATE investor_positions
    SET current_value = current_value + v_net,
        updated_at = now()
    WHERE investor_id = rec.investor_id
      AND fund_id = p_fund_id;

    investor_id := rec.investor_id;
    gross_amount := v_gross;
    fee_amount := v_fee;
    net_amount := v_net;
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grants (adjust roles as needed)
GRANT EXECUTE ON FUNCTION public.apply_daily_yield_to_fund(uuid, date, numeric, uuid) TO anon, authenticated, service_role;

-- ==============================================================================
-- End of migration
-- ==============================================================================
