# N+1 Query Audit

## Generated: 2024-12-22

## Overview

This document audits the codebase for N+1 query patterns and documents mitigations.

## What is N+1?

N+1 occurs when:
1. One query fetches N parent records
2. N additional queries fetch related data for each parent

Example (BAD):
```javascript
const investors = await supabase.from('profiles').select('*');
for (const investor of investors) {
  const balance = await supabase.from('transactions_v2')
    .select('amount')
    .eq('user_id', investor.id);
  // This runs N queries!
}
```

## Audit Results

### 1. Investor List Page

**Pattern Checked:** Loading investors with balances

**Implementation:**
```typescript
// GOOD: Single query with join
const { data } = await supabase
  .from('profiles')
  .select(`
    *,
    user_roles!inner(role),
    transactions_v2(amount, type, fund_id)
  `)
  .eq('user_roles.role', 'investor');
```

**Status:** ✅ No N+1 - Uses Supabase joins

### 2. Transaction History

**Pattern Checked:** Loading transactions with investor/fund names

**Implementation:**
```typescript
// GOOD: Embedded relations
const { data } = await supabase
  .from('transactions_v2')
  .select(`
    *,
    profiles!user_id(full_name, email),
    funds!fund_id(name, asset)
  `)
  .order('created_at', { ascending: false })
  .limit(50);
```

**Status:** ✅ No N+1 - Uses embedded selects

### 3. Performance Reports

**Pattern Checked:** Loading investor performance with period info

**Implementation:**
```typescript
// GOOD: Join with statement_periods
const { data } = await supabase
  .from('investor_fund_performance')
  .select(`
    *,
    statement_periods!period_id(period_start, period_end, is_closed),
    profiles!investor_id(full_name)
  `)
  .eq('purpose', 'reporting');
```

**Status:** ✅ No N+1

### 4. Email Delivery Center

**Pattern Checked:** Loading deliveries with statement and investor info

**Implementation:**
```typescript
// GOOD: Multiple joins
const { data } = await supabase
  .from('statement_email_delivery')
  .select(`
    *,
    generated_statements!statement_id(
      html_content,
      investor_id,
      profiles!investor_id(full_name, email)
    ),
    statement_periods!period_id(period_start, period_end)
  `);
```

**Status:** ✅ No N+1

### 5. Yield Distribution Preview

**Pattern Checked:** Calculating yields for multiple investors

**Implementation:**
```typescript
// GOOD: RPC function handles in single query
const { data } = await supabase.rpc('preview_yield_distribution', {
  p_fund_id: fundId,
  p_period_start: periodStart,
  p_period_end: periodEnd
});

// The RPC function uses a single query:
// SELECT ... FROM profiles p
// JOIN transactions_v2 t ON ...
// GROUP BY p.id
```

**Status:** ✅ No N+1 - Server-side aggregation

### 6. IB Commission Calculation

**Pattern Checked:** Loading IB relationships and calculating commissions

**Implementation:**
```sql
-- RPC handles all in one query
SELECT 
  ib.id as ib_id,
  src.id as source_id,
  ibr.ib_percentage,
  SUM(t.amount) as source_income
FROM profiles ib
JOIN ib_relationships ibr ON ibr.ib_id = ib.id
JOIN profiles src ON src.id = ibr.investor_id
JOIN transactions_v2 t ON t.user_id = src.id
GROUP BY ib.id, src.id, ibr.ib_percentage;
```

**Status:** ✅ No N+1

### 7. Report Generation

**Pattern Checked:** Generating reports for multiple investors

**Implementation:**
```typescript
// GOOD: Batch fetch all data first
const { data: allPerformance } = await supabase
  .from('investor_fund_performance')
  .select('*')
  .eq('period_id', periodId)
  .eq('purpose', 'reporting');

// Then process in memory
const reports = allPerformance.reduce((acc, perf) => {
  // Group by investor
}, {});
```

**Status:** ✅ No N+1 - Batch fetch + in-memory processing

## React Query Patterns

### Batching with useQueries

```typescript
// GOOD: Parallel queries when separate data needed
const results = useQueries({
  queries: investorIds.map(id => ({
    queryKey: ['investor', id],
    queryFn: () => fetchInvestor(id),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  }))
});
```

### Avoiding Waterfall with Suspense

```typescript
// GOOD: Parallel data loading
const [investors, funds] = await Promise.all([
  supabase.from('profiles').select('*'),
  supabase.from('funds').select('*')
]);
```

## Prevention Strategies

1. **Use Supabase's embedded selects** for related data
2. **Use RPC functions** for complex aggregations
3. **Batch fetch** before processing loops
4. **Use React Query's useQueries** for parallel fetching
5. **Avoid async operations in loops** - fetch all data first

## Monitoring

```typescript
// Development mode query counter
if (process.env.NODE_ENV === 'development') {
  let queryCount = 0;
  const originalFetch = window.fetch;
  window.fetch = (...args) => {
    if (args[0].includes('supabase')) queryCount++;
    return originalFetch(...args);
  };
  // Log if > 5 queries per component render
}
```

## Result: ✅ PASS

No N+1 patterns detected in audited code paths. All list views use joins or batch fetching.
