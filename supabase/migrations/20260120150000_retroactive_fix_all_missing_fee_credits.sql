-- Retroactive Fix: Process ALL yield distributions missing FEE_CREDIT transactions
-- Issue: apply_adb_yield_distribution was not creating fee credits for INDIGO FEES
-- This migration processes all affected distributions and creates missing records
--
-- Fixed issues:
-- 1. Set canonical flag with correct namespace (indigo.canonical_rpc, not app.canonical_rpc)
-- 2. Use correct column names (type not tx_type, value_date not effective_date)
-- 3. Include asset column in transactions_v2 INSERT
-- 4. Set source='migration' to bypass transaction RPC trigger
-- 5. Use correct aum_purpose enum value ('transaction' not 'month_end')
-- 6. Use correct platform_fee_ledger schema (yield_distribution_id, per-investor entries)
-- 7. Remove non-existent created_at from investor_positions

DO $$
DECLARE
  v_indigo_fees_id uuid := '169bb053-36cb-4f6e-93ea-831f0dfeaf1d';
  v_admin_id uuid;
  v_distribution RECORD;
  v_allocation RECORD;
  v_total_fees numeric;
  v_fee_tx_id uuid;
  v_fund_code text;
  v_fund_asset text;
  v_period_end date;
  v_period_start date;
  v_distributions_fixed int := 0;
  v_allocations_fixed int := 0;
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  SELECT id INTO v_admin_id FROM profiles WHERE email = 'h.monoja@gmail.com' LIMIT 1;

  RAISE NOTICE 'Starting retroactive fee fix';

  FOR v_distribution IN
    SELECT DISTINCT
      yd.id as distribution_id, yd.fund_id, f.code as fund_code, f.asset,
      COALESCE(yd.period_start, yd.effective_date) as period_start,
      COALESCE(yd.period_end, yd.effective_date) as period_end,
      COALESCE(yd.gross_yield_amount, yd.gross_yield) as gross_yield_amount
    FROM yield_distributions yd
    JOIN funds f ON f.id = yd.fund_id
    WHERE yd.is_voided = false AND yd.status = 'applied'
      AND NOT EXISTS (
        SELECT 1 FROM transactions_v2 t
        WHERE t.fund_id = yd.fund_id AND t.investor_id = v_indigo_fees_id
          AND t.type = 'FEE_CREDIT' AND t.reference_id LIKE '%' || yd.id::text || '%'
          AND t.is_voided = false
      )
  LOOP
    v_fund_code := v_distribution.fund_code;
    v_fund_asset := v_distribution.asset;
    v_period_end := v_distribution.period_end;
    v_period_start := v_distribution.period_start;
    v_total_fees := 0;

    RAISE NOTICE 'Processing: % (%)', v_distribution.distribution_id, v_fund_code;

    FOR v_allocation IN
      SELECT ya.investor_id, ya.fund_id, ya.gross_amount, ya.fee_amount as recorded_fee,
             p.first_name || ' ' || p.last_name as investor_name,
             COALESCE(
               (SELECT ifs.fee_pct FROM investor_fee_schedule ifs
                WHERE ifs.investor_id = ya.investor_id AND ifs.fund_id = ya.fund_id
                ORDER BY ifs.created_at DESC LIMIT 1),
               p.fee_pct, 0
             ) as effective_fee_pct
      FROM yield_allocations ya
      JOIN profiles p ON p.id = ya.investor_id
      WHERE ya.distribution_id = v_distribution.distribution_id
        AND (ya.fee_amount = 0 OR ya.fee_amount IS NULL)
    LOOP
      IF v_allocation.effective_fee_pct > 0 THEN
        DECLARE
          v_expected_fee numeric;
          v_expected_net numeric;
          v_fee_diff numeric;
        BEGIN
          v_expected_fee := ROUND((v_allocation.gross_amount * v_allocation.effective_fee_pct / 100)::numeric, 8);
          v_expected_net := v_allocation.gross_amount - v_expected_fee;
          v_fee_diff := v_expected_fee - COALESCE(v_allocation.recorded_fee, 0);

          UPDATE yield_allocations
          SET fee_amount = v_expected_fee, net_amount = v_expected_net, fee_pct = v_allocation.effective_fee_pct
          WHERE distribution_id = v_distribution.distribution_id AND investor_id = v_allocation.investor_id;

          UPDATE investor_positions
          SET current_value = current_value - v_fee_diff, updated_at = NOW()
          WHERE investor_id = v_allocation.investor_id AND fund_id = v_allocation.fund_id;

          INSERT INTO fee_allocations (
            distribution_id, investor_id, fund_id, fees_account_id,
            period_start, period_end, purpose,
            base_net_income, fee_percentage, fee_amount,
            created_at, created_by, is_voided
          ) VALUES (
            v_distribution.distribution_id, v_allocation.investor_id, v_allocation.fund_id, v_indigo_fees_id,
            v_period_start, v_period_end, 'transaction'::aum_purpose,
            v_allocation.gross_amount, v_allocation.effective_fee_pct, v_expected_fee,
            NOW(), v_admin_id, false
          ) ON CONFLICT DO NOTHING;

          INSERT INTO platform_fee_ledger (
            fund_id, yield_distribution_id, investor_id, investor_name,
            gross_yield_amount, fee_percentage, fee_amount,
            effective_date, asset, created_at, created_by, is_voided
          ) VALUES (
            v_allocation.fund_id, v_distribution.distribution_id, v_allocation.investor_id, v_allocation.investor_name,
            v_allocation.gross_amount, v_allocation.effective_fee_pct, v_expected_fee,
            v_period_end, v_fund_asset, NOW(), v_admin_id, false
          ) ON CONFLICT DO NOTHING;

          v_total_fees := v_total_fees + v_expected_fee;
          v_allocations_fixed := v_allocations_fixed + 1;
        END;
      END IF;
    END LOOP;

    IF v_total_fees > 0 THEN
      UPDATE yield_distributions
      SET total_fees = v_total_fees, total_fee_amount = v_total_fees,
          net_yield = COALESCE(gross_yield_amount, gross_yield) - v_total_fees,
          total_net_amount = COALESCE(gross_yield_amount, gross_yield) - v_total_fees
      WHERE id = v_distribution.distribution_id;

      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, asset, amount,
        tx_date, value_date, reference_id, notes,
        created_by, is_voided, source, created_at
      ) VALUES (
        v_indigo_fees_id, v_distribution.fund_id, 'FEE_CREDIT', v_fund_asset, v_total_fees,
        v_period_end, v_period_end,
        'retroactive_fee_credit_' || v_distribution.distribution_id::text,
        'Retroactive fee credit for ' || v_fund_code || ' yield distribution',
        v_admin_id, false, 'migration', NOW()
      ) RETURNING id INTO v_fee_tx_id;

      -- Update INDIGO FEES position (no created_at column in investor_positions)
      INSERT INTO investor_positions (investor_id, fund_id, current_value, is_active, updated_at)
      VALUES (v_indigo_fees_id, v_distribution.fund_id, v_total_fees, true, NOW())
      ON CONFLICT (investor_id, fund_id)
      DO UPDATE SET current_value = investor_positions.current_value + EXCLUDED.current_value, is_active = true, updated_at = NOW();

      v_distributions_fixed := v_distributions_fixed + 1;
      RAISE NOTICE 'FEE_CREDIT: % % for %', v_total_fees, v_fund_asset, v_fund_code;
    END IF;
  END LOOP;

  RAISE NOTICE 'Complete: % distributions, % allocations fixed', v_distributions_fixed, v_allocations_fixed;
END $$;
