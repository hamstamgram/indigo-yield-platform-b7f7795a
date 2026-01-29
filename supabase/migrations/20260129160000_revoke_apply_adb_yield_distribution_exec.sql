revoke execute on function public.apply_adb_yield_distribution(
  p_fund_id uuid,
  p_period_start date,
  p_period_end date,
  p_gross_yield_amount numeric,
  p_admin_id uuid,
  p_purpose text,
  p_dust_tolerance numeric
) from public, anon, authenticated;
