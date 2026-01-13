-- ==============================================
-- RIPPLE FUND NOVEMBER 2025 YIELD DIAGNOSTIC
-- Run this FIRST to understand what's broken
-- ==============================================

-- ============ SECTION 1: FIND THE DISTRIBUTION ============
\echo '=== 1. YIELD DISTRIBUTION RECORD ==='

SELECT 
  yd.id AS distribution_id,
  f.name AS fund_name,
  yd.yield_date,
  yd.yield_percentage,
  yd.gross_yield_amount,
  yd.total_fees,
  yd.total_ib_fees,
  yd.net_yield_amount,
  yd.dust_amount,
  yd.investor_count,
  yd.status,
  yd.is_voided,
  yd.created_at
FROM yield_distributions yd
JOIN funds f ON yd.fund_id = f.id
WHERE f.name ILIKE '%ripple%'
  AND yd.yield_date >= '2025-11-01'
  AND yd.yield_date <= '2025-11-30'
ORDER BY yd.yield_date DESC;

-- ============ SECTION 2: CHECK TRANSACTIONS BY TYPE ============
\echo ''
\echo '=== 2. TRANSACTIONS BY TYPE (November 2025) ==='

SELECT 
  tx_type,
  COUNT(*) AS count,
  SUM(amount) AS total_amount,
  SUM(CASE WHEN is_voided THEN 1 ELSE 0 END) AS voided_count
FROM transactions_v2 t
JOIN funds f ON t.fund_id = f.id
WHERE f.name ILIKE '%ripple%'
  AND t.tx_date >= '2025-11-01'
  AND t.tx_date <= '2025-11-30'
  AND t.reference_id LIKE 'yield-%'
GROUP BY tx_type
ORDER BY tx_type;

-- ============ SECTION 3: CHECK INDIGO FEES ACCOUNT ============
\echo ''
\echo '=== 3. INDIGO FEES ACCOUNT ==='

SELECT 
  id,
  display_name,
  investor_type,
  is_active,
  email
FROM profiles
WHERE investor_type = 'SYSTEM_FEES'
   OR display_name ILIKE '%indigo%fee%'
   OR display_name ILIKE '%platform%fee%';

-- ============ SECTION 4: FEE TRANSACTIONS TO FEES ACCOUNT ============
\echo ''
\echo '=== 4. FEE TRANSACTIONS TO INDIGO FEES ==='

SELECT 
  t.id,
  t.amount,
  t.tx_date,
  t.reference_id,
  t.is_voided
FROM transactions_v2 t
JOIN profiles p ON t.investor_id = p.id
WHERE (p.investor_type = 'SYSTEM_FEES' OR p.display_name ILIKE '%indigo%fee%')
  AND t.tx_date >= '2025-11-01'
  AND t.tx_date <= '2025-11-30'
ORDER BY t.tx_date;

-- ============ SECTION 5: CHECK FEE ALLOCATIONS ============
\echo ''
\echo '=== 5. FEE ALLOCATIONS FOR RIPPLE NOVEMBER ==='

SELECT 
  COUNT(*) AS allocation_count,
  SUM(fa.fee_amount) AS total_fees,
  SUM(fa.yield_amount_gross) AS total_gross,
  SUM(fa.yield_amount_net) AS total_net
FROM fee_allocations fa
JOIN yield_distributions yd ON fa.distribution_id = yd.id
JOIN funds f ON yd.fund_id = f.id
WHERE f.name ILIKE '%ripple%'
  AND yd.yield_date >= '2025-11-01'
  AND yd.yield_date <= '2025-11-30';

-- ============ SECTION 6: CHECK IB ALLOCATIONS ============
\echo ''
\echo '=== 6. IB ALLOCATIONS FOR RIPPLE NOVEMBER ==='

SELECT 
  COUNT(*) AS ib_count,
  SUM(iba.commission_amount) AS total_ib_commissions,
  COUNT(DISTINCT iba.ib_investor_id) AS unique_ib_parents
FROM ib_allocations iba
JOIN yield_distributions yd ON iba.distribution_id = yd.id
JOIN funds f ON yd.fund_id = f.id
WHERE f.name ILIKE '%ripple%'
  AND yd.yield_date >= '2025-11-01';

-- ============ SECTION 7: CHECK IB RELATIONSHIPS ============
\echo ''
\echo '=== 7. INVESTORS WITH IB PARENTS IN RIPPLE ==='

SELECT 
  p.display_name AS investor,
  p.ib_parent_id,
  ibp.display_name AS ib_parent,
  p.ib_commission_rate
FROM profiles p
LEFT JOIN profiles ibp ON p.ib_parent_id = ibp.id
WHERE p.id IN (
  SELECT ip.investor_id 
  FROM investor_positions ip
  JOIN funds f ON ip.fund_id = f.id
  WHERE f.name ILIKE '%ripple%'
)
AND p.ib_parent_id IS NOT NULL;

-- ============ SECTION 8: INVESTOR POSITIONS ============
\echo ''
\echo '=== 8. RIPPLE FUND INVESTOR POSITIONS ==='

SELECT 
  p.display_name,
  ip.current_value,
  ip.last_yield_date,
  ip.updated_at
FROM investor_positions ip
JOIN profiles p ON ip.investor_id = p.id
JOIN funds f ON ip.fund_id = f.id
WHERE f.name ILIKE '%ripple%'
  AND ip.is_active = true
ORDER BY ip.current_value DESC;

-- ============ SECTION 9: AUM HISTORY ============
\echo ''
\echo '=== 9. RIPPLE FUND AUM HISTORY ==='

SELECT 
  fa.aum_date,
  fa.total_aum,
  fa.source,
  fa.notes,
  fa.created_at
FROM fund_daily_aum fa
JOIN funds f ON fa.fund_id = f.id
WHERE f.name ILIKE '%ripple%'
  AND fa.aum_date >= '2025-10-25'
ORDER BY fa.aum_date DESC
LIMIT 15;

-- ============ SECTION 10: AUM VS POSITIONS COMPARISON ============
\echo ''
\echo '=== 10. AUM vs SUM OF POSITIONS ==='

SELECT 
  f.name,
  (SELECT total_aum FROM fund_daily_aum WHERE fund_id = f.id ORDER BY aum_date DESC LIMIT 1) AS latest_recorded_aum,
  SUM(ip.current_value) AS sum_of_positions,
  (SELECT total_aum FROM fund_daily_aum WHERE fund_id = f.id ORDER BY aum_date DESC LIMIT 1) - SUM(ip.current_value) AS variance
FROM funds f
LEFT JOIN investor_positions ip ON ip.fund_id = f.id AND ip.is_active = true
WHERE f.name ILIKE '%ripple%'
GROUP BY f.id, f.name;

-- ============ SECTION 11: POSITION-LEDGER RECONCILIATION ============
\echo ''
\echo '=== 11. POSITION vs LEDGER RECONCILIATION ==='

SELECT 
  p.display_name,
  ip.current_value AS position_value,
  COALESCE(SUM(t.amount) FILTER (WHERE NOT t.is_voided), 0) AS ledger_value,
  ip.current_value - COALESCE(SUM(t.amount) FILTER (WHERE NOT t.is_voided), 0) AS variance,
  CASE 
    WHEN ABS(ip.current_value - COALESCE(SUM(t.amount) FILTER (WHERE NOT t.is_voided), 0)) < 0.01 
    THEN '✅'
    ELSE '❌'
  END AS status
FROM investor_positions ip
JOIN profiles p ON ip.investor_id = p.id
JOIN funds f ON ip.fund_id = f.id
LEFT JOIN transactions_v2 t ON t.investor_id = ip.investor_id AND t.fund_id = ip.fund_id
WHERE f.name ILIKE '%ripple%'
GROUP BY ip.investor_id, p.display_name, ip.current_value
ORDER BY variance DESC;

-- ============ SECTION 12: YIELD TRANSACTION DETAILS ============
\echo ''
\echo '=== 12. INDIVIDUAL YIELD TRANSACTIONS ==='

SELECT 
  t.tx_type,
  p.display_name AS recipient,
  t.amount,
  t.tx_date,
  t.reference_id,
  t.is_voided,
  t.notes
FROM transactions_v2 t
JOIN profiles p ON t.investor_id = p.id
JOIN funds f ON t.fund_id = f.id
WHERE f.name ILIKE '%ripple%'
  AND t.tx_date >= '2025-11-01'
  AND t.reference_id LIKE 'yield-%'
ORDER BY t.tx_type, t.amount DESC;

-- ============ SECTION 13: CONSERVATION CHECK ============
\echo ''
\echo '=== 13. CONSERVATION CHECK ==='

SELECT 
  yd.yield_date,
  yd.gross_yield_amount AS gross,
  yd.total_fees AS fees,
  yd.total_ib_fees AS ib_fees,
  yd.net_yield_amount AS net,
  yd.dust_amount AS dust,
  (yd.net_yield_amount + yd.total_fees + COALESCE(yd.total_ib_fees, 0) + COALESCE(yd.dust_amount, 0)) AS calculated_gross,
  yd.gross_yield_amount - (yd.net_yield_amount + yd.total_fees + COALESCE(yd.total_ib_fees, 0) + COALESCE(yd.dust_amount, 0)) AS conservation_error,
  CASE 
    WHEN ABS(yd.gross_yield_amount - (yd.net_yield_amount + yd.total_fees + COALESCE(yd.total_ib_fees, 0) + COALESCE(yd.dust_amount, 0))) < 0.0001 
    THEN '✅ PASS'
    ELSE '❌ FAIL'
  END AS status
FROM yield_distributions yd
JOIN funds f ON yd.fund_id = f.id
WHERE f.name ILIKE '%ripple%'
  AND yd.yield_date >= '2025-11-01'
  AND NOT yd.is_voided;

-- ============ SECTION 14: CHECK FUNCTION EXISTS ============
\echo ''
\echo '=== 14. YIELD FUNCTION SIGNATURES ==='

SELECT 
  proname AS function_name,
  pg_get_function_identity_arguments(oid) AS parameters
FROM pg_proc
WHERE proname IN (
  'apply_daily_yield_to_fund_v3',
  'preview_daily_yield_v3',
  'recalculate_fund_aum_for_date'
);

-- ============ SUMMARY ============
\echo ''
\echo '=== DIAGNOSTIC SUMMARY ==='
\echo 'Review above results to identify:'
\echo '1. Does yield_distributions record exist? (Section 1)'
\echo '2. Are YIELD/FEE/IB_CREDIT transactions present? (Section 2)'
\echo '3. Does INDIGO Fees account exist? (Section 3)'
\echo '4. Did fees flow to INDIGO Fees? (Section 4)'
\echo '5. Are fee_allocations recorded? (Section 5)'
\echo '6. Are ib_allocations recorded? (Section 6)'
\echo '7. Do investors have IB parents? (Section 7)'
\echo '8. Are position values updated? (Section 8)'
\echo '9. Is AUM updated post-yield? (Section 9)'
\echo '10. Does AUM match positions? (Section 10)'
\echo '11. Do positions match ledger? (Section 11)'
\echo '12. Review individual transactions (Section 12)'
\echo '13. Does conservation law hold? (Section 13)'
