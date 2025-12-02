-- Migration: Fix Withdrawal Ledger
-- Date: 2025-11-24
-- Description: Updates `complete_withdrawal` to insert records into `transactions_v2` to ensure
--              the yield calculation engine accounts for withdrawals.

BEGIN;

-- 1. Ensure transactions_v2 table exists and has correct structure
-- (Based on distribution logic requirements)
CREATE TABLE IF NOT EXISTS public.transactions_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investor_id UUID REFERENCES public.investors(id), -- Link to investor
    type TEXT NOT NULL CHECK (type IN ('DEPOSIT', 'WITHDRAWAL', 'INTEREST', 'FEE', 'ADJUSTMENT')),
    amount NUMERIC NOT NULL,
    asset TEXT NOT NULL, -- Asset symbol (BTC, USDT, etc.)
    status TEXT DEFAULT 'pending',
    tx_hash TEXT,
    description TEXT,
    occurred_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_transactions_v2_investor ON public.transactions_v2(investor_id);
CREATE INDEX IF NOT EXISTS idx_transactions_v2_asset ON public.transactions_v2(asset);
CREATE INDEX IF NOT EXISTS idx_transactions_v2_occurred_at ON public.transactions_v2(occurred_at);

-- Enable RLS
ALTER TABLE public.transactions_v2 ENABLE ROW LEVEL SECURITY;

-- Policies (if not already existing)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'transactions_v2' AND policyname = 'Admins can manage all transactions') THEN
        CREATE POLICY "Admins can manage all transactions" ON public.transactions_v2
            FOR ALL TO authenticated
            USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'transactions_v2' AND policyname = 'Investors can view own transactions') THEN
        CREATE POLICY "Investors can view own transactions" ON public.transactions_v2
            FOR SELECT TO authenticated
            USING (investor_id IN (SELECT id FROM public.investors WHERE profile_id = auth.uid()));
    END IF;
END $$;


-- 2. Update complete_withdrawal function to insert into transactions_v2
CREATE OR REPLACE FUNCTION public.complete_withdrawal(
  p_request_id UUID,
  p_tx_hash TEXT DEFAULT NULL,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE 
  v_request RECORD;
  v_fund_asset TEXT;
BEGIN
  -- Ensure admin privileges
  PERFORM public.ensure_admin();
  
  -- Get request details with fund asset info
  SELECT wr.*, f.asset_symbol 
  INTO v_request 
  FROM public.withdrawal_requests wr
  JOIN public.funds f ON wr.fund_id = f.id
  WHERE wr.id = p_request_id;
  
  IF v_request IS NULL THEN 
    RAISE EXCEPTION 'Withdrawal request not found';
  END IF;
  
  IF v_request.status != 'processing' THEN 
    RAISE EXCEPTION 'Can only complete requests in processing. Current status: %', v_request.status;
  END IF;

  -- Update request status
  UPDATE public.withdrawal_requests
  SET 
    status = 'completed',
    tx_hash = COALESCE(p_tx_hash, tx_hash),
    admin_notes = COALESCE(p_admin_notes, admin_notes)
  WHERE id = p_request_id;

  -- INSERT INTO transactions_v2 (Critical for Yield Calculation)
  INSERT INTO public.transactions_v2 (
    investor_id,
    type,
    amount,
    asset,
    status,
    tx_hash,
    description,
    occurred_at
  ) VALUES (
    v_request.investor_id,
    'WITHDRAWAL',
    v_request.processed_amount, -- Use the processed amount
    v_request.asset_symbol,
    'completed',
    COALESCE(p_tx_hash, v_request.tx_hash),
    'Withdrawal from ' || v_request.fund_class,
    NOW()
  );

  -- Log action
  PERFORM public.log_withdrawal_action(
    p_request_id,
    'complete',
    jsonb_build_object(
      'tx_hash', COALESCE(p_tx_hash, v_request.tx_hash),
      'processed_amount', v_request.processed_amount,
      'admin_notes', p_admin_notes,
      'ledger_update', 'transactions_v2 record created'
    )
  );
  
  RETURN TRUE;
END;
$$;

COMMIT;
