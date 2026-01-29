DO $$
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  UPDATE yield_distributions
  SET
    net_yield = CASE WHEN net_yield IS NULL OR net_yield = 0 THEN total_net_amount ELSE net_yield END,
    total_fees = CASE WHEN total_fees IS NULL OR total_fees = 0 THEN total_fee_amount ELSE total_fees END,
    total_ib = CASE WHEN total_ib IS NULL OR total_ib = 0 THEN total_ib_amount ELSE total_ib END
  WHERE status = 'applied'
    AND (total_net_amount IS NOT NULL OR total_fee_amount IS NOT NULL OR total_ib_amount IS NOT NULL);
END $$;
