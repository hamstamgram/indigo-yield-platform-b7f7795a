-- Fix Yield Conservation: Backfill missing summary_json for distribution 1a564c4a-786d-4ccc-b480-f4d437868462
-- This distribution has gross_yield = 100,000 but NULL summary_json causing conservation check failure

-- First, calculate and update the summary_json based on actual fee_allocations data
UPDATE yield_distributions yd
SET summary_json = jsonb_build_object(
  'total_gross_interest', yd.gross_yield,
  'total_net_interest', yd.gross_yield - COALESCE(fees.total_fees, 0) - COALESCE(ib.total_ib, 0),
  'total_fees', COALESCE(fees.total_fees, 0),
  'total_ib_fees', COALESCE(ib.total_ib, 0),
  'investor_count', COALESCE(fees.investor_count, 0),
  'backfilled_at', now()
)
FROM (
  SELECT distribution_id, 
         SUM(fee_amount) as total_fees,
         COUNT(DISTINCT investor_id) as investor_count
  FROM fee_allocations 
  WHERE distribution_id = '1a564c4a-786d-4ccc-b480-f4d437868462'
    AND NOT COALESCE(is_voided, false)
  GROUP BY distribution_id
) fees
LEFT JOIN (
  SELECT distribution_id, SUM(ib_fee_amount) as total_ib
  FROM ib_allocations 
  WHERE distribution_id = '1a564c4a-786d-4ccc-b480-f4d437868462'
    AND NOT COALESCE(is_voided, false)
  GROUP BY distribution_id
) ib ON fees.distribution_id = ib.distribution_id
WHERE yd.id = '1a564c4a-786d-4ccc-b480-f4d437868462'
  AND yd.summary_json IS NULL;

-- Also create a reusable function to backfill any future missing summaries
CREATE OR REPLACE FUNCTION backfill_yield_summaries()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fixed_count int := 0;
  v_dist RECORD;
  v_total_fees numeric;
  v_total_ib numeric;
  v_investor_count int;
BEGIN
  -- Verify admin
  IF NOT check_is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  -- Find distributions with NULL summary_json
  FOR v_dist IN 
    SELECT id, gross_yield, fund_id
    FROM yield_distributions 
    WHERE summary_json IS NULL
      AND NOT COALESCE(is_voided, false)
  LOOP
    -- Calculate fees
    SELECT COALESCE(SUM(fee_amount), 0), COUNT(DISTINCT investor_id)
    INTO v_total_fees, v_investor_count
    FROM fee_allocations 
    WHERE distribution_id = v_dist.id
      AND NOT COALESCE(is_voided, false);
    
    -- Calculate IB
    SELECT COALESCE(SUM(ib_fee_amount), 0)
    INTO v_total_ib
    FROM ib_allocations 
    WHERE distribution_id = v_dist.id
      AND NOT COALESCE(is_voided, false);
    
    -- Update the distribution
    UPDATE yield_distributions
    SET summary_json = jsonb_build_object(
      'total_gross_interest', v_dist.gross_yield,
      'total_net_interest', v_dist.gross_yield - v_total_fees - v_total_ib,
      'total_fees', v_total_fees,
      'total_ib_fees', v_total_ib,
      'investor_count', v_investor_count,
      'backfilled_at', now()
    )
    WHERE id = v_dist.id;
    
    v_fixed_count := v_fixed_count + 1;
  END LOOP;

  -- Audit log
  IF v_fixed_count > 0 THEN
    INSERT INTO audit_log (action, entity, actor_user, new_values)
    VALUES ('BACKFILL_YIELD_SUMMARIES', 'yield_distributions', auth.uid(), 
      jsonb_build_object('distributions_fixed', v_fixed_count));
  END IF;

  RETURN jsonb_build_object('success', true, 'distributions_fixed', v_fixed_count);
END;
$$;

-- Grant execute to authenticated users (admin check is inside function)
GRANT EXECUTE ON FUNCTION backfill_yield_summaries() TO authenticated;