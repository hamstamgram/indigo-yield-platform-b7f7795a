-- Fix get_position_at_date and get_all_positions_at_date functions
-- These functions reference invalid enum values for tx_type
--
-- Invalid values used: IB_COMMISSION, REFERRAL_BONUS, REDEMPTION, TRANSFER_IN, TRANSFER_OUT
-- Valid enum values: DEPOSIT, WITHDRAWAL, INTEREST, FEE, ADJUSTMENT, FEE_CREDIT, IB_CREDIT, YIELD, INTERNAL_WITHDRAWAL, INTERNAL_CREDIT, IB_DEBIT
--
-- Mapping:
--   IB_COMMISSION -> IB_CREDIT
--   REFERRAL_BONUS -> IB_CREDIT (treat as IB credit)
--   REDEMPTION -> WITHDRAWAL
--   TRANSFER_IN -> INTERNAL_CREDIT
--   TRANSFER_OUT -> INTERNAL_WITHDRAWAL

-- Fix get_position_at_date
CREATE OR REPLACE FUNCTION public.get_position_at_date(
  p_investor_id uuid,
  p_fund_id uuid,
  p_target_date date
)
RETURNS numeric
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_position numeric(28,10);
BEGIN
  -- Calculate position by summing all non-voided transactions up to target date
  -- This is the mathematically correct approach (event-sourced)
  SELECT COALESCE(SUM(
    CASE
      -- Credit transactions (add to position)
      WHEN type IN ('DEPOSIT', 'INTEREST', 'YIELD', 'IB_CREDIT', 'FEE_CREDIT', 'INTERNAL_CREDIT') THEN amount
      -- Debit transactions (subtract from position)
      WHEN type IN ('WITHDRAWAL', 'FEE', 'INTERNAL_WITHDRAWAL', 'IB_DEBIT') THEN -ABS(amount)
      -- Adjustments can be positive or negative
      WHEN type = 'ADJUSTMENT' THEN amount
      ELSE 0
    END
  ), 0)
  INTO v_position
  FROM transactions_v2
  WHERE investor_id = p_investor_id
    AND fund_id = p_fund_id
    AND tx_date <= p_target_date
    AND is_voided = false;

  RETURN v_position;
END;
$function$;

-- Fix get_all_positions_at_date
CREATE OR REPLACE FUNCTION public.get_all_positions_at_date(
  p_fund_id uuid,
  p_target_date date
)
RETURNS TABLE(investor_id uuid, position_value numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    t.investor_id,
    SUM(
      CASE
        -- Credit transactions (add to position)
        WHEN t.type IN ('DEPOSIT', 'INTEREST', 'YIELD', 'IB_CREDIT', 'FEE_CREDIT', 'INTERNAL_CREDIT') THEN t.amount
        -- Debit transactions (subtract from position)
        WHEN t.type IN ('WITHDRAWAL', 'FEE', 'INTERNAL_WITHDRAWAL', 'IB_DEBIT') THEN -ABS(t.amount)
        -- Adjustments can be positive or negative
        WHEN t.type = 'ADJUSTMENT' THEN t.amount
        ELSE 0
      END
    ) as position_value
  FROM transactions_v2 t
  WHERE t.fund_id = p_fund_id
    AND t.tx_date <= p_target_date
    AND t.is_voided = false
  GROUP BY t.investor_id
  HAVING SUM(
    CASE
      WHEN t.type IN ('DEPOSIT', 'INTEREST', 'YIELD', 'IB_CREDIT', 'FEE_CREDIT', 'INTERNAL_CREDIT') THEN t.amount
      WHEN t.type IN ('WITHDRAWAL', 'FEE', 'INTERNAL_WITHDRAWAL', 'IB_DEBIT') THEN -ABS(t.amount)
      WHEN t.type = 'ADJUSTMENT' THEN t.amount
      ELSE 0
    END
  ) > 0;
END;
$function$;

-- Add comment documenting the enum values used
COMMENT ON FUNCTION get_position_at_date(uuid, uuid, date) IS 'Calculate investor position at a specific date using event-sourced transactions. Uses valid tx_type enum values.';
COMMENT ON FUNCTION get_all_positions_at_date(uuid, date) IS 'Get all non-zero investor positions for a fund at a specific date using event-sourced transactions. Uses valid tx_type enum values.';
