-- Comprehensive Void Flow Enhancement
-- Ensures all related entities are updated when a transaction is voided

-- ============================================================================
-- PHASE 1: Add voiding columns to ib_allocations and fee_allocations
-- ============================================================================

-- ib_allocations already has is_voided and voided_at, add voided_by
ALTER TABLE ib_allocations 
ADD COLUMN IF NOT EXISTS voided_by uuid REFERENCES auth.users(id);

-- fee_allocations already has is_voided and voided_at, add voided_by  
ALTER TABLE fee_allocations
ADD COLUMN IF NOT EXISTS voided_by uuid REFERENCES auth.users(id);

-- ============================================================================
-- PHASE 2: Add 'voided' status to withdrawal_requests if not exists
-- ============================================================================

-- Check current constraint and update
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'withdrawal_requests_status_check'
    AND table_name = 'withdrawal_requests'
  ) THEN
    ALTER TABLE withdrawal_requests DROP CONSTRAINT withdrawal_requests_status_check;
  END IF;
  
  -- Add updated constraint including 'voided'
  ALTER TABLE withdrawal_requests
  ADD CONSTRAINT withdrawal_requests_status_check 
  CHECK (status IN ('pending', 'approved', 'processing', 'completed', 'cancelled', 'rejected', 'voided'));
EXCEPTION WHEN OTHERS THEN
  -- Constraint might already be correct, ignore
  NULL;
END $$;

-- ============================================================================
-- PHASE 3: Enhanced void_transaction with cascading updates
-- ============================================================================

CREATE OR REPLACE FUNCTION public.void_transaction(p_transaction_id uuid, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tx RECORD;
  v_admin_id UUID := auth.uid();
  v_counterparty_tx RECORD;
  v_fees_account_id uuid := '169bb053-36cb-4f6e-93ea-831f0dfeaf1d';
  v_withdrawal_id uuid;
  v_voided_allocations int := 0;
  v_updated_nav boolean := false;
BEGIN
  -- Verify admin
  IF NOT check_is_admin(v_admin_id) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  -- Get transaction
  SELECT * INTO v_tx FROM transactions_v2 WHERE id = p_transaction_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;
  
  -- Check if already voided
  IF v_tx.is_voided THEN
    RAISE EXCEPTION 'Transaction already voided';
  END IF;
  
  -- Require reason
  IF p_reason IS NULL OR LENGTH(TRIM(p_reason)) < 3 THEN
    RAISE EXCEPTION 'Void reason must be at least 3 characters';
  END IF;
  
  -- Update transaction to voided
  UPDATE transactions_v2
  SET is_voided = true,
      voided_at = now(),
      voided_by = v_admin_id,
      void_reason = p_reason
  WHERE id = p_transaction_id;
  
  -- Recompute position for affected investor/fund
  PERFORM recompute_investor_position(v_tx.investor_id, v_tx.fund_id);
  
  -- =========================================================================
  -- CASCADE 1: Update daily_nav.aum and flow metrics
  -- =========================================================================
  UPDATE daily_nav
  SET 
    aum = (
      SELECT COALESCE(SUM(current_value), 0)
      FROM investor_positions
      WHERE fund_id = v_tx.fund_id
    ),
    total_inflows = CASE 
      WHEN v_tx.type IN ('DEPOSIT', 'INTEREST', 'YIELD', 'IB_CREDIT', 'FEE_CREDIT', 'INTERNAL_CREDIT') 
      THEN GREATEST(0, COALESCE(total_inflows, 0) - ABS(v_tx.amount))
      ELSE total_inflows
    END,
    total_outflows = CASE 
      WHEN v_tx.type IN ('WITHDRAWAL', 'FEE', 'INTERNAL_WITHDRAWAL')
      THEN GREATEST(0, COALESCE(total_outflows, 0) - ABS(v_tx.amount))
      ELSE total_outflows
    END
  WHERE fund_id = v_tx.fund_id
    AND nav_date = v_tx.tx_date;
  
  IF FOUND THEN
    v_updated_nav := true;
  END IF;

  -- Also update fund_daily_aum
  UPDATE fund_daily_aum
  SET 
    total_aum = (
      SELECT COALESCE(SUM(current_value), 0)
      FROM investor_positions
      WHERE fund_id = v_tx.fund_id
    ),
    updated_at = now(),
    updated_by = v_admin_id
  WHERE fund_id = v_tx.fund_id
    AND aum_date = v_tx.tx_date
    AND NOT is_voided;

  -- =========================================================================
  -- CASCADE 2: Handle withdrawal_requests status reversion
  -- =========================================================================
  IF v_tx.type = 'WITHDRAWAL' AND v_tx.reference_id IS NOT NULL THEN
    -- Check if reference_id points to a withdrawal request (WD- prefix or uuid)
    IF v_tx.reference_id LIKE 'WD-%' THEN
      v_withdrawal_id := SUBSTRING(v_tx.reference_id FROM 4)::uuid;
    ELSIF v_tx.reference_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      v_withdrawal_id := v_tx.reference_id::uuid;
    END IF;
    
    IF v_withdrawal_id IS NOT NULL THEN
      UPDATE withdrawal_requests
      SET 
        status = 'approved',
        processed_at = NULL,
        processed_amount = NULL,
        admin_notes = COALESCE(admin_notes || E'\n', '') || 
          'Transaction voided: ' || p_reason || ' at ' || now()::text
      WHERE id = v_withdrawal_id
        AND status = 'completed';
    END IF;
  END IF;
  
  -- Handle fee_route withdrawals
  IF v_tx.reference_id LIKE 'fee_route_%' THEN
    v_withdrawal_id := SUBSTRING(v_tx.reference_id FROM 11)::uuid;
    
    UPDATE withdrawal_requests
    SET 
      status = 'voided',
      admin_notes = COALESCE(admin_notes || E'\n', '') || 
        'Voided: ' || p_reason || ' at ' || now()::text
    WHERE id = v_withdrawal_id;
  END IF;

  -- =========================================================================
  -- CASCADE 3: Void related IB allocations
  -- =========================================================================
  IF v_tx.type = 'IB_CREDIT' THEN
    UPDATE ib_allocations
    SET 
      is_voided = true,
      voided_at = now(),
      voided_by = v_admin_id
    WHERE ib_investor_id = v_tx.investor_id
      AND fund_id = v_tx.fund_id
      AND effective_date = v_tx.tx_date
      AND ABS(ib_fee_amount - v_tx.amount) < 0.01
      AND NOT COALESCE(is_voided, false);
    
    GET DIAGNOSTICS v_voided_allocations = ROW_COUNT;
  END IF;

  -- =========================================================================
  -- CASCADE 4: Void related fee allocations
  -- =========================================================================
  IF v_tx.type = 'FEE' THEN
    UPDATE fee_allocations
    SET 
      is_voided = true,
      voided_at = now(),
      voided_by = v_admin_id
    WHERE investor_id = v_tx.investor_id
      AND fund_id = v_tx.fund_id
      AND period_end >= v_tx.tx_date
      AND period_start <= v_tx.tx_date
      AND ABS(fee_amount - ABS(v_tx.amount)) < 0.01
      AND NOT COALESCE(is_voided, false);
  END IF;

  -- =========================================================================
  -- CASCADE 5: Handle counterparty transactions (existing logic enhanced)
  -- =========================================================================
  
  -- For FEE transactions, also void the corresponding FEE_CREDIT
  IF v_tx.type = 'FEE' AND v_tx.reference_id IS NOT NULL THEN
    SELECT * INTO v_counterparty_tx 
    FROM transactions_v2 
    WHERE reference_id LIKE 'fee_credit_%' 
      AND fund_id = v_tx.fund_id
      AND type = 'FEE_CREDIT'
      AND investor_id = v_fees_account_id
      AND tx_date = v_tx.tx_date
      AND ABS(amount) = ABS(v_tx.amount)
      AND is_voided = false
    LIMIT 1;
    
    IF v_counterparty_tx IS NOT NULL THEN
      UPDATE transactions_v2
      SET is_voided = true,
          voided_at = now(),
          voided_by = v_admin_id,
          void_reason = 'Auto-voided: paired with ' || p_transaction_id::text
      WHERE id = v_counterparty_tx.id;
      
      PERFORM recompute_investor_position(v_fees_account_id, v_tx.fund_id);
    END IF;
  END IF;
  
  -- For FEE_CREDIT transactions, also void the corresponding FEE
  IF v_tx.type = 'FEE_CREDIT' AND v_tx.investor_id = v_fees_account_id THEN
    SELECT * INTO v_counterparty_tx 
    FROM transactions_v2 
    WHERE type = 'FEE'
      AND fund_id = v_tx.fund_id
      AND tx_date = v_tx.tx_date
      AND ABS(amount) = ABS(v_tx.amount)
      AND is_voided = false
    LIMIT 1;
    
    IF v_counterparty_tx IS NOT NULL THEN
      UPDATE transactions_v2
      SET is_voided = true,
          voided_at = now(),
          voided_by = v_admin_id,
          void_reason = 'Auto-voided: paired with ' || p_transaction_id::text
      WHERE id = v_counterparty_tx.id;
      
      PERFORM recompute_investor_position(v_counterparty_tx.investor_id, v_tx.fund_id);
      
      -- Also void the fee allocation
      UPDATE fee_allocations
      SET 
        is_voided = true,
        voided_at = now(),
        voided_by = v_admin_id
      WHERE investor_id = v_counterparty_tx.investor_id
        AND fund_id = v_tx.fund_id
        AND period_end >= v_tx.tx_date
        AND period_start <= v_tx.tx_date
        AND NOT COALESCE(is_voided, false);
    END IF;
  END IF;
  
  -- Handle INTERNAL_WITHDRAWAL/INTERNAL_CREDIT pairs
  IF v_tx.type = 'INTERNAL_WITHDRAWAL' THEN
    SELECT * INTO v_counterparty_tx 
    FROM transactions_v2 
    WHERE type = 'INTERNAL_CREDIT'
      AND fund_id = v_tx.fund_id
      AND tx_date = v_tx.tx_date
      AND amount = ABS(v_tx.amount)
      AND is_voided = false
    LIMIT 1;
    
    IF v_counterparty_tx IS NOT NULL THEN
      UPDATE transactions_v2
      SET is_voided = true,
          voided_at = now(),
          voided_by = v_admin_id,
          void_reason = 'Auto-voided: paired with ' || p_transaction_id::text
      WHERE id = v_counterparty_tx.id;
      
      PERFORM recompute_investor_position(v_counterparty_tx.investor_id, v_tx.fund_id);
    END IF;
  END IF;
  
  IF v_tx.type = 'INTERNAL_CREDIT' THEN
    SELECT * INTO v_counterparty_tx 
    FROM transactions_v2 
    WHERE type = 'INTERNAL_WITHDRAWAL'
      AND fund_id = v_tx.fund_id
      AND tx_date = v_tx.tx_date
      AND ABS(amount) = v_tx.amount
      AND is_voided = false
    LIMIT 1;
    
    IF v_counterparty_tx IS NOT NULL THEN
      UPDATE transactions_v2
      SET is_voided = true,
          voided_at = now(),
          voided_by = v_admin_id,
          void_reason = 'Auto-voided: paired with ' || p_transaction_id::text
      WHERE id = v_counterparty_tx.id;
      
      PERFORM recompute_investor_position(v_counterparty_tx.investor_id, v_tx.fund_id);
    END IF;
  END IF;

  -- Handle yield distribution transactions (INTEREST type)
  IF v_tx.type = 'INTEREST' AND v_tx.distribution_id IS NOT NULL THEN
    -- Void the related IB allocations for this distribution
    UPDATE ib_allocations
    SET 
      is_voided = true,
      voided_at = now(),
      voided_by = v_admin_id
    WHERE distribution_id = v_tx.distribution_id
      AND source_investor_id = v_tx.investor_id
      AND NOT COALESCE(is_voided, false);
    
    -- Void the related fee allocations for this distribution  
    UPDATE fee_allocations
    SET 
      is_voided = true,
      voided_at = now(),
      voided_by = v_admin_id
    WHERE distribution_id = v_tx.distribution_id
      AND investor_id = v_tx.investor_id
      AND NOT COALESCE(is_voided, false);
  END IF;
  
  -- =========================================================================
  -- Comprehensive Audit log
  -- =========================================================================
  INSERT INTO audit_log (action, entity, entity_id, actor_user, old_values, new_values, meta)
  VALUES (
    'VOID_TRANSACTION', 
    'transactions_v2', 
    p_transaction_id::text, 
    v_admin_id,
    jsonb_build_object(
      'amount', v_tx.amount,
      'type', v_tx.type,
      'investor_id', v_tx.investor_id,
      'fund_id', v_tx.fund_id,
      'tx_date', v_tx.tx_date,
      'reference_id', v_tx.reference_id
    ),
    jsonb_build_object(
      'is_voided', true,
      'void_reason', p_reason,
      'voided_at', now()
    ),
    jsonb_build_object(
      'nav_updated', v_updated_nav,
      'voided_allocations', v_voided_allocations,
      'counterparty_voided', v_counterparty_tx IS NOT NULL
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', p_transaction_id,
    'type', v_tx.type,
    'amount', v_tx.amount,
    'asset', v_tx.asset,
    'nav_updated', v_updated_nav,
    'voided_allocations', v_voided_allocations,
    'counterparty_voided', v_counterparty_tx IS NOT NULL,
    'message', 'Transaction voided with cascading updates'
  );
END;
$function$;

-- ============================================================================
-- PHASE 4: Trigger to sync AUM when positions change
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_nav_on_position_change()
RETURNS TRIGGER AS $$
DECLARE
  v_fund_id uuid;
  v_new_aum numeric;
BEGIN
  -- Determine which fund was affected
  v_fund_id := COALESCE(NEW.fund_id, OLD.fund_id);
  
  -- Calculate new total AUM for this fund
  SELECT COALESCE(SUM(current_value), 0) INTO v_new_aum
  FROM investor_positions
  WHERE fund_id = v_fund_id;
  
  -- Update today's daily_nav record if exists
  UPDATE daily_nav
  SET aum = v_new_aum
  WHERE fund_id = v_fund_id
    AND nav_date = CURRENT_DATE;
  
  -- Update today's fund_daily_aum record if exists
  UPDATE fund_daily_aum
  SET 
    total_aum = v_new_aum,
    updated_at = now()
  WHERE fund_id = v_fund_id
    AND aum_date = CURRENT_DATE
    AND NOT COALESCE(is_voided, false);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger (drop if exists first)
DROP TRIGGER IF EXISTS trg_sync_nav_on_position ON investor_positions;

CREATE TRIGGER trg_sync_nav_on_position
AFTER INSERT OR UPDATE OF current_value OR DELETE ON investor_positions
FOR EACH ROW
EXECUTE FUNCTION sync_nav_on_position_change();

COMMENT ON FUNCTION sync_nav_on_position_change() IS 'Auto-syncs daily_nav.aum and fund_daily_aum when investor positions change';

-- ============================================================================
-- PHASE 5: Update position trigger to handle void updates
-- ============================================================================

-- Modify the existing transaction trigger to also fire on UPDATE OF is_voided
DROP TRIGGER IF EXISTS trg_update_position_on_transaction ON transactions_v2;

CREATE OR REPLACE FUNCTION update_position_on_transaction_v2()
RETURNS TRIGGER AS $$
DECLARE
  v_position_exists boolean;
  v_new_balance numeric;
  v_target_investor_id uuid;
  v_target_fund_id uuid;
BEGIN
  -- Determine target investor/fund
  IF TG_OP = 'UPDATE' THEN
    v_target_investor_id := NEW.investor_id;
    v_target_fund_id := NEW.fund_id;
  ELSE
    v_target_investor_id := NEW.investor_id;
    v_target_fund_id := NEW.fund_id;
  END IF;

  -- For UPDATE, only process if is_voided changed to true
  IF TG_OP = 'UPDATE' AND NEW.is_voided = OLD.is_voided THEN
    RETURN NEW;
  END IF;
  
  -- For INSERT, skip if transaction is voided
  IF TG_OP = 'INSERT' AND NEW.is_voided THEN
    RETURN NEW;
  END IF;
  
  -- Calculate new balance from all non-voided transactions
  SELECT COALESCE(SUM(
    CASE 
      WHEN type IN ('DEPOSIT', 'INTEREST', 'YIELD', 'IB_CREDIT', 'FEE_CREDIT', 'INTERNAL_CREDIT', 'ADJUSTMENT') THEN amount
      WHEN type IN ('WITHDRAWAL', 'FEE', 'INTERNAL_WITHDRAWAL') THEN -ABS(amount)
      ELSE 0
    END
  ), 0)
  INTO v_new_balance
  FROM transactions_v2
  WHERE investor_id = v_target_investor_id 
    AND fund_id = v_target_fund_id
    AND NOT is_voided;
  
  -- Check if position exists
  SELECT EXISTS(
    SELECT 1 FROM investor_positions 
    WHERE investor_id = v_target_investor_id AND fund_id = v_target_fund_id
  ) INTO v_position_exists;
  
  IF v_position_exists THEN
    -- Update existing position
    UPDATE investor_positions
    SET 
      current_value = v_new_balance,
      shares = v_new_balance,
      updated_at = NOW(),
      last_transaction_date = CASE 
        WHEN TG_OP = 'INSERT' THEN NEW.effective_date
        ELSE last_transaction_date
      END
    WHERE investor_id = v_target_investor_id AND fund_id = v_target_fund_id;
  ELSIF TG_OP = 'INSERT' AND NOT NEW.is_voided THEN
    -- Create new position only on INSERT
    INSERT INTO investor_positions (
      investor_id, fund_id, fund_class, shares, cost_basis, current_value, last_transaction_date
    )
    SELECT 
      v_target_investor_id,
      v_target_fund_id,
      f.fund_class,
      v_new_balance,
      v_new_balance,
      v_new_balance,
      NEW.effective_date
    FROM funds f
    WHERE f.id = v_target_fund_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger that fires on INSERT and UPDATE OF is_voided
CREATE TRIGGER trg_update_position_on_transaction
AFTER INSERT OR UPDATE OF is_voided ON transactions_v2
FOR EACH ROW
EXECUTE FUNCTION update_position_on_transaction_v2();

COMMENT ON FUNCTION update_position_on_transaction_v2() IS 'Auto-updates investor_positions when transactions are inserted or voided';

-- ============================================================================
-- Log the migration
-- ============================================================================
INSERT INTO audit_log (action, entity, new_values)
VALUES (
  'VOID_FLOW_ENHANCEMENT',
  'system',
  jsonb_build_object(
    'description', 'Enhanced void_transaction with cascading updates to daily_nav, withdrawal_requests, ib_allocations, fee_allocations',
    'features', ARRAY[
      'Automatic NAV/AUM sync on void',
      'Withdrawal status reversion on void',
      'IB allocation voiding',
      'Fee allocation voiding',
      'Position sync trigger on investor_positions changes',
      'Transaction trigger handles UPDATE OF is_voided'
    ]
  )
);