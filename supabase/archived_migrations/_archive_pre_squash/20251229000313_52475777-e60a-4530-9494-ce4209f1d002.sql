-- Drop the old 5-parameter version that still uses 'open' status
DROP FUNCTION IF EXISTS public.apply_daily_yield_to_fund_v2(uuid, date, numeric, uuid, text);

-- Create corrected 5-parameter version with 'DRAFT' status
CREATE OR REPLACE FUNCTION public.apply_daily_yield_to_fund_v2(
    p_fund_id uuid,
    p_date date,
    p_gross_amount numeric,
    p_admin_id uuid,
    p_purpose text DEFAULT 'reporting'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_fund RECORD;
    v_distribution_id uuid;
    v_period_id uuid;
    v_total_distributed numeric := 0;
    v_investor_count integer := 0;
    v_total_fees numeric := 0;
    v_total_ib numeric := 0;
    v_investor RECORD;
    v_investor_share numeric;
    v_investor_gross numeric;
    v_fee_amount numeric;
    v_ib_amount numeric;
    v_net_yield numeric;
    v_total_aum numeric;
    v_fees_account_id uuid := '169bb053-36cb-4f6e-93ea-831f0dfeaf1d';
    v_period_year integer;
    v_period_month integer;
    v_daily_rate numeric;
BEGIN
    -- Get fund details
    SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
    IF v_fund IS NULL THEN
        RAISE EXCEPTION 'Fund not found: %', p_fund_id;
    END IF;

    -- Calculate total AUM for this fund
    SELECT COALESCE(SUM(current_value), 0) INTO v_total_aum
    FROM investor_positions
    WHERE fund_id = p_fund_id
      AND current_value > 0
      AND investor_id != v_fees_account_id;

    IF v_total_aum <= 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'No investor positions with positive balance'
        );
    END IF;

    -- Calculate daily rate from gross amount and AUM
    v_daily_rate := p_gross_amount / v_total_aum;

    -- Calculate period
    v_period_year := EXTRACT(YEAR FROM p_date);
    v_period_month := EXTRACT(MONTH FROM p_date);

    -- Get or create statement period with DRAFT status (not 'open')
    SELECT id INTO v_period_id
    FROM statement_periods
    WHERE year = v_period_year AND month = v_period_month;

    IF v_period_id IS NULL THEN
        INSERT INTO statement_periods (year, month, period_end_date, status, period_name)
        VALUES (
            v_period_year,
            v_period_month,
            (date_trunc('month', p_date) + interval '1 month' - interval '1 day')::date,
            'DRAFT',
            to_char(p_date, 'YYYY-MM')
        )
        RETURNING id INTO v_period_id;
    END IF;

    -- Create yield distribution record
    INSERT INTO yield_distributions (
        fund_id,
        distribution_date,
        period_start,
        period_end,
        gross_amount,
        daily_rate,
        purpose,
        status,
        created_by
    ) VALUES (
        p_fund_id,
        p_date,
        date_trunc('month', p_date)::date,
        (date_trunc('month', p_date) + interval '1 month' - interval '1 day')::date,
        p_gross_amount,
        v_daily_rate,
        p_purpose::aum_purpose,
        'applied',
        p_admin_id
    )
    RETURNING id INTO v_distribution_id;

    -- Process each investor with a position in this fund
    FOR v_investor IN
        SELECT 
            ip.investor_id,
            ip.current_value,
            ip.fund_class,
            COALESCE(p.fee_override_bps, v_fund.perf_fee_bps, 0) as fee_bps,
            COALESCE(p.ib_id, NULL) as ib_id,
            COALESCE(p.ib_fee_share_bps, 0) as ib_fee_share_bps
        FROM investor_positions ip
        JOIN profiles p ON p.id = ip.investor_id
        WHERE ip.fund_id = p_fund_id
          AND ip.current_value > 0
          AND p.id != v_fees_account_id
    LOOP
        -- Calculate this investor's share of the gross yield
        v_investor_share := v_investor.current_value / v_total_aum;
        v_investor_gross := p_gross_amount * v_investor_share;
        
        -- Calculate fee (from investor's yield)
        v_fee_amount := v_investor_gross * (v_investor.fee_bps / 10000.0);
        
        -- Calculate IB share (from the fee, not additional)
        IF v_investor.ib_id IS NOT NULL AND v_investor.ib_fee_share_bps > 0 THEN
            v_ib_amount := v_fee_amount * (v_investor.ib_fee_share_bps / 10000.0);
        ELSE
            v_ib_amount := 0;
        END IF;
        
        -- Net yield to investor
        v_net_yield := v_investor_gross - v_fee_amount;
        
        -- Update investor position with net yield
        UPDATE investor_positions
        SET current_value = current_value + v_net_yield,
            updated_at = NOW()
        WHERE investor_id = v_investor.investor_id
          AND fund_id = p_fund_id;

        -- Create yield transaction for investor
        INSERT INTO transactions_v2 (
            investor_id, fund_id, type, amount, asset, fund_class,
            tx_date, notes, reference_id, created_by, purpose
        ) VALUES (
            v_investor.investor_id,
            p_fund_id,
            'YIELD',
            v_net_yield,
            v_fund.asset,
            v_investor.fund_class,
            p_date,
            'Daily yield distribution',
            'yield_' || v_distribution_id || '_' || v_investor.investor_id,
            p_admin_id,
            p_purpose::aum_purpose
        );

        -- Record fee allocation
        IF v_fee_amount > 0 THEN
            INSERT INTO fee_allocations (
                distribution_id, fund_id, investor_id, fees_account_id,
                base_net_income, fee_percentage, fee_amount,
                period_start, period_end, purpose, created_by
            ) VALUES (
                v_distribution_id,
                p_fund_id,
                v_investor.investor_id,
                v_fees_account_id,
                v_investor_gross,
                v_investor.fee_bps,
                v_fee_amount,
                date_trunc('month', p_date)::date,
                (date_trunc('month', p_date) + interval '1 month' - interval '1 day')::date,
                p_purpose::aum_purpose,
                p_admin_id
            );
            
            v_total_fees := v_total_fees + v_fee_amount;
        END IF;

        -- Record IB allocation if applicable
        IF v_ib_amount > 0 AND v_investor.ib_id IS NOT NULL THEN
            INSERT INTO ib_allocations (
                distribution_id, fund_id, source_investor_id, ib_investor_id,
                source_net_income, ib_percentage, ib_fee_amount,
                period_start, period_end, purpose, created_by
            ) VALUES (
                v_distribution_id,
                p_fund_id,
                v_investor.investor_id,
                v_investor.ib_id,
                v_fee_amount,
                v_investor.ib_fee_share_bps,
                v_ib_amount,
                date_trunc('month', p_date)::date,
                (date_trunc('month', p_date) + interval '1 month' - interval '1 day')::date,
                p_purpose::aum_purpose,
                p_admin_id
            );
            
            v_total_ib := v_total_ib + v_ib_amount;
        END IF;

        v_total_distributed := v_total_distributed + v_net_yield;
        v_investor_count := v_investor_count + 1;
    END LOOP;

    -- Credit fees to INDIGO FEES account
    IF v_total_fees > 0 THEN
        UPDATE investor_positions
        SET current_value = current_value + v_total_fees,
            updated_at = NOW()
        WHERE investor_id = v_fees_account_id
          AND fund_id = p_fund_id;

        -- If no position exists, create one
        IF NOT FOUND THEN
            INSERT INTO investor_positions (
                investor_id, fund_id, fund_class, shares, current_value, cost_basis
            ) VALUES (
                v_fees_account_id, p_fund_id, v_fund.fund_class, 0, v_total_fees, 0
            );
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'distribution_id', v_distribution_id,
        'gross_amount', p_gross_amount,
        'total_distributed', v_total_distributed,
        'total_fees', v_total_fees,
        'total_ib', v_total_ib,
        'investor_count', v_investor_count,
        'daily_rate', v_daily_rate
    );
END;
$function$;