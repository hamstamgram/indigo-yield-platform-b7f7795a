-- ============================================
-- Add purpose column to transactions_v2 and investor_fund_performance
-- This ensures yield distribution purpose is tracked end-to-end
-- ============================================

-- 1. Add purpose column to transactions_v2
ALTER TABLE transactions_v2 
ADD COLUMN IF NOT EXISTS purpose aum_purpose DEFAULT 'transaction'::aum_purpose;

-- Create index for filtering by purpose
CREATE INDEX IF NOT EXISTS idx_transactions_v2_purpose 
ON transactions_v2 (purpose);

-- Create composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_transactions_v2_investor_purpose 
ON transactions_v2 (investor_id, purpose);

-- 2. Add purpose column to investor_fund_performance for statement generation
ALTER TABLE investor_fund_performance 
ADD COLUMN IF NOT EXISTS purpose aum_purpose DEFAULT 'reporting'::aum_purpose;

-- Update unique constraint to include purpose (drop old, create new)
-- First check if the constraint exists and drop it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'investor_fund_performance_period_id_investor_id_fund_name_key'
  ) THEN
    ALTER TABLE investor_fund_performance 
    DROP CONSTRAINT investor_fund_performance_period_id_investor_id_fund_name_key;
  END IF;
END $$;

-- Create new unique constraint that includes purpose
-- This allows both reporting and transaction purpose entries per investor/period/fund
CREATE UNIQUE INDEX IF NOT EXISTS investor_fund_performance_unique_with_purpose 
ON investor_fund_performance (period_id, investor_id, fund_name, purpose);

-- 3. Add purpose column to ib_allocations if not already present (verify NOT NULL)
-- (Already has purpose column from existing schema, just verify it's populated)
UPDATE ib_allocations 
SET purpose = 'reporting'::aum_purpose 
WHERE purpose IS NULL;

-- 4. Update the apply_daily_yield_to_fund_v2 RPC to store purpose in transactions
CREATE OR REPLACE FUNCTION public.apply_daily_yield_to_fund_v2(
  p_fund_id uuid,
  p_date date,
  p_gross_amount numeric,
  p_admin_id uuid,
  p_purpose text DEFAULT 'reporting'
)
RETURNS TABLE (
  investor_id uuid,
  gross_amount numeric,
  fee_amount numeric,
  net_amount numeric,
  ib_amount numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_total numeric;
  v_asset text;
  v_ref text;
  v_fee_ref text;
  v_ib_ref text;
  rec record;
  v_fee_pct numeric;
  v_gross numeric;
  v_fee numeric;
  v_net numeric;
  v_total_fees numeric := 0;
  v_ib_parent_id uuid;
  v_ib_pct numeric;
  v_ib_amount numeric := 0;
  v_purpose_enum aum_purpose;
  v_indigo_fees_id uuid := '169bb053-36cb-4f6e-93ea-831f0dfeaf1d'::uuid;
BEGIN
  -- Validate and cast purpose to enum
  IF p_purpose NOT IN ('reporting', 'transaction') THEN
    RAISE EXCEPTION 'Invalid purpose: %. Must be "reporting" or "transaction"', p_purpose;
  END IF;
  v_purpose_enum := p_purpose::aum_purpose;

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

  -- idempotency key for this fund/date/purpose
  v_ref := concat('yield:', p_fund_id, ':', p_date::text, ':', p_purpose);
  v_fee_ref := concat('fee_credit:', p_fund_id, ':', p_date::text, ':', p_purpose);
  v_ib_ref := concat('ib:', p_fund_id, ':', p_date::text, ':', p_purpose);

  -- Check for existing yield distribution (idempotency)
  IF EXISTS (SELECT 1 FROM transactions_v2 WHERE reference_id = v_ref LIMIT 1) THEN
    RAISE EXCEPTION 'Yield already distributed for fund % on % with purpose %', p_fund_id, p_date, p_purpose;
  END IF;

  FOR rec IN
    SELECT ip.investor_id, ip.current_value,
           p.ib_parent_id, p.ib_percentage
    FROM investor_positions ip
    JOIN profiles p ON p.id = ip.investor_id
    WHERE ip.fund_id = p_fund_id
      AND ip.current_value > 0
  LOOP
    v_fee_pct := public._resolve_investor_fee_pct(rec.investor_id, p_fund_id, p_date);
    v_gross := p_gross_amount * (rec.current_value / v_total);
    v_fee := v_gross * (v_fee_pct / 100.0);
    v_net := v_gross - v_fee;
    v_ib_amount := 0;

    -- Track total fees collected
    v_total_fees := v_total_fees + v_fee;

    -- INTEREST (gross) - NOW WITH PURPOSE COLUMN
    INSERT INTO transactions_v2 (
      id, investor_id, fund_id, type, asset, fund_class, amount, tx_date, reference_id, notes, created_at, purpose
    ) VALUES (
      gen_random_uuid(), rec.investor_id, p_fund_id, 'INTEREST', v_asset, v_asset, v_gross, p_date, v_ref, 
      concat('Yield distribution (gross) - ', p_purpose), now(), v_purpose_enum
    );

    -- FEE (negative from investor) - NOW WITH PURPOSE COLUMN
    IF v_fee <> 0 THEN
      INSERT INTO transactions_v2 (
        id, investor_id, fund_id, type, asset, fund_class, amount, tx_date, reference_id, notes, created_at, purpose
      ) VALUES (
        gen_random_uuid(), rec.investor_id, p_fund_id, 'FEE', v_asset, v_asset, -v_fee, p_date, v_ref, 
        concat('Fee ', v_fee_pct, '% - ', p_purpose), now(), v_purpose_enum
      );
    END IF;

    -- IB Allocation (if investor has IB parent configured)
    v_ib_parent_id := rec.ib_parent_id;
    v_ib_pct := COALESCE(rec.ib_percentage, 0);
    
    IF v_ib_parent_id IS NOT NULL AND v_ib_pct > 0 AND v_net > 0 THEN
      v_ib_amount := v_fee * (v_ib_pct / 100.0);
      
      IF v_ib_amount > 0.000001 THEN
        -- Record IB allocation - NOW WITH PURPOSE COLUMN
        INSERT INTO ib_allocations (
          id, ib_investor_id, source_investor_id, fund_id, source_net_income, 
          ib_percentage, ib_fee_amount, effective_date, created_by, created_at, purpose
        ) VALUES (
          gen_random_uuid(), v_ib_parent_id, rec.investor_id, p_fund_id, v_net,
          v_ib_pct, v_ib_amount, p_date, p_admin_id, now(), v_purpose_enum
        )
        ON CONFLICT DO NOTHING;
        
        -- Credit IB parent's position - NOW WITH PURPOSE COLUMN
        INSERT INTO transactions_v2 (
          id, investor_id, fund_id, type, asset, fund_class, amount, tx_date, reference_id, notes, created_at, purpose
        ) VALUES (
          gen_random_uuid(), v_ib_parent_id, p_fund_id, 'IB_CREDIT', v_asset, v_asset, v_ib_amount, p_date,
          concat(v_ib_ref, ':', rec.investor_id),
          concat('IB allocation from investor (', v_ib_pct, '% of fees)'), now(), v_purpose_enum
        );
        
        UPDATE investor_positions
        SET current_value = current_value + v_ib_amount,
            updated_at = now()
        WHERE investor_id = v_ib_parent_id
          AND fund_id = p_fund_id;
          
        IF NOT FOUND THEN
          INSERT INTO investor_positions (investor_id, fund_id, fund_class, shares, current_value, cost_basis, updated_at)
          VALUES (v_ib_parent_id, p_fund_id, v_asset, v_ib_amount, v_ib_amount, 0, now())
          ON CONFLICT (investor_id, fund_id) DO UPDATE SET
            current_value = investor_positions.current_value + v_ib_amount,
            shares = investor_positions.shares + v_ib_amount,
            updated_at = now();
        END IF;
        
        v_total_fees := v_total_fees - v_ib_amount;
      END IF;
    END IF;

    -- Update investor position current_value with net
    UPDATE investor_positions
    SET current_value = current_value + v_net,
        updated_at = now()
    WHERE investor_id = rec.investor_id
      AND fund_id = p_fund_id;

    investor_id := rec.investor_id;
    gross_amount := v_gross;
    fee_amount := v_fee;
    net_amount := v_net;
    ib_amount := v_ib_amount;
    RETURN NEXT;
  END LOOP;

  -- Credit remaining fees to INDIGO FEES account - NOW WITH PURPOSE COLUMN
  IF v_total_fees > 0 THEN
    IF NOT EXISTS (SELECT 1 FROM transactions_v2 WHERE reference_id = v_fee_ref LIMIT 1) THEN
      INSERT INTO transactions_v2 (
        id, investor_id, fund_id, type, asset, fund_class, amount, tx_date, reference_id, notes, created_at, purpose
      ) VALUES (
        gen_random_uuid(), v_indigo_fees_id, p_fund_id, 'FEE_CREDIT', v_asset, v_asset, v_total_fees, p_date, v_fee_ref,
        concat('Platform fees collected - ', p_purpose), now(), v_purpose_enum
      );
      
      UPDATE investor_positions
      SET current_value = current_value + v_total_fees,
          updated_at = now()
      WHERE investor_id = v_indigo_fees_id
        AND fund_id = p_fund_id;
        
      IF NOT FOUND THEN
        INSERT INTO investor_positions (investor_id, fund_id, fund_class, shares, current_value, cost_basis, updated_at)
        VALUES (v_indigo_fees_id, p_fund_id, v_asset, v_total_fees, v_total_fees, 0, now())
        ON CONFLICT (investor_id, fund_id) DO UPDATE SET
          current_value = investor_positions.current_value + v_total_fees,
          shares = investor_positions.shares + v_total_fees,
          updated_at = now();
      END IF;
    END IF;
  END IF;

  -- Record in fund_daily_aum with the correct purpose
  INSERT INTO fund_daily_aum (
    id, fund_id, aum_date, as_of_date, total_aum, source, purpose, created_by, created_at
  ) VALUES (
    gen_random_uuid(), p_fund_id::text, p_date, p_date, v_total + p_gross_amount, 
    'yield_distribution', v_purpose_enum, p_admin_id, now()
  )
  ON CONFLICT (fund_id, aum_date, purpose) DO UPDATE SET
    total_aum = EXCLUDED.total_aum,
    updated_at = now(),
    updated_by = p_admin_id;

END;
$function$;

-- 5. Backfill existing transactions with appropriate purpose
-- Yields that were part of month-end distributions should be reporting
-- Others default to transaction
UPDATE transactions_v2 t
SET purpose = 'reporting'::aum_purpose
WHERE t.purpose IS NULL
  AND t.type IN ('INTEREST', 'FEE', 'FEE_CREDIT', 'IB_CREDIT')
  AND t.tx_date = (DATE_TRUNC('month', t.tx_date) + INTERVAL '1 month - 1 day')::date;

UPDATE transactions_v2
SET purpose = 'transaction'::aum_purpose
WHERE purpose IS NULL;