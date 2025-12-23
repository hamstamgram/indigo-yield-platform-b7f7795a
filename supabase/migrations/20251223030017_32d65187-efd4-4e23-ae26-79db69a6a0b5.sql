-- ============================================================================
-- COMPREHENSIVE FIX: Drop broken function overloads and fix column mismatches
-- This migration ensures NO functions reference non-existent columns
-- ============================================================================

-- ============================================================================
-- PHASE 1: Drop broken apply_daily_yield_to_fund_v2 overloads
-- These use wrong columns like statement_periods.start_date, yield_distributions.distribution_date
-- ============================================================================

-- Drop the 5-param version with p_admin_id that uses wrong column references
DROP FUNCTION IF EXISTS apply_daily_yield_to_fund_v2(uuid, date, numeric, uuid, text);

-- Drop the 4-param version with p_new_aum that uses wrong column references  
DROP FUNCTION IF EXISTS apply_daily_yield_to_fund_v2(uuid, date, numeric, text);

-- ============================================================================
-- PHASE 2: Create the CORRECT apply function with proper column references
-- Uses: statement_periods (year, month, period_end_date)
-- Uses: yield_distributions (effective_date, gross_yield)
-- ============================================================================

CREATE OR REPLACE FUNCTION apply_daily_yield_to_fund_v2(
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
AS $$
DECLARE
    v_fund record;
    v_investor record;
    v_total_aum numeric := 0;
    v_investor_yield numeric;
    v_investor_fee numeric;
    v_investor_net numeric;
    v_fee_pct numeric;
    v_allocation_pct numeric;
    v_distribution_id uuid;
    v_period_id uuid;
    v_period_year integer;
    v_period_month integer;
    v_total_fees numeric := 0;
    v_total_ib_fees numeric := 0;
    v_investors_updated integer := 0;
    v_ib_parent_id uuid;
    v_ib_percentage numeric;
    v_ib_amount numeric;
    v_result jsonb;
    v_enum_purpose aum_purpose;
BEGIN
    -- Cast purpose to enum
    v_enum_purpose := p_purpose::aum_purpose;
    
    -- Get fund info
    SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Fund not found');
    END IF;
    
    -- Calculate total AUM from active investor positions
    SELECT COALESCE(SUM(ip.current_value), 0) INTO v_total_aum
    FROM investor_positions ip
    JOIN profiles p ON ip.investor_id = p.id
    WHERE ip.fund_id = p_fund_id
    AND ip.current_value > 0
    AND (p.status IS NULL OR p.status = 'active');
    
    IF v_total_aum <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'No active positions to distribute yield');
    END IF;
    
    -- Get or create period using CORRECT column names (year, month, period_end_date)
    v_period_year := EXTRACT(YEAR FROM p_date)::integer;
    v_period_month := EXTRACT(MONTH FROM p_date)::integer;
    
    SELECT id INTO v_period_id
    FROM statement_periods
    WHERE year = v_period_year AND month = v_period_month
    LIMIT 1;
    
    IF v_period_id IS NULL THEN
        INSERT INTO statement_periods (year, month, period_end_date, status, period_name)
        VALUES (
            v_period_year,
            v_period_month,
            (date_trunc('month', p_date) + interval '1 month' - interval '1 day')::date,
            'open',
            to_char(p_date, 'YYYY-MM')
        )
        RETURNING id INTO v_period_id;
    END IF;
    
    -- Create yield distribution record using CORRECT column names (effective_date, gross_yield)
    INSERT INTO yield_distributions (
        fund_id,
        effective_date,
        gross_yield,
        purpose,
        status,
        created_by,
        summary_json
    ) VALUES (
        p_fund_id,
        p_date,
        p_gross_amount,
        v_enum_purpose,
        'applied',
        p_admin_id,
        jsonb_build_object(
            'period_id', v_period_id,
            'total_aum', v_total_aum,
            'applied_at', now()
        )
    )
    RETURNING id INTO v_distribution_id;
    
    -- Process each investor with active positions
    FOR v_investor IN
        SELECT 
            ip.investor_id,
            ip.id as position_id,
            ip.current_value,
            COALESCE(p.fee_percentage, 20) as fee_percentage,
            p.ib_parent_id,
            COALESCE(p.ib_percentage, 0) as ib_percentage
        FROM investor_positions ip
        JOIN profiles p ON ip.investor_id = p.id
        WHERE ip.fund_id = p_fund_id
        AND ip.current_value > 0
        AND (p.status IS NULL OR p.status = 'active')
    LOOP
        -- Calculate allocation percentage
        v_allocation_pct := v_investor.current_value / v_total_aum;
        
        -- Calculate gross yield for this investor
        v_investor_yield := p_gross_amount * v_allocation_pct;
        
        -- Calculate fee (as percentage of yield)
        v_fee_pct := v_investor.fee_percentage / 100.0;
        v_investor_fee := v_investor_yield * v_fee_pct;
        v_total_fees := v_total_fees + v_investor_fee;
        
        -- Calculate IB fee if applicable
        v_ib_parent_id := v_investor.ib_parent_id;
        v_ib_percentage := v_investor.ib_percentage;
        v_ib_amount := 0;
        
        IF v_ib_parent_id IS NOT NULL AND v_ib_percentage > 0 THEN
            -- IB gets a percentage of the platform fee
            v_ib_amount := v_investor_fee * (v_ib_percentage / 100.0);
            v_total_ib_fees := v_total_ib_fees + v_ib_amount;
            
            -- Record IB allocation
            INSERT INTO ib_allocations (
                fund_id,
                distribution_id,
                source_investor_id,
                ib_investor_id,
                source_net_income,
                ib_percentage,
                ib_fee_amount,
                effective_date,
                purpose,
                period_id,
                created_by
            ) VALUES (
                p_fund_id,
                v_distribution_id,
                v_investor.investor_id,
                v_ib_parent_id,
                v_investor_yield - v_investor_fee,
                v_ib_percentage,
                v_ib_amount,
                p_date,
                v_enum_purpose,
                v_period_id,
                p_admin_id
            );
        END IF;
        
        -- Net yield after fees
        v_investor_net := v_investor_yield - v_investor_fee;
        
        -- Update investor position
        UPDATE investor_positions
        SET current_value = current_value + v_investor_net,
            unrealized_pnl = COALESCE(unrealized_pnl, 0) + v_investor_net,
            updated_at = now()
        WHERE id = v_investor.position_id;
        
        -- Record fee allocation
        INSERT INTO fee_allocations (
            distribution_id,
            fund_id,
            investor_id,
            period_start,
            period_end,
            purpose,
            base_net_income,
            fee_percentage,
            fee_amount,
            created_by
        ) VALUES (
            v_distribution_id,
            p_fund_id,
            v_investor.investor_id,
            make_date(v_period_year, v_period_month, 1),
            (date_trunc('month', p_date) + interval '1 month' - interval '1 day')::date,
            v_enum_purpose,
            v_investor_yield,
            v_investor.fee_percentage,
            v_investor_fee,
            p_admin_id
        );
        
        -- Create yield transaction
        INSERT INTO transactions_v2 (
            investor_id,
            fund_id,
            transaction_type,
            amount,
            effective_date,
            purpose,
            reference_id,
            notes,
            created_by
        ) VALUES (
            v_investor.investor_id,
            p_fund_id,
            'yield',
            v_investor_net,
            p_date,
            v_enum_purpose,
            v_distribution_id::text,
            'Daily yield distribution',
            p_admin_id
        );
        
        v_investors_updated := v_investors_updated + 1;
    END LOOP;
    
    -- Update distribution summary
    UPDATE yield_distributions
    SET summary_json = summary_json || jsonb_build_object(
            'total_fees', v_total_fees,
            'total_ib_fees', v_total_ib_fees,
            'investors_updated', v_investors_updated,
            'net_yield', p_gross_amount - v_total_fees
        )
    WHERE id = v_distribution_id;
    
    -- Build result
    v_result := jsonb_build_object(
        'success', true,
        'distribution_id', v_distribution_id,
        'period_id', v_period_id,
        'gross_amount', p_gross_amount,
        'total_fees', v_total_fees,
        'total_ib_fees', v_total_ib_fees,
        'net_amount', p_gross_amount - v_total_fees,
        'investors_updated', v_investors_updated,
        'purpose', p_purpose
    );
    
    RETURN v_result;
END;
$$;

-- ============================================================================
-- PHASE 3: Fix get_reporting_eligible_investors function
-- This function incorrectly references period_start_date which doesn't exist
-- ============================================================================

DROP FUNCTION IF EXISTS get_reporting_eligible_investors(uuid);

CREATE OR REPLACE FUNCTION get_reporting_eligible_investors(p_period_id uuid)
RETURNS TABLE(
    investor_id uuid,
    investor_name text,
    email text,
    eligibility_reason text,
    is_eligible boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_period_start date;
    v_period_end date;
    v_period_year integer;
    v_period_month integer;
BEGIN
    -- Get period dates using CORRECT column names (year, month, period_end_date)
    SELECT 
        sp.year,
        sp.month,
        make_date(sp.year, sp.month, 1),  -- Calculate period start from year/month
        sp.period_end_date
    INTO v_period_year, v_period_month, v_period_start, v_period_end
    FROM statement_periods sp
    WHERE sp.id = p_period_id;
    
    IF v_period_start IS NULL THEN
        RAISE EXCEPTION 'Period not found: %', p_period_id;
    END IF;
    
    RETURN QUERY
    WITH investor_data AS (
        SELECT 
            p.id as inv_id,
            COALESCE(p.display_name, p.full_name, 'Unknown') as inv_name,
            p.email as inv_email,
            p.status as inv_status,
            EXISTS (
                SELECT 1 FROM investor_positions ip
                WHERE ip.investor_id = p.id
                AND ip.current_value > 0
            ) as has_positions,
            EXISTS (
                SELECT 1 FROM investor_fund_performance ifp
                WHERE ifp.investor_id = p.id
                AND ifp.period_id = p_period_id
                AND (ifp.purpose IS NULL OR ifp.purpose = 'reporting')
            ) as has_performance_data,
            EXISTS (
                SELECT 1 FROM generated_statements gs
                WHERE gs.investor_id = p.id
                AND gs.period_id = p_period_id
            ) as already_generated
        FROM profiles p
        WHERE p.role = 'investor' OR p.role IS NULL
    )
    SELECT 
        id.inv_id,
        id.inv_name,
        id.inv_email,
        CASE 
            WHEN id.already_generated THEN 'Statement already generated'
            WHEN NOT id.has_positions THEN 'No active positions'
            WHEN NOT id.has_performance_data THEN 'No performance data for period'
            WHEN id.inv_status = 'inactive' THEN 'Account inactive'
            ELSE 'Eligible for statement'
        END as reason,
        (id.has_positions AND id.has_performance_data AND NOT id.already_generated AND COALESCE(id.inv_status, 'active') != 'inactive') as eligible
    FROM investor_data id
    ORDER BY id.inv_name;
END;
$$;

-- ============================================================================
-- PHASE 4: Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION apply_daily_yield_to_fund_v2(uuid, date, numeric, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_reporting_eligible_investors(uuid) TO authenticated;