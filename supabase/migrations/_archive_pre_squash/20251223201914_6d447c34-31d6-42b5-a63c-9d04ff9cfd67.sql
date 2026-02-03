-- Fix position mismatches by recomputing stale positions
DO $$
DECLARE
  r RECORD;
  recomputed_count INT := 0;
BEGIN
  FOR r IN 
    SELECT DISTINCT ip.investor_id, ip.fund_id, ip.current_value as position_value,
           COALESCE(tx.net_amount, 0) as tx_net,
           ABS(ip.current_value - COALESCE(tx.net_amount, 0)) as diff
    FROM investor_positions ip
    LEFT JOIN (
      SELECT investor_id, fund_id, SUM(
        CASE 
          WHEN type IN ('DEPOSIT', 'FEE_CREDIT', 'INTERNAL_CREDIT', 'YIELD') THEN amount
          WHEN type IN ('WITHDRAWAL', 'FEE', 'INTERNAL_WITHDRAWAL') THEN -amount
          ELSE 0
        END
      ) as net_amount
      FROM transactions_v2 WHERE is_voided = false
      GROUP BY investor_id, fund_id
    ) tx ON ip.investor_id = tx.investor_id AND ip.fund_id = tx.fund_id
    WHERE ABS(ip.current_value - COALESCE(tx.net_amount, 0)) > 0.01
  LOOP
    -- Recompute position for each mismatched investor/fund pair
    PERFORM recompute_investor_position(r.investor_id, r.fund_id);
    recomputed_count := recomputed_count + 1;
    RAISE NOTICE 'Recomputed position for investor % in fund % (diff was %)', r.investor_id, r.fund_id, r.diff;
  END LOOP;
  
  RAISE NOTICE 'Total positions recomputed: %', recomputed_count;
END $$;