-- Fix RPC functions that incorrectly reference fee_percentage instead of fee_pct
-- The profiles table uses fee_pct, not fee_percentage

-- Fix get_all_non_admin_profiles - alias fee_pct as fee_percentage for backward compatibility
CREATE OR REPLACE FUNCTION public.get_all_non_admin_profiles()
RETURNS TABLE(id uuid, email text, first_name text, last_name text, created_at timestamp with time zone, fee_percentage numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT p.id, p.email, p.first_name, p.last_name, p.created_at,
         p.fee_pct AS fee_percentage  -- Alias for backward compatibility
  FROM public.profiles p
  WHERE p.is_admin = false
  ORDER BY p.created_at DESC;
END;
$function$;

-- Fix get_profile_by_id - alias fee_pct as fee_percentage for backward compatibility
CREATE OR REPLACE FUNCTION public.get_profile_by_id(profile_id uuid)
RETURNS TABLE(id uuid, email text, first_name text, last_name text, is_admin boolean, fee_percentage numeric, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT p.id, p.email, p.first_name, p.last_name, p.is_admin,
         p.fee_pct AS fee_percentage,  -- Alias for backward compatibility
         p.created_at
  FROM public.profiles p
  WHERE p.id = profile_id;
END;
$function$;

-- Fix _resolve_investor_fee_pct - use fee_pct instead of fee_percentage
CREATE OR REPLACE FUNCTION public._resolve_investor_fee_pct(p_investor_id uuid, p_fund_id uuid, p_date date)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_fee numeric;
BEGIN
  -- First check investor_fee_schedule for fund-specific or global fee
  SELECT fee_pct INTO v_fee
  FROM public.investor_fee_schedule
  WHERE investor_id = p_investor_id
    AND (fund_id = p_fund_id OR fund_id IS NULL)
    AND effective_date <= p_date
    AND (end_date IS NULL OR end_date >= p_date)
  ORDER BY fund_id NULLS LAST, effective_date DESC
  LIMIT 1;

  IF v_fee IS NOT NULL THEN RETURN v_fee; END IF;

  -- Fallback to profile fee_pct (correct column name)
  SELECT fee_pct INTO v_fee FROM public.profiles WHERE id = p_investor_id;
  IF v_fee IS NOT NULL THEN RETURN v_fee; END IF;

  -- Default to 20% if no fee configured
  RETURN 20;
END;
$function$;

-- Add helpful indexes for common queries
CREATE INDEX IF NOT EXISTS idx_deposits_user_id ON public.deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_fund_id ON public.documents(fund_id);
CREATE INDEX IF NOT EXISTS idx_fee_allocations_credit_tx ON public.fee_allocations(credit_transaction_id) WHERE credit_transaction_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fee_allocations_debit_tx ON public.fee_allocations(debit_transaction_id) WHERE debit_transaction_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_v2_created_at ON public.transactions_v2(created_at);

-- Add comments for documentation
COMMENT ON FUNCTION public.get_all_non_admin_profiles() IS 'Returns all non-admin profiles. fee_percentage is aliased from fee_pct for backward compatibility.';
COMMENT ON FUNCTION public.get_profile_by_id(uuid) IS 'Returns a single profile by ID. fee_percentage is aliased from fee_pct for backward compatibility.';
COMMENT ON FUNCTION public._resolve_investor_fee_pct(uuid, uuid, date) IS 'Resolves the fee percentage for an investor, checking fee_schedule first, then profile.fee_pct, defaulting to 20%.';