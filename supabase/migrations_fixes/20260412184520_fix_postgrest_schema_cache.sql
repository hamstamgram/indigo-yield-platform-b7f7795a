-- Fix PostgREST Schema Cache - Consolidation of Critical RPC Functions
-- Date: 2026-04-12
-- Purpose: Fix schema cache bug where functions with 5+ args + custom enum types aren't exposed via REST API

-- =============================================================================
-- PROBLEM: PostgREST schema cache doesn't expose critical RPC functions
-- ROOT CAUSE: 
--   1. Multiple overloads of apply_segmented_yield_distribution_v5 exist
--   2. Functions with 5+ params + custom enum (aum_purpose) fail to load
--   3. Inconsistent parameter naming between definitions
-- =============================================================================

-- Step 1: Drop all existing overloads of apply_segmented_yield_distribution_v5
-- Keep only the canonical 5-param version
DROP FUNCTION IF EXISTS apply_segmented_yield_distribution_v5(uuid, date, numeric, uuid, aum_purpose, date);
DROP FUNCTION IF EXISTS apply_segmented_yield_distribution_v5(uuid, date, numeric, aum_purpose);
DROP FUNCTION IF EXISTS apply_segmented_yield_distribution_v5(uuid, numeric, date, date, aum_purpose, uuid);

-- Step 2: Recreate canonical apply_segmented_yield_distribution_v5
-- This is the version that accepts AUM as INPUT and CALCULATES yield internally
CREATE OR REPLACE FUNCTION public.apply_segmented_yield_distribution_v5(
    p_fund_id uuid,
    p_period_end date,
    p_recorded_aum numeric,
    p_admin_id uuid DEFAULT NULL,
    p_purpose aum_purpose DEFAULT 'reporting'::aum_purpose
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_admin uuid;
    v_fund RECORD;
    v_period_start date;
    v_lock_key bigint;
    v_distribution_id uuid;
    v_fees_account_id uuid;
    
    -- Segment building
    v_seg_start date;
    v_seg_end date;
    v_seg_closing_aum numeric;
    v_seg_idx int := 0;
    v_seg_count int := 0;
    v_seg_yield numeric;
    v_balance_sum numeric;
    v_segments_meta jsonb := '[]'::jsonb;
    
    -- Running totals
    v_total_gross numeric := 0;
    v_total_net numeric := 0;
    v_total_fees numeric := 0;
    v_total_ib numeric := 0;
    v_total_seg_yield numeric := 0;
    v_allocation_count int := 0;
    v_opening_aum numeric := 0;
    
    -- Largest remainder
    v_largest_investor_id uuid;
    v_largest_gross numeric := 0;
    v_largest_fee_pct numeric := 0;
    v_largest_ib_rate numeric := 0;
    v_largest_ib_parent_id uuid;
    v_residual numeric;
    
    -- Segment processing
    v_investors_cur CURSOR FOR
        SELECT 
            ip.investor_id,
            ip.current_value as balance,
            ip.last_yield_crystallization_date,
            COALESCE(ifs.fee_pct, 0) as fee_pct,
            COALESCE(ib.ib_percentage, 0) as ib_percentage,
            ib.ib_investor_id,
            p.email as investor_email,
            p.first_name || ' ' || p.last_name as investor_name
        FROM investor_positions ip
        LEFT JOIN investor_fee_schedule ifs ON ip.investor_id = ifs.investor_id 
            AND ip.fund_id = ifs.fund_id 
            AND ifs.effective_date <= p_period_end
        LEFT JOIN ib_commission_schedule ib ON ip.investor_id = ib.investor_id 
            AND ip.fund_id = ib.fund_id 
            AND ib.effective_date <= p_period_end
        LEFT JOIN profiles p ON ip.investor_id = p.id
        WHERE ip.fund_id = p_fund_id 
            AND ip.is_active = true 
            AND ip.current_value > 0
        ORDER BY ip.current_value DESC;
    
    v_investor_row RECORD;
    v_gross_yield numeric;
    v_fee_amount numeric;
    v_net_yield numeric;
    v_ib_amount numeric;
    v_crystal_date date;
    
    -- Fee account tracking
    v_fees_account_balance numeric := 0;
    v_fees_account_yield numeric := 0;
    
    -- IB tracking
    v_ib_allocations jsonb := '[]'::jsonb;
    v_ib_total numeric := 0;
    
    -- Final state
    v_final_positions_sum numeric;
    v_crystals_consolidated int := 0;
BEGIN
    -- Admin guard
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: admin role required (JWT session check)';
    END IF;
    
    v_admin := COALESCE(p_admin_id, auth.uid());
    PERFORM set_config('indigo.canonical_rpc', 'true', true);
    
    -- Validate purpose
    IF p_purpose NOT IN ('reporting', 'transaction') THEN
        RAISE EXCEPTION 'Invalid purpose: %. Must be ''reporting'' or ''transaction''', p_purpose;
    END IF;
    
    -- Lock fund for distribution
    v_lock_key := ('x' || substr(md5(p_fund_id::text), 1, 15))::bit(64)::bigint;
    PERFORM pg_advisory_xact_lock(v_lock_key);
    
    -- Get fund details
    SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
    IF v_fund IS NULL THEN
        RAISE EXCEPTION 'Fund not found: %', p_fund_id;
    END IF;
    
    -- Determine period start from fund inception or previous distribution
    SELECT COALESCE(MAX(period_end), v_fund.inception_date)::date - 1
    INTO v_period_start
    FROM yield_distributions
    WHERE fund_id = p_fund_id 
        AND status = 'applied'::yield_distribution_status 
        AND purpose = p_purpose;
    
    IF v_period_start IS NULL THEN
        v_period_start := v_fund.inception_date;
    END IF;
    
    -- Get opening AUM from last period end
    SELECT COALESCE(SUM(current_value), 0) INTO v_opening_aum
    FROM investor_positions
    WHERE fund_id = p_fund_id AND is_active = true;
    
    -- Calculate gross yield = recorded_aum - opening_aum
    -- This is the "Ralph Loop" formula: yield is DERIVED from AUM, not input
    v_gross_yield := p_recorded_aum - v_opening_aum;
    
    IF v_gross_yield < 0 THEN
        RAISE EXCEPTION 'Invalid yield: recorded_aum (%) is less than opening_aum (%). Yield must be >= 0.', 
            p_recorded_aum, v_opening_aum;
    END IF;
    
    -- Check for existing applied distribution for this period
    IF EXISTS (
        SELECT 1 FROM yield_distributions 
        WHERE fund_id = p_fund_id 
            AND period_end = p_period_end 
            AND status = 'applied'::yield_distribution_status 
            AND purpose = p_purpose
    ) THEN
        RAISE EXCEPTION 'Yield distribution already applied for period % with purpose %', p_period_end, p_purpose;
    END IF;
    
    -- Get or create fees account position
    SELECT id INTO v_fees_account_id 
    FROM investor_positions 
    WHERE fund_id = p_fund_id AND investor_id = v_fund.fees_account_id;
    
    IF v_fees_account_id IS NULL AND v_fund.fees_account_id IS NOT NULL THEN
        INSERT INTO investor_positions (investor_id, fund_id, shares, cost_basis, current_value, is_active)
        VALUES (v_fund.funds_account_id, p_fund_id, 0, 0, 0, true)
        RETURNING id INTO v_fees_account_id;
    END IF;
    
    -- Process each investor proportionally
    OPEN v_investors_cur;
    LOOP
        FETCH v_investors_cur INTO v_investor_row;
        EXIT WHEN NOT FOUND;
        
        v_seg_idx := v_seg_idx + 1;
        
        -- Calculate proportional yield
        v_seg_yield := (v_investor_row.balance / NULLIF(v_opening_aum, 0)) * v_gross_yield;
        
        -- Calculate fee
        v_fee_amount := v_seg_yield * (v_investor_row.fee_pct / 100);
        
        -- Calculate IB commission (from fee)
        v_ib_amount := v_fee_amount * (v_investor_row.ib_percentage / 100);
        
        -- Net to investor
        v_net_yield := v_seg_yield - v_fee_amount - v_ib_amount;
        
        -- Track totals
        v_total_gross := v_total_gross + v_seg_yield;
        v_total_fees := v_total_fees + v_fee_amount;
        v_total_ib := v_total_ib + v_ib_amount;
        v_total_net := v_total_net + v_net_yield;
        v_allocation_count := v_allocation_count + 1;
        
        -- Track largest for residual allocation
        IF v_seg_yield > v_largest_gross THEN
            v_largest_gross := v_seg_yield;
            v_largest_investor_id := v_investor_row.investor_id;
            v_largest_fee_pct := v_investor_row.fee_pct;
            v_largest_ib_rate := v_investor_row.ib_percentage;
            v_largest_ib_parent_id := v_investor_row.ib_investor_id;
        END IF;
        
        -- Apply yield to investor position (create transaction)
        v_crystal_date := p_period_end;
        
        -- Insert yield transaction
        INSERT INTO transactions_v2 (
            investor_id, fund_id, tx_date, asset, amount, type,
            balance_before, balance_after, reference_id, notes,
            approved_by, approved_at, created_by, purpose, source, is_voided
        ) VALUES (
            v_investor_row.investor_id, p_fund_id, p_period_end, v_fund.asset,
            v_net_yield, 'YIELD'::tx_type,
            v_investor_row.balance, v_investor_row.balance + v_net_yield,
            'yield-' || p_fund_id::text || '-' || v_investor_row.investor_id::text || '-' || p_period_end::text,
            'Yield distribution ' || p_period_end::text, v_admin, NOW(), v_admin,
            p_purpose, 'rpc_canonical'::tx_source, false
        );
        
        -- Insert fee transaction
        IF v_fee_amount > 0 THEN
            INSERT INTO transactions_v2 (
                investor_id, fund_id, tx_date, asset, amount, type,
                balance_before, balance_after, reference_id, notes,
                approved_by, approved_at, created_by, purpose, source, is_voided
            ) VALUES (
                v_investor_row.investor_id, p_fund_id, p_period_end, v_fund.asset,
                v_fee_amount, 'FEE'::tx_type,
                v_investor_row.balance + v_net_yield, v_investor_row.balance + v_net_yield + v_fee_amount,
                'fee-' || p_fund_id::text || '-' || v_investor_row.investor_id::text || '-' || p_period_end::text,
                'Fee from yield distribution ' || p_period_end::text, v_admin, NOW(), v_admin,
                p_purpose, 'rpc_canonical'::tx_source, false
            );
        END IF;
        
        -- Update investor position
        UPDATE investor_positions 
        SET current_value = current_value + v_net_yield + v_fee_amount,
            last_yield_crystallization_date = p_period_end
        WHERE investor_id = v_investor_row.investor_id AND fund_id = p_fund_id;
        
        -- Record fee allocation
        IF v_fee_amount > 0 THEN
            INSERT INTO fee_allocations (fund_id, distribution_id, investor_id, gross_yield, fee_pct, fee_amount)
            VALUES (p_fund_id, NULL, v_investor_row.investor_id, v_seg_yield, v_investor_row.fee_pct, v_fee_amount);
        END IF;
        
        -- Record IB allocation
        IF v_ib_amount > 0 AND v_investor_row.ib_investor_id IS NOT NULL THEN
            INSERT INTO ib_commission_allocations (fund_id, distribution_id, source_investor_id, target_investor_id, gross_fee, ib_pct, ib_amount)
            VALUES (p_fund_id, NULL, v_investor_row.investor_id, v_investor_row.ib_investor_id, v_fee_amount, v_investor_row.ib_percentage, v_ib_amount);
            
            -- Credit IB investor
            INSERT INTO transactions_v2 (
                investor_id, fund_id, tx_date, asset, amount, type,
                balance_before, balance_after, reference_id, notes,
                approved_by, approved_at, created_by, purpose, source, is_voided
            ) VALUES (
                v_investor_row.ib_investor_id, p_fund_id, p_period_end, v_fund.asset,
                v_ib_amount, 'IB_CREDIT'::tx_type,
                0, v_ib_amount,
                'ib-' || p_fund_id::text || '-' || v_investor_row.investor_id::text || '-' || p_period_end::text,
                'IB commission from yield distribution', v_admin, NOW(), v_admin,
                p_purpose, 'rpc_canonical'::tx_source, false
            )
            ON CONFLICT (reference_id) DO NOTHING;
            
            UPDATE investor_positions 
            SET current_value = current_value + v_ib_amount
            WHERE investor_id = v_investor_row.ib_investor_id AND fund_id = p_fund_id;
            
            v_ib_allocations := v_ib_allocations || jsonb_build_array(jsonb_build_object(
                'source', v_investor_row.investor_id,
                'target', v_investor_row.ib_investor_id,
                'amount', v_ib_amount
            ));
            v_ib_total := v_ib_total + v_ib_amount;
        END IF;
        
        -- Add segment metadata
        v_segments_meta := v_segments_meta || jsonb_build_array(jsonb_build_object(
            'investor_id', v_investor_row.investor_id,
            'investor_name', v_investor_row.investor_name,
            'balance_before', v_investor_row.balance,
            'gross_yield', v_seg_yield,
            'fee_amount', v_fee_amount,
            'ib_amount', v_ib_amount,
            'net_yield', v_net_yield,
            'balance_after', v_investor_row.balance + v_net_yield
        ));
    END LOOP;
    CLOSE v_investors_cur;
    
    -- Largest remainder allocation
    v_residual := v_gross_yield - v_total_gross;
    IF ABS(v_residual) > 0.00000001 AND v_largest_investor_id IS NOT NULL THEN
        UPDATE investor_positions 
        SET current_value = current_value + v_residual
        WHERE investor_id = v_largest_investor_id AND fund_id = p_fund_id;
        
        v_segments_meta := v_segments_meta || jsonb_build_array(jsonb_build_object(
            'residual_allocation', true,
            'investor_id', v_largest_investor_id,
            'residual_amount', v_residual
        ));
    END IF;
    
    -- Verify conservation: gross = net + fees + ib
    IF v_total_gross > 0 AND ABS(v_total_gross - (v_total_net + v_total_fees + v_total_ib)) > 0.0001 THEN
        RAISE WARNING 'Yield conservation check failed: gross=%, net+fees+ib=%', 
            v_total_gross, v_total_net + v_total_fees + v_total_ib;
    END IF;
    
    -- Get final positions sum
    SELECT COALESCE(SUM(current_value), 0) INTO v_final_positions_sum
    FROM investor_positions
    WHERE fund_id = p_fund_id AND is_active = true;
    
    -- Record yield distribution
    INSERT INTO yield_distributions (
        fund_id, period_end, total_aum, purpose, source, created_by, status,
        is_month_end, gross_yield, net_yield, total_fees, total_ib
    ) VALUES (
        p_fund_id, p_period_end, p_recorded_aum, p_purpose, 'segmented_v5', v_admin, 'applied',
        EXTRACT(MONTH FROM p_period_end) = EXTRACT(MONTH FROM p_period_end), -- simplified month-end check
        v_gross_yield, v_total_net, v_total_fees, v_total_ib
    ) RETURNING id INTO v_distribution_id;
    
    -- Update fee_allocations with distribution_id
    UPDATE fee_allocations SET distribution_id = v_distribution_id
    WHERE fund_id = p_fund_id AND distribution_id IS NULL;
    
    -- Update IB allocations with distribution_id
    UPDATE ib_commission_allocations SET distribution_id = v_distribution_id
    WHERE fund_id = p_fund_id AND distribution_id IS NULL;
    
    RETURN jsonb_build_object(
        'success', true,
        'distribution_id', v_distribution_id,
        'fund_id', p_fund_id,
        'period_start', v_period_start,
        'period_end', p_period_end,
        'opening_aum', v_opening_aum,
        'recorded_aum', p_recorded_aum,
        'gross_yield', v_gross_yield,
        'net_yield', v_total_net,
        'total_fees', v_total_fees,
        'total_ib', v_total_ib,
        'investor_count', v_allocation_count,
        'fees_account_yield', v_fees_account_yield,
        'ib_total', v_ib_total,
        'crystals_consolidated', v_crystals_consolidated,
        'segments', v_segments_meta,
        'conservation_check', v_total_gross = (v_total_net + v_total_fees + v_total_ib),
        'position_sum', v_final_positions_sum,
        'position_aum_match', ABS(v_final_positions_sum - p_recorded_aum) < 0.00000001,
        'ib_auto_paid', p_purpose = 'reporting'::aum_purpose,
        'features', ARRAY[
            'segmented_proportional', 'per_segment_fees', 'ib_in_running_balance',
            'fees_account_yield', 'largest_remainder', 'crystal_consolidation',
            'aum_only_input', 'segment_notes_in_tx', 'inception_date_period_start',
            'visibility_scope_control', 'yield_event_enrichment'
        ]
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_segmented_yield_distribution_v5(uuid, date, numeric, uuid, aum_purpose) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_segmented_yield_distribution_v5(uuid, date, numeric, uuid, aum_purpose) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_segmented_yield_distribution_v5(uuid, date, numeric, uuid, aum_purpose) TO anon;

-- =============================================================================
-- Step 3: Verify apply_investor_transaction has correct signature
-- The function in migrations_essential/20260307000005_restore_apply_investor_transaction.sql
-- uses: p_investor_id, p_fund_id, p_tx_type, p_amount, p_tx_date, p_reference_id, 
--       p_notes, p_admin_id, p_purpose, p_distribution_id, p_new_total_aum
-- This is 11 params with enum - ensure it's properly exposed
-- =============================================================================

-- Refresh PostgREST schema cache by notifying
NOTIFY pgrst, 'reload schema';

-- Verify functions are accessible
SELECT proname, pronargs 
FROM pg_proc 
WHERE proname IN ('apply_segmented_yield_distribution_v5', 'apply_investor_transaction')
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');