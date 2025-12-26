-- Integrity Views for Backend Audit
-- These views return rows ONLY when something is wrong

-- View 1: Fund AUM Mismatch
-- Compares recorded fund_daily_aum to sum of investor_positions
CREATE OR REPLACE VIEW fund_aum_mismatch AS
SELECT 
  f.id AS fund_id,
  f.code AS fund_code,
  f.name AS fund_name,
  COALESCE(fda.total_aum, 0) AS recorded_aum,
  COALESCE(pos_sum.total_position_value, 0) AS calculated_aum,
  ABS(COALESCE(fda.total_aum, 0) - COALESCE(pos_sum.total_position_value, 0)) AS discrepancy,
  fda.aum_date
FROM funds f
LEFT JOIN LATERAL (
  SELECT total_aum, aum_date
  FROM fund_daily_aum
  WHERE fund_id = f.id 
    AND is_voided = false
    AND purpose = 'reporting'
  ORDER BY aum_date DESC
  LIMIT 1
) fda ON true
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(current_value), 0) AS total_position_value
  FROM investor_positions ip
  WHERE ip.fund_id = f.id
) pos_sum ON true
WHERE ABS(COALESCE(fda.total_aum, 0) - COALESCE(pos_sum.total_position_value, 0)) > 0.0001;

-- View 2: Yield Distribution Conservation Check
-- Uses summary_json to extract net amounts for conservation check
CREATE OR REPLACE VIEW yield_distribution_conservation_check AS
SELECT 
  yd.id AS distribution_id,
  yd.fund_id,
  f.code AS fund_code,
  yd.effective_date,
  yd.gross_yield,
  COALESCE(fee_sum.total_fees, 0) AS calculated_fees,
  COALESCE(ib_sum.total_ib, 0) AS calculated_ib,
  COALESCE((yd.summary_json->>'total_net_interest')::numeric, 0) AS net_to_investors,
  yd.gross_yield - COALESCE((yd.summary_json->>'total_net_interest')::numeric, 0) AS expected_deductions,
  COALESCE(fee_sum.total_fees, 0) + COALESCE(ib_sum.total_ib, 0) AS actual_deductions,
  ABS(
    (yd.gross_yield - COALESCE((yd.summary_json->>'total_net_interest')::numeric, 0)) 
    - (COALESCE(fee_sum.total_fees, 0) + COALESCE(ib_sum.total_ib, 0))
  ) AS conservation_error
FROM yield_distributions yd
LEFT JOIN funds f ON f.id = yd.fund_id
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(fee_amount), 0) AS total_fees
  FROM fee_allocations fa
  WHERE fa.distribution_id = yd.id AND fa.is_voided = false
) fee_sum ON true
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(ib_fee_amount), 0) AS total_ib
  FROM ib_allocations ia
  WHERE ia.distribution_id = yd.id AND ia.is_voided = false
) ib_sum ON true
WHERE yd.voided_at IS NULL
  AND yd.status = 'applied'
  AND ABS(
    (yd.gross_yield - COALESCE((yd.summary_json->>'total_net_interest')::numeric, 0)) 
    - (COALESCE(fee_sum.total_fees, 0) + COALESCE(ib_sum.total_ib, 0))
  ) > 0.0001;

-- View 3: IB Allocation Consistency Check
-- Flags allocations where IB relationship may have changed since allocation
CREATE OR REPLACE VIEW ib_allocation_consistency AS
SELECT 
  ia.id AS allocation_id,
  ia.source_investor_id,
  source_p.first_name || ' ' || source_p.last_name AS source_investor_name,
  ia.ib_investor_id AS allocated_ib_id,
  ib_p.first_name || ' ' || ib_p.last_name AS allocated_ib_name,
  source_p.ib_parent_id AS current_ib_id,
  current_ib_p.first_name || ' ' || current_ib_p.last_name AS current_ib_name,
  ia.ib_fee_amount,
  ia.effective_date,
  ia.ib_investor_id != source_p.ib_parent_id AS ib_changed_since_allocation,
  source_p.ib_parent_id IS NULL AND ia.ib_investor_id IS NOT NULL AS ib_removed
FROM ib_allocations ia
JOIN profiles source_p ON source_p.id = ia.source_investor_id
LEFT JOIN profiles ib_p ON ib_p.id = ia.ib_investor_id
LEFT JOIN profiles current_ib_p ON current_ib_p.id = source_p.ib_parent_id
WHERE ia.is_voided = false
  AND (
    -- IB has changed
    (source_p.ib_parent_id IS NOT NULL AND ia.ib_investor_id != source_p.ib_parent_id)
    -- Or IB was removed
    OR (source_p.ib_parent_id IS NULL AND ia.ib_investor_id IS NOT NULL)
  );

-- View 4: Investor Position vs Ledger Mismatch
-- Enhanced version showing actual discrepancy details
-- tx_type enum values: DEPOSIT, WITHDRAWAL, INTEREST, FEE, ADJUSTMENT, FEE_CREDIT, IB_CREDIT, YIELD, INTERNAL_WITHDRAWAL, INTERNAL_CREDIT
CREATE OR REPLACE VIEW investor_position_ledger_mismatch AS
SELECT 
  ip.investor_id,
  p.first_name || ' ' || p.last_name AS investor_name,
  ip.fund_id,
  f.code AS fund_code,
  ip.current_value AS position_value,
  COALESCE(ledger.net_balance, 0) AS ledger_balance,
  ip.current_value - COALESCE(ledger.net_balance, 0) AS discrepancy
FROM investor_positions ip
JOIN profiles p ON p.id = ip.investor_id
JOIN funds f ON f.id = ip.fund_id
LEFT JOIN LATERAL (
  SELECT 
    SUM(
      CASE 
        -- Credits (add to balance)
        WHEN type IN ('DEPOSIT', 'INTEREST', 'IB_CREDIT', 'YIELD', 'INTERNAL_CREDIT', 'FEE_CREDIT', 'ADJUSTMENT') THEN amount
        -- Debits (subtract from balance)
        WHEN type IN ('WITHDRAWAL', 'FEE', 'INTERNAL_WITHDRAWAL') THEN -ABS(amount)
        ELSE 0
      END
    ) AS net_balance
  FROM transactions_v2 t
  WHERE t.investor_id = ip.investor_id 
    AND t.fund_id = ip.fund_id
    AND t.is_voided = false
) ledger ON true
WHERE ABS(ip.current_value - COALESCE(ledger.net_balance, 0)) > 0.0001;