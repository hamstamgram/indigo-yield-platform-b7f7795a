# V2 Architecture Migration Guide

**Target Audience**: Developers working on Indigo Yield Platform
**Last Updated**: 2025-12-08

---

## Quick Reference

### ❌ OLD (Deprecated)
```typescript
// BROKEN - investors table dropped
const { data } = await supabase
  .from('investors')
  .select('*')
  .eq('email', userEmail);
```

### ✅ NEW (V2)
```typescript
// CORRECT - use profiles table
const { data } = await supabase
  .from('profiles')
  .select('*')
  .eq('email', userEmail);
```

---

## The One ID System

In V2 architecture, there is **ONE** identifier for each investor:

```
profiles.id = auth.user.id = investor_id
```

### What Changed?

| Old System | New System |
|------------|------------|
| `investors.id` | ❌ REMOVED |
| `investors.profile_id` → `profiles.id` | ❌ REMOVED |
| `profiles.id` | ✅ PRIMARY ID |
| All `investor_id` columns | ✅ Reference `profiles.id` |

---

## Common Migration Patterns

### 1. Fetching Investor Data

#### ❌ Before (Broken)
```typescript
const { data: investor } = await supabase
  .from('investors')
  .select('*, profile:profiles(*)')
  .eq('id', investorId)
  .single();
```

#### ✅ After (Correct)
```typescript
const { data: investor } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', investorId)
  .single();
```

### 2. Fetching Positions with Investor Details

#### ❌ Before (Broken)
```typescript
const { data } = await supabase
  .from('investor_positions')
  .select(`
    *,
    investors(name, email),
    funds(code, name)
  `);
```

#### ✅ After (Correct)
```typescript
const { data } = await supabase
  .from('investor_positions')
  .select(`
    *,
    profiles!investor_id(first_name, last_name, email),
    funds(code, name)
  `);
```

### 3. Creating Transactions

#### ❌ Before (Broken)
```typescript
// Lookup investor ID first
const { data: investor } = await supabase
  .from('investors')
  .select('id')
  .eq('profile_id', userId)
  .single();

await supabase.from('transactions_v2').insert({
  investor_id: investor.id, // ❌ Wrong ID
  // ...
});
```

#### ✅ After (Correct)
```typescript
// Use profile ID directly
await supabase.from('transactions_v2').insert({
  investor_id: userId, // ✅ profile.id = investor_id
  fund_id,
  amount,
  type: 'DEPOSIT',
});
```

### 4. RLS Policies in Supabase

#### ❌ Before (Broken)
```sql
CREATE POLICY "users_select_own"
ON transactions_v2 FOR SELECT
USING (
  investor_id IN (
    SELECT id FROM investors WHERE profile_id = auth.uid()
  )
);
```

#### ✅ After (Correct)
```sql
CREATE POLICY "users_select_own"
ON transactions_v2 FOR SELECT
USING (investor_id = auth.uid());
```

---

## Table Reference Guide

### Core V2 Tables

| Table | Primary Key | Investor Reference | Purpose |
|-------|-------------|-------------------|---------|
| `profiles` | `id` | Self (= auth.uid()) | User accounts |
| `funds` | `id` | N/A | Fund definitions |
| `investor_positions` | `(investor_id, fund_id)` | `investor_id → profiles.id` | Current balances |
| `transactions_v2` | `id` | `investor_id → profiles.id` | All transactions |
| `withdrawal_requests` | `id` | `investor_id → profiles.id` | Withdrawal workflow |
| `investor_fund_performance` | `id` | `investor_id → profiles.id` | Monthly performance |

### ⚠️ Renamed Columns

| Table | Old Column | New Column |
|-------|-----------|------------|
| `investor_fund_performance` | `user_id` | `investor_id` |

### ❌ Dropped Tables

- `investors` - Merged into `profiles`
- `investor_emails` - No longer needed

---

## TypeScript Type Updates

### Before
```typescript
interface Investor {
  id: string;
  name: string;
  email: string;
  profile_id: string; // ❌ Removed
}
```

### After
```typescript
interface Profile {
  id: string; // This is the investor_id
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  is_admin: boolean;
  fee_percentage: number;
  status?: 'active' | 'pending' | 'suspended' | 'closed' | 'archived';
  onboarding_date?: string;
  entity_type?: 'individual' | 'corporate' | 'trust' | 'foundation';
  kyc_status?: 'pending' | 'approved' | 'rejected' | 'expired';
}
```

### Usage
```typescript
// Old way (broken)
const investorId = investor.id;
const profileId = investor.profile_id;

// New way (correct)
const investorId = profile.id; // profile.id IS the investor_id
```

---

## Service Layer Examples

### InvestorService (V2)

```typescript
export class InvestorServiceV2 {
  // Get investor by ID
  async getInvestor(investorId: string): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', investorId)
      .single();

    if (error) throw error;
    return data;
  }

  // Get investor positions
  async getPositions(investorId: string): Promise<InvestorPosition[]> {
    const { data, error } = await supabase
      .from('investor_positions')
      .select(`
        *,
        funds(code, name, asset)
      `)
      .eq('investor_id', investorId);

    if (error) throw error;
    return data;
  }

  // Get transaction history
  async getTransactions(investorId: string): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions_v2')
      .select(`
        *,
        funds(code, name, asset)
      `)
      .eq('investor_id', investorId)
      .order('tx_date', { ascending: false });

    if (error) throw error;
    return data;
  }
}
```

---

## Common Pitfalls

### 1. Using Wrong Table
❌ `investors` table no longer exists
✅ Use `profiles` table

### 2. Double ID Lookup
❌ Don't lookup `investors.id` from `profiles.id`
✅ `profiles.id` **IS** the `investor_id`

### 3. Old Column Names
❌ `investor_fund_performance.user_id`
✅ `investor_fund_performance.investor_id`

### 4. Broken Joins
❌ `.select('*, investors(...))`
✅ `.select('*, profiles!investor_id(...)')`

### 5. RLS Subqueries
❌ `investor_id IN (SELECT id FROM investors ...)`
✅ `investor_id = auth.uid()`

---

## Testing Your Changes

### 1. Check for Broken Queries
```bash
# Search for references to investors table
grep -r "from('investors')" src/
grep -r "\.investors(" src/

# Should return 0 results (except comments)
```

### 2. Test RLS Policies
```typescript
// Login as regular user
const { data } = await supabase.auth.signInWithPassword({
  email: 'investor@example.com',
  password: 'test123'
});

// Try to fetch positions (should only see own)
const { data: positions } = await supabase
  .from('investor_positions')
  .select('*');

console.log('Can only see own positions:', positions);
```

### 3. Verify Data Integrity
```sql
-- No orphaned positions
SELECT COUNT(*)
FROM investor_positions ip
LEFT JOIN profiles p ON ip.investor_id = p.id
WHERE p.id IS NULL;
-- Should return 0

-- No orphaned transactions
SELECT COUNT(*)
FROM transactions_v2 t
LEFT JOIN profiles p ON t.investor_id = p.id
WHERE p.id IS NULL;
-- Should return 0
```

---

## Migration Checklist

When updating code to V2:

- [ ] Replace `from('investors')` with `from('profiles')`
- [ ] Update joins: `investors(...)` → `profiles!investor_id(...)`
- [ ] Remove `profile_id` lookups (use `id` directly)
- [ ] Update `user_id` → `investor_id` where applicable
- [ ] Test RLS policies work correctly
- [ ] Verify no broken FK constraints
- [ ] Check no orphaned data
- [ ] Update TypeScript types
- [ ] Update API documentation

---

## Need Help?

1. **Read Full Audit**: `DATABASE_AUDIT_REPORT.md`
2. **Run Health Check**: `scripts/verify-database-health.sql`
3. **Review Schema**: `CLAUDE.md` - V2 Architecture section

---

## Active Funds (Reference)

| Code | Name | Asset | Native Token Display |
|------|------|-------|---------------------|
| BTCYF | BTC Yield Fund | BTC | `44.89 BTC` |
| ETHYF | ETH Yield Fund | ETH | `717.83 ETH` |
| USDTYF | USDT Yield Fund | USDT | `3,428,235 USDT` |
| SOLYF | SOL Yield Fund | SOL | `3,635.82 SOL` |
| XRPYF | XRP Yield Fund | XRP | `229,294 XRP` |

**REMEMBER**: All values are in NATIVE TOKENS, never USD!

---

**Last Updated**: 2025-12-08 (Post One ID Unification)
