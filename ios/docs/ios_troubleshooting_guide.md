# iOS App Portfolio Data Loading Issue - Troubleshooting Guide

## Problem Summary
- **Issue**: iOS app successfully authenticates users but fails to load portfolio data
- **Error**: "Unable to load portfolio"
- **Affected Users**: Both admin (hammadou@Indigo.fund) and investor (h.monoja@protonmail.com)
- **Environment**: Remote Supabase instance (https://nkfimvovosdehmyyjubn.supabase.co)

## Root Cause Analysis

### 1. Most Likely Causes (in order of probability):

#### A. Row Level Security (RLS) Policy Issues
- **Symptoms**: Authentication works but data queries fail
- **Cause**: Overly restrictive RLS policies blocking legitimate access
- **Fix**: Apply the `fix_rls_policies.sql` script

#### B. Missing User Profile Records
- **Symptoms**: Portfolio queries fail because user-to-investor mapping is missing
- **Cause**: `profiles` table doesn't have records linking `auth.users` to investor data
- **Fix**: Ensure profiles are created for authenticated users

#### C. Database Permission Issues
- **Symptoms**: Queries fail with permission errors
- **Cause**: `authenticated` role lacks necessary table permissions
- **Fix**: Grant proper SELECT permissions to authenticated role

#### D. Table Structure Mismatch
- **Symptoms**: Decode errors in iOS app
- **Cause**: Database schema doesn't match iOS model expectations
- **Fix**: Align database columns with iOS Portfolio model

### 2. iOS App Query Analysis

The iOS app (`PortfolioServiceWrapper.swift`) makes these critical queries:

```sql
-- Main portfolio query (line 37-42)
SELECT * FROM portfolios WHERE investor_id = :userId

-- Positions query (line 51-55)
SELECT * FROM positions WHERE portfolio_id = :portfolioId

-- Performance data query (line 98-105)
SELECT * FROM performance_history
WHERE investor_id = :userId
AND date >= :startDate AND date <= :endDate
```

### 3. Expected Database Schema

Based on iOS models, tables should have these columns:

#### `portfolios` table:
```sql
id uuid PRIMARY KEY
investor_id uuid (references auth.users.id)
total_value numeric
total_cost numeric
total_gain numeric
total_gain_percent numeric
day_change numeric
day_change_percent numeric
week_change numeric
week_change_percent numeric
month_change numeric
month_change_percent numeric
year_change numeric
year_change_percent numeric
last_updated timestamp
```

#### `positions` table:
```sql
id uuid PRIMARY KEY
portfolio_id uuid (references portfolios.id)
asset_symbol text
asset_name text
quantity numeric
average_cost numeric
current_price numeric
market_value numeric
total_gain numeric
total_gain_percent numeric
day_change numeric
day_change_percent numeric
allocation numeric
```

## Step-by-Step Troubleshooting

### Step 1: Run Database Diagnosis
```sql
-- Execute the diagnosis script
\i db_diagnosis.sql
```

### Step 2: Check Critical Issues
1. **Verify table existence**: Ensure `portfolios`, `positions`, `profiles` tables exist
2. **Check RLS status**: Confirm RLS is enabled but not overly restrictive
3. **Validate user data**: Ensure test users have corresponding profiles

### Step 3: Apply Fixes
```sql
-- Apply the comprehensive fix
\i fix_rls_policies.sql
```

### Step 4: Test Access
```sql
-- Run access tests
\i test_portfolio_access.sql
```

### Step 5: iOS App Configuration Check

Verify the iOS app configuration in `SupabaseConfig.swift`:
- URL: `https://nkfimvovosdehmyyjubn.supabase.co`
- Anon Key: Valid JWT token
- Authentication: Working (confirmed)

## Common Fix Patterns

### Fix 1: RLS Policy Update
```sql
-- Allow users to read their own portfolios
CREATE POLICY "portfolios_select_policy" ON portfolios
FOR SELECT USING (auth.uid() = investor_id);
```

### Fix 2: Missing Profile Creation
```sql
-- Ensure profiles exist for authenticated users
INSERT INTO profiles (user_id, email, role)
SELECT id, email, 'investor' FROM auth.users
WHERE NOT EXISTS (
    SELECT 1 FROM profiles WHERE user_id = auth.users.id
);
```

### Fix 3: Grant Table Permissions
```sql
-- Grant necessary permissions
GRANT SELECT ON portfolios TO authenticated;
GRANT SELECT ON positions TO authenticated;
GRANT SELECT ON performance_history TO authenticated;
```

## Testing Commands

### Test with Supabase CLI:
```bash
# Test portfolio query directly
supabase db reset --linked
psql -c "SELECT * FROM portfolios WHERE investor_id = (SELECT id FROM auth.users WHERE email = 'h.monoja@protonmail.com');"
```

### Test in Supabase Dashboard:
1. Go to SQL Editor
2. Run test queries with user context
3. Check RLS policies in Authentication > Policies

## Expected Results After Fix

### 1. Successful Portfolio Query:
```json
{
  "id": "uuid",
  "investor_id": "uuid",
  "total_value": 100000.00,
  "total_gain_percent": 5.26,
  "day_change": 150.00,
  "last_updated": "2024-01-01T12:00:00Z"
}
```

### 2. Successful Positions Query:
```json
[
  {
    "id": "uuid",
    "portfolio_id": "uuid",
    "asset_symbol": "USDC",
    "asset_name": "USD Coin",
    "market_value": 100000.00,
    "allocation": 100.0
  }
]
```

## Prevention Measures

1. **Automated Tests**: Add RLS policy tests to CI/CD
2. **Migration Validation**: Verify RLS policies in migrations
3. **User Onboarding**: Ensure profiles are created during signup
4. **Monitoring**: Add alerts for failed data queries

## Emergency Rollback

If fixes cause issues:
```sql
-- Temporarily disable RLS (NOT for production)
ALTER TABLE portfolios DISABLE ROW LEVEL SECURITY;
ALTER TABLE positions DISABLE ROW LEVEL SECURITY;
```

## Contact Points

- Database Admin: Check Supabase project settings
- iOS Developer: Verify error handling and retry logic
- Backend Team: Ensure user creation triggers profile creation