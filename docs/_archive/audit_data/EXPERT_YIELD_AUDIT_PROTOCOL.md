# INDIGO Platform: Expert Multi-Disciplinary Audit Protocol
## Yield Distribution Pipeline & AUM Integrity

> **Assembled Team Expertise:**
> - 🏦 **Fund Operations Specialist** — NAV calculation, fee waterfall, investor allocations
> - 📊 **Financial Controller** — Ledger reconciliation, audit trails, conservation of funds
> - 💻 **Platform Architect** — Database integrity, transaction atomicity, RPC contracts
> - 📋 **Compliance Officer** — Regulatory reporting, investor statements, audit evidence
> - 🔍 **QA Engineer** — End-to-end testing, regression prevention, validation automation

---

## Issue Statement

**Observed Symptoms:**
1. Applied yield for Ripple Fund (November 2025)
2. No fee transactions visible flowing to INDIGO Fees account
3. No investor yield transactions recorded in transaction ledger
4. No IB commission transactions recorded
5. Fund AUM showing stale snapshot instead of post-yield recalculated value

**Business Impact:**
- Investor statements will be incorrect
- Platform fee revenue not tracked
- IB partner commissions not recorded
- NAV reporting incorrect
- Regulatory compliance at risk

---

## Part A: Fund Operations Perspective

### A.1 Yield Distribution Waterfall Verification

The yield distribution must follow this exact waterfall:

```
┌────────────────────────────────────────────────────────────────────────────┐
│                    YIELD DISTRIBUTION WATERFALL                            │
│                                                                            │
│  INPUT                                                                     │
│  ├── Previous Day AUM (T-1 snapshot): $X                                   │
│  └── Yield Percentage: Y%                                                  │
│                                                                            │
│  STEP 1: CALCULATE GROSS YIELD                                             │
│  └── Gross Yield = Previous AUM × (Y/100) = $G                             │
│                                                                            │
│  STEP 2: ALLOCATE PER INVESTOR (Pro-Rata)                                  │
│  └── For each investor i with position P_i:                                │
│      ├── Weight_i = P_i / Total_AUM                                        │
│      └── Gross_i = Weight_i × Gross Yield                                  │
│                                                                            │
│  STEP 3: EXTRACT FEES (From GROSS, not NET)                                │
│  └── For each investor i:                                                  │
│      ├── Platform_Fee_i = Gross_i × Platform_Fee_Rate                      │
│      └── IB_Fee_i = Gross_i × IB_Commission_Rate (if IB parent exists)     │
│                                                                            │
│  STEP 4: CALCULATE NET YIELD                                               │
│  └── Net_i = Gross_i - Platform_Fee_i - IB_Fee_i                           │
│                                                                            │
│  STEP 5: RECORD TRANSACTIONS                                               │
│  └── For each investor i:                                                  │
│      ├── YIELD transaction: +Net_i to investor                             │
│      ├── FEE transaction: +Platform_Fee_i to INDIGO Fees account           │
│      └── IB_CREDIT transaction: +IB_Fee_i to IB Parent (if applicable)     │
│                                                                            │
│  STEP 6: UPDATE POSITIONS                                                  │
│  └── investor_positions.current_value += Net_i                             │
│                                                                            │
│  STEP 7: UPDATE FUND AUM                                                   │
│  └── New_AUM = Previous_AUM + Gross_Yield                                  │
│      (Or: SUM of all updated investor positions)                           │
│                                                                            │
│  CONSERVATION LAW (MUST HOLD):                                             │
│  └── Gross_Yield = SUM(Net_i) + SUM(Platform_Fee_i) + SUM(IB_Fee_i) + Dust │
│      |Conservation Error| < 10^-10                                         │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

### A.2 Critical Business Rules

| Rule | Description | Validation Query |
|------|-------------|------------------|
| **T-1 AUM Snapshot** | Yield calculated against PREVIOUS day's closing AUM, not current | Check `aum_date < yield_date` in function |
| **Pro-Rata Allocation** | Yield allocated proportionally to position size | Verify `(position / total_aum) × gross` |
| **Fees from Gross** | Platform and IB fees calculated from GROSS yield, not NET | Check function calculates fees BEFORE net |
| **Conservation** | Gross = Net + Fees + IB + Dust | Check `ABS(gross - (net + fees + ib + dust)) < 1e-10` |
| **Atomic Transaction** | All-or-nothing: all transactions created or none | Function wrapped in single transaction |
| **Idempotency** | Same distribution cannot be applied twice | Unique constraint on `(fund_id, yield_date)` |

### A.3 Fund Operations Diagnostic

```sql
-- Fund Ops Check 1: Was yield calculated from correct AUM?
SELECT 
  yd.yield_date,
  yd.gross_yield_amount,
  (SELECT total_aum FROM fund_daily_aum 
   WHERE fund_id = yd.fund_id AND aum_date < yd.yield_date 
   ORDER BY aum_date DESC LIMIT 1) AS t_minus_1_aum,
  yd.yield_percentage,
  yd.gross_yield_amount / NULLIF(
    (SELECT total_aum FROM fund_daily_aum 
     WHERE fund_id = yd.fund_id AND aum_date < yd.yield_date 
     ORDER BY aum_date DESC LIMIT 1), 0
  ) * 100 AS implied_percentage,
  CASE 
    WHEN ABS(yd.yield_percentage - (yd.gross_yield_amount / NULLIF(
      (SELECT total_aum FROM fund_daily_aum 
       WHERE fund_id = yd.fund_id AND aum_date < yd.yield_date 
       ORDER BY aum_date DESC LIMIT 1), 0
    ) * 100)) < 0.0001 
    THEN '✅ CORRECT'
    ELSE '⚠️ CHECK CALCULATION'
  END AS status
FROM yield_distributions yd
JOIN funds f ON yd.fund_id = f.id
WHERE f.name ILIKE '%ripple%'
  AND yd.yield_date >= '2025-11-01';

-- Fund Ops Check 2: Fee rates applied correctly?
SELECT 
  p.display_name,
  fa.yield_amount_gross,
  fa.fee_percentage,
  fa.fee_amount,
  fa.yield_amount_gross * fa.fee_percentage AS expected_fee,
  ABS(fa.fee_amount - (fa.yield_amount_gross * fa.fee_percentage)) AS variance
FROM fee_allocations fa
JOIN investor_positions ip ON fa.investor_position_id = ip.id
JOIN profiles p ON ip.investor_id = p.id
JOIN yield_distributions yd ON fa.distribution_id = yd.id
JOIN funds f ON yd.fund_id = f.id
WHERE f.name ILIKE '%ripple%'
  AND yd.yield_date >= '2025-11-01';

-- Fund Ops Check 3: Post-distribution AUM recorded?
SELECT 
  yd.yield_date AS distribution_date,
  yd.gross_yield_amount,
  fa.aum_date,
  fa.total_aum,
  fa.source,
  CASE 
    WHEN fa.source = 'YIELD_DISTRIBUTION' THEN '✅ Auto-recorded'
    WHEN fa.source = 'MANUAL' THEN '⚠️ Manual entry'
    ELSE '❓ Unknown source'
  END AS status
FROM yield_distributions yd
JOIN funds f ON yd.fund_id = f.id
LEFT JOIN fund_daily_aum fa ON fa.fund_id = f.id AND fa.aum_date = yd.yield_date
WHERE f.name ILIKE '%ripple%'
  AND yd.yield_date >= '2025-11-01';
```

---

## Part B: Financial Controller Perspective

### B.1 Ledger Integrity Checks

```sql
-- Controller Check 1: Transaction Type Distribution
-- All yield distributions should create: YIELD, FEE, and optionally IB_CREDIT
SELECT 
  tx_type,
  COUNT(*) AS transaction_count,
  SUM(amount) AS total_amount,
  COUNT(DISTINCT investor_id) AS unique_recipients
FROM transactions_v2 t
JOIN funds f ON t.fund_id = f.id
WHERE f.name ILIKE '%ripple%'
  AND t.tx_date >= '2025-11-01'
  AND t.tx_date <= '2025-11-30'
  AND t.reference_id LIKE 'yield-%'
  AND NOT t.is_voided
GROUP BY tx_type
ORDER BY tx_type;

-- EXPECTED OUTPUT:
-- | tx_type   | count | total_amount | unique_recipients |
-- |-----------|-------|--------------|-------------------|
-- | FEE       | N     | sum_fees     | 1 (INDIGO Fees)   |
-- | IB_CREDIT | M     | sum_ib       | num_ib_parents    |
-- | YIELD     | N     | sum_net      | num_investors     |

-- Controller Check 2: Conservation of Funds
SELECT 
  yd.yield_date,
  yd.gross_yield_amount AS gross,
  COALESCE(SUM(t.amount) FILTER (WHERE t.tx_type = 'YIELD'), 0) AS sum_yield_tx,
  COALESCE(SUM(t.amount) FILTER (WHERE t.tx_type = 'FEE'), 0) AS sum_fee_tx,
  COALESCE(SUM(t.amount) FILTER (WHERE t.tx_type = 'IB_CREDIT'), 0) AS sum_ib_tx,
  yd.gross_yield_amount - (
    COALESCE(SUM(t.amount) FILTER (WHERE t.tx_type = 'YIELD'), 0) +
    COALESCE(SUM(t.amount) FILTER (WHERE t.tx_type = 'FEE'), 0) +
    COALESCE(SUM(t.amount) FILTER (WHERE t.tx_type = 'IB_CREDIT'), 0)
  ) AS unallocated
FROM yield_distributions yd
JOIN funds f ON yd.fund_id = f.id
LEFT JOIN transactions_v2 t ON t.fund_id = f.id 
  AND t.reference_id LIKE 'yield-' || f.id::text || '-' || yd.yield_date::text || '%'
  AND NOT t.is_voided
WHERE f.name ILIKE '%ripple%'
  AND yd.yield_date >= '2025-11-01'
  AND NOT yd.is_voided
GROUP BY yd.yield_date, yd.gross_yield_amount;

-- Controller Check 3: Audit Trail Completeness
SELECT 
  al.action,
  al.entity_type,
  al.created_at,
  al.actor_user,
  al.details->>'yield_date' AS yield_date,
  al.details->>'gross_yield' AS gross_yield,
  al.details->>'investor_count' AS investor_count
FROM audit_log al
WHERE al.entity_type = 'yield_distribution'
  AND al.created_at >= '2025-11-01'
ORDER BY al.created_at DESC;
```

### B.2 Double-Entry Verification

For each yield distribution, verify the accounting equation holds:

```sql
-- Every YIELD credit to investor must have corresponding entries
WITH yield_entries AS (
  SELECT 
    t.tx_date,
    t.investor_id,
    t.amount AS yield_amount,
    t.reference_id
  FROM transactions_v2 t
  JOIN funds f ON t.fund_id = f.id
  WHERE f.name ILIKE '%ripple%'
    AND t.tx_type = 'YIELD'
    AND t.tx_date >= '2025-11-01'
    AND NOT t.is_voided
),
fee_entries AS (
  SELECT 
    t.tx_date,
    t.amount AS fee_amount,
    t.reference_id
  FROM transactions_v2 t
  JOIN profiles p ON t.investor_id = p.id
  JOIN funds f ON t.fund_id = f.id
  WHERE f.name ILIKE '%ripple%'
    AND t.tx_type = 'FEE'
    AND t.tx_date >= '2025-11-01'
    AND NOT t.is_voided
    AND p.investor_type = 'SYSTEM_FEES'
)
SELECT 
  ye.tx_date,
  COUNT(DISTINCT ye.investor_id) AS investors_with_yield,
  SUM(ye.yield_amount) AS total_yield,
  COALESCE(SUM(fe.fee_amount), 0) AS total_fees,
  CASE 
    WHEN COALESCE(SUM(fe.fee_amount), 0) = 0 THEN '❌ NO FEES RECORDED'
    ELSE '✅ FEES PRESENT'
  END AS fee_status
FROM yield_entries ye
LEFT JOIN fee_entries fe ON fe.tx_date = ye.tx_date
GROUP BY ye.tx_date;
```

### B.3 Statement Accuracy Check

```sql
-- What investors will see on their statements
SELECT 
  p.display_name AS investor,
  ip.current_value AS current_position,
  COALESCE(SUM(t.amount) FILTER (WHERE t.tx_type = 'DEPOSIT'), 0) AS total_deposits,
  COALESCE(SUM(t.amount) FILTER (WHERE t.tx_type = 'WITHDRAWAL'), 0) AS total_withdrawals,
  COALESCE(SUM(t.amount) FILTER (WHERE t.tx_type = 'YIELD'), 0) AS total_yields,
  COALESCE(SUM(t.amount) FILTER (WHERE t.tx_type = 'FEE'), 0) AS total_fees_charged,
  -- Position should equal: deposits - withdrawals + yields - fees
  (
    COALESCE(SUM(t.amount) FILTER (WHERE t.tx_type = 'DEPOSIT'), 0) +
    COALESCE(SUM(t.amount) FILTER (WHERE t.tx_type = 'WITHDRAWAL'), 0) +
    COALESCE(SUM(t.amount) FILTER (WHERE t.tx_type = 'YIELD'), 0)
  ) AS calculated_position,
  ip.current_value - (
    COALESCE(SUM(t.amount) FILTER (WHERE t.tx_type = 'DEPOSIT'), 0) +
    COALESCE(SUM(t.amount) FILTER (WHERE t.tx_type = 'WITHDRAWAL'), 0) +
    COALESCE(SUM(t.amount) FILTER (WHERE t.tx_type = 'YIELD'), 0)
  ) AS discrepancy
FROM investor_positions ip
JOIN profiles p ON ip.investor_id = p.id
JOIN funds f ON ip.fund_id = f.id
LEFT JOIN transactions_v2 t ON t.investor_id = ip.investor_id 
  AND t.fund_id = ip.fund_id 
  AND NOT t.is_voided
WHERE f.name ILIKE '%ripple%'
GROUP BY p.display_name, ip.current_value
ORDER BY ABS(ip.current_value - (
    COALESCE(SUM(t.amount) FILTER (WHERE t.tx_type = 'DEPOSIT'), 0) +
    COALESCE(SUM(t.amount) FILTER (WHERE t.tx_type = 'WITHDRAWAL'), 0) +
    COALESCE(SUM(t.amount) FILTER (WHERE t.tx_type = 'YIELD'), 0)
  )) DESC;
```

---

## Part C: Platform Architect Perspective

### C.1 Function Contract Verification

```sql
-- Check function exists with correct signature
SELECT 
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS parameters,
  pg_get_function_result(p.oid) AS return_type,
  CASE WHEN p.prosecdef THEN '✅ SECURITY DEFINER' ELSE '❌ INVOKER' END AS security,
  CASE WHEN 'search_path=public' = ANY(p.proconfig) THEN '✅' ELSE '❌' END AS search_path_set
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'apply_daily_yield_to_fund_v3',
    'preview_daily_yield_v3',
    'recalculate_fund_aum_for_date',
    'recompute_investor_position'
  );

-- Check function definition for critical logic
SELECT pg_get_functiondef(oid) AS function_definition
FROM pg_proc 
WHERE proname = 'apply_daily_yield_to_fund_v3';
```

### C.2 Transaction Atomicity Verification

```sql
-- Check if advisory locks are in place
SELECT 
  proname,
  CASE 
    WHEN prosrc LIKE '%pg_advisory_xact_lock%' THEN '✅ Has advisory lock'
    WHEN prosrc LIKE '%pg_advisory_lock%' THEN '⚠️ Has session lock (should be xact)'
    ELSE '❌ No advisory lock'
  END AS lock_status
FROM pg_proc
WHERE proname IN (
  'apply_daily_yield_to_fund_v3',
  'void_transaction',
  'admin_create_transaction'
);

-- Check for proper error handling
SELECT 
  proname,
  CASE 
    WHEN prosrc LIKE '%EXCEPTION%' THEN '✅ Has exception handler'
    ELSE '⚠️ No exception handler'
  END AS error_handling,
  CASE 
    WHEN prosrc LIKE '%RAISE EXCEPTION%' THEN '✅ Raises exceptions'
    ELSE '⚠️ May fail silently'
  END AS raises_exceptions
FROM pg_proc
WHERE proname = 'apply_daily_yield_to_fund_v3';
```

### C.3 Trigger Chain Verification

```sql
-- All triggers on transaction tables
SELECT 
  tgrelid::regclass AS table_name,
  tgname AS trigger_name,
  CASE tgenabled
    WHEN 'O' THEN '✅ ENABLED'
    WHEN 'D' THEN '❌ DISABLED'
    WHEN 'A' THEN '✅ ALWAYS'
    WHEN 'R' THEN '✅ REPLICA'
  END AS status,
  pg_get_triggerdef(oid) AS definition
FROM pg_trigger
WHERE NOT tgisinternal
  AND tgrelid::regclass::text IN (
    'transactions_v2',
    'investor_positions',
    'yield_distributions',
    'fee_allocations',
    'ib_allocations'
  )
ORDER BY tgrelid::regclass, tgname;
```

### C.4 Frontend-Backend Contract Check

```bash
#!/bin/bash
# Check if frontend calls match backend function signatures

echo "=== Frontend RPC Calls for Yield ==="
grep -rn "apply_daily_yield\|preview.*yield" src/ --include="*.ts" --include="*.tsx" -A 10

echo ""
echo "=== Parameter Names Used ==="
grep -rn "apply_daily_yield\|preview.*yield" src/ --include="*.ts" --include="*.tsx" -A 10 | \
  grep -E "p_[a-z_]+:"
```

---

## Part D: Compliance Perspective

### D.1 Audit Trail Requirements

```sql
-- Verify complete audit trail exists
SELECT 
  'yield_distributions' AS entity,
  COUNT(*) FILTER (WHERE created_at >= '2025-11-01') AS november_records,
  COUNT(*) FILTER (WHERE created_at >= '2025-11-01' AND is_voided = false) AS active_records
FROM yield_distributions yd
JOIN funds f ON yd.fund_id = f.id
WHERE f.name ILIKE '%ripple%'

UNION ALL

SELECT 
  'transactions (YIELD)' AS entity,
  COUNT(*) FILTER (WHERE created_at >= '2025-11-01') AS november_records,
  COUNT(*) FILTER (WHERE created_at >= '2025-11-01' AND is_voided = false) AS active_records
FROM transactions_v2 t
JOIN funds f ON t.fund_id = f.id
WHERE f.name ILIKE '%ripple%' AND t.tx_type = 'YIELD'

UNION ALL

SELECT 
  'transactions (FEE)' AS entity,
  COUNT(*),
  COUNT(*) FILTER (WHERE is_voided = false)
FROM transactions_v2 t
JOIN funds f ON t.fund_id = f.id
WHERE f.name ILIKE '%ripple%' AND t.tx_type = 'FEE' AND t.created_at >= '2025-11-01'

UNION ALL

SELECT 
  'audit_log entries' AS entity,
  COUNT(*),
  COUNT(*)
FROM audit_log
WHERE created_at >= '2025-11-01'
  AND (entity_type = 'yield_distribution' OR action LIKE '%YIELD%');
```

### D.2 Investor Statement Data Validation

```sql
-- Data that will appear on investor statements must be complete
SELECT 
  p.display_name AS investor,
  p.email,
  ip.current_value AS position_value,
  (SELECT MAX(t.tx_date) FROM transactions_v2 t 
   WHERE t.investor_id = p.id AND t.tx_type = 'YIELD' AND NOT t.is_voided) AS last_yield_date,
  (SELECT SUM(t.amount) FROM transactions_v2 t 
   WHERE t.investor_id = p.id AND t.tx_type = 'YIELD' 
   AND t.tx_date >= '2025-11-01' AND t.tx_date <= '2025-11-30'
   AND NOT t.is_voided) AS november_yield,
  CASE 
    WHEN (SELECT SUM(t.amount) FROM transactions_v2 t 
          WHERE t.investor_id = p.id AND t.tx_type = 'YIELD' 
          AND t.tx_date >= '2025-11-01' AND t.tx_date <= '2025-11-30'
          AND NOT t.is_voided) IS NULL 
    THEN '❌ NO YIELD RECORDED'
    ELSE '✅ YIELD PRESENT'
  END AS statement_status
FROM profiles p
JOIN investor_positions ip ON ip.investor_id = p.id
JOIN funds f ON ip.fund_id = f.id
WHERE f.name ILIKE '%ripple%'
  AND ip.is_active = true
  AND ip.current_value > 0
ORDER BY p.display_name;
```

### D.3 Fee Revenue Tracking

```sql
-- Platform fee revenue must be tracked for accounting
SELECT 
  DATE_TRUNC('month', t.tx_date) AS month,
  f.name AS fund,
  SUM(t.amount) AS total_fees_collected,
  COUNT(*) AS fee_transaction_count
FROM transactions_v2 t
JOIN profiles p ON t.investor_id = p.id
JOIN funds f ON t.fund_id = f.id
WHERE p.investor_type = 'SYSTEM_FEES'
  AND t.tx_type = 'FEE'
  AND NOT t.is_voided
  AND t.tx_date >= '2025-01-01'
GROUP BY DATE_TRUNC('month', t.tx_date), f.name
ORDER BY month DESC, fund;
```

---

## Part E: QA Engineer Perspective

### E.1 End-to-End Test Scenario

```sql
-- Simulate what SHOULD happen for a yield distribution

-- 1. Setup: Get test data
WITH test_context AS (
  SELECT 
    f.id AS fund_id,
    f.name AS fund_name,
    (SELECT total_aum FROM fund_daily_aum WHERE fund_id = f.id ORDER BY aum_date DESC LIMIT 1) AS current_aum,
    (SELECT COUNT(*) FROM investor_positions WHERE fund_id = f.id AND is_active AND current_value > 0) AS investor_count
  FROM funds f
  WHERE f.name ILIKE '%ripple%'
)
SELECT 
  *,
  current_aum * 0.001 AS expected_gross_at_0_1_pct,
  investor_count AS expected_yield_tx_count,
  investor_count AS expected_fee_tx_count
FROM test_context;

-- 2. Verify: After distribution, check counts
SELECT 
  tx_type,
  COUNT(*) AS actual_count,
  SUM(amount) AS actual_total
FROM transactions_v2 t
JOIN funds f ON t.fund_id = f.id
WHERE f.name ILIKE '%ripple%'
  AND t.tx_date = '2025-11-XX'  -- Replace with actual date
  AND t.reference_id LIKE 'yield-%'
  AND NOT t.is_voided
GROUP BY tx_type;
```

### E.2 Regression Test Queries

```sql
-- These should ALL return 0 rows if system is healthy

-- Test 1: Orphan yield transactions (no parent distribution)
SELECT t.* 
FROM transactions_v2 t
WHERE t.tx_type = 'YIELD'
  AND t.reference_id LIKE 'yield-%'
  AND NOT EXISTS (
    SELECT 1 FROM yield_distributions yd
    WHERE t.reference_id LIKE 'yield-' || yd.fund_id::text || '-' || yd.yield_date::text || '%'
  );

-- Test 2: Distributions without transactions
SELECT yd.*
FROM yield_distributions yd
WHERE yd.status = 'COMPLETED'
  AND NOT yd.is_voided
  AND NOT EXISTS (
    SELECT 1 FROM transactions_v2 t
    WHERE t.reference_id LIKE 'yield-' || yd.fund_id::text || '-' || yd.yield_date::text || '%'
      AND NOT t.is_voided
  );

-- Test 3: Fee allocations without fee transactions
SELECT fa.*
FROM fee_allocations fa
JOIN yield_distributions yd ON fa.distribution_id = yd.id
WHERE NOT yd.is_voided
  AND NOT EXISTS (
    SELECT 1 FROM transactions_v2 t
    JOIN profiles p ON t.investor_id = p.id
    WHERE t.tx_type = 'FEE'
      AND p.investor_type = 'SYSTEM_FEES'
      AND t.tx_date = yd.yield_date
      AND NOT t.is_voided
  );

-- Test 4: Position-ledger mismatches > $0.01
SELECT 
  ip.investor_id,
  ip.current_value,
  SUM(t.amount) FILTER (WHERE NOT t.is_voided) AS ledger_sum,
  ABS(ip.current_value - COALESCE(SUM(t.amount) FILTER (WHERE NOT t.is_voided), 0)) AS variance
FROM investor_positions ip
LEFT JOIN transactions_v2 t ON t.investor_id = ip.investor_id AND t.fund_id = ip.fund_id
GROUP BY ip.investor_id, ip.fund_id, ip.current_value
HAVING ABS(ip.current_value - COALESCE(SUM(t.amount) FILTER (WHERE NOT t.is_voided), 0)) > 0.01;
```

### E.3 Automated Health Check Function

```sql
-- Create comprehensive health check
CREATE OR REPLACE FUNCTION check_yield_distribution_health(p_fund_name text, p_month date)
RETURNS TABLE (
  check_name text,
  status text,
  expected text,
  actual text,
  details jsonb
) AS $$
DECLARE
  v_fund_id uuid;
  v_distribution RECORD;
  v_yield_tx_count integer;
  v_fee_tx_count integer;
  v_ib_tx_count integer;
  v_position_count integer;
BEGIN
  -- Get fund
  SELECT id INTO v_fund_id FROM funds WHERE name ILIKE '%' || p_fund_name || '%';
  
  IF v_fund_id IS NULL THEN
    RETURN QUERY SELECT 'fund_exists'::text, 'FAIL'::text, 'Fund found'::text, 'Not found'::text, '{}'::jsonb;
    RETURN;
  END IF;
  
  -- Check 1: Distribution exists
  SELECT * INTO v_distribution
  FROM yield_distributions
  WHERE fund_id = v_fund_id
    AND yield_date >= p_month
    AND yield_date < p_month + INTERVAL '1 month'
    AND NOT is_voided
  LIMIT 1;
  
  IF v_distribution IS NULL THEN
    RETURN QUERY SELECT 'distribution_exists'::text, 'FAIL'::text, 'Distribution found'::text, 'Not found'::text, '{}'::jsonb;
    RETURN;
  END IF;
  
  RETURN QUERY SELECT 'distribution_exists'::text, 'PASS'::text, 
    'Distribution found'::text, v_distribution.id::text, 
    jsonb_build_object('status', v_distribution.status, 'gross', v_distribution.gross_yield_amount);
  
  -- Check 2: YIELD transactions exist
  SELECT COUNT(*) INTO v_yield_tx_count
  FROM transactions_v2
  WHERE fund_id = v_fund_id
    AND tx_type = 'YIELD'
    AND tx_date = v_distribution.yield_date
    AND NOT is_voided;
  
  RETURN QUERY SELECT 'yield_transactions'::text,
    CASE WHEN v_yield_tx_count > 0 THEN 'PASS' ELSE 'FAIL' END,
    'Count > 0'::text, v_yield_tx_count::text, '{}'::jsonb;
  
  -- Check 3: FEE transactions exist
  SELECT COUNT(*) INTO v_fee_tx_count
  FROM transactions_v2 t
  JOIN profiles p ON t.investor_id = p.id
  WHERE t.fund_id = v_fund_id
    AND t.tx_type = 'FEE'
    AND t.tx_date = v_distribution.yield_date
    AND p.investor_type = 'SYSTEM_FEES'
    AND NOT t.is_voided;
  
  RETURN QUERY SELECT 'fee_transactions'::text,
    CASE WHEN v_fee_tx_count > 0 THEN 'PASS' ELSE 'FAIL' END,
    'Count > 0'::text, v_fee_tx_count::text, '{}'::jsonb;
  
  -- Check 4: Position count matches
  SELECT COUNT(*) INTO v_position_count
  FROM investor_positions
  WHERE fund_id = v_fund_id AND is_active AND current_value > 0;
  
  RETURN QUERY SELECT 'transaction_count_matches_positions'::text,
    CASE WHEN v_yield_tx_count = v_position_count THEN 'PASS' ELSE 'WARN' END,
    v_position_count::text, v_yield_tx_count::text, '{}'::jsonb;
  
  -- Check 5: Conservation
  RETURN QUERY SELECT 'conservation_law'::text,
    CASE 
      WHEN ABS(v_distribution.gross_yield_amount - 
        (v_distribution.net_yield_amount + v_distribution.total_fees + COALESCE(v_distribution.total_ib_fees, 0))) < 0.0001 
      THEN 'PASS' ELSE 'FAIL' 
    END,
    v_distribution.gross_yield_amount::text,
    (v_distribution.net_yield_amount + v_distribution.total_fees + COALESCE(v_distribution.total_ib_fees, 0))::text,
    jsonb_build_object(
      'gross', v_distribution.gross_yield_amount,
      'net', v_distribution.net_yield_amount,
      'fees', v_distribution.total_fees,
      'ib', v_distribution.total_ib_fees
    );
  
END;
$$ LANGUAGE plpgsql;

-- Run health check
SELECT * FROM check_yield_distribution_health('ripple', '2025-11-01');
```

---

## Part F: Remediation Decision Matrix

Based on diagnostic results, follow this decision tree:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     REMEDIATION DECISION MATRIX                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SCENARIO A: Distribution record exists, but no transactions                │
│  ├── Diagnosis: Function created record but failed during transaction loop │
│  ├── Root Cause: Check function body for errors, check triggers            │
│  └── Fix: Void distribution, fix function, re-apply                        │
│                                                                             │
│  SCENARIO B: Distribution exists, YIELD transactions exist, no FEE         │
│  ├── Diagnosis: Fee transaction logic skipped or INDIGO Fees account missing│
│  ├── Root Cause: Check if INDIGO Fees account exists                       │
│  └── Fix: Create account if missing, manually insert FEE transactions      │
│                                                                             │
│  SCENARIO C: All transactions exist, but positions not updated             │
│  ├── Diagnosis: Position UPDATE failed or was skipped                      │
│  ├── Root Cause: Check UPDATE logic in function, check triggers            │
│  └── Fix: Run recompute_investor_position for each investor                │
│                                                                             │
│  SCENARIO D: All transactions exist, but AUM not updated                   │
│  ├── Diagnosis: AUM record not inserted after distribution                 │
│  ├── Root Cause: Missing INSERT/UPSERT for fund_daily_aum                  │
│  └── Fix: Insert correct AUM record, update function                       │
│                                                                             │
│  SCENARIO E: No distribution record at all                                 │
│  ├── Diagnosis: Function failed before creating distribution               │
│  ├── Root Cause: RPC signature mismatch, parameter error, missing AUM      │
│  └── Fix: Fix function signature, ensure prerequisites, re-apply           │
│                                                                             │
│  SCENARIO F: Everything exists but UI shows wrong values                   │
│  ├── Diagnosis: Frontend query or caching issue                            │
│  ├── Root Cause: Query joins wrong, React Query cache stale                │
│  └── Fix: Fix frontend query, invalidate cache                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Execution Checklist

```markdown
## Complete Audit Checklist

### Part A: Fund Operations
- [ ] A.1 Verified yield calculated from T-1 AUM
- [ ] A.2 Verified fee rates correct
- [ ] A.3 Verified post-distribution AUM recorded

### Part B: Financial Controller
- [ ] B.1 Transaction types distribution verified
- [ ] B.2 Conservation of funds verified
- [ ] B.3 Statement accuracy verified

### Part C: Platform Architect
- [ ] C.1 Function signatures verified
- [ ] C.2 Advisory locks present
- [ ] C.3 Triggers enabled
- [ ] C.4 Frontend-backend contract matches

### Part D: Compliance
- [ ] D.1 Audit trail complete
- [ ] D.2 Investor statement data present
- [ ] D.3 Fee revenue tracked

### Part E: QA
- [ ] E.1 End-to-end scenario verified
- [ ] E.2 Regression tests pass (0 rows)
- [ ] E.3 Health check function created and run

### Part F: Remediation
- [ ] Scenario identified
- [ ] Root cause determined
- [ ] Fix applied
- [ ] Re-validation passed
```

---

## Output Deliverables

1. **RIPPLE_YIELD_DIAGNOSTIC.sql** — Run first to gather all data
2. **RIPPLE_NOV2025_ROOT_CAUSE.md** — Document findings
3. **RIPPLE_NOV2025_REMEDIATION.sql** — Fix migration
4. **RIPPLE_NOV2025_VALIDATION.md** — Proof all checks pass
5. **Updated apply_daily_yield_to_fund_v3** — If function was broken
