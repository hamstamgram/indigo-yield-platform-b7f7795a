-- ====================================================================
-- FUND OPERATIONS TABLES MIGRATION
-- Generated: 2025-12-07
-- Purpose: Enable daily AUM tracking, yield distribution, and position adjustments
-- ====================================================================

-- STEP 1: Create fund_daily_aum table for historical AUM snapshots
-- This stores daily fund performance data entered by admins

CREATE TABLE IF NOT EXISTS fund_daily_aum (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fund_id UUID REFERENCES funds(id) NOT NULL,
  record_date DATE NOT NULL,
  opening_aum NUMERIC(20,8) NOT NULL,
  closing_aum NUMERIC(20,8) NOT NULL,
  gross_yield NUMERIC(20,8) DEFAULT 0,
  net_yield NUMERIC(20,8) DEFAULT 0,
  yield_percentage NUMERIC(10,6) DEFAULT 0,
  total_fees_collected NUMERIC(20,8) DEFAULT 0,
  investor_count INTEGER DEFAULT 0,
  entered_by UUID REFERENCES profiles(id),
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'applied', 'adjusted')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  applied_at TIMESTAMPTZ,
  UNIQUE(fund_id, record_date)
);

-- Add RLS policies for fund_daily_aum
ALTER TABLE fund_daily_aum ENABLE ROW LEVEL SECURITY;

-- Admins can read all records
CREATE POLICY "Admins can view all fund_daily_aum"
  ON fund_daily_aum FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Admins can insert records
CREATE POLICY "Admins can insert fund_daily_aum"
  ON fund_daily_aum FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Admins can update records
CREATE POLICY "Admins can update fund_daily_aum"
  ON fund_daily_aum FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Create index for faster lookups
CREATE INDEX idx_fund_daily_aum_fund_date ON fund_daily_aum(fund_id, record_date DESC);

-- ====================================================================
-- STEP 2: Create position_adjustments table for audit trail
-- ====================================================================

CREATE TABLE IF NOT EXISTS position_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investor_id UUID REFERENCES profiles(id) NOT NULL,
  fund_id UUID REFERENCES funds(id) NOT NULL,
  adjustment_date DATE NOT NULL,
  previous_balance NUMERIC(20,8) NOT NULL,
  new_balance NUMERIC(20,8) NOT NULL,
  adjustment_amount NUMERIC(20,8) NOT NULL,
  adjustment_type VARCHAR(20) NOT NULL CHECK (adjustment_type IN ('yield', 'correction', 'rebalance', 'deposit', 'withdrawal')),
  reason TEXT NOT NULL,
  approved_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies for position_adjustments
ALTER TABLE position_adjustments ENABLE ROW LEVEL SECURITY;

-- Admins can view all adjustments
CREATE POLICY "Admins can view all position_adjustments"
  ON position_adjustments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Investors can view their own adjustments
CREATE POLICY "Investors can view their own position_adjustments"
  ON position_adjustments FOR SELECT
  TO authenticated
  USING (investor_id = auth.uid());

-- Admins can insert adjustments
CREATE POLICY "Admins can insert position_adjustments"
  ON position_adjustments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Create indexes for faster lookups
CREATE INDEX idx_position_adjustments_investor ON position_adjustments(investor_id);
CREATE INDEX idx_position_adjustments_fund ON position_adjustments(fund_id);
CREATE INDEX idx_position_adjustments_date ON position_adjustments(adjustment_date DESC);

-- ====================================================================
-- STEP 3: Enhance investor_fund_performance table
-- ====================================================================

-- Add columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'investor_fund_performance'
    AND column_name = 'daily_yield_applied'
  ) THEN
    ALTER TABLE investor_fund_performance
    ADD COLUMN daily_yield_applied NUMERIC(20,8) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'investor_fund_performance'
    AND column_name = 'last_yield_date'
  ) THEN
    ALTER TABLE investor_fund_performance
    ADD COLUMN last_yield_date DATE;
  END IF;
END $$;

-- ====================================================================
-- STEP 4: Create distribute_daily_yield RPC function
-- Core function for yield distribution with pro-rata allocation
-- ====================================================================

CREATE OR REPLACE FUNCTION distribute_daily_yield(
  p_fund_id UUID,
  p_yield_date DATE,
  p_new_aum NUMERIC,
  p_admin_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_aum NUMERIC;
  v_gross_yield NUMERIC;
  v_net_yield NUMERIC := 0;
  v_total_fees NUMERIC := 0;
  v_investor RECORD;
  v_investor_yield NUMERIC;
  v_investor_fee NUMERIC;
  v_investor_net NUMERIC;
  v_result JSONB;
  v_distributions JSONB := '[]'::JSONB;
  v_fund_asset TEXT;
BEGIN
  -- Get fund asset for transactions
  SELECT asset INTO v_fund_asset
  FROM funds WHERE id = p_fund_id;

  IF v_fund_asset IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Fund not found'
    );
  END IF;

  -- Calculate current AUM from positions
  SELECT COALESCE(SUM(current_value), 0)
  INTO v_current_aum
  FROM investor_positions
  WHERE fund_id = p_fund_id AND current_value > 0;

  IF v_current_aum = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No active positions in fund'
    );
  END IF;

  -- Calculate gross yield
  v_gross_yield := p_new_aum - v_current_aum;

  IF v_gross_yield <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'New AUM must be greater than current AUM for positive yield',
      'current_aum', v_current_aum,
      'new_aum', p_new_aum
    );
  END IF;

  -- Process each investor
  FOR v_investor IN
    SELECT
      ip.investor_id,
      ip.current_value,
      ip.current_value / NULLIF(v_current_aum, 0) as allocation_pct,
      COALESCE(p.fee_percentage, 0.20) as fee_pct,
      CONCAT(p.first_name, ' ', p.last_name) as investor_name
    FROM investor_positions ip
    JOIN profiles p ON p.id = ip.investor_id
    WHERE ip.fund_id = p_fund_id AND ip.current_value > 0
  LOOP
    -- Calculate proportional yield
    v_investor_yield := v_gross_yield * v_investor.allocation_pct;

    -- Calculate fee (only on positive yield)
    v_investor_fee := v_investor_yield * v_investor.fee_pct;
    v_investor_net := v_investor_yield - v_investor_fee;

    -- Update position
    UPDATE investor_positions
    SET current_value = current_value + v_investor_net,
        updated_at = NOW()
    WHERE investor_id = v_investor.investor_id
      AND fund_id = p_fund_id;

    -- Create INTEREST transaction
    INSERT INTO transactions_v2 (
      investor_id, fund_id, type, asset, amount, tx_date, value_date, notes
    )
    VALUES (
      v_investor.investor_id,
      p_fund_id,
      'INTEREST',
      v_fund_asset,
      v_investor_net,
      p_yield_date,
      p_yield_date,
      'Daily yield distribution'
    );

    -- Create FEE transaction if fee > 0
    IF v_investor_fee > 0 THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, asset, amount, tx_date, value_date, notes
      )
      VALUES (
        v_investor.investor_id,
        p_fund_id,
        'FEE',
        v_fund_asset,
        v_investor_fee,
        p_yield_date,
        p_yield_date,
        'Performance fee (' || ROUND(v_investor.fee_pct * 100) || '%)'
      );
    END IF;

    -- Log position adjustment
    INSERT INTO position_adjustments (
      investor_id, fund_id, adjustment_date, previous_balance,
      new_balance, adjustment_amount, adjustment_type, reason, approved_by
    )
    VALUES (
      v_investor.investor_id,
      p_fund_id,
      p_yield_date,
      v_investor.current_value,
      v_investor.current_value + v_investor_net,
      v_investor_net,
      'yield',
      'Daily yield distribution',
      p_admin_id
    );

    -- Track totals
    v_net_yield := v_net_yield + v_investor_net;
    v_total_fees := v_total_fees + v_investor_fee;

    -- Add to distributions array
    v_distributions := v_distributions || jsonb_build_object(
      'investor_id', v_investor.investor_id,
      'investor_name', v_investor.investor_name,
      'previous_balance', v_investor.current_value,
      'allocation_pct', ROUND(v_investor.allocation_pct * 100, 4),
      'fee_pct', ROUND(v_investor.fee_pct * 100, 2),
      'gross_yield', ROUND(v_investor_yield::NUMERIC, 8),
      'fee', ROUND(v_investor_fee::NUMERIC, 8),
      'net_yield', ROUND(v_investor_net::NUMERIC, 8),
      'new_balance', ROUND((v_investor.current_value + v_investor_net)::NUMERIC, 8)
    );
  END LOOP;

  -- Record in fund_daily_aum
  INSERT INTO fund_daily_aum (
    fund_id, record_date, opening_aum, closing_aum,
    gross_yield, net_yield, yield_percentage,
    total_fees_collected, investor_count, entered_by, status, applied_at
  )
  VALUES (
    p_fund_id, p_yield_date, v_current_aum, p_new_aum,
    v_gross_yield, v_net_yield,
    ROUND((v_gross_yield / NULLIF(v_current_aum, 0)) * 100, 6),
    v_total_fees,
    (SELECT COUNT(*) FROM investor_positions WHERE fund_id = p_fund_id AND current_value > 0),
    p_admin_id, 'applied', NOW()
  )
  ON CONFLICT (fund_id, record_date) DO UPDATE SET
    closing_aum = EXCLUDED.closing_aum,
    gross_yield = EXCLUDED.gross_yield,
    net_yield = EXCLUDED.net_yield,
    yield_percentage = EXCLUDED.yield_percentage,
    total_fees_collected = EXCLUDED.total_fees_collected,
    investor_count = EXCLUDED.investor_count,
    status = 'applied',
    applied_at = NOW();

  RETURN jsonb_build_object(
    'success', true,
    'fund_id', p_fund_id,
    'fund_asset', v_fund_asset,
    'yield_date', p_yield_date,
    'current_aum', v_current_aum,
    'new_aum', p_new_aum,
    'gross_yield', ROUND(v_gross_yield::NUMERIC, 8),
    'net_yield', ROUND(v_net_yield::NUMERIC, 8),
    'total_fees', ROUND(v_total_fees::NUMERIC, 8),
    'yield_percentage', ROUND((v_gross_yield / NULLIF(v_current_aum, 0)) * 100, 4),
    'investor_count', jsonb_array_length(v_distributions),
    'distributions', v_distributions
  );
END;
$$;

-- ====================================================================
-- STEP 5: Create preview_yield_distribution function (read-only)
-- For previewing yield distribution before applying
-- ====================================================================

CREATE OR REPLACE FUNCTION preview_yield_distribution(
  p_fund_id UUID,
  p_new_aum NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_aum NUMERIC;
  v_gross_yield NUMERIC;
  v_net_yield NUMERIC := 0;
  v_total_fees NUMERIC := 0;
  v_investor RECORD;
  v_investor_yield NUMERIC;
  v_investor_fee NUMERIC;
  v_investor_net NUMERIC;
  v_distributions JSONB := '[]'::JSONB;
  v_fund_asset TEXT;
  v_fund_code TEXT;
BEGIN
  -- Get fund details
  SELECT asset, code INTO v_fund_asset, v_fund_code
  FROM funds WHERE id = p_fund_id;

  IF v_fund_asset IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Fund not found'
    );
  END IF;

  -- Calculate current AUM from positions
  SELECT COALESCE(SUM(current_value), 0)
  INTO v_current_aum
  FROM investor_positions
  WHERE fund_id = p_fund_id AND current_value > 0;

  IF v_current_aum = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No active positions in fund'
    );
  END IF;

  -- Calculate gross yield
  v_gross_yield := p_new_aum - v_current_aum;

  IF v_gross_yield <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'New AUM must be greater than current AUM for positive yield',
      'current_aum', v_current_aum,
      'new_aum', p_new_aum
    );
  END IF;

  -- Calculate per-investor distribution (READ ONLY - no updates)
  FOR v_investor IN
    SELECT
      ip.investor_id,
      ip.current_value,
      ip.current_value / NULLIF(v_current_aum, 0) as allocation_pct,
      COALESCE(p.fee_percentage, 0.20) as fee_pct,
      CONCAT(p.first_name, ' ', p.last_name) as investor_name
    FROM investor_positions ip
    JOIN profiles p ON p.id = ip.investor_id
    WHERE ip.fund_id = p_fund_id AND ip.current_value > 0
    ORDER BY ip.current_value DESC
  LOOP
    v_investor_yield := v_gross_yield * v_investor.allocation_pct;
    v_investor_fee := v_investor_yield * v_investor.fee_pct;
    v_investor_net := v_investor_yield - v_investor_fee;

    v_net_yield := v_net_yield + v_investor_net;
    v_total_fees := v_total_fees + v_investor_fee;

    v_distributions := v_distributions || jsonb_build_object(
      'investor_id', v_investor.investor_id,
      'investor_name', v_investor.investor_name,
      'current_balance', ROUND(v_investor.current_value::NUMERIC, 8),
      'allocation_pct', ROUND(v_investor.allocation_pct * 100, 4),
      'fee_pct', ROUND(v_investor.fee_pct * 100, 2),
      'gross_yield', ROUND(v_investor_yield::NUMERIC, 8),
      'fee', ROUND(v_investor_fee::NUMERIC, 8),
      'net_yield', ROUND(v_investor_net::NUMERIC, 8),
      'new_balance', ROUND((v_investor.current_value + v_investor_net)::NUMERIC, 8)
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'preview', true,
    'fund_id', p_fund_id,
    'fund_code', v_fund_code,
    'fund_asset', v_fund_asset,
    'current_aum', ROUND(v_current_aum::NUMERIC, 8),
    'new_aum', ROUND(p_new_aum::NUMERIC, 8),
    'gross_yield', ROUND(v_gross_yield::NUMERIC, 8),
    'net_yield', ROUND(v_net_yield::NUMERIC, 8),
    'total_fees', ROUND(v_total_fees::NUMERIC, 8),
    'yield_percentage', ROUND((v_gross_yield / NULLIF(v_current_aum, 0)) * 100, 4),
    'investor_count', jsonb_array_length(v_distributions),
    'distributions', v_distributions
  );
END;
$$;

-- ====================================================================
-- STEP 6: Create adjust_investor_position function
-- For manual position corrections with audit trail
-- ====================================================================

CREATE OR REPLACE FUNCTION adjust_investor_position(
  p_investor_id UUID,
  p_fund_id UUID,
  p_new_balance NUMERIC,
  p_adjustment_type VARCHAR(20),
  p_reason TEXT,
  p_admin_id UUID,
  p_create_transaction BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_balance NUMERIC;
  v_adjustment_amount NUMERIC;
  v_fund_asset TEXT;
  v_investor_name TEXT;
BEGIN
  -- Get current position
  SELECT ip.current_value, f.asset, CONCAT(p.first_name, ' ', p.last_name)
  INTO v_current_balance, v_fund_asset, v_investor_name
  FROM investor_positions ip
  JOIN funds f ON f.id = ip.fund_id
  JOIN profiles p ON p.id = ip.investor_id
  WHERE ip.investor_id = p_investor_id AND ip.fund_id = p_fund_id;

  IF v_current_balance IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Position not found'
    );
  END IF;

  v_adjustment_amount := p_new_balance - v_current_balance;

  -- Update position
  UPDATE investor_positions
  SET current_value = p_new_balance,
      updated_at = NOW()
  WHERE investor_id = p_investor_id
    AND fund_id = p_fund_id;

  -- Log adjustment
  INSERT INTO position_adjustments (
    investor_id, fund_id, adjustment_date, previous_balance,
    new_balance, adjustment_amount, adjustment_type, reason, approved_by
  )
  VALUES (
    p_investor_id,
    p_fund_id,
    CURRENT_DATE,
    v_current_balance,
    p_new_balance,
    v_adjustment_amount,
    p_adjustment_type,
    p_reason,
    p_admin_id
  );

  -- Create transaction if requested
  IF p_create_transaction THEN
    INSERT INTO transactions_v2 (
      investor_id, fund_id, type, asset, amount, tx_date, value_date, notes
    )
    VALUES (
      p_investor_id,
      p_fund_id,
      CASE WHEN v_adjustment_amount >= 0 THEN 'INTEREST' ELSE 'FEE' END,
      v_fund_asset,
      ABS(v_adjustment_amount),
      CURRENT_DATE,
      CURRENT_DATE,
      'Position adjustment: ' || p_reason
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'investor_id', p_investor_id,
    'investor_name', v_investor_name,
    'fund_id', p_fund_id,
    'fund_asset', v_fund_asset,
    'previous_balance', v_current_balance,
    'new_balance', p_new_balance,
    'adjustment_amount', v_adjustment_amount,
    'adjustment_type', p_adjustment_type
  );
END;
$$;

-- ====================================================================
-- STEP 7: Grant permissions
-- ====================================================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION distribute_daily_yield TO authenticated;
GRANT EXECUTE ON FUNCTION preview_yield_distribution TO authenticated;
GRANT EXECUTE ON FUNCTION adjust_investor_position TO authenticated;

-- ====================================================================
-- VERIFICATION QUERIES
-- ====================================================================

-- Verify tables created
SELECT 'fund_daily_aum' as table_name, COUNT(*) as rows FROM fund_daily_aum
UNION ALL
SELECT 'position_adjustments' as table_name, COUNT(*) as rows FROM position_adjustments;

-- Verify functions created
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('distribute_daily_yield', 'preview_yield_distribution', 'adjust_investor_position');
