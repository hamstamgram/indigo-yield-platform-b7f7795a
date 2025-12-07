# Database Optimization Guide - Indigo Yield Platform

**Purpose**: Optimize PostgreSQL database performance for production scale

---

## Current Database Analysis

**Database**: PostgreSQL 15+ (Supabase)
**Tables**: 50+ production tables
**Rows**: ~10K-100K (estimated current scale)
**Target Scale**: 1M+ rows, 10K+ concurrent users

---

## 1. Index Optimization

### Current Indexes (Good Foundation)
```sql
-- Already implemented in migration 001
CREATE INDEX idx_positions_investor ON positions(investor_id);
CREATE INDEX idx_transactions_investor ON transactions(investor_id);
CREATE INDEX idx_transactions_date ON transactions(created_at DESC);
CREATE INDEX idx_statements_investor ON statements(investor_id);
CREATE INDEX idx_audit_log_actor ON audit_log(actor_user);
```

### Additional Indexes Needed

```sql
-- Composite indexes for common queries
CREATE INDEX CONCURRENTLY idx_positions_investor_asset
  ON positions(investor_id, asset_code)
  INCLUDE (current_balance, total_earned);

CREATE INDEX CONCURRENTLY idx_transactions_investor_type_date
  ON transactions(investor_id, type, created_at DESC)
  WHERE status = 'confirmed';

CREATE INDEX CONCURRENTLY idx_portfolio_history_user_date_asset
  ON portfolio_history(user_id, date DESC, asset_id)
  INCLUDE (balance, usd_value);

-- Partial indexes for active data
CREATE INDEX CONCURRENTLY idx_active_positions
  ON positions(investor_id)
  WHERE current_balance > 0;

CREATE INDEX CONCURRENTLY idx_pending_transactions
  ON transactions(investor_id, created_at DESC)
  WHERE status = 'pending';

-- Full-text search indexes
CREATE INDEX CONCURRENTLY idx_profiles_search
  ON profiles USING gin(to_tsvector('english',
    coalesce(first_name, '') || ' ' ||
    coalesce(last_name, '') || ' ' ||
    coalesce(email, '')
  ));

CREATE INDEX CONCURRENTLY idx_support_tickets_search
  ON support_tickets USING gin(to_tsvector('english',
    coalesce(subject, '') || ' ' ||
    coalesce(description, '')
  ));

-- Asset prices for quick lookups
CREATE INDEX CONCURRENTLY idx_asset_prices_latest
  ON asset_prices(asset_id, as_of DESC)
  INCLUDE (price_usd);

-- Yield rates for calculations
CREATE INDEX CONCURRENTLY idx_yield_rates_date_asset
  ON yield_rates(date DESC, asset_id)
  INCLUDE (daily_yield_percentage);
```

### Index Maintenance

```sql
-- Analyze index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC
LIMIT 20;

-- Find unused indexes
SELECT
  schemaname || '.' || tablename AS table,
  indexname AS index,
  pg_size_pretty(pg_relation_size(indexrelid::regclass)) AS size,
  idx_scan
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0
  AND indexrelid NOT IN (
    SELECT conindid FROM pg_constraint
  )
ORDER BY pg_relation_size(indexrelid::regclass) DESC;

-- Reindex periodically
REINDEX TABLE CONCURRENTLY positions;
REINDEX TABLE CONCURRENTLY transactions;
```

---

## 2. Query Optimization

### Slow Query Identification

```sql
-- Enable pg_stat_statements
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Find slow queries
SELECT
  mean_exec_time,
  calls,
  total_exec_time,
  query
FROM pg_stat_statements
WHERE mean_exec_time > 100  -- queries taking > 100ms
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Find queries with high I/O
SELECT
  query,
  calls,
  shared_blks_hit,
  shared_blks_read,
  (shared_blks_read::float / NULLIF(shared_blks_hit + shared_blks_read, 0)) * 100 AS cache_miss_ratio
FROM pg_stat_statements
WHERE shared_blks_read > 0
ORDER BY shared_blks_read DESC
LIMIT 20;
```

### Common Query Patterns - Optimized

**❌ BEFORE (N+1 Query Problem)**
```typescript
// BAD: Multiple queries
const investors = await supabase.from('profiles').select('id')
for (const investor of investors) {
  const positions = await supabase
    .from('positions')
    .select('*')
    .eq('investor_id', investor.id)
}
```

**✅ AFTER (Single Query with Join)**
```typescript
// GOOD: Single query with join
const { data } = await supabase
  .from('profiles')
  .select(`
    *,
    positions(*)
  `)
  .eq('is_admin', false)
```

**❌ BEFORE (Inefficient Aggregation)**
```sql
-- BAD: Scanning entire table
SELECT investor_id, SUM(current_balance) as total
FROM positions
GROUP BY investor_id;
```

**✅ AFTER (Materialized View)**
```sql
-- GOOD: Pre-computed results
CREATE MATERIALIZED VIEW investor_totals AS
SELECT
  investor_id,
  SUM(current_balance) as total_balance,
  COUNT(*) as position_count
FROM positions
WHERE current_balance > 0
GROUP BY investor_id;

CREATE UNIQUE INDEX ON investor_totals (investor_id);

-- Refresh periodically
REFRESH MATERIALIZED VIEW CONCURRENTLY investor_totals;
```

**❌ BEFORE (Unbounded Result Set)**
```sql
-- BAD: No limit, could return millions of rows
SELECT * FROM transactions
WHERE investor_id = '...'
ORDER BY created_at DESC;
```

**✅ AFTER (Paginated Query)**
```sql
-- GOOD: Pagination with cursor
SELECT *
FROM transactions
WHERE investor_id = '...'
  AND created_at < '2025-10-01'  -- cursor
ORDER BY created_at DESC
LIMIT 50;
```

---

## 3. Materialized Views

### Portfolio Summary View

```sql
CREATE MATERIALIZED VIEW mv_portfolio_summary AS
SELECT
  p.id as investor_id,
  p.email,
  p.first_name,
  p.last_name,
  COALESCE(SUM(pos.current_balance * ap.price_usd), 0) as total_value_usd,
  COALESCE(SUM(pos.total_earned * ap.price_usd), 0) as total_earnings_usd,
  COALESCE(SUM(pos.principal * ap.price_usd), 0) as total_principal_usd,
  COUNT(pos.id) as position_count,
  MAX(t.created_at) as last_transaction_date
FROM profiles p
LEFT JOIN positions pos ON pos.investor_id = p.id
LEFT JOIN assets_v2 a ON a.symbol = pos.asset_code
LEFT JOIN LATERAL (
  SELECT price_usd
  FROM asset_prices
  WHERE asset_id = a.asset_id
  ORDER BY as_of DESC
  LIMIT 1
) ap ON TRUE
LEFT JOIN transactions t ON t.investor_id = p.id
WHERE p.is_admin = FALSE
GROUP BY p.id, p.email, p.first_name, p.last_name;

CREATE UNIQUE INDEX ON mv_portfolio_summary (investor_id);
CREATE INDEX ON mv_portfolio_summary (total_value_usd DESC);
```

### Transaction Summary View

```sql
CREATE MATERIALIZED VIEW mv_transaction_summary AS
SELECT
  investor_id,
  asset_code,
  type,
  status,
  DATE_TRUNC('day', created_at) as transaction_date,
  COUNT(*) as transaction_count,
  SUM(amount) as total_amount
FROM transactions
GROUP BY investor_id, asset_code, type, status, DATE_TRUNC('day', created_at);

CREATE INDEX ON mv_transaction_summary (investor_id, transaction_date DESC);
CREATE INDEX ON mv_transaction_summary (asset_code, transaction_date DESC);
```

### Refresh Strategy

```sql
-- Option 1: Scheduled refresh (pg_cron)
SELECT cron.schedule(
  'refresh-portfolio-summary',
  '*/15 * * * *',  -- Every 15 minutes
  $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_portfolio_summary;
  $$
);

-- Option 2: Trigger-based refresh
CREATE OR REPLACE FUNCTION refresh_portfolio_summary()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_portfolio_summary;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_refresh_portfolio
AFTER INSERT OR UPDATE OR DELETE ON positions
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_portfolio_summary();
```

---

## 4. Connection Pooling

### Supabase Connection Settings

```typescript
// Use connection pooling for Edge Functions
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  {
    db: {
      schema: 'public'
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    global: {
      headers: {
        'x-connection-pool': 'true'
      }
    }
  }
)
```

### Database Configuration

```sql
-- Optimize connection settings
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET work_mem = '16MB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';

-- Connection lifecycle
ALTER SYSTEM SET idle_in_transaction_session_timeout = '60s';
ALTER SYSTEM SET statement_timeout = '30s';
```

---

## 5. Partitioning Strategy

### Partition Large Tables

```sql
-- Partition transactions by date (monthly)
CREATE TABLE transactions_partitioned (
  id UUID DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL,
  asset_code TEXT NOT NULL,
  amount NUMERIC(38,18) NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create partitions
CREATE TABLE transactions_2025_01 PARTITION OF transactions_partitioned
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE transactions_2025_02 PARTITION OF transactions_partitioned
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- Auto-create future partitions
CREATE OR REPLACE FUNCTION create_monthly_partition(target_date DATE)
RETURNS void AS $$
DECLARE
  partition_name TEXT;
  start_date DATE;
  end_date DATE;
BEGIN
  start_date := DATE_TRUNC('month', target_date);
  end_date := start_date + INTERVAL '1 month';
  partition_name := 'transactions_' || TO_CHAR(start_date, 'YYYY_MM');

  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF transactions_partitioned
     FOR VALUES FROM (%L) TO (%L)',
    partition_name, start_date, end_date
  );
END;
$$ LANGUAGE plpgsql;

-- Schedule partition creation
SELECT cron.schedule(
  'create-next-month-partition',
  '0 0 1 * *',  -- First day of each month
  $$
  SELECT create_monthly_partition(CURRENT_DATE + INTERVAL '1 month');
  $$
);
```

### Partition Portfolio History

```sql
CREATE TABLE portfolio_history_partitioned (
  id UUID DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  asset_id INTEGER NOT NULL,
  balance NUMERIC(38,18) NOT NULL,
  date DATE NOT NULL,
  PRIMARY KEY (id, date)
) PARTITION BY RANGE (date);

-- Create partitions for last 12 months and next 3 months
DO $$
DECLARE
  month_date DATE;
BEGIN
  FOR i IN -12..3 LOOP
    month_date := DATE_TRUNC('month', CURRENT_DATE + (i || ' months')::INTERVAL);
    PERFORM create_portfolio_history_partition(month_date);
  END LOOP;
END $$;
```

---

## 6. Caching Strategy

### Application-Level Caching

```typescript
// In-memory cache for Edge Functions
class SimpleCache {
  private cache = new Map<string, { data: any; expires: number }>()

  set(key: string, data: any, ttlMs: number) {
    this.cache.set(key, {
      data,
      expires: Date.now() + ttlMs
    })
  }

  get(key: string): any | null {
    const cached = this.cache.get(key)
    if (!cached) return null

    if (Date.now() > cached.expires) {
      this.cache.delete(key)
      return null
    }

    return cached.data
  }

  clear() {
    this.cache.clear()
  }
}

const cache = new SimpleCache()

// Usage in Edge Function
export async function getAssetPrices() {
  const cacheKey = 'asset_prices'
  const cached = cache.get(cacheKey)
  if (cached) return cached

  const prices = await fetchPricesFromDB()
  cache.set(cacheKey, prices, 5 * 60 * 1000) // 5 minutes
  return prices
}
```

### Redis Caching (External)

```typescript
// If using external Redis
import { connect } from 'https://deno.land/x/redis/mod.ts'

const redis = await connect({
  hostname: Deno.env.get('REDIS_HOST')!,
  port: 6379
})

// Cache portfolio data
export async function getCachedPortfolio(userId: string) {
  const cacheKey = `portfolio:${userId}`

  // Try cache first
  const cached = await redis.get(cacheKey)
  if (cached) {
    return JSON.parse(cached)
  }

  // Fetch from database
  const portfolio = await fetchPortfolioFromDB(userId)

  // Store in cache for 1 minute
  await redis.setex(cacheKey, 60, JSON.stringify(portfolio))

  return portfolio
}
```

---

## 7. Query Performance Testing

### EXPLAIN ANALYZE

```sql
-- Test query performance
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT
  p.*,
  pos.current_balance,
  ap.price_usd
FROM profiles p
JOIN positions pos ON pos.investor_id = p.id
LEFT JOIN LATERAL (
  SELECT price_usd
  FROM asset_prices
  WHERE asset_id = pos.asset_code
  ORDER BY as_of DESC
  LIMIT 1
) ap ON TRUE
WHERE p.is_admin = FALSE
ORDER BY pos.current_balance DESC
LIMIT 100;

-- Look for:
-- - Seq Scan (bad) vs Index Scan (good)
-- - High execution time
-- - Many buffer reads
-- - Sort operations
```

### Benchmarking Script

```typescript
// benchmark.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(url, key)

async function benchmarkQuery(name: string, query: () => Promise<any>) {
  const iterations = 100
  const times: number[] = []

  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    await query()
    const end = performance.now()
    times.push(end - start)
  }

  const avg = times.reduce((a, b) => a + b, 0) / times.length
  const min = Math.min(...times)
  const max = Math.max(...times)
  const p95 = times.sort()[Math.floor(times.length * 0.95)]

  console.log(`${name}:`)
  console.log(`  Avg: ${avg.toFixed(2)}ms`)
  console.log(`  Min: ${min.toFixed(2)}ms`)
  console.log(`  Max: ${max.toFixed(2)}ms`)
  console.log(`  P95: ${p95.toFixed(2)}ms`)
}

// Run benchmarks
await benchmarkQuery('Get Portfolio', async () => {
  await supabase
    .from('positions')
    .select('*')
    .eq('investor_id', 'test-user-id')
})

await benchmarkQuery('Get Transactions', async () => {
  await supabase
    .from('transactions')
    .select('*')
    .eq('investor_id', 'test-user-id')
    .order('created_at', { ascending: false })
    .limit(50)
})
```

---

## 8. Monitoring Queries

### Key Metrics to Track

```sql
-- Database size
SELECT
  pg_size_pretty(pg_database_size(current_database())) as database_size;

-- Table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) as size,
  pg_size_pretty(pg_relation_size(schemaname || '.' || tablename)) as table_size,
  pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename) -
                 pg_relation_size(schemaname || '.' || tablename)) as indexes_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC;

-- Active connections
SELECT
  datname,
  count(*) as connections,
  max(state) as max_state
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY datname;

-- Long-running queries
SELECT
  pid,
  now() - query_start as duration,
  state,
  query
FROM pg_stat_activity
WHERE state != 'idle'
  AND query_start < now() - interval '5 seconds'
ORDER BY duration DESC;

-- Cache hit ratio (should be > 99%)
SELECT
  sum(heap_blks_read) as heap_read,
  sum(heap_blks_hit) as heap_hit,
  sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) * 100 as cache_hit_ratio
FROM pg_statio_user_tables;

-- Index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC
LIMIT 20;
```

---

## 9. Vacuum and Maintenance

### Auto-vacuum Configuration

```sql
-- Tune autovacuum settings
ALTER TABLE transactions SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02
);

ALTER TABLE positions SET (
  autovacuum_vacuum_scale_factor = 0.1,
  autovacuum_analyze_scale_factor = 0.05
);

-- Manual vacuum when needed
VACUUM ANALYZE transactions;
VACUUM ANALYZE positions;

-- Full vacuum (requires downtime)
VACUUM FULL ANALYZE transactions;
```

### Scheduled Maintenance

```sql
-- Schedule maintenance tasks
SELECT cron.schedule(
  'daily-vacuum',
  '0 2 * * *',  -- 2 AM daily
  $$
  VACUUM ANALYZE;
  $$
);

SELECT cron.schedule(
  'weekly-reindex',
  '0 3 * * 0',  -- 3 AM Sunday
  $$
  REINDEX TABLE CONCURRENTLY transactions;
  REINDEX TABLE CONCURRENTLY positions;
  $$
);
```

---

## 10. Performance Checklist

### Pre-Production Checklist

- [ ] All indexes created and tested
- [ ] Slow queries identified and optimized
- [ ] Materialized views created and scheduled
- [ ] Partitioning strategy implemented for large tables
- [ ] Connection pooling configured
- [ ] Caching strategy implemented
- [ ] Query benchmarks completed (target: p95 < 100ms)
- [ ] EXPLAIN ANALYZE run on critical queries
- [ ] Monitoring queries set up
- [ ] Auto-vacuum tuned
- [ ] Backup strategy tested

### Ongoing Monitoring

```sql
-- Create monitoring view
CREATE VIEW db_health AS
SELECT
  'Database Size' as metric,
  pg_size_pretty(pg_database_size(current_database())) as value
UNION ALL
SELECT
  'Active Connections',
  count(*)::text
FROM pg_stat_activity
WHERE state = 'active'
UNION ALL
SELECT
  'Cache Hit Ratio',
  round((sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) * 100)::numeric, 2)::text || '%'
FROM pg_statio_user_tables
UNION ALL
SELECT
  'Long Running Queries',
  count(*)::text
FROM pg_stat_activity
WHERE state != 'idle'
  AND query_start < now() - interval '10 seconds';

-- Query it
SELECT * FROM db_health;
```

---

## Performance Targets

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| Query Response Time (p95) | < 100ms | > 500ms |
| API Endpoint Latency (p95) | < 200ms | > 1000ms |
| Database Cache Hit Ratio | > 99% | < 95% |
| Connection Pool Utilization | < 80% | > 95% |
| Index Usage Ratio | > 90% | < 70% |
| Disk I/O Wait | < 10% | > 30% |

---

**Document Version**: 1.0
**Last Updated**: October 6, 2025
