-- Add simple RPC wrappers to work around PostgREST schema cache issues with 11-arg functions
-- The apply_investor_transaction function works but isn't exposed via PostgREST properly

CREATE OR REPLACE FUNCTION public.simple_apply_transaction(
  p_fund_id uuid,
  p_investor_id uuid,
  p_tx_type text,
  p_amount numeric,
  p_tx_date date,
  p_reference_id text,
  p_admin_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN apply_investor_transaction(
    p_investor_id => p_investor_id,
    p_fund_id => p_fund_id,
    p_tx_type => p_tx_type,
    p_amount => p_amount,
    p_tx_date => p_tx_date,
    p_reference_id => p_reference_id,
    p_admin_id => p_admin_id,
    p_notes => p_notes
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.simple_apply_transaction TO anon, authenticated, service_role;