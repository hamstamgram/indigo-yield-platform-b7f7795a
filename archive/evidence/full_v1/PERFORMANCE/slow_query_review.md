# Slow Query Review

## Generated: 2024-12-22

## Overview

This document reviews potentially slow queries and provides optimization recommendations.

## Query Analysis

### 1. Investor List with Balances

**Query Pattern:**
```sql
SELECT p.*, 
  (SELECT SUM(amount) FROM transactions_v2 WHERE user_id = p.id) as total_balance
FROM profiles p
WHERE EXISTS (SELECT 1 FROM user_roles WHERE user_id = p.id AND role = 'investor');
```

**Issue:** Correlated subquery for each investor
**Impact:** O(n) subqueries for n investors

**Optimization:**
```sql
SELECT p.*, COALESCE(tb.total_balance, 0) as total_balance
FROM profiles p
JOIN user_roles ur ON ur.user_id = p.id AND ur.role = 'investor'
LEFT JOIN (
  SELECT user_id, SUM(amount) as total_balance
  FROM transactions_v2
  GROUP BY user_id
) tb ON tb.user_id = p.id;
```

**Status:** ✅ Optimized in codebase

### 2. Performance Records Fetch

**Query Pattern:**
```sql
SELECT * FROM investor_fund_performance
WHERE investor_id = $1
ORDER BY period_id DESC;
```

**Required Indexes:**
```sql
CREATE INDEX idx_ifp_investor_period ON investor_fund_performance(investor_id, period_id DESC);
```

**Status:** ✅ Index exists

### 3. Transaction History

**Query Pattern:**
```sql
SELECT t.*, p.full_name, f.name as fund_name
FROM transactions_v2 t
JOIN profiles p ON p.id = t.user_id
JOIN funds f ON f.id = t.fund_id
ORDER BY t.created_at DESC
LIMIT 100;
```

**Required Indexes:**
```sql
CREATE INDEX idx_transactions_created ON transactions_v2(created_at DESC);
```

**Status:** ✅ Index exists

### 4. Yield Distribution Preview

**Query Pattern:**
```sql
SELECT p.*, 
  SUM(t.amount) as current_balance,
  ifs.fee_pct
FROM profiles p
JOIN user_roles ur ON ur.user_id = p.id AND ur.role = 'investor'
LEFT JOIN transactions_v2 t ON t.user_id = p.id AND t.fund_id = $fund_id
LEFT JOIN investor_fee_schedule ifs ON ifs.investor_id = p.id
WHERE t.effective_date <= $period_end
GROUP BY p.id, ifs.fee_pct;
```

**Optimization:** Uses aggregate with proper indexes

**Status:** ✅ Acceptable performance

### 5. Report Generation Batch

**Query Pattern:**
```sql
SELECT ifp.*, p.full_name, p.email
FROM investor_fund_performance ifp
JOIN profiles p ON p.id = ifp.investor_id
WHERE ifp.period_id = $period_id
  AND ifp.purpose = 'reporting';
```

**Required Indexes:**
```sql
CREATE INDEX idx_ifp_period_purpose ON investor_fund_performance(period_id, purpose);
```

**Status:** ✅ Index exists

## Pagination Implementation

All list queries implement cursor-based or offset pagination:

```typescript
// Cursor-based pagination (preferred)
const { data } = await supabase
  .from('transactions_v2')
  .select('*')
  .order('created_at', { ascending: false })
  .lt('created_at', cursor)
  .limit(50);

// Offset pagination (for admin tables with sorting)
const { data, count } = await supabase
  .from('profiles')
  .select('*', { count: 'exact' })
  .range(offset, offset + limit - 1);
```

## Query Limits

| Table | Default Limit | Max Limit |
|-------|---------------|-----------|
| transactions_v2 | 50 | 500 |
| profiles (investors) | 25 | 100 |
| investor_fund_performance | 100 | 500 |
| generated_statements | 25 | 100 |
| audit_log | 50 | 200 |

## Slow Query Log Review

```sql
-- Check for slow queries in Postgres logs
SELECT 
  query,
  calls,
  mean_time,
  total_time
FROM pg_stat_statements
WHERE mean_time > 100  -- > 100ms average
ORDER BY total_time DESC
LIMIT 20;
```

**Current Status:** No queries consistently exceeding 100ms threshold

## Recommendations Applied

1. ✅ Batch balance calculations instead of per-row subqueries
2. ✅ Composite indexes on frequently filtered columns
3. ✅ Pagination on all list endpoints
4. ✅ Server-side ordering with indexed columns
5. ✅ Materialized views for complex aggregates (daily_nav, fund_period_snapshot)

## Result: ✅ PASS

No unbounded queries detected. All list pages have pagination and indexed ordering.
