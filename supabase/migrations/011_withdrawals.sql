-- Migration: 004_withdrawals.sql
-- Date: 2025-09-03
-- Description: Withdrawal request management system

-- ========================================
-- Create withdrawal status ENUM
-- ========================================
DO $$ 
BEGIN 
  CREATE TYPE withdrawal_status AS ENUM (
    'pending',
    'approved',
    'processing',
    'completed',
    'rejected',
    'cancelled'
  ); 
EXCEPTION 
  WHEN duplicate_object THEN NULL; 
END $$;

-- ========================================
-- WITHDRAWAL REQUESTS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES public.investors(id) ON DELETE CASCADE,
  fund_id UUID NOT NULL REFERENCES public.funds(id) ON DELETE CASCADE,
  fund_class TEXT CHECK (fund_class IN ('USDT', 'USDC', 'EURC', 'BTC', 'ETH', 'SOL')),
  request_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  requested_amount NUMERIC(28,10) NOT NULL CHECK (requested_amount > 0),
  requested_shares NUMERIC(28,10),
  withdrawal_type TEXT NOT NULL CHECK (withdrawal_type IN ('full', 'partial')),
  status withdrawal_status NOT NULL DEFAULT 'pending',
  
  -- Processing details
  approved_amount NUMERIC(28,10),
  approved_shares NUMERIC(28,10),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  
  -- Execution details
  processed_amount NUMERIC(28,10),
  processed_at TIMESTAMPTZ,
  settlement_date DATE,
  tx_hash TEXT,
  
  -- Administrative fields
  rejection_reason TEXT,
  rejected_by UUID REFERENCES public.profiles(id),
  rejected_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  cancelled_by UUID REFERENCES public.profiles(id),
  cancelled_at TIMESTAMPTZ,
  
  -- Metadata
  notes TEXT,
  admin_notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT chk_amounts CHECK (
    (status = 'pending' AND approved_amount IS NULL) OR
    (status IN ('approved', 'processing', 'completed') AND approved_amount IS NOT NULL) OR
    (status IN ('rejected', 'cancelled'))
  )
);

-- ========================================
-- WITHDRAWAL QUEUE VIEW (for admins)
-- ========================================
CREATE OR REPLACE VIEW public.withdrawal_queue AS
SELECT 
  wr.id,
  wr.request_date,
  wr.status,
  wr.requested_amount,
  wr.approved_amount,
  wr.fund_class,
  i.name as investor_name,
  i.email as investor_email,
  f.name as fund_name,
  f.code as fund_code,
  ip.current_value as current_position_value,
  ip.shares as current_shares,
  CASE 
    WHEN wr.withdrawal_type = 'full' THEN ip.current_value
    ELSE wr.requested_amount
  END as expected_withdrawal
FROM public.withdrawal_requests wr
JOIN public.investors i ON wr.investor_id = i.id
JOIN public.funds f ON wr.fund_id = f.id
LEFT JOIN public.investor_positions ip 
  ON wr.investor_id = ip.investor_id 
  AND wr.fund_id = ip.fund_id
WHERE wr.status IN ('pending', 'approved', 'processing')
ORDER BY wr.request_date ASC;

-- ========================================
-- Functions for withdrawal processing
-- ========================================

-- Function to check if investor can withdraw
CREATE OR REPLACE FUNCTION public.can_withdraw(
  p_investor_id UUID,
  p_fund_id UUID,
  p_amount NUMERIC(28,10)
) RETURNS JSONB AS $$
DECLARE
  v_position RECORD;
  v_fund RECORD;
  v_result JSONB;
BEGIN
  -- Get investor position
  SELECT * INTO v_position
  FROM public.investor_positions
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id;
  
  -- Get fund details
  SELECT * INTO v_fund
  FROM public.funds
  WHERE id = p_fund_id;
  
  -- Check if position exists
  IF v_position IS NULL THEN
    RETURN jsonb_build_object(
      'can_withdraw', false,
      'reason', 'No position found in this fund'
    );
  END IF;
  
  -- Check if amount is valid
  IF p_amount > v_position.current_value THEN
    RETURN jsonb_build_object(
      'can_withdraw', false,
      'reason', 'Requested amount exceeds current position value',
      'current_value', v_position.current_value,
      'requested_amount', p_amount
    );
  END IF;
  
  -- Check lock period
  IF v_position.lock_until_date IS NOT NULL AND v_position.lock_until_date > CURRENT_DATE THEN
    RETURN jsonb_build_object(
      'can_withdraw', false,
      'reason', 'Position is locked until ' || v_position.lock_until_date::TEXT,
      'lock_until', v_position.lock_until_date
    );
  END IF;
  
  -- Check if there are pending withdrawals
  IF EXISTS (
    SELECT 1 FROM public.withdrawal_requests
    WHERE investor_id = p_investor_id 
      AND fund_id = p_fund_id
      AND status IN ('pending', 'approved', 'processing')
  ) THEN
    RETURN jsonb_build_object(
      'can_withdraw', false,
      'reason', 'There is already a pending withdrawal request for this fund'
    );
  END IF;
  
  -- All checks passed
  RETURN jsonb_build_object(
    'can_withdraw', true,
    'current_value', v_position.current_value,
    'shares', v_position.shares,
    'lock_until', v_position.lock_until_date
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create withdrawal request
CREATE OR REPLACE FUNCTION public.create_withdrawal_request(
  p_investor_id UUID,
  p_fund_id UUID,
  p_amount NUMERIC(28,10),
  p_type TEXT DEFAULT 'partial',
  p_notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_request_id UUID;
  v_can_withdraw JSONB;
  v_fund_class TEXT;
BEGIN
  -- Check if withdrawal is allowed
  v_can_withdraw = public.can_withdraw(p_investor_id, p_fund_id, p_amount);
  
  IF NOT (v_can_withdraw->>'can_withdraw')::BOOLEAN THEN
    RAISE EXCEPTION 'Withdrawal not allowed: %', v_can_withdraw->>'reason';
  END IF;
  
  -- Get fund class
  SELECT fund_class INTO v_fund_class
  FROM public.funds
  WHERE id = p_fund_id;
  
  -- Create the request
  INSERT INTO public.withdrawal_requests (
    investor_id,
    fund_id,
    fund_class,
    requested_amount,
    withdrawal_type,
    notes,
    created_by
  ) VALUES (
    p_investor_id,
    p_fund_id,
    v_fund_class,
    p_amount,
    p_type,
    p_notes,
    auth.uid()
  ) RETURNING id INTO v_request_id;
  
  RETURN v_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for admin to approve withdrawal
CREATE OR REPLACE FUNCTION public.approve_withdrawal(
  p_request_id UUID,
  p_approved_amount NUMERIC(28,10) DEFAULT NULL,
  p_admin_notes TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_request RECORD;
BEGIN
  -- Get the request
  SELECT * INTO v_request
  FROM public.withdrawal_requests
  WHERE id = p_request_id;
  
  IF v_request IS NULL THEN
    RAISE EXCEPTION 'Withdrawal request not found';
  END IF;
  
  IF v_request.status != 'pending' THEN
    RAISE EXCEPTION 'Can only approve pending requests';
  END IF;
  
  -- Update the request
  UPDATE public.withdrawal_requests
  SET 
    status = 'approved',
    approved_amount = COALESCE(p_approved_amount, requested_amount),
    approved_by = auth.uid(),
    approved_at = NOW(),
    admin_notes = p_admin_notes,
    updated_at = NOW()
  WHERE id = p_request_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- Create indexes
-- ========================================
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_investor ON public.withdrawal_requests(investor_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_fund ON public.withdrawal_requests(fund_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON public.withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_date ON public.withdrawal_requests(request_date DESC);

-- ========================================
-- RLS Policies
-- ========================================
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Investors can view their own requests
CREATE POLICY "withdrawal_requests_select_own" ON public.withdrawal_requests
  FOR SELECT
  USING (
    investor_id IN (
      SELECT id FROM public.investors WHERE profile_id = auth.uid()
    )
  );

-- Investors can create their own requests
CREATE POLICY "withdrawal_requests_insert_own" ON public.withdrawal_requests
  FOR INSERT
  WITH CHECK (
    investor_id IN (
      SELECT id FROM public.investors WHERE profile_id = auth.uid()
    )
  );

-- Investors can cancel their pending requests
CREATE POLICY "withdrawal_requests_update_own" ON public.withdrawal_requests
  FOR UPDATE
  USING (
    investor_id IN (
      SELECT id FROM public.investors WHERE profile_id = auth.uid()
    ) AND status = 'pending'
  )
  WITH CHECK (
    status = 'cancelled'
  );

-- Admins can do everything
CREATE POLICY "withdrawal_requests_admin_all" ON public.withdrawal_requests
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- ========================================
-- Grant permissions
-- ========================================
GRANT SELECT ON public.withdrawal_queue TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_withdraw(UUID, UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_withdrawal_request(UUID, UUID, NUMERIC, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_withdrawal(UUID, NUMERIC, TEXT) TO authenticated;

COMMENT ON TABLE public.withdrawal_requests IS 'Tracks investor withdrawal requests and their processing status';
COMMENT ON VIEW public.withdrawal_queue IS 'Administrative view of pending and processing withdrawals';
COMMENT ON FUNCTION public.can_withdraw IS 'Checks if an investor is eligible to withdraw from a fund';
COMMENT ON FUNCTION public.create_withdrawal_request IS 'Creates a new withdrawal request for an investor';
COMMENT ON FUNCTION public.approve_withdrawal IS 'Admin function to approve a withdrawal request';
