-- =============================================================================
-- AUM YIELD AUDIT DIAGNOSTIC
-- Purpose: Audit the AUM update mechanism when recording yield distributions
-- Date: 2026-01-12
-- =============================================================================

-- =============================================================================
-- SECTION 1: CRITICAL - AUM UPDATE VERIFICATION
-- =============================================================================
-- The apply_daily_yield_to_fund_v3 function updates AUM at line 149:
--   UPDATE fund_daily_aum SET total_aum = total_aum + v_gross_yield_amount
--   WHERE fund_id = p_fund_id AND aum_date = p_yield_date AND purpose = p_purpose AND is_voided = false;
--
-- This UPDATE may silently fail if no matching record exists!

\echo '=== 1.1 CHECK: AUM Records for Each Yield Distribution ==='

-- For each yield distribution, verify there IS an AUM record for that date
SELECT
  yd.id AS yield_distribution_id,
  f.name AS fund_name,
  yd.yield_date,
  yd.gross_yield_amount,
  yd.purpose AS yield_purpose,
  fa.id AS aum_record_id,
  fa.total_aum AS recorded_aum,
  fa.purpose AS aum_purpose,
  fa.source AS aum_source,
  CASE
    WHEN fa.id IS NULL THEN '!! NO AUM RECORD - YIELD APPLIED TO NOTHING'
    WHEN yd.purpose::text <> fa.purpose::text THEN '!! PURPOSE MISMATCH'
    WHEN fa.is_voided THEN '!! AUM RECORD VOIDED'
    ELSE '  OK'
  END AS status
FROM yield_distributions yd
JOIN funds f ON yd.fund_id = f.id
LEFT JOIN fund_daily_aum fa ON fa.fund_id = yd.fund_id
  AND fa.aum_date = yd.yield_date
  AND fa.is_voided = false
WHERE yd.status = 'applied'
  AND NOT yd.is_voided
ORDER BY yd.created_at DESC
LIMIT 50;

-- =============================================================================
-- SECTION 2: AUM CONSERVATION CHECK
-- =============================================================================
\echo ''
\echo '=== 2.1 CHECK: AUM = SUM(investor_positions) - fees_account ==='

-- Calculate what AUM SHOULD be vs what's recorded
SELECT
  f.name AS fund_name,
  fa.aum_date,
  fa.total_aum AS recorded_aum,
  fa.source,
  (SELECT COALESCE(SUM(ip.current_value), 0)
   FROM investor_positions ip
   JOIN profiles p ON p.id = ip.investor_id
   WHERE ip.fund_id = f.id
     AND ip.current_value > 0
     AND p.account_type <> 'fees_account') AS calculated_aum_from_positions,
  fa.total_aum - (SELECT COALESCE(SUM(ip.current_value), 0)
   FROM investor_positions ip
   JOIN profiles p ON p.id = ip.investor_id
   WHERE ip.fund_id = f.id
     AND ip.current_value > 0
     AND p.account_type <> 'fees_account') AS variance,
  CASE
    WHEN ABS(fa.total_aum - (SELECT COALESCE(SUM(ip.current_value), 0)
     FROM investor_positions ip
     JOIN profiles p ON p.id = ip.investor_id
     WHERE ip.fund_id = f.id
       AND ip.current_value > 0
       AND p.account_type <> 'fees_account')) < 0.01 THEN '  OK'
    ELSE '!! MISMATCH'
  END AS status
FROM fund_daily_aum fa
JOIN funds f ON fa.fund_id = f.id
WHERE fa.is_voided = false
  AND fa.aum_date = (
    SELECT MAX(aum_date) FROM fund_daily_aum
    WHERE fund_id = f.id AND is_voided = false
  )
ORDER BY f.name;

-- =============================================================================
-- SECTION 3: YIELD DISTRIBUTION COMPLETENESS
-- =============================================================================
\echo ''
\echo '=== 3.1 CHECK: Did Yield Update AUM? ==='

-- Compare AUM before and after yield distribution
WITH yield_events AS (
  SELECT
    yd.fund_id,
    yd.yield_date,
    yd.gross_yield_amount,
    yd.created_at AS yield_created_at
  FROM yield_distributions yd
  WHERE yd.status = 'applied'
    AND NOT yd.is_voided
    AND yd.yield_date >= NOW() - INTERVAL '30 days'
),
aum_before AS (
  SELECT DISTINCT ON (ye.fund_id, ye.yield_date)
    ye.fund_id,
    ye.yield_date,
    fa.total_aum AS aum_before_yield,
    fa.aum_date AS aum_date_before
  FROM yield_events ye
  JOIN fund_daily_aum fa ON fa.fund_id = ye.fund_id
    AND fa.aum_date < ye.yield_date
    AND fa.is_voided = false
  ORDER BY ye.fund_id, ye.yield_date, fa.aum_date DESC
),
aum_after AS (
  SELECT DISTINCT ON (ye.fund_id, ye.yield_date)
    ye.fund_id,
    ye.yield_date,
    fa.total_aum AS aum_after_yield,
    fa.aum_date AS aum_date_after,
    fa.source AS aum_source
  FROM yield_events ye
  JOIN fund_daily_aum fa ON fa.fund_id = ye.fund_id
    AND fa.aum_date >= ye.yield_date
    AND fa.is_voided = false
  ORDER BY ye.fund_id, ye.yield_date, fa.aum_date ASC
)
SELECT
  f.name AS fund_name,
  ye.yield_date,
  ye.gross_yield_amount,
  ab.aum_before_yield,
  aa.aum_after_yield,
  aa.aum_source,
  (aa.aum_after_yield - ab.aum_before_yield) AS aum_change,
  ye.gross_yield_amount - (aa.aum_after_yield - ab.aum_before_yield) AS discrepancy,
  CASE
    WHEN aa.aum_after_yield IS NULL THEN '!! NO AUM AFTER YIELD'
    WHEN ABS(ye.gross_yield_amount - (aa.aum_after_yield - ab.aum_before_yield)) < 0.01 THEN '  OK'
    ELSE '!! AUM NOT UPDATED BY YIELD AMOUNT'
  END AS status
FROM yield_events ye
JOIN funds f ON ye.fund_id = f.id
LEFT JOIN aum_before ab ON ab.fund_id = ye.fund_id AND ab.yield_date = ye.yield_date
LEFT JOIN aum_after aa ON aa.fund_id = ye.fund_id AND aa.yield_date = ye.yield_date
ORDER BY ye.yield_date DESC;

-- =============================================================================
-- SECTION 4: ORPHAN ANALYSIS
-- =============================================================================
\echo ''
\echo '=== 4.1 CHECK: Yield Distributions Without AUM Record ==='

SELECT
  yd.id,
  f.name AS fund_name,
  yd.yield_date,
  yd.gross_yield_amount,
  yd.purpose,
  yd.created_at
FROM yield_distributions yd
JOIN funds f ON yd.fund_id = f.id
WHERE yd.status = 'applied'
  AND NOT yd.is_voided
  AND NOT EXISTS (
    SELECT 1 FROM fund_daily_aum fa
    WHERE fa.fund_id = yd.fund_id
      AND fa.aum_date = yd.yield_date
      AND fa.is_voided = false
  )
ORDER BY yd.created_at DESC;

\echo ''
\echo '=== 4.2 CHECK: AUM Records Without Yield Distribution (expected for manual entries) ==='

SELECT
  fa.id,
  f.name AS fund_name,
  fa.aum_date,
  fa.total_aum,
  fa.source,
  fa.purpose
FROM fund_daily_aum fa
JOIN funds f ON fa.fund_id = f.id
WHERE fa.is_voided = false
  AND fa.source = 'YIELD_DISTRIBUTION'
  AND NOT EXISTS (
    SELECT 1 FROM yield_distributions yd
    WHERE yd.fund_id = fa.fund_id
      AND yd.yield_date = fa.aum_date
      AND yd.status = 'applied'
      AND NOT yd.is_voided
  )
ORDER BY fa.created_at DESC;

-- =============================================================================
-- SECTION 5: POSITION RECONCILIATION
-- =============================================================================
\echo ''
\echo '=== 5.1 CHECK: Investor Position = SUM(Ledger Transactions) ==='

SELECT
  p.display_name,
  f.name AS fund_name,
  ip.current_value AS position_value,
  COALESCE(SUM(t.amount) FILTER (WHERE NOT t.is_voided), 0) AS ledger_sum,
  ip.current_value - COALESCE(SUM(t.amount) FILTER (WHERE NOT t.is_voided), 0) AS variance,
  CASE
    WHEN ABS(ip.current_value - COALESCE(SUM(t.amount) FILTER (WHERE NOT t.is_voided), 0)) < 0.01 THEN '  OK'
    ELSE '!! MISMATCH'
  END AS status
FROM investor_positions ip
JOIN profiles p ON ip.investor_id = p.id
JOIN funds f ON ip.fund_id = f.id
LEFT JOIN transactions_v2 t ON t.investor_id = ip.investor_id AND t.fund_id = ip.fund_id
WHERE ip.is_active = true
  AND ip.current_value > 0
GROUP BY p.display_name, f.name, ip.current_value
HAVING ABS(ip.current_value - COALESCE(SUM(t.amount) FILTER (WHERE NOT t.is_voided), 0)) >= 0.01
ORDER BY ABS(ip.current_value - COALESCE(SUM(t.amount) FILTER (WHERE NOT t.is_voided), 0)) DESC;

-- =============================================================================
-- SECTION 6: TIMELINE AUDIT
-- =============================================================================
\echo ''
\echo '=== 6.1 CHECK: AUM Timeline vs Yield Timeline ==='

-- Show AUM records and yield distributions in chronological order
SELECT
  f.name AS fund_name,
  'AUM' AS record_type,
  fa.aum_date AS event_date,
  fa.total_aum AS amount,
  fa.source,
  fa.created_at
FROM fund_daily_aum fa
JOIN funds f ON fa.fund_id = f.id
WHERE fa.is_voided = false
  AND fa.aum_date >= NOW() - INTERVAL '30 days'

UNION ALL

SELECT
  f.name AS fund_name,
  'YIELD' AS record_type,
  yd.yield_date AS event_date,
  yd.gross_yield_amount AS amount,
  'yield_distribution' AS source,
  yd.created_at
FROM yield_distributions yd
JOIN funds f ON yd.fund_id = f.id
WHERE yd.status = 'applied'
  AND NOT yd.is_voided
  AND yd.yield_date >= NOW() - INTERVAL '30 days'

ORDER BY fund_name, event_date DESC, record_type;

-- =============================================================================
-- SECTION 7: FUNCTION DEFINITION CHECK
-- =============================================================================
\echo ''
\echo '=== 7.1 CHECK: apply_daily_yield_to_fund_v3 AUM Update Logic ==='

-- Check if the function exists and get its key parameters
SELECT
  proname AS function_name,
  pg_get_function_identity_arguments(oid) AS parameters,
  CASE
    WHEN prosrc LIKE '%UPDATE fund_daily_aum%total_aum + v_gross_yield_amount%' THEN '  Has AUM UPDATE logic'
    ELSE '!! MISSING AUM UPDATE'
  END AS aum_update_status,
  CASE
    WHEN prosrc LIKE '%IF%NOT FOUND%INSERT%fund_daily_aum%' OR prosrc LIKE '%UPSERT%fund_daily_aum%' THEN '  Has INSERT fallback'
    WHEN prosrc NOT LIKE '%INSERT INTO%fund_daily_aum%' THEN '!! NO INSERT FALLBACK - UPDATE MAY FAIL SILENTLY'
    ELSE '  Has some INSERT logic'
  END AS insert_fallback_status
FROM pg_proc
WHERE proname = 'apply_daily_yield_to_fund_v3'
  AND pronamespace = 'public'::regnamespace;

-- =============================================================================
-- SECTION 8: RIPPLE FUND SPECIFIC
-- =============================================================================
\echo ''
\echo '=== 8.1 RIPPLE FUND: November 2025 Yield-AUM Correlation ==='

SELECT
  'YIELD' AS type,
  yd.yield_date,
  yd.gross_yield_amount,
  yd.net_yield_amount,
  yd.total_fees,
  yd.status,
  yd.created_at
FROM yield_distributions yd
JOIN funds f ON yd.fund_id = f.id
WHERE f.name ILIKE '%ripple%'
  AND yd.yield_date >= '2025-11-01'
  AND yd.yield_date <= '2025-11-30'

UNION ALL

SELECT
  'AUM' AS type,
  fa.aum_date,
  fa.total_aum,
  NULL,
  NULL,
  fa.source,
  fa.created_at
FROM fund_daily_aum fa
JOIN funds f ON fa.fund_id = f.id
WHERE f.name ILIKE '%ripple%'
  AND fa.aum_date >= '2025-10-25'
  AND fa.aum_date <= '2025-11-30'
  AND fa.is_voided = false

ORDER BY yield_date DESC, type;

-- =============================================================================
-- SUMMARY
-- =============================================================================
\echo ''
\echo '=== AUDIT SUMMARY ==='
\echo 'Key checks performed:'
\echo '1. AUM record exists for each yield distribution date'
\echo '2. AUM = SUM(investor_positions) excluding fees_account'
\echo '3. AUM increased by gross_yield_amount after yield distribution'
\echo '4. No orphan yield distributions or AUM records'
\echo '5. Investor positions match ledger transactions'
\echo '6. Timeline shows correct sequence of AUM and yield events'
\echo '7. Function has proper AUM update logic'
\echo ''
\echo 'CRITICAL FINDING:'
\echo 'The apply_daily_yield_to_fund_v3 function uses UPDATE (not UPSERT) for AUM.'
\echo 'If no AUM record exists for the yield_date, the UPDATE silently fails!'
\echo 'Recommendation: Add INSERT fallback or use UPSERT pattern.'
