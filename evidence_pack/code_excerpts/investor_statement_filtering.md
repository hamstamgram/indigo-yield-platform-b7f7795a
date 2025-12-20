# Investor Statement Purpose Filtering - Code Excerpts

## Overview

Investors can ONLY see `purpose = 'reporting'` data. Transaction-purpose data is hidden from investors.

---

## 1. Investor Statements Page

**File:** `src/routes/investor/statements/StatementsPage.tsx`  
**Lines:** 55-65

```typescript
// Fetch performance data for investor - ONLY reporting purpose
const { data: performanceData, error: perfError } = await supabase
  .from("investor_fund_performance")
  .select(`
    id,
    fund_name,
    period_id,
    purpose,
    mtd_beginning_balance,
    mtd_additions,
    mtd_redemptions,
    mtd_ending_balance,
    mtd_net_income,
    mtd_rate_of_return,
    ...
  `)
  .eq("investor_id", user.id)
  .eq("period_id", selectedPeriodId)
  .or("purpose.is.null,purpose.eq.reporting");  // ← STRICT FILTER
```

**Note:** The `.or("purpose.is.null,purpose.eq.reporting")` filter ensures:
- Only `purpose = 'reporting'` records are shown
- Legacy records with `NULL` purpose are included (backward compatibility)
- `purpose = 'transaction'` records are NEVER visible to investors

---

## 2. Generate Fund Performance Edge Function

**File:** `supabase/functions/generate-fund-performance/index.ts`  
**Lines:** 180-195

```typescript
// Query investor performance data - REPORTING PURPOSE ONLY
const { data: performanceData, error: perfError } = await supabase
  .from("investor_fund_performance")
  .select("*")
  .eq("investor_id", investorId)
  .eq("period_id", periodId)
  .or("purpose.is.null,purpose.eq.reporting")  // ← STRICT FILTER
  .order("fund_name");

if (perfError) {
  throw new Error(`Failed to fetch performance data: ${perfError.message}`);
}

// Only include reporting data in statements
const reportingData = performanceData?.filter(
  (p) => !p.purpose || p.purpose === "reporting"
);
```

---

## 3. Generate Monthly Statements Edge Function

**File:** `supabase/functions/generate-monthly-statements/index.ts`  
**Lines:** ~150-165

```typescript
// Fetch only REPORTING purpose data for statement generation
const performanceQuery = supabase
  .from("investor_fund_performance")
  .select(`
    id, investor_id, fund_name, period_id, purpose,
    mtd_beginning_balance, mtd_additions, mtd_redemptions,
    mtd_ending_balance, mtd_net_income, mtd_rate_of_return,
    ytd_beginning_balance, ytd_additions, ytd_redemptions,
    ytd_ending_balance, ytd_net_income, ytd_rate_of_return,
    itd_beginning_balance, itd_additions, itd_redemptions,
    itd_ending_balance, itd_net_income, itd_rate_of_return
  `)
  .eq("period_id", periodId)
  .or("purpose.is.null,purpose.eq.reporting");  // ← STRICT FILTER
```

---

## 4. RLS Policy Enforcement

**Table:** `investor_fund_performance`  
**Policy:** `Investors view own reporting data`

```sql
CREATE POLICY "Investors view own reporting data" 
ON investor_fund_performance 
FOR SELECT 
USING (
  investor_id = auth.uid() 
  AND (purpose IS NULL OR purpose = 'reporting')
);
```

This policy is enforced at the DATABASE level, so even if frontend code is bypassed, investors cannot access transaction-purpose data.

---

## 5. Purpose Enum Definition

**File:** `src/integrations/supabase/types.ts`  

```typescript
export type aum_purpose = "reporting" | "transaction";
```

- `reporting`: Month-end official data for investor statements
- `transaction`: Mid-month/real-time data for admin operations only

---

## Verification Steps

1. Login as an investor
2. Navigate to /statements
3. Select any period
4. Verify only reporting data is shown (no transaction-purpose rows)
5. Check network tab - queries include `purpose.eq.reporting` filter

## Summary

| Layer | Purpose Filter | Status |
|-------|---------------|--------|
| Frontend Query | `.or("purpose.is.null,purpose.eq.reporting")` | ✓ |
| Edge Function | `.or("purpose.is.null,purpose.eq.reporting")` | ✓ |
| RLS Policy | `purpose IS NULL OR purpose = 'reporting'` | ✓ |
| Type Safety | `aum_purpose` enum | ✓ |
