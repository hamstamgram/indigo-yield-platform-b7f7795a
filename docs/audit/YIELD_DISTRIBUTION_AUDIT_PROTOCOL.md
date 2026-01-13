# INDIGO Platform: Yield Distribution Pipeline Audit & Remediation

> **Critical Issue:** November 2025 yield applied to Ripple Fund but downstream effects missing
> **Symptoms:**
> - No fee transactions flowing to INDIGO Fees account
> - No investor yield transactions recorded
> - No IB commission transactions recorded  
> - Fund AUM showing stale snapshot instead of post-yield recalculated value
> **Impact:** Financial reconciliation broken, investor statements incorrect, fee revenue not tracked

---

## Executive Summary

The yield distribution is a multi-step atomic operation that should:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     YIELD DISTRIBUTION WATERFALL                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. GROSS YIELD CALCULATION                                                 │
│     New AUM - Previous AUM = Gross Yield                                    │
│                                                                             │
│  2. FEE EXTRACTION (from gross)                                             │
│     ├── Platform Fee → INDIGO Fees Account (FEE transaction)                │
│     └── IB Commission → IB Parent Account (IB_CREDIT transaction)           │
│                                                                             │
│  3. NET YIELD DISTRIBUTION                                                  │
│     └── Per Investor: (position_weight × gross) - fees = NET YIELD          │
│         → Investor Account (YIELD transaction)                              │
│                                                                             │
│  4. POSITION UPDATES                                                        │
│     └── Each investor_position.current_value += net_yield                   │
│                                                                             │
│  5. AUM RECALCULATION                                                       │
│     └── fund_daily_aum = SUM(investor_positions.current_value)              │
│                                                                             │
│  6. CONSERVATION CHECK                                                      │
│     └── |Gross Yield - (Fees + Net Yields)| < 10^-10                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

If any step fails silently, you get the symptoms described.

---

## Part 1: Immediate Forensic Diagnosis

### 1.1 Identify the Yield Distribution Record

```sql
-- Find the November 2025 yield distribution for Ripple Fund
SELECT 
  yd.id AS distribution_id,
  yd.fund_id,
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
  yd.created_at,
  yd.created_by,
  yd.is_voided,
  yd.notes
FROM yield_distributions yd
JOIN funds f ON yd.fund_id = f.id
WHERE f.name ILIKE '%ripple%'
  AND yd.yield_date >= '2025-11-01'
  AND yd.yield_date <= '2025-11-30'
ORDER BY yd.yield_date DESC;
```

**Save the `distribution_id` - you'll need it for all subsequent queries.**

### 1.2 Check Transaction Creation

```sql
-- Set the distribution_id from 1.1
-- Replace 'YOUR_DISTRIBUTION_ID' with actual UUID

-- All transactions linked to this distribution
SELECT 
  t.id AS transaction_id,
  t.tx_type,
  t.amount,
  t.investor_id,
  p.display_name AS investor_name,
  p.investor_type,
  t.fund_id,
  t.tx_date,
  t.reference_id,
  t.is_voided,
  t.created_at
FROM transactions_v2 t
LEFT JOIN profiles p ON t.investor_id = p.id
WHERE t.reference_id LIKE 'yield-%'
  AND t.fund_id = (SELECT fund_id FROM yield_distributions WHERE id = 'YOUR_DISTRIBUTION_ID')
  AND t.tx_date >= '2025-11-01'
  AND t.tx_date <= '2025-11-30'
ORDER BY t.tx_type, t.amount DESC;

-- Count by type
SELECT 
  tx_type,
  COUNT(*) AS transaction_count,
  SUM(amount) AS total_amount,
  SUM(CASE WHEN is_voided THEN 1 ELSE 0 END) AS voided_count
FROM transactions_v2
WHERE reference_id LIKE 'yield-%'
  AND fund_id = (SELECT fund_id FROM yield_distributions WHERE id = 'YOUR_DISTRIBUTION_ID')
  AND tx_date >= '2025-11-01'
  AND tx_date <= '2025-11-30'
GROUP BY tx_type;
```

**Expected output:**
| tx_type | transaction_count | total_amount |
|---------|-------------------|--------------|
| YIELD | N (one per investor) | Sum of net yields |
| FEE | N (one per investor) | Sum of platform fees |
| IB_CREDIT | M (one per IB relationship) | Sum of IB commissions |

**If any row is missing or shows 0, that's where the pipeline broke.**

### 1.3 Check Fee Allocations

```sql
-- Fee allocations for this distribution
SELECT 
  fa.id,
  fa.distribution_id,
  fa.investor_position_id,
  fa.fee_amount,
  fa.fee_percentage,
  fa.yield_amount_gross,
  fa.yield_amount_net,
  fa.created_at,
  p.display_name AS investor_name
FROM fee_allocations fa
JOIN investor_positions ip ON fa.investor_position_id = ip.id
JOIN profiles p ON ip.investor_id = p.id
WHERE fa.distribution_id = 'YOUR_DISTRIBUTION_ID'
ORDER BY fa.fee_amount DESC;

-- Summary
SELECT 
  COUNT(*) AS allocation_count,
  SUM(fee_amount) AS total_fees,
  SUM(yield_amount_gross) AS total_gross,
  SUM(yield_amount_net) AS total_net
FROM fee_allocations
WHERE distribution_id = 'YOUR_DISTRIBUTION_ID';
```

### 1.4 Check IB Allocations

```sql
-- IB allocations for this distribution
SELECT 
  iba.id,
  iba.distribution_id,
  iba.source_investor_id,
  sp.display_name AS source_investor,
  iba.ib_investor_id,
  ibp.display_name AS ib_parent,
  iba.commission_amount,
  iba.commission_rate,
  iba.gross_yield_amount,
  iba.created_at
FROM ib_allocations iba
JOIN profiles sp ON iba.source_investor_id = sp.id
JOIN profiles ibp ON iba.ib_investor_id = ibp.id
WHERE iba.distribution_id = 'YOUR_DISTRIBUTION_ID'
ORDER BY iba.commission_amount DESC;

-- Summary
SELECT 
  COUNT(*) AS ib_allocation_count,
  SUM(commission_amount) AS total_ib_commissions,
  COUNT(DISTINCT ib_investor_id) AS unique_ib_parents
FROM ib_allocations
WHERE distribution_id = 'YOUR_DISTRIBUTION_ID';
```

### 1.5 Check INDIGO Fees Account

```sql
-- Find INDIGO Fees account (system account for platform fees)
SELECT id, display_name, investor_type, is_system_account
FROM profiles
WHERE display_name ILIKE '%indigo%fees%'
   OR display_name ILIKE '%platform%fees%'
   OR investor_type = 'SYSTEM_FEES';

-- Check transactions TO the fees account
SELECT 
  t.id,
  t.tx_type,
  t.amount,
  t.tx_date,
  t.reference_id,
  t.created_at
FROM transactions_v2 t
JOIN profiles p ON t.investor_id = p.id
WHERE (p.display_name ILIKE '%indigo%fees%' OR p.investor_type = 'SYSTEM_FEES')
  AND t.tx_date >= '2025-11-01'
  AND t.tx_date <= '2025-11-30'
  AND NOT t.is_voided
ORDER BY t.tx_date DESC;
```

### 1.6 Check Investor Positions (Pre vs Post Yield)

```sql
-- Current positions for Ripple Fund investors
SELECT 
  ip.id AS position_id,
  ip.investor_id,
  p.display_name,
  ip.fund_id,
  f.name AS fund_name,
  ip.current_value,
  ip.cost_basis,
  ip.last_yield_date,
  ip.updated_at
FROM investor_positions ip
JOIN profiles p ON ip.investor_id = p.id
JOIN funds f ON ip.fund_id = f.id
WHERE f.name ILIKE '%ripple%'
ORDER BY ip.current_value DESC;

-- Compare position values vs ledger (should match)
SELECT 
  ip.investor_id,
  p.display_name,
  ip.current_value AS position_value,
  COALESCE(SUM(t.amount) FILTER (WHERE NOT t.is_voided), 0) AS ledger_value,
  ip.current_value - COALESCE(SUM(t.amount) FILTER (WHERE NOT t.is_voided), 0) AS variance
FROM investor_positions ip
JOIN profiles p ON ip.investor_id = p.id
JOIN funds f ON ip.fund_id = f.id
LEFT JOIN transactions_v2 t ON t.investor_id = ip.investor_id AND t.fund_id = ip.fund_id
WHERE f.name ILIKE '%ripple%'
GROUP BY ip.investor_id, p.display_name, ip.current_value
HAVING ABS(ip.current_value - COALESCE(SUM(t.amount) FILTER (WHERE NOT t.is_voided), 0)) > 0.0000001;
```

### 1.7 Check Fund AUM Records

```sql
-- AUM history for Ripple Fund (November 2025)
SELECT 
  fa.id,
  fa.fund_id,
  f.name AS fund_name,
  fa.aum_date,
  fa.total_aum,
  fa.source,
  fa.notes,
  fa.created_at,
  fa.created_by
FROM fund_daily_aum fa
JOIN funds f ON fa.fund_id = f.id
WHERE f.name ILIKE '%ripple%'
  AND fa.aum_date >= '2025-10-25'  -- Include late October for context
  AND fa.aum_date <= '2025-12-05'
ORDER BY fa.aum_date DESC;

-- Compare recorded AUM vs sum of positions
SELECT 
  f.name AS fund_name,
  fa.aum_date,
  fa.total_aum AS recorded_aum,
  COALESCE(SUM(ip.current_value), 0) AS calculated_from_positions,
  fa.total_aum - COALESCE(SUM(ip.current_value), 0) AS variance
FROM fund_daily_aum fa
JOIN funds f ON fa.fund_id = f.id
LEFT JOIN investor_positions ip ON ip.fund_id = f.id
WHERE f.name ILIKE '%ripple%'
  AND fa.aum_date >= '2025-11-01'
GROUP BY f.name, fa.aum_date, fa.total_aum
ORDER BY fa.aum_date DESC;
```

### 1.8 Check the Apply Yield Function Exists and Works

```sql
-- Verify function signature
SELECT 
  proname,
  pg_get_function_identity_arguments(oid) AS parameters,
  pg_get_function_result(oid) AS return_type
FROM pg_proc
WHERE proname IN (
  'apply_daily_yield_to_fund_v3',
  'preview_daily_yield_v3',
  'calculate_yield_allocations'
);

-- Check function definition for bugs
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'apply_daily_yield_to_fund_v3';
```

---

## Part 2: Root Cause Analysis Decision Tree

Based on Part 1 results, identify the failure point:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DIAGNOSIS DECISION TREE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Q1: Does yield_distributions record exist?                                 │
│  ├── NO → apply_daily_yield_to_fund_v3 failed before creating record        │
│  │        Check: function exists, parameter names match frontend            │
│  └── YES → Continue to Q2                                                   │
│                                                                             │
│  Q2: Are there YIELD transactions in transactions_v2?                       │
│  ├── NO → Transaction insertion loop failed                                 │
│  │        Check: investor_positions exist, function body for INSERT logic   │
│  └── YES → Continue to Q3                                                   │
│                                                                             │
│  Q3: Are there FEE transactions to INDIGO Fees account?                     │
│  ├── NO → Fee transaction creation skipped or INDIGO Fees account missing   │
│  │        Check: INDIGO Fees profile exists, fee_allocations populated      │
│  └── YES → Continue to Q4                                                   │
│                                                                             │
│  Q4: Are there IB_CREDIT transactions for IB parents?                       │
│  ├── NO → IB commission logic skipped or no IB relationships defined        │
│  │        Check: ib_parent_id set on investor profiles, ib_allocations      │
│  └── YES → Continue to Q5                                                   │
│                                                                             │
│  Q5: Do investor_positions reflect updated values?                          │
│  ├── NO → Position update failed or never executed                          │
│  │        Check: UPDATE logic in function, trigger interference             │
│  └── YES → Continue to Q6                                                   │
│                                                                             │
│  Q6: Does fund_daily_aum show post-yield AUM?                               │
│  ├── NO → AUM recalculation never triggered                                 │
│  │        Check: recalculate_fund_aum_for_date called in function           │
│  └── YES → Pipeline complete, check UI display logic                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Part 3: Specific Issue Diagnostics

### 3.1 Missing Fee Flow to INDIGO Fees Account

```sql
-- Check if INDIGO Fees account exists
SELECT id, display_name, investor_type, is_active
FROM profiles
WHERE investor_type = 'SYSTEM_FEES'
   OR display_name ILIKE '%indigo%fee%'
   OR display_name ILIKE '%platform%fee%';

-- If missing, create it:
/*
INSERT INTO profiles (
  id,
  display_name,
  investor_type,
  is_active,
  is_system_account,
  email
) VALUES (
  gen_random_uuid(),
  'INDIGO Platform Fees',
  'SYSTEM_FEES',
  true,
  true,
  'fees@indigo.fund'
);
*/

-- Check apply_daily_yield_to_fund_v3 for fee transaction logic
-- Look for: INSERT INTO transactions_v2 ... WHERE tx_type = 'FEE'
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'apply_daily_yield_to_fund_v3';
```

### 3.2 Missing Investor Yield Transactions

```sql
-- Check if investors have positions in Ripple Fund
SELECT 
  ip.id,
  ip.investor_id,
  p.display_name,
  p.investor_type,
  ip.current_value,
  ip.is_active
FROM investor_positions ip
JOIN profiles p ON ip.investor_id = p.id
JOIN funds f ON ip.fund_id = f.id
WHERE f.name ILIKE '%ripple%'
  AND ip.is_active = true
  AND ip.current_value > 0;

-- If positions exist but no YIELD transactions, check the function logic
-- The function should loop through each position and INSERT a YIELD transaction
```

### 3.3 Missing IB Commissions

```sql
-- Check IB parent relationships
SELECT 
  p.id AS investor_id,
  p.display_name,
  p.ib_parent_id,
  ibp.display_name AS ib_parent_name,
  p.ib_commission_rate
FROM profiles p
LEFT JOIN profiles ibp ON p.ib_parent_id = ibp.id
WHERE p.id IN (
  SELECT investor_id 
  FROM investor_positions ip
  JOIN funds f ON ip.fund_id = f.id
  WHERE f.name ILIKE '%ripple%'
)
AND p.ib_parent_id IS NOT NULL;

-- If no results, no IB relationships are configured
-- If results exist but no IB_CREDIT transactions, function logic is broken
```

### 3.4 Stale AUM (Wrong Snapshot)

```sql
-- What AUM values exist for Ripple Fund?
SELECT 
  aum_date,
  total_aum,
  source,
  notes,
  created_at
FROM fund_daily_aum
WHERE fund_id = (SELECT id FROM funds WHERE name ILIKE '%ripple%')
ORDER BY aum_date DESC
LIMIT 20;

-- What SHOULD the AUM be? (Sum of positions)
SELECT 
  SUM(ip.current_value) AS calculated_aum
FROM investor_positions ip
JOIN funds f ON ip.fund_id = f.id
WHERE f.name ILIKE '%ripple%'
  AND ip.is_active = true;

-- What's the most recent AUM record?
SELECT * FROM fund_daily_aum
WHERE fund_id = (SELECT id FROM funds WHERE name ILIKE '%ripple%')
ORDER BY aum_date DESC
LIMIT 1;

-- Check if recalculate_fund_aum_for_date is being called
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'recalculate_fund_aum_for_date';
```

---

## Part 4: Comprehensive Fix Protocol

### 4.1 Verify/Create System Accounts

```sql
-- Ensure INDIGO Fees account exists
DO $$
DECLARE
  v_fees_account_id uuid;
BEGIN
  SELECT id INTO v_fees_account_id
  FROM profiles
  WHERE investor_type = 'SYSTEM_FEES'
     OR display_name ILIKE '%indigo%fee%'
  LIMIT 1;
  
  IF v_fees_account_id IS NULL THEN
    INSERT INTO profiles (
      id,
      display_name,
      investor_type,
      is_active,
      email,
      created_at
    ) VALUES (
      gen_random_uuid(),
      'INDIGO Platform Fees',
      'SYSTEM_FEES',
      true,
      'platform-fees@indigo.fund',
      now()
    )
    RETURNING id INTO v_fees_account_id;
    
    RAISE NOTICE 'Created INDIGO Fees account: %', v_fees_account_id;
  ELSE
    RAISE NOTICE 'INDIGO Fees account exists: %', v_fees_account_id;
  END IF;
END $$;
```

### 4.2 Fix apply_daily_yield_to_fund_v3 Function

```sql
-- First, backup current function definition
SELECT pg_get_functiondef(oid) AS current_definition
FROM pg_proc 
WHERE proname = 'apply_daily_yield_to_fund_v3';

-- CORRECTED FUNCTION (review and adapt to your actual schema)
CREATE OR REPLACE FUNCTION apply_daily_yield_to_fund_v3(
  p_fund_id uuid,
  p_yield_date date,
  p_yield_percentage numeric(10,6),
  p_admin_id uuid DEFAULT auth.uid()
)
RETURNS jsonb AS $$
DECLARE
  v_distribution_id uuid;
  v_gross_yield numeric(28,10) := 0;
  v_total_fees numeric(28,10) := 0;
  v_total_ib_fees numeric(28,10) := 0;
  v_net_yield numeric(28,10) := 0;
  v_dust numeric(28,10) := 0;
  v_investor_count integer := 0;
  v_previous_aum numeric(28,10);
  v_new_aum numeric(28,10);
  v_fees_account_id uuid;
  v_position RECORD;
  v_investor_gross numeric(28,10);
  v_investor_fee numeric(28,10);
  v_investor_ib_fee numeric(28,10);
  v_investor_net numeric(28,10);
  v_fee_rate numeric(10,6);
  v_ib_rate numeric(10,6);
  v_ib_parent_id uuid;
  v_reference_base text;
  v_allocated_total numeric(28,10) := 0;
BEGIN
  -- Acquire advisory lock
  PERFORM pg_advisory_xact_lock(hashtext('yield:' || p_fund_id::text || ':' || p_yield_date::text));
  
  -- Check for duplicate distribution
  IF EXISTS (
    SELECT 1 FROM yield_distributions 
    WHERE fund_id = p_fund_id 
      AND yield_date = p_yield_date 
      AND NOT is_voided
  ) THEN
    RAISE EXCEPTION 'Yield already distributed for fund % on %', p_fund_id, p_yield_date;
  END IF;
  
  -- Get INDIGO Fees account
  SELECT id INTO v_fees_account_id
  FROM profiles
  WHERE investor_type = 'SYSTEM_FEES'
     OR display_name ILIKE '%indigo%fee%'
  LIMIT 1;
  
  IF v_fees_account_id IS NULL THEN
    RAISE EXCEPTION 'INDIGO Fees account not found. Create system fees account first.';
  END IF;
  
  -- Get previous AUM (T-1 snapshot)
  SELECT total_aum INTO v_previous_aum
  FROM fund_daily_aum
  WHERE fund_id = p_fund_id
    AND aum_date < p_yield_date
  ORDER BY aum_date DESC
  LIMIT 1;
  
  IF v_previous_aum IS NULL OR v_previous_aum <= 0 THEN
    RAISE EXCEPTION 'No previous AUM found for fund % before %', p_fund_id, p_yield_date;
  END IF;
  
  -- Calculate gross yield
  v_gross_yield := v_previous_aum * (p_yield_percentage / 100);
  v_new_aum := v_previous_aum + v_gross_yield;
  
  -- Reference ID base
  v_reference_base := 'yield-' || p_fund_id::text || '-' || p_yield_date::text;
  
  -- Create distribution record FIRST
  INSERT INTO yield_distributions (
    id,
    fund_id,
    yield_date,
    yield_percentage,
    gross_yield_amount,
    status,
    created_by,
    created_at
  ) VALUES (
    gen_random_uuid(),
    p_fund_id,
    p_yield_date,
    p_yield_percentage,
    v_gross_yield,
    'PROCESSING',
    p_admin_id,
    now()
  )
  RETURNING id INTO v_distribution_id;
  
  -- Get default fee rate from fund
  SELECT COALESCE(management_fee_rate, 0.20) INTO v_fee_rate
  FROM funds WHERE id = p_fund_id;
  
  -- Process each investor position
  FOR v_position IN (
    SELECT 
      ip.id AS position_id,
      ip.investor_id,
      ip.current_value,
      p.ib_parent_id,
      COALESCE(p.ib_commission_rate, 0) AS ib_rate,
      p.display_name
    FROM investor_positions ip
    JOIN profiles p ON ip.investor_id = p.id
    WHERE ip.fund_id = p_fund_id
      AND ip.is_active = true
      AND ip.current_value > 0
    ORDER BY ip.investor_id
  )
  LOOP
    v_investor_count := v_investor_count + 1;
    
    -- Calculate investor's share of gross yield (pro-rata)
    v_investor_gross := (v_position.current_value / v_previous_aum) * v_gross_yield;
    
    -- Calculate platform fee (from gross)
    v_investor_fee := v_investor_gross * v_fee_rate;
    v_total_fees := v_total_fees + v_investor_fee;
    
    -- Calculate IB commission (from gross, if applicable)
    v_investor_ib_fee := 0;
    IF v_position.ib_parent_id IS NOT NULL AND v_position.ib_rate > 0 THEN
      v_investor_ib_fee := v_investor_gross * v_position.ib_rate;
      v_total_ib_fees := v_total_ib_fees + v_investor_ib_fee;
    END IF;
    
    -- Calculate net yield
    v_investor_net := v_investor_gross - v_investor_fee - v_investor_ib_fee;
    v_net_yield := v_net_yield + v_investor_net;
    v_allocated_total := v_allocated_total + v_investor_gross;
    
    -- 1. INSERT YIELD TRANSACTION (to investor)
    INSERT INTO transactions_v2 (
      id,
      investor_id,
      fund_id,
      amount,
      tx_type,
      tx_date,
      reference_id,
      notes,
      created_by,
      created_at
    ) VALUES (
      gen_random_uuid(),
      v_position.investor_id,
      p_fund_id,
      v_investor_net,
      'YIELD',
      p_yield_date,
      v_reference_base || '-' || v_position.investor_id::text,
      'Net yield after fees',
      p_admin_id,
      now()
    );
    
    -- 2. INSERT FEE TRANSACTION (to INDIGO Fees account)
    IF v_investor_fee > 0 THEN
      INSERT INTO transactions_v2 (
        id,
        investor_id,
        fund_id,
        amount,
        tx_type,
        tx_date,
        reference_id,
        notes,
        created_by,
        created_at
      ) VALUES (
        gen_random_uuid(),
        v_fees_account_id,
        p_fund_id,
        v_investor_fee,
        'FEE',
        p_yield_date,
        v_reference_base || '-fee-' || v_position.investor_id::text,
        'Platform fee from ' || v_position.display_name,
        p_admin_id,
        now()
      );
    END IF;
    
    -- 3. INSERT IB_CREDIT TRANSACTION (to IB parent)
    IF v_investor_ib_fee > 0 AND v_position.ib_parent_id IS NOT NULL THEN
      INSERT INTO transactions_v2 (
        id,
        investor_id,
        fund_id,
        amount,
        tx_type,
        tx_date,
        reference_id,
        notes,
        created_by,
        created_at
      ) VALUES (
        gen_random_uuid(),
        v_position.ib_parent_id,
        p_fund_id,
        v_investor_ib_fee,
        'IB_CREDIT',
        p_yield_date,
        v_reference_base || '-ib-' || v_position.investor_id::text,
        'IB commission from ' || v_position.display_name,
        p_admin_id,
        now()
      );
      
      -- Record IB allocation
      INSERT INTO ib_allocations (
        id,
        distribution_id,
        source_investor_id,
        ib_investor_id,
        gross_yield_amount,
        commission_rate,
        commission_amount,
        created_at
      ) VALUES (
        gen_random_uuid(),
        v_distribution_id,
        v_position.investor_id,
        v_position.ib_parent_id,
        v_investor_gross,
        v_position.ib_rate,
        v_investor_ib_fee,
        now()
      );
    END IF;
    
    -- 4. Record fee allocation
    INSERT INTO fee_allocations (
      id,
      distribution_id,
      investor_position_id,
      yield_amount_gross,
      fee_percentage,
      fee_amount,
      yield_amount_net,
      created_at
    ) VALUES (
      gen_random_uuid(),
      v_distribution_id,
      v_position.position_id,
      v_investor_gross,
      v_fee_rate,
      v_investor_fee,
      v_investor_net,
      now()
    );
    
    -- 5. UPDATE INVESTOR POSITION
    UPDATE investor_positions
    SET 
      current_value = current_value + v_investor_net,
      last_yield_date = p_yield_date,
      updated_at = now()
    WHERE id = v_position.position_id;
    
  END LOOP;
  
  -- Calculate dust (rounding residual)
  v_dust := v_gross_yield - v_allocated_total;
  
  -- Route dust to fees account if > 0 and < threshold
  IF v_dust > 0 AND v_dust < 0.01 THEN
    INSERT INTO transactions_v2 (
      id,
      investor_id,
      fund_id,
      amount,
      tx_type,
      tx_date,
      reference_id,
      notes,
      created_by,
      created_at
    ) VALUES (
      gen_random_uuid(),
      v_fees_account_id,
      p_fund_id,
      v_dust,
      'FEE',
      p_yield_date,
      v_reference_base || '-dust',
      'Rounding dust',
      p_admin_id,
      now()
    );
    v_total_fees := v_total_fees + v_dust;
  END IF;
  
  -- 6. RECORD NEW AUM
  INSERT INTO fund_daily_aum (
    id,
    fund_id,
    aum_date,
    total_aum,
    source,
    notes,
    created_by,
    created_at
  ) VALUES (
    gen_random_uuid(),
    p_fund_id,
    p_yield_date,
    v_new_aum,
    'YIELD_DISTRIBUTION',
    'Post-yield AUM after ' || p_yield_percentage::text || '% distribution',
    p_admin_id,
    now()
  )
  ON CONFLICT (fund_id, aum_date) 
  DO UPDATE SET 
    total_aum = EXCLUDED.total_aum,
    source = EXCLUDED.source,
    notes = EXCLUDED.notes,
    updated_at = now();
  
  -- 7. UPDATE DISTRIBUTION RECORD
  UPDATE yield_distributions
  SET 
    total_fees = v_total_fees,
    total_ib_fees = v_total_ib_fees,
    net_yield_amount = v_net_yield,
    dust_amount = v_dust,
    investor_count = v_investor_count,
    status = 'COMPLETED',
    completed_at = now()
  WHERE id = v_distribution_id;
  
  -- 8. AUDIT LOG
  INSERT INTO audit_log (
    action,
    entity_type,
    entity_id,
    actor_user,
    details
  ) VALUES (
    'APPLY_YIELD',
    'yield_distribution',
    v_distribution_id::text,
    p_admin_id,
    jsonb_build_object(
      'fund_id', p_fund_id,
      'yield_date', p_yield_date,
      'yield_percentage', p_yield_percentage,
      'gross_yield', v_gross_yield,
      'total_fees', v_total_fees,
      'total_ib_fees', v_total_ib_fees,
      'net_yield', v_net_yield,
      'investor_count', v_investor_count,
      'previous_aum', v_previous_aum,
      'new_aum', v_new_aum
    )
  );
  
  -- CONSERVATION CHECK
  IF ABS(v_gross_yield - (v_net_yield + v_total_fees + v_total_ib_fees)) > 0.0000001 THEN
    RAISE EXCEPTION 'Conservation check failed: gross=%, net=%, fees=%, ib=%',
      v_gross_yield, v_net_yield, v_total_fees, v_total_ib_fees;
  END IF;
  
  -- Return summary
  RETURN jsonb_build_object(
    'success', true,
    'distribution_id', v_distribution_id,
    'fund_id', p_fund_id,
    'yield_date', p_yield_date,
    'yield_percentage', p_yield_percentage,
    'previous_aum', v_previous_aum,
    'gross_yield', v_gross_yield,
    'total_fees', v_total_fees,
    'total_ib_fees', v_total_ib_fees,
    'net_yield', v_net_yield,
    'dust', v_dust,
    'new_aum', v_new_aum,
    'investor_count', v_investor_count
  );
  
EXCEPTION WHEN OTHERS THEN
  -- Log error
  INSERT INTO audit_log (
    action,
    entity_type,
    entity_id,
    actor_user,
    details
  ) VALUES (
    'YIELD_ERROR',
    'fund',
    p_fund_id::text,
    p_admin_id,
    jsonb_build_object(
      'error', SQLERRM,
      'yield_date', p_yield_date,
      'yield_percentage', p_yield_percentage
    )
  );
  RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION apply_daily_yield_to_fund_v3(uuid, date, numeric, uuid) IS 
  'Apply daily yield to fund with complete transaction flow: investor yields, platform fees, IB commissions, and AUM update';
```

### 4.3 Manual Remediation for November 2025 Distribution

If the distribution record exists but transactions are missing:

```sql
-- OPTION A: Void and re-apply (cleanest)
BEGIN;

-- 1. Get the distribution ID
SELECT id FROM yield_distributions 
WHERE fund_id = (SELECT id FROM funds WHERE name ILIKE '%ripple%')
  AND yield_date BETWEEN '2025-11-01' AND '2025-11-30';

-- 2. Void it
UPDATE yield_distributions
SET is_voided = true, 
    void_reason = 'Remediation: incomplete transaction flow',
    voided_at = now()
WHERE id = 'YOUR_DISTRIBUTION_ID';

-- 3. Void related transactions
UPDATE transactions_v2
SET is_voided = true,
    void_reason = 'Parent distribution voided for remediation'
WHERE reference_id LIKE 'yield-' || (SELECT id FROM funds WHERE name ILIKE '%ripple%')::text || '-2025-11%';

-- 4. Recompute all affected positions
DO $$
DECLARE
  v_position RECORD;
BEGIN
  FOR v_position IN (
    SELECT ip.investor_id, ip.fund_id
    FROM investor_positions ip
    JOIN funds f ON ip.fund_id = f.id
    WHERE f.name ILIKE '%ripple%'
  )
  LOOP
    PERFORM recompute_investor_position(v_position.investor_id, v_position.fund_id);
  END LOOP;
END $$;

COMMIT;

-- 5. Now re-apply yield using fixed function
SELECT apply_daily_yield_to_fund_v3(
  (SELECT id FROM funds WHERE name ILIKE '%ripple%'),
  '2025-11-XX',  -- Replace with actual date
  X.XX           -- Replace with actual yield percentage
);
```

```sql
-- OPTION B: Manually insert missing transactions (surgical fix)
-- Use only if you can identify exactly what's missing

-- Example: Insert missing FEE transactions
INSERT INTO transactions_v2 (
  id, investor_id, fund_id, amount, tx_type, tx_date, reference_id, notes, created_at
)
SELECT 
  gen_random_uuid(),
  (SELECT id FROM profiles WHERE investor_type = 'SYSTEM_FEES'),
  fa.distribution_id,  -- This might be wrong column, adjust to fund_id
  fa.fee_amount,
  'FEE',
  yd.yield_date,
  'yield-' || yd.fund_id::text || '-' || yd.yield_date::text || '-fee-' || ip.investor_id::text,
  'Platform fee (remediation)',
  now()
FROM fee_allocations fa
JOIN yield_distributions yd ON fa.distribution_id = yd.id
JOIN investor_positions ip ON fa.investor_position_id = ip.id
WHERE yd.id = 'YOUR_DISTRIBUTION_ID'
  AND NOT EXISTS (
    SELECT 1 FROM transactions_v2 t
    WHERE t.reference_id = 'yield-' || yd.fund_id::text || '-' || yd.yield_date::text || '-fee-' || ip.investor_id::text
  );
```

---

## Part 5: Validation After Fix

### 5.1 Conservation Check

```sql
-- Verify conservation law holds
SELECT 
  yd.id,
  yd.yield_date,
  yd.gross_yield_amount,
  yd.total_fees,
  yd.total_ib_fees,
  yd.net_yield_amount,
  yd.dust_amount,
  (yd.net_yield_amount + yd.total_fees + yd.total_ib_fees + COALESCE(yd.dust_amount, 0)) AS calculated_gross,
  ABS(yd.gross_yield_amount - (yd.net_yield_amount + yd.total_fees + yd.total_ib_fees + COALESCE(yd.dust_amount, 0))) AS variance,
  CASE 
    WHEN ABS(yd.gross_yield_amount - (yd.net_yield_amount + yd.total_fees + yd.total_ib_fees + COALESCE(yd.dust_amount, 0))) < 0.0000001 
    THEN '✅ PASS'
    ELSE '❌ FAIL'
  END AS conservation_check
FROM yield_distributions yd
JOIN funds f ON yd.fund_id = f.id
WHERE f.name ILIKE '%ripple%'
  AND yd.yield_date >= '2025-11-01'
  AND NOT yd.is_voided;
```

### 5.2 Transaction Flow Check

```sql
-- Verify all transaction types present
WITH distribution_summary AS (
  SELECT 
    yd.id AS distribution_id,
    yd.yield_date,
    yd.investor_count AS expected_investors
  FROM yield_distributions yd
  JOIN funds f ON yd.fund_id = f.id
  WHERE f.name ILIKE '%ripple%'
    AND yd.yield_date >= '2025-11-01'
    AND NOT yd.is_voided
)
SELECT 
  ds.yield_date,
  ds.expected_investors,
  COUNT(*) FILTER (WHERE t.tx_type = 'YIELD') AS yield_tx_count,
  COUNT(*) FILTER (WHERE t.tx_type = 'FEE') AS fee_tx_count,
  COUNT(*) FILTER (WHERE t.tx_type = 'IB_CREDIT') AS ib_tx_count,
  SUM(t.amount) FILTER (WHERE t.tx_type = 'YIELD') AS total_yields,
  SUM(t.amount) FILTER (WHERE t.tx_type = 'FEE') AS total_fees,
  SUM(t.amount) FILTER (WHERE t.tx_type = 'IB_CREDIT') AS total_ib
FROM distribution_summary ds
LEFT JOIN transactions_v2 t ON t.reference_id LIKE 'yield-%' 
  AND t.tx_date = ds.yield_date
  AND NOT t.is_voided
GROUP BY ds.yield_date, ds.expected_investors;
```

### 5.3 Position-Ledger Reconciliation

```sql
-- All Ripple Fund positions should match ledger
SELECT 
  ip.investor_id,
  p.display_name,
  ip.current_value AS position_value,
  COALESCE(SUM(t.amount) FILTER (WHERE NOT t.is_voided), 0) AS ledger_value,
  ip.current_value - COALESCE(SUM(t.amount) FILTER (WHERE NOT t.is_voided), 0) AS variance,
  CASE 
    WHEN ABS(ip.current_value - COALESCE(SUM(t.amount) FILTER (WHERE NOT t.is_voided), 0)) < 0.0000001 
    THEN '✅ MATCH'
    ELSE '❌ MISMATCH'
  END AS status
FROM investor_positions ip
JOIN profiles p ON ip.investor_id = p.id
JOIN funds f ON ip.fund_id = f.id
LEFT JOIN transactions_v2 t ON t.investor_id = ip.investor_id AND t.fund_id = ip.fund_id
WHERE f.name ILIKE '%ripple%'
GROUP BY ip.investor_id, p.display_name, ip.current_value;
```

### 5.4 AUM Validation

```sql
-- Fund AUM should equal sum of positions
SELECT 
  f.name,
  fa.aum_date,
  fa.total_aum AS recorded_aum,
  SUM(ip.current_value) AS sum_of_positions,
  fa.total_aum - SUM(ip.current_value) AS variance,
  CASE 
    WHEN ABS(fa.total_aum - SUM(ip.current_value)) < 0.01 
    THEN '✅ MATCH'
    ELSE '❌ MISMATCH'
  END AS status
FROM fund_daily_aum fa
JOIN funds f ON fa.fund_id = f.id
LEFT JOIN investor_positions ip ON ip.fund_id = f.id AND ip.is_active = true
WHERE f.name ILIKE '%ripple%'
  AND fa.aum_date >= '2025-11-01'
GROUP BY f.name, fa.aum_date, fa.total_aum
ORDER BY fa.aum_date DESC;
```

---

## Part 6: UI Display Verification

### 6.1 Check What Frontend Queries

```bash
# Find how frontend fetches AUM
grep -rn "fund_daily_aum\|total_aum\|aum" src/ --include="*.ts" --include="*.tsx" | head -30

# Find how frontend fetches yield distributions
grep -rn "yield_distribution\|yield" src/ --include="*.ts" --include="*.tsx" | head -30

# Check for any caching issues
grep -rn "staleTime\|cacheTime\|refetchInterval" src/ --include="*.ts" | head -20
```

### 6.2 Force Cache Refresh

If data is correct in DB but UI shows stale data:

```typescript
// In your React component or hook
queryClient.invalidateQueries({ queryKey: ['fund', fundId, 'aum'] });
queryClient.invalidateQueries({ queryKey: ['fund', fundId, 'yield-distributions'] });
queryClient.invalidateQueries({ queryKey: ['investor-positions'] });
```

---

## Part 7: Execution Checklist

```markdown
## Yield Distribution Pipeline Fix Checklist

### Diagnosis
- [ ] Run 1.1 - Found yield_distributions record
- [ ] Run 1.2 - Counted transactions by type
- [ ] Run 1.3 - Verified fee_allocations exist
- [ ] Run 1.4 - Verified ib_allocations exist
- [ ] Run 1.5 - Confirmed INDIGO Fees account exists
- [ ] Run 1.6 - Checked position values
- [ ] Run 1.7 - Checked AUM records
- [ ] Run 1.8 - Verified function signature

### Root Cause Identified
- [ ] YIELD transactions missing
- [ ] FEE transactions missing
- [ ] IB_CREDIT transactions missing
- [ ] Position updates missing
- [ ] AUM update missing
- [ ] INDIGO Fees account missing
- [ ] Function logic broken

### Fix Applied
- [ ] Created INDIGO Fees account (if missing)
- [ ] Fixed apply_daily_yield_to_fund_v3 function
- [ ] Voided broken distribution
- [ ] Re-applied yield distribution
- [ ] Verified all transactions created

### Validation
- [ ] 5.1 Conservation check passes
- [ ] 5.2 All transaction types present
- [ ] 5.3 Position-ledger reconciliation clean
- [ ] 5.4 AUM matches sum of positions
- [ ] 6.2 UI shows correct values

### Documentation
- [ ] Documented root cause
- [ ] Documented fix applied
- [ ] Updated audit trail
```

---

## Output Artifacts Required

After completing this protocol:

1. **docs/audit/RIPPLE_YIELD_NOV2025_DIAGNOSIS.md** — Root cause analysis
2. **supabase/migrations/[TS]_fix_yield_distribution_pipeline.sql** — Function fixes
3. **docs/audit/RIPPLE_YIELD_NOV2025_REMEDIATION.md** — Steps taken to fix
4. **docs/audit/RIPPLE_YIELD_NOV2025_VALIDATION.md** — Proof that all checks pass
