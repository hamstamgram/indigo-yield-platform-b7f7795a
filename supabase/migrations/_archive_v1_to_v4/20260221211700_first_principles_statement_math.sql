-- Overhaul populate_investor_fund_performance to use strict First Principles Math
-- 1. Accept specific p_target_date instead of CURRENT_DATE.
-- 2. Explicitly bound Additions, Redemptions, and Net Income to precise start/end ranges.
-- 3. Calculate Beginning Balances strictly forward by SUM(amount) of all ledger entries prior to period start.

DROP FUNCTION IF EXISTS public.populate_investor_fund_performance(uuid);

CREATE OR REPLACE FUNCTION public.populate_investor_fund_performance(p_investor_id uuid DEFAULT NULL::uuid, p_target_date date DEFAULT CURRENT_DATE)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_period_id UUID;
  v_records_inserted INTEGER := 0;
  r RECORD;
  v_mtd_start DATE;
  v_qtd_start DATE;
  v_ytd_start DATE;
  v_period_end DATE;
  v_period_month INTEGER;
  v_period_year INTEGER;
BEGIN
  -- 1. Setup exact period boundary dates
  v_mtd_start := DATE_TRUNC('month', p_target_date)::DATE;
  v_qtd_start := DATE_TRUNC('quarter', p_target_date)::DATE;
  v_ytd_start := DATE_TRUNC('year', p_target_date)::DATE;
  v_period_end := (v_mtd_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
  v_period_month := EXTRACT(MONTH FROM v_period_end)::INTEGER;
  v_period_year := EXTRACT(YEAR FROM v_period_end)::INTEGER;

  -- 2. Setup or find the statement period exactly matching these boundaries
  SELECT id INTO v_period_id
  FROM statement_periods
  WHERE year = v_period_year AND month = v_period_month;

  IF v_period_id IS NULL THEN
    INSERT INTO statement_periods (year, month, period_name, period_end_date, status)
    VALUES (
      v_period_year,
      v_period_month,
      TO_CHAR(v_period_end, 'Month YYYY'),
      v_period_end,
      'DRAFT'
    )
    RETURNING id INTO v_period_id;
  END IF;

  -- Delete existing records for this period (and optionally investor)
  DELETE FROM investor_fund_performance
  WHERE period_id = v_period_id
    AND (p_investor_id IS NULL OR investor_id = p_investor_id);

  -- For each active position, calculate exact metrics using First Principles Math
  FOR r IN 
    SELECT 
      ip.investor_id,
      ip.fund_id,
      f.name as fund_name,
      -- Ending position (we recalculate this forward instead of trusting current_value blindly for historicals)
      COALESCE((
        SELECT SUM(CASE WHEN t.type = 'WITHDRAWAL' THEN -ABS(t.amount) ELSE t.amount END)
        FROM transactions_v2 t
        WHERE t.investor_id = ip.investor_id 
          AND t.fund_id = ip.fund_id 
          AND NOT t.is_voided
          AND t.tx_date <= v_period_end
      ), 0) as exact_ending_balance,
      
      -- ================= MTD =================
      -- 1. Forward MTD Beginning Balance (Sum of all ledger strictly BEFORE MTD start)
      COALESCE((
        SELECT SUM(CASE WHEN t.type = 'WITHDRAWAL' THEN -ABS(t.amount) ELSE t.amount END)
        FROM transactions_v2 t
        WHERE t.investor_id = ip.investor_id 
          AND t.fund_id = ip.fund_id 
          AND NOT t.is_voided
          AND t.tx_date < v_mtd_start
      ), 0) as mtd_beginning_balance,
      -- 2. Bounded MTD Additions
      COALESCE((
        SELECT SUM(t.amount)
        FROM transactions_v2 t
        WHERE t.investor_id = ip.investor_id 
          AND t.fund_id = ip.fund_id 
          AND NOT t.is_voided
          AND t.type = 'DEPOSIT'
          AND t.tx_date >= v_mtd_start AND t.tx_date <= v_period_end
      ), 0) as mtd_additions,
      -- 3. Bounded MTD Redemptions
      COALESCE((
        SELECT SUM(ABS(t.amount))
        FROM transactions_v2 t
        WHERE t.investor_id = ip.investor_id 
          AND t.fund_id = ip.fund_id 
          AND NOT t.is_voided
          AND t.type = 'WITHDRAWAL'
          AND t.tx_date >= v_mtd_start AND t.tx_date <= v_period_end
      ), 0) as mtd_redemptions,
      -- 4. Bounded MTD Net Income
      COALESCE((
        SELECT SUM(t.amount)
        FROM transactions_v2 t
        WHERE t.investor_id = ip.investor_id 
          AND t.fund_id = ip.fund_id 
          AND NOT t.is_voided
          AND t.type IN ('YIELD', 'IB_CREDIT')
          AND t.tx_date >= v_mtd_start AND t.tx_date <= v_period_end
      ), 0) as mtd_net_income,

      -- ================= QTD =================
      -- 1. Forward QTD Beginning Balance
      COALESCE((
        SELECT SUM(CASE WHEN t.type = 'WITHDRAWAL' THEN -ABS(t.amount) ELSE t.amount END)
        FROM transactions_v2 t
        WHERE t.investor_id = ip.investor_id 
          AND t.fund_id = ip.fund_id 
          AND NOT t.is_voided
          AND t.tx_date < v_qtd_start
      ), 0) as qtd_beginning_balance,
      -- 2. Bounded QTD Additions
      COALESCE((
        SELECT SUM(t.amount)
        FROM transactions_v2 t
        WHERE t.investor_id = ip.investor_id 
          AND t.fund_id = ip.fund_id 
          AND NOT t.is_voided
          AND t.type = 'DEPOSIT'
          AND t.tx_date >= v_qtd_start AND t.tx_date <= v_period_end
      ), 0) as qtd_additions,
      -- 3. Bounded QTD Redemptions
      COALESCE((
        SELECT SUM(ABS(t.amount))
        FROM transactions_v2 t
        WHERE t.investor_id = ip.investor_id 
          AND t.fund_id = ip.fund_id 
          AND NOT t.is_voided
          AND t.type = 'WITHDRAWAL'
          AND t.tx_date >= v_qtd_start AND t.tx_date <= v_period_end
      ), 0) as qtd_redemptions,
      -- 4. Bounded QTD Net Income
      COALESCE((
        SELECT SUM(t.amount)
        FROM transactions_v2 t
        WHERE t.investor_id = ip.investor_id 
          AND t.fund_id = ip.fund_id 
          AND NOT t.is_voided
          AND t.type IN ('YIELD', 'IB_CREDIT')
          AND t.tx_date >= v_qtd_start AND t.tx_date <= v_period_end
      ), 0) as qtd_net_income,

      -- ================= YTD =================
      -- 1. Forward YTD Beginning Balance
      COALESCE((
        SELECT SUM(CASE WHEN t.type = 'WITHDRAWAL' THEN -ABS(t.amount) ELSE t.amount END)
        FROM transactions_v2 t
        WHERE t.investor_id = ip.investor_id 
          AND t.fund_id = ip.fund_id 
          AND NOT t.is_voided
          AND t.tx_date < v_ytd_start
      ), 0) as ytd_beginning_balance,
      -- 2. Bounded YTD Additions
      COALESCE((
        SELECT SUM(t.amount)
        FROM transactions_v2 t
        WHERE t.investor_id = ip.investor_id 
          AND t.fund_id = ip.fund_id 
          AND NOT t.is_voided
          AND t.type = 'DEPOSIT'
          AND t.tx_date >= v_ytd_start AND t.tx_date <= v_period_end
      ), 0) as ytd_additions,
      -- 3. Bounded YTD Redemptions
      COALESCE((
        SELECT SUM(ABS(t.amount))
        FROM transactions_v2 t
        WHERE t.investor_id = ip.investor_id 
          AND t.fund_id = ip.fund_id 
          AND NOT t.is_voided
          AND t.type = 'WITHDRAWAL'
          AND t.tx_date >= v_ytd_start AND t.tx_date <= v_period_end
      ), 0) as ytd_redemptions,
      -- 4. Bounded YTD Net Income
      COALESCE((
        SELECT SUM(t.amount)
        FROM transactions_v2 t
        WHERE t.investor_id = ip.investor_id 
          AND t.fund_id = ip.fund_id 
          AND NOT t.is_voided
          AND t.type IN ('YIELD', 'IB_CREDIT')
          AND t.tx_date >= v_ytd_start AND t.tx_date <= v_period_end
      ), 0) as ytd_net_income,

      -- ================= ITD =================
      -- 1. Forward ITD Beginning Balance (Always strictly zero)
      0::numeric as itd_beginning_balance,
      -- 2. Bounded ITD Additions
      COALESCE((
        SELECT SUM(t.amount)
        FROM transactions_v2 t
        WHERE t.investor_id = ip.investor_id 
          AND t.fund_id = ip.fund_id 
          AND NOT t.is_voided
          AND t.type = 'DEPOSIT'
          AND t.tx_date <= v_period_end
      ), 0) as itd_additions,
      -- 3. Bounded ITD Redemptions
      COALESCE((
        SELECT SUM(ABS(t.amount))
        FROM transactions_v2 t
        WHERE t.investor_id = ip.investor_id 
          AND t.fund_id = ip.fund_id 
          AND NOT t.is_voided
          AND t.type = 'WITHDRAWAL'
          AND t.tx_date <= v_period_end
      ), 0) as itd_redemptions,
      -- 4. Bounded ITD Net Income
      COALESCE((
        SELECT SUM(t.amount)
        FROM transactions_v2 t
        WHERE t.investor_id = ip.investor_id 
          AND t.fund_id = ip.fund_id 
          AND NOT t.is_voided
          AND t.type IN ('YIELD', 'IB_CREDIT')
          AND t.tx_date <= v_period_end
      ), 0) as itd_net_income

    FROM investor_positions ip
    JOIN funds f ON ip.fund_id = f.id
    JOIN profiles p ON p.id = ip.investor_id
    WHERE ip.current_value > 0 -- Optimization to only run this for active ledgers
      AND p.account_type = 'investor'
      AND (p_investor_id IS NULL OR ip.investor_id = p_investor_id)
  LOOP
    -- Calculate Modified Dietz Rate of Return: net_income / (begin + (add - red)/2) * 100
    DECLARE
      mtd_ror NUMERIC := CASE 
        WHEN r.mtd_beginning_balance + (r.mtd_additions - r.mtd_redemptions) / 2 > 0 
        THEN r.mtd_net_income / (r.mtd_beginning_balance + (r.mtd_additions - r.mtd_redemptions) / 2) * 100 
        ELSE 0 
      END;
      qtd_ror NUMERIC := CASE 
        WHEN r.qtd_beginning_balance + (r.qtd_additions - r.qtd_redemptions) / 2 > 0 
        THEN r.qtd_net_income / (r.qtd_beginning_balance + (r.qtd_additions - r.qtd_redemptions) / 2) * 100 
        ELSE 0 
      END;
      ytd_ror NUMERIC := CASE 
        WHEN r.ytd_beginning_balance + (r.ytd_additions - r.ytd_redemptions) / 2 > 0 
        THEN r.ytd_net_income / (r.ytd_beginning_balance + (r.ytd_additions - r.ytd_redemptions) / 2) * 100 
        ELSE 0 
      END;
      itd_ror NUMERIC := CASE 
        WHEN (r.itd_additions - r.itd_redemptions) / 2 > 0 
        THEN r.itd_net_income / ((r.itd_additions - r.itd_redemptions) / 2) * 100 
        ELSE 0 
      END;
    BEGIN
      INSERT INTO investor_fund_performance (
        period_id, investor_id, fund_name,
        mtd_beginning_balance, mtd_additions, mtd_redemptions, mtd_net_income, mtd_ending_balance, mtd_rate_of_return,
        qtd_beginning_balance, qtd_additions, qtd_redemptions, qtd_net_income, qtd_ending_balance, qtd_rate_of_return,
        ytd_beginning_balance, ytd_additions, ytd_redemptions, ytd_net_income, ytd_ending_balance, ytd_rate_of_return,
        itd_beginning_balance, itd_additions, itd_redemptions, itd_net_income, itd_ending_balance, itd_rate_of_return,
        created_at, updated_at
      ) VALUES (
        v_period_id, r.investor_id, r.fund_name,
        r.mtd_beginning_balance, r.mtd_additions, r.mtd_redemptions, r.mtd_net_income, r.exact_ending_balance, mtd_ror,
        r.qtd_beginning_balance, r.qtd_additions, r.qtd_redemptions, r.qtd_net_income, r.exact_ending_balance, qtd_ror,
        r.ytd_beginning_balance, r.ytd_additions, r.ytd_redemptions, r.ytd_net_income, r.exact_ending_balance, ytd_ror,
        r.itd_beginning_balance, r.itd_additions, r.itd_redemptions, r.itd_net_income, r.exact_ending_balance, itd_ror,
        NOW(), NOW()
      );
      
      v_records_inserted := v_records_inserted + 1;
    END;
  END LOOP;

  RETURN v_records_inserted;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.populate_investor_fund_performance(uuid, date) TO authenticated;
