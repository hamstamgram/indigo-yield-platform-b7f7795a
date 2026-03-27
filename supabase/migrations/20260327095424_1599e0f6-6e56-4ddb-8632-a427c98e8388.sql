-- P0-3 Fix: Tighten v_yield_conservation_violations threshold per asset
-- Previous threshold: flat 0.01 (too coarse for crypto -- 0.01 BTC = ~$1,000)
-- New threshold: asset-appropriate precision

CREATE OR REPLACE VIEW v_yield_conservation_violations AS
SELECT yd.id AS distribution_id,
    f.code AS fund_code,
    'gross_mismatch'::text AS violation_type,
    abs(COALESCE(yd.gross_yield_amount, yd.gross_yield, 0::numeric) - COALESCE(yd.total_net_amount, yd.net_yield, 0::numeric) - COALESCE(yd.total_fee_amount, yd.total_fees, 0::numeric) - COALESCE(yd.total_ib_amount, yd.total_ib, 0::numeric)) AS gross_diff,
    yd.fund_id,
    yd.effective_date,
    COALESCE(yd.gross_yield_amount, yd.gross_yield) AS header_gross,
    COALESCE(yd.total_net_amount, yd.net_yield) AS header_net,
    COALESCE(yd.total_fee_amount, yd.total_fees) AS header_fees,
    COALESCE(yd.total_ib_amount, yd.total_ib) AS header_ib,
    COALESCE(yd.dust_amount, 0::numeric) AS header_dust,
    abs(COALESCE(yd.gross_yield_amount, yd.gross_yield, 0::numeric) - COALESCE(yd.total_net_amount, yd.net_yield, 0::numeric) - COALESCE(yd.total_fee_amount, yd.total_fees, 0::numeric) - COALESCE(yd.total_ib_amount, yd.total_ib, 0::numeric)) AS variance
   FROM yield_distributions yd
     JOIN funds f ON f.id = yd.fund_id
  WHERE (yd.is_voided IS NULL OR yd.is_voided = false)
    AND yd.status = 'applied'::text
    AND yd.consolidated_into_id IS NULL
    AND abs(COALESCE(yd.gross_yield_amount, yd.gross_yield, 0::numeric) - COALESCE(yd.total_net_amount, yd.net_yield, 0::numeric) - COALESCE(yd.total_fee_amount, yd.total_fees, 0::numeric) - COALESCE(yd.total_ib_amount, yd.total_ib, 0::numeric)) >
      CASE f.asset
        WHEN 'BTC' THEN 0.00000001
        WHEN 'ETH' THEN 0.00000001
        WHEN 'USDT' THEN 0.0001
        WHEN 'USDC' THEN 0.0001
        WHEN 'EURC' THEN 0.0001
        WHEN 'SOL' THEN 0.00001
        WHEN 'XRP' THEN 0.00001
        WHEN 'ADA' THEN 0.00001
        WHEN 'xAUT' THEN 0.00000001
        ELSE 0.0001
      END;