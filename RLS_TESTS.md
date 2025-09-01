# Row Level Security (RLS) Tests

## Overview
This document provides comprehensive tests to validate that RLS policies are working correctly to protect investor data.

## Test Setup

### Prerequisites
1. Apply migrations 001 and 002 to your Supabase database
2. Create test users:
   - Admin user: `admin@test.com`
   - LP user 1: `investor1@test.com`
   - LP user 2: `investor2@test.com`

### Test Data SQL
```sql
-- Create test users (run in Supabase Auth)
-- Note: Use Supabase Dashboard to create auth users, then run:

-- Set up profiles
INSERT INTO public.profiles (id, email, first_name, last_name, is_admin) VALUES
  ('admin-uuid', 'admin@test.com', 'Admin', 'User', true),
  ('investor1-uuid', 'investor1@test.com', 'John', 'Doe', false),
  ('investor2-uuid', 'investor2@test.com', 'Jane', 'Smith', false);

-- Create test positions
INSERT INTO public.positions (investor_id, asset_code, principal, total_earned, current_balance) VALUES
  ('investor1-uuid', 'BTC', 1.5, 0.05, 1.55),
  ('investor1-uuid', 'USDC', 10000, 200, 10200),
  ('investor2-uuid', 'ETH', 10, 0.5, 10.5);

-- Create test transactions
INSERT INTO public.transactions (investor_id, asset_code, amount, type, status) VALUES
  ('investor1-uuid', 'BTC', 1.5, 'DEPOSIT', 'confirmed'),
  ('investor1-uuid', 'BTC', 0.05, 'INTEREST', 'confirmed'),
  ('investor2-uuid', 'ETH', 10, 'DEPOSIT', 'confirmed');
```

## RLS Test Cases

### 1. Profiles Table Tests

#### Test 1.1: LP can only see their own profile
```sql
-- Run as investor1
SELECT * FROM public.profiles;
-- Expected: Only investor1's profile returned

-- Run as investor2
SELECT * FROM public.profiles;
-- Expected: Only investor2's profile returned
```

#### Test 1.2: Admin can see all profiles
```sql
-- Run as admin
SELECT * FROM public.profiles;
-- Expected: All profiles returned
```

#### Test 1.3: LP cannot update another user's profile
```sql
-- Run as investor1
UPDATE public.profiles SET first_name = 'Hacker' WHERE id = 'investor2-uuid';
-- Expected: ERROR - permission denied
```

### 2. Positions Table Tests

#### Test 2.1: LP can only see their own positions
```sql
-- Run as investor1
SELECT * FROM public.positions;
-- Expected: Only BTC and USDC positions for investor1

-- Run as investor2
SELECT * FROM public.positions;
-- Expected: Only ETH position for investor2
```

#### Test 2.2: LP cannot insert positions
```sql
-- Run as investor1
INSERT INTO public.positions (investor_id, asset_code, principal) 
VALUES ('investor1-uuid', 'SOL', 100);
-- Expected: ERROR - permission denied
```

#### Test 2.3: Admin can manage all positions
```sql
-- Run as admin
SELECT * FROM public.positions;
-- Expected: All positions returned

INSERT INTO public.positions (investor_id, asset_code, principal) 
VALUES ('investor1-uuid', 'SOL', 100);
-- Expected: Success

UPDATE public.positions SET current_balance = 110 
WHERE investor_id = 'investor1-uuid' AND asset_code = 'SOL';
-- Expected: Success
```

### 3. Transactions Table Tests

#### Test 3.1: LP can only see their own transactions
```sql
-- Run as investor1
SELECT * FROM public.transactions;
-- Expected: Only investor1's BTC transactions

-- Run as investor2
SELECT * FROM public.transactions;
-- Expected: Only investor2's ETH transaction
```

#### Test 3.2: LP cannot create transactions
```sql
-- Run as investor1
INSERT INTO public.transactions (investor_id, asset_code, amount, type) 
VALUES ('investor1-uuid', 'BTC', 0.1, 'INTEREST');
-- Expected: ERROR - permission denied
```

#### Test 3.3: LP cannot modify transactions
```sql
-- Run as investor1
UPDATE public.transactions SET amount = 1000 
WHERE investor_id = 'investor1-uuid';
-- Expected: ERROR - permission denied
```

### 4. Statements Table Tests

#### Test 4.1: LP can only see their own statements
```sql
-- First create test statements as admin
INSERT INTO public.statements (investor_id, period_year, period_month, asset_code, begin_balance, additions, redemptions, net_income, end_balance)
VALUES 
  ('investor1-uuid', 2025, 8, 'BTC', 1.0, 0.5, 0, 0.05, 1.55),
  ('investor2-uuid', 2025, 8, 'ETH', 5.0, 5.0, 0, 0.5, 10.5);

-- Run as investor1
SELECT * FROM public.statements;
-- Expected: Only investor1's statement

-- Run as investor2
SELECT * FROM public.statements;
-- Expected: Only investor2's statement
```

### 5. Cross-Table Security Tests

#### Test 5.1: Cannot access other investors' data via JOIN
```sql
-- Run as investor1
SELECT p.*, t.* 
FROM public.positions p
JOIN public.transactions t ON p.investor_id = t.investor_id
WHERE p.investor_id = 'investor2-uuid';
-- Expected: No results (RLS filters both tables)
```

#### Test 5.2: Admin function access
```sql
-- Run as investor1
SELECT public.is_admin();
-- Expected: false

-- Run as admin
SELECT public.is_admin();
-- Expected: true
```

### 6. Audit Log Tests

#### Test 6.1: Audit logs are created for sensitive operations
```sql
-- Run as admin
INSERT INTO public.transactions (investor_id, asset_code, amount, type, status)
VALUES ('investor1-uuid', 'BTC', 0.01, 'INTEREST', 'confirmed');

-- Check audit log as admin
SELECT * FROM public.audit_log WHERE entity = 'transactions' ORDER BY created_at DESC LIMIT 1;
-- Expected: Log entry with CREATE_TRANSACTION action
```

#### Test 6.2: LP cannot view audit logs
```sql
-- Run as investor1
SELECT * FROM public.audit_log;
-- Expected: No results (blocked by RLS)
```

## Automated Test Script

Create this as a Supabase Edge Function or run via your application:

```javascript
async function runRLSTests(supabase, userRole) {
  const results = [];
  
  // Test 1: Profile access
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('*');
  
  results.push({
    test: 'Profile Access',
    role: userRole,
    passed: userRole === 'admin' ? profiles.length > 1 : profiles.length === 1,
    details: `Found ${profiles?.length || 0} profiles`
  });
  
  // Test 2: Position access
  const { data: positions, error: posError } = await supabase
    .from('positions')
    .select('*');
  
  results.push({
    test: 'Position Access',
    role: userRole,
    passed: userRole === 'admin' ? positions.length >= 3 : positions.length < 3,
    details: `Found ${positions?.length || 0} positions`
  });
  
  // Test 3: Transaction insert (should fail for LP)
  const { error: txError } = await supabase
    .from('transactions')
    .insert({
      investor_id: 'test-id',
      asset_code: 'BTC',
      amount: 0.01,
      type: 'INTEREST'
    });
  
  results.push({
    test: 'Transaction Insert',
    role: userRole,
    passed: userRole === 'admin' ? !txError : !!txError,
    details: txError?.message || 'Success'
  });
  
  return results;
}
```

## Expected Results Summary

| Table | LP Read Own | LP Read Others | LP Write | Admin Read All | Admin Write |
|-------|------------|----------------|----------|----------------|-------------|
| profiles | ✅ | ❌ | ✅ (own) | ✅ | ✅ |
| positions | ✅ | ❌ | ❌ | ✅ | ✅ |
| transactions | ✅ | ❌ | ❌ | ✅ | ✅ |
| statements | ✅ | ❌ | ❌ | ✅ | ✅ |
| fees | ✅ | ❌ | ❌ | ✅ | ✅ |
| audit_log | ❌ | ❌ | ❌ | ✅ | ❌ |
| yield_rates | ✅ | ✅ | ❌ | ✅ | ✅ |

## Security Verification Checklist

- [ ] All tables have RLS enabled
- [ ] No table allows cross-investor data access
- [ ] Admin-only operations are properly restricted
- [ ] Audit logs capture all sensitive operations
- [ ] No user can delete audit logs
- [ ] Service role keys are never exposed to client
- [ ] All financial operations require admin role

## Compliance Notes

1. **Data Isolation**: Each investor can only see their own financial data
2. **Audit Trail**: All modifications to transactions are logged
3. **Admin Operations**: All privileged operations require admin role
4. **Immutability**: Audit logs cannot be modified or deleted
5. **Least Privilege**: Users have minimum necessary permissions

---

*Run these tests after each migration and before production deployment to ensure RLS policies are working correctly.*
