-- Fix apply_daily_yield_to_fund_v2: divide fee_bps by 100 for fee_allocations.fee_percentage
-- The constraint expects percentage format (0-100), not basis points (0-10000)

CREATE OR REPLACE FUNCTION public.apply_daily_yield_to_fund_v2(p_fund_id uuid, p_date date, p_gross_amount numeric, p_admin_id uuid, p_purpose text DEFAULT 'reporting'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_total_yield numeric := 0;
    v_investor_count integer := 0;
    v_distribution_id uuid;
    v_fund_record RECORD;
    v_investor RECORD;
    v_investor_yield numeric;
    v_fee_amount numeric;
    v_ib_amount numeric;
    v_net_yield numeric;
    v_total_aum numeric := 0;
    v_fees_account_id uuid := '169bb053-36cb-4f6e-93ea-831f0dfeaf1d';
    v_total_fees numeric := 0;
    v_total_ib numeric := 0;
    v_is_month_end boolean;
BEGIN
    -- Get fund details
    SELECT * INTO v_fund_record FROM funds WHERE id = p_fund_id;
    IF v_fund_record IS NULL THEN
        RAISE EXCEPTION 'Fund not found: %', p_fund_id;
    END IF;

    -- Calculate total AUM for this fund (excluding fees account)
    SELECT COALESCE(SUM(current_value), 0) INTO v_total_aum
    FROM investor_positions
    WHERE fund_id = p_fund_id
      AND current_value > 0
      AND investor_id != v_fees_account_id;

    IF v_total_aum <= 0 THEN
        RAISE EXCEPTION 'No investor positions found for fund %', p_fund_id;
    END IF;

    -- Determine if this is month end
    v_is_month_end := p_date = (date_trunc('month', p_date) + interval '1 month' - interval '1 day')::date;

    -- Create yield distribution record
    INSERT INTO yield_distributions (
        fund_id,
        effective_date,
        purpose,
        is_month_end,
        recorded_aum,
        gross_yield,
        distribution_type,
        status,
        created_by
    ) VALUES (
        p_fund_id,
        p_date,
        p_purpose::aum_purpose,
        v_is_month_end,
        v_total_aum,
        p_gross_amount,
        'daily',
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
            -- fee_percentage is stored as decimal (0.05 = 5%), convert to bps for calculation
            COALESCE(p.fee_percentage * 10000, v_fund_record.perf_fee_bps, 0) as fee_bps,
            -- ib_parent_id is the correct column name
            p.ib_parent_id as ib_id,
            -- ib_percentage is stored as decimal, convert to bps
            COALESCE(p.ib_percentage * 10000, 0) as ib_fee_share_bps
        FROM investor_positions ip
        JOIN profiles p ON p.id = ip.investor_id
        WHERE ip.fund_id = p_fund_id
          AND ip.current_value > 0
          AND ip.investor_id != v_fees_account_id
    LOOP
        -- Calculate yield proportionally based on investor's share of AUM
        v_investor_yield := p_gross_amount * (v_investor.current_value / v_total_aum);
        
        -- Calculate fee (from investor's yield)
        v_fee_amount := v_investor_yield * (v_investor.fee_bps / 10000.0);
        
        -- Calculate IB share (from the fee, not additional)
        IF v_investor.ib_id IS NOT NULL AND v_investor.ib_fee_share_bps > 0 THEN
            v_ib_amount := v_fee_amount * (v_investor.ib_fee_share_bps / 10000.0);
        ELSE
            v_ib_amount := 0;
        END IF;
        
        -- Net yield to investor
        v_net_yield := v_investor_yield - v_fee_amount;
        
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
            'YIELD'::tx_type,
            v_net_yield,
            v_fund_record.asset,
            v_investor.fund_class,
            p_date,
            'Daily yield distribution',
            'yield_' || v_distribution_id || '_' || v_investor.investor_id,
            p_admin_id,
            p_purpose::aum_purpose
        );

        -- Record fee allocation
        -- FIX: Divide fee_bps by 100 to get percentage format (0-100) instead of basis points (0-10000)
        IF v_fee_amount > 0 THEN
            INSERT INTO fee_allocations (
                distribution_id,
                fund_id,
                investor_id,
                fees_account_id,
                base_net_income,
                fee_percentage,
                fee_amount,
                period_start,
                period_end,
                purpose,
                created_by
            ) VALUES (
                v_distribution_id,
                p_fund_id,
                v_investor.investor_id,
                v_fees_account_id,
                v_investor_yield,
                v_investor.fee_bps / 100.0,  -- Convert bps to percentage (2000 bps → 20%)
                v_fee_amount,
                p_date,
                p_date,
                p_purpose::aum_purpose,
                p_admin_id
            );
            
            v_total_fees := v_total_fees + v_fee_amount;
        END IF;

        -- Record IB allocation if applicable
        IF v_ib_amount > 0 AND v_investor.ib_id IS NOT NULL THEN
            INSERT INTO ib_allocations (
                distribution_id,
                fund_id,
                source_investor_id,
                ib_investor_id,
                source_net_income,
                ib_percentage,
                ib_fee_amount,
                period_start,
                period_end,
                effective_date,
                purpose,
                created_by
            ) VALUES (
                v_distribution_id,
                p_fund_id,
                v_investor.investor_id,
                v_investor.ib_id,
                v_net_yield,
                v_investor.ib_fee_share_bps / 100.0,  -- Convert bps to percentage
                v_ib_amount,
                p_date,
                p_date,
                p_date,
                p_purpose::aum_purpose,
                p_admin_id
            );
            
            v_total_ib := v_total_ib + v_ib_amount;
        END IF;

        v_total_yield := v_total_yield + v_net_yield;
        v_investor_count := v_investor_count + 1;
    END LOOP;

    -- Update the distribution record with totals
    UPDATE yield_distributions
    SET net_yield = v_total_yield,
        total_fees = v_total_fees,
        total_ib = v_total_ib,
        investor_count = v_investor_count
    WHERE id = v_distribution_id;

    -- Credit fees to the fees account
    IF v_total_fees > 0 THEN
        UPDATE investor_positions
        SET current_value = current_value + (v_total_fees - v_total_ib),
            updated_at = NOW()
        WHERE investor_id = v_fees_account_id
          AND fund_id = p_fund_id;

        -- Create fee credit transaction
        INSERT INTO transactions_v2 (
            investor_id, fund_id, type, amount, asset, fund_class,
            tx_date, notes, reference_id, created_by, purpose
        ) VALUES (
            v_fees_account_id,
            p_fund_id,
            'FEE_CREDIT'::tx_type,
            v_total_fees - v_total_ib,
            v_fund_record.asset,
            v_fund_record.fund_class,
            p_date,
            'Platform fees from yield distribution',
            'fee_' || v_distribution_id,
            p_admin_id,
            p_purpose::aum_purpose
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'distribution_id', v_distribution_id,
        'fund_id', p_fund_id,
        'date', p_date,
        'gross_amount', p_gross_amount,
        'net_yield', v_total_yield,
        'total_fees', v_total_fees,
        'total_ib', v_total_ib,
        'investor_count', v_investor_count,
        'recorded_aum', v_total_aum
    );
END;
$function$;