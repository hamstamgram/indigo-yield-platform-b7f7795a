-- Set views as SECURITY INVOKER to use the querying user's permissions
ALTER VIEW fund_aum_mismatch SET (security_invoker = on);
ALTER VIEW yield_distribution_conservation_check SET (security_invoker = on);
ALTER VIEW ib_allocation_consistency SET (security_invoker = on);
ALTER VIEW investor_position_ledger_mismatch SET (security_invoker = on);