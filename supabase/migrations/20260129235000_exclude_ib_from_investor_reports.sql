-- Exclude IB accounts from investor-facing report data.

-- 1) Remove any existing IB records from investor-facing report tables (if tables exist).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'investor_fund_performance') THEN
    DELETE FROM investor_fund_performance
    WHERE investor_id IN (SELECT id FROM profiles WHERE account_type = 'ib');
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'investor_monthly_reports') THEN
    DELETE FROM investor_monthly_reports
    WHERE investor_id IN (SELECT id FROM profiles WHERE account_type = 'ib');
  END IF;
END $$;

-- 2) Ensure populate_investor_fund_performance only includes investors.
CREATE OR REPLACE FUNCTION public.populate_investor_fund_performance(p_investor_id uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_period_id UUID;
  v_records_inserted INTEGER := 0;
  r RECORD;
BEGIN
  -- Get current period (create if not exists)
  SELECT id INTO v_period_id
  FROM statement_periods
  WHERE status = 'DRAFT'
  ORDER BY year DESC, month DESC
  LIMIT 1;

  IF v_period_id IS NULL THEN
    INSERT INTO statement_periods (year, month, period_name, period_end_date, status)
    VALUES (
      EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
      EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER,
      TO_CHAR(CURRENT_DATE, 'Month YYYY'),
      (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::DATE,
      'DRAFT'
    )
    RETURNING id INTO v_period_id;
  END IF;

  -- Delete existing records for this period (and optionally investor)
  DELETE FROM investor_fund_performance
  WHERE period_id = v_period_id
    AND (p_investor_id IS NULL OR investor_id = p_investor_id);

  -- For each active position, calculate metrics (investor accounts only)
  FOR r IN 
    SELECT 
      ip.investor_id,
      ip.fund_id,
      f.name as fund_name,
      ip.current_value as current_position,
      -- MTD: Current month transactions
      COALESCE((
        SELECT SUM(CASE WHEN t.type = 'DEPOSIT' THEN t.amount ELSE 0 END)
        FROM transactions_v2 t
        WHERE t.investor_id = ip.investor_id 
          AND t.fund_id = ip.fund_id 
          AND NOT t.is_voided
          AND t.tx_date >= DATE_TRUNC('month', CURRENT_DATE)
      ), 0) as mtd_additions,
      COALESCE((
        SELECT SUM(CASE WHEN t.type = 'WITHDRAWAL' THEN ABS(t.amount) ELSE 0 END)
        FROM transactions_v2 t
        WHERE t.investor_id = ip.investor_id 
          AND t.fund_id = ip.fund_id 
          AND NOT t.is_voided
          AND t.tx_date >= DATE_TRUNC('month', CURRENT_DATE)
      ), 0) as mtd_redemptions,
      COALESCE((
        SELECT SUM(t.amount)
        FROM transactions_v2 t
        WHERE t.investor_id = ip.investor_id 
          AND t.fund_id = ip.fund_id 
          AND NOT t.is_voided
          AND t.type IN ('YIELD', 'IB_CREDIT')
          AND t.tx_date >= DATE_TRUNC('month', CURRENT_DATE)
      ), 0) as mtd_net_income,
      -- QTD: Current quarter transactions
      COALESCE((
        SELECT SUM(CASE WHEN t.type = 'DEPOSIT' THEN t.amount ELSE 0 END)
        FROM transactions_v2 t
        WHERE t.investor_id = ip.investor_id 
          AND t.fund_id = ip.fund_id 
          AND NOT t.is_voided
          AND t.tx_date >= DATE_TRUNC('quarter', CURRENT_DATE)
      ), 0) as qtd_additions,
      COALESCE((
        SELECT SUM(CASE WHEN t.type = 'WITHDRAWAL' THEN ABS(t.amount) ELSE 0 END)
        FROM transactions_v2 t
        WHERE t.investor_id = ip.investor_id 
          AND t.fund_id = ip.fund_id 
          AND NOT t.is_voided
          AND t.tx_date >= DATE_TRUNC('quarter', CURRENT_DATE)
      ), 0) as qtd_redemptions,
      COALESCE((
        SELECT SUM(t.amount)
        FROM transactions_v2 t
        WHERE t.investor_id = ip.investor_id 
          AND t.fund_id = ip.fund_id 
          AND NOT t.is_voided
          AND t.type IN ('YIELD', 'IB_CREDIT')
          AND t.tx_date >= DATE_TRUNC('quarter', CURRENT_DATE)
      ), 0) as qtd_net_income,
      -- YTD: Current year transactions
      COALESCE((
        SELECT SUM(CASE WHEN t.type = 'DEPOSIT' THEN t.amount ELSE 0 END)
        FROM transactions_v2 t
        WHERE t.investor_id = ip.investor_id 
          AND t.fund_id = ip.fund_id 
          AND NOT t.is_voided
          AND t.tx_date >= DATE_TRUNC('year', CURRENT_DATE)
      ), 0) as ytd_additions,
      COALESCE((
        SELECT SUM(CASE WHEN t.type = 'WITHDRAWAL' THEN ABS(t.amount) ELSE 0 END)
        FROM transactions_v2 t
        WHERE t.investor_id = ip.investor_id 
          AND t.fund_id = ip.fund_id 
          AND NOT t.is_voided
          AND t.tx_date >= DATE_TRUNC('year', CURRENT_DATE)
      ), 0) as ytd_redemptions,
      COALESCE((
        SELECT SUM(t.amount)
        FROM transactions_v2 t
        WHERE t.investor_id = ip.investor_id 
          AND t.fund_id = ip.fund_id 
          AND NOT t.is_voided
          AND t.type IN ('YIELD', 'IB_CREDIT')
          AND t.tx_date >= DATE_TRUNC('year', CURRENT_DATE)
      ), 0) as ytd_net_income,
      -- ITD: All transactions since inception
      COALESCE((
        SELECT SUM(CASE WHEN t.type = 'DEPOSIT' THEN t.amount ELSE 0 END)
        FROM transactions_v2 t
        WHERE t.investor_id = ip.investor_id 
          AND t.fund_id = ip.fund_id 
          AND NOT t.is_voided
      ), 0) as itd_additions,
      COALESCE((
        SELECT SUM(CASE WHEN t.type = 'WITHDRAWAL' THEN ABS(t.amount) ELSE 0 END)
        FROM transactions_v2 t
        WHERE t.investor_id = ip.investor_id 
          AND t.fund_id = ip.fund_id 
          AND NOT t.is_voided
      ), 0) as itd_redemptions,
      COALESCE((
        SELECT SUM(t.amount)
        FROM transactions_v2 t
        WHERE t.investor_id = ip.investor_id 
          AND t.fund_id = ip.fund_id 
          AND NOT t.is_voided
          AND t.type IN ('YIELD', 'IB_CREDIT')
      ), 0) as itd_net_income
    FROM investor_positions ip
    JOIN funds f ON ip.fund_id = f.id
    JOIN profiles p ON p.id = ip.investor_id
    WHERE ip.current_value > 0
      AND p.account_type = 'investor'
      AND (p_investor_id IS NULL OR ip.investor_id = p_investor_id)
  LOOP
    -- Calculate beginning balances (ending - additions + redemptions - net_income)
    DECLARE
      mtd_begin NUMERIC := r.current_position - r.mtd_additions + r.mtd_redemptions - r.mtd_net_income;
      qtd_begin NUMERIC := r.current_position - r.qtd_additions + r.qtd_redemptions - r.qtd_net_income;
      ytd_begin NUMERIC := r.current_position - r.ytd_additions + r.ytd_redemptions - r.ytd_net_income;
      itd_begin NUMERIC := 0; -- ITD always starts from 0
      
      -- Modified Dietz RoR: net_income / (begin + (add - red)/2) * 100
      mtd_ror NUMERIC := CASE 
        WHEN mtd_begin + (r.mtd_additions - r.mtd_redemptions) / 2 > 0 
        THEN r.mtd_net_income / (mtd_begin + (r.mtd_additions - r.mtd_redemptions) / 2) * 100 
        ELSE 0 
      END;
      qtd_ror NUMERIC := CASE 
        WHEN qtd_begin + (r.qtd_additions - r.qtd_redemptions) / 2 > 0 
        THEN r.qtd_net_income / (qtd_begin + (r.qtd_additions - r.qtd_redemptions) / 2) * 100 
        ELSE 0 
      END;
      ytd_ror NUMERIC := CASE 
        WHEN ytd_begin + (r.ytd_additions - r.ytd_redemptions) / 2 > 0 
        THEN r.ytd_net_income / (ytd_begin + (r.ytd_additions - r.ytd_redemptions) / 2) * 100 
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
        mtd_begin, r.mtd_additions, r.mtd_redemptions, r.mtd_net_income, r.current_position, mtd_ror,
        qtd_begin, r.qtd_additions, r.qtd_redemptions, r.qtd_net_income, r.current_position, qtd_ror,
        ytd_begin, r.ytd_additions, r.ytd_redemptions, r.ytd_net_income, r.current_position, ytd_ror,
        itd_begin, r.itd_additions, r.itd_redemptions, r.itd_net_income, r.current_position, itd_ror,
        NOW(), NOW()
      );
      
      v_records_inserted := v_records_inserted + 1;
    END;
  END LOOP;

  RETURN v_records_inserted;
END;
$function$;
