# Indigo Yield Platform - Expert Fix Plan

> **Date**: 2025-12-06
> **Status**: Ready for Implementation
> **Priority**: CRITICAL
> **Estimated Time**: 2.5 hours

---

## Executive Summary

Based on comprehensive diagnostic audit, there are **4 critical issues** preventing investors from rendering:

| Priority | Issue | Impact | Time |
|----------|-------|--------|------|
| **P0** | Import inside JSX (DailyRatesManagement.tsx:302) | Runtime crash | 5 min |
| **P0** | Schema mismatch: `asset_symbol` vs `asset` | Query failures | 30 min |
| **P1** | Empty investors table (0 records) | No data to display | 45 min |
| **P2** | TypeScript types referencing wrong columns | Type errors | 20 min |

### Root Cause Analysis

The **cascading failure** occurs because:
1. The `investors` table is **EMPTY** (0 records)
2. Even if investors existed, queries fail because code uses `funds.asset_symbol` but actual column is `funds.asset`
3. DailyRatesManagement has malformed code (import inside JSX)
4. Silent error swallowing hides these failures from users

### Database State (VERIFIED via Supabase API)

| Table | Records | Status |
|-------|---------|--------|
| investors | 0 | **EMPTY** |
| profiles | 0 (or RLS blocked) | **EMPTY** |
| investor_positions | 0 | **EMPTY** |
| funds | 5 | Has data (asset column, NOT asset_symbol) |

---

## Phase 1: Critical Fixes (IMMEDIATE)

### 1.1 Fix Import Inside JSX

**File**: `src/routes/admin/DailyRatesManagement.tsx`

**Issue**: Line 302 contains an import statement INSIDE the component JSX:
```tsx
<CardContent>
  <div className="space-y-4">
    import {CryptoIcon} from "@/components/CryptoIcons"; // MALFORMED!
```

**Fix**:
1. **DELETE** line 302 entirely
2. **ADD** import at top of file (after existing imports):
```typescript
import { CryptoIcon } from "@/components/CryptoIcons";
```

**Verification**:
```bash
npm run build  # Should complete without syntax errors
```

---

### 1.2 Fix Schema Mismatch: `asset_symbol` → `asset`

**Root Cause**: Database `funds` table has column `asset`, but code references `asset_symbol` in 20+ files.

#### Critical File #1: `src/services/investor/investorDataService.ts`

**Line 47-58** - Change:
```typescript
const { data: fundPositions, error } = await supabase
  .from("investor_positions")
  .select(`
    *,
    funds (
      name,
      code,
      asset_symbol,  // ❌ WRONG
      fund_class
    )
  `)
```

**To**:
```typescript
const { data: fundPositions, error } = await supabase
  .from("investor_positions")
  .select(`
    *,
    funds (
      name,
      code,
      asset,  // ✅ CORRECT
      fund_class
    )
  `)
```

**Line 72** - Change:
```typescript
asset: fp.funds?.asset_symbol || "Unknown",  // ❌ WRONG
```
**To**:
```typescript
asset: fp.funds?.asset || "Unknown",  // ✅ CORRECT
```

#### Critical File #2: `src/utils/statementCalculations.ts`

**Line 87** - Change:
```typescript
const { data: funds } = await supabase.from("funds").select("id, name, asset_symbol, code");
```
**To**:
```typescript
const { data: funds } = await supabase.from("funds").select("id, name, asset, code");
```

**Line 89** - Change:
```typescript
const fundMap = new Map(funds?.map((f) => [f.asset_symbol, f]));
```
**To**:
```typescript
const fundMap = new Map(funds?.map((f) => [f.asset, f]));
```

#### All Files Requiring `asset_symbol` → `asset` Updates

Run this command to find all occurrences:
```bash
grep -rn "asset_symbol" src/ --include="*.ts" --include="*.tsx"
```

**Files to update**:
- `src/services/investor/investorDataService.ts` (lines 55, 72)
- `src/utils/statementCalculations.ts` (lines 87, 89)
- `src/services/bulkOperationsService.ts` (multiple lines)
- `src/hooks/useNotifications.ts` (line 299)
- `src/services/investorServiceV2.ts` (lines 307-336)

---

## Phase 2: Data Population

### 2.1 Seed Investors (SQL Migration)

Execute in Supabase SQL Editor:

```sql
-- Create test investors
INSERT INTO public.investors (
  id, email, name, phone, entity_type, status,
  kyc_status, aml_status, accredited, onboarding_date, created_at
) VALUES
  (
    gen_random_uuid(),
    'john.doe@indigo.fund',
    'John Doe',
    '+1-555-0101',
    'individual',
    'active',
    'approved',
    'approved',
    true,
    NOW() - INTERVAL '90 days',
    NOW() - INTERVAL '90 days'
  ),
  (
    gen_random_uuid(),
    'jane.smith@indigo.fund',
    'Jane Smith',
    '+1-555-0102',
    'individual',
    'active',
    'approved',
    'approved',
    true,
    NOW() - INTERVAL '60 days',
    NOW() - INTERVAL '60 days'
  ),
  (
    gen_random_uuid(),
    'acme@corporation.com',
    'ACME Corporation',
    '+1-555-0200',
    'corporation',
    'active',
    'approved',
    'approved',
    true,
    NOW() - INTERVAL '120 days',
    NOW() - INTERVAL '120 days'
  )
ON CONFLICT (email) DO NOTHING;

-- Verify
SELECT id, name, email, status FROM investors;
```

### 2.2 Seed Investor Positions

```sql
-- Create positions for each investor
DO $$
DECLARE
  v_investor_id UUID;
  v_btc_fund_id UUID := '4563c5fb-5b8d-4193-a05c-29fca372832d';  -- BTCYF from funds table
  v_eth_fund_id UUID := 'f9266e2a-dbee-460b-b906-d22e098df568';  -- ETHYF from funds table
  v_usdt_fund_id UUID := 'ce4c8fb8-65fc-4b48-baa3-04ca86192de2'; -- USDTYF from funds table
BEGIN
  FOR v_investor_id IN SELECT id FROM public.investors LOOP
    -- BTC position
    INSERT INTO public.investor_positions (
      investor_id, fund_id, shares, current_value, cost_basis,
      unrealized_pnl, realized_pnl, fund_class, updated_at
    ) VALUES (
      v_investor_id, v_btc_fund_id,
      ROUND((RANDOM() * 5 + 0.5)::NUMERIC, 4),
      ROUND((RANDOM() * 200000 + 25000)::NUMERIC, 2),
      ROUND((RANDOM() * 150000 + 20000)::NUMERIC, 2),
      ROUND((RANDOM() * 50000)::NUMERIC, 2),
      0, 'BTC', NOW()
    ) ON CONFLICT DO NOTHING;

    -- ETH position
    INSERT INTO public.investor_positions (
      investor_id, fund_id, shares, current_value, cost_basis,
      unrealized_pnl, realized_pnl, fund_class, updated_at
    ) VALUES (
      v_investor_id, v_eth_fund_id,
      ROUND((RANDOM() * 50 + 5)::NUMERIC, 4),
      ROUND((RANDOM() * 100000 + 10000)::NUMERIC, 2),
      ROUND((RANDOM() * 80000 + 8000)::NUMERIC, 2),
      ROUND((RANDOM() * 20000)::NUMERIC, 2),
      0, 'ETH', NOW()
    ) ON CONFLICT DO NOTHING;

    -- USDT position
    INSERT INTO public.investor_positions (
      investor_id, fund_id, shares, current_value, cost_basis,
      unrealized_pnl, realized_pnl, fund_class, updated_at
    ) VALUES (
      v_investor_id, v_usdt_fund_id,
      ROUND((RANDOM() * 100000 + 10000)::NUMERIC, 2),
      ROUND((RANDOM() * 100000 + 10000)::NUMERIC, 2),
      ROUND((RANDOM() * 90000 + 9000)::NUMERIC, 2),
      ROUND((RANDOM() * 10000)::NUMERIC, 2),
      0, 'USDT', NOW()
    ) ON CONFLICT DO NOTHING;
  END LOOP;

  RAISE NOTICE 'Investor positions seeded successfully';
END $$;

-- Verify
SELECT
  i.name as investor,
  f.code as fund,
  ip.shares,
  ip.current_value
FROM investor_positions ip
JOIN investors i ON ip.investor_id = i.id
JOIN funds f ON ip.fund_id = f.id
ORDER BY i.name, f.code;
```

---

## Phase 3: Schema Alignment

### 3.1 Regenerate Supabase Types

```bash
cd /Users/mama/indigo-yield-platform-v01
supabase gen types typescript --linked > src/integrations/supabase/types.ts
```

**Alternative**: If regeneration fails, manually verify `src/integrations/supabase/types.ts` has:
```typescript
funds: {
  Row: {
    asset: string  // NOT asset_symbol
    // ... other columns
  }
}
```

---

## Phase 4: Security Hardening

### 4.1 Verify RLS Status

```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('investors', 'investor_positions', 'profiles', 'funds')
ORDER BY tablename;
```

### 4.2 Apply RLS Policies

```sql
-- Enable RLS on investors
ALTER TABLE public.investors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investors FORCE ROW LEVEL SECURITY;

-- Policy: Users see own record, admins see all
CREATE POLICY "investors_select_policy" ON public.investors
  FOR SELECT USING (
    profile_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Policy: Only admins can modify
CREATE POLICY "investors_admin_manage" ON public.investors
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Enable RLS on investor_positions
ALTER TABLE public.investor_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_positions FORCE ROW LEVEL SECURITY;

CREATE POLICY "positions_select_policy" ON public.investor_positions
  FOR SELECT USING (
    investor_id IN (SELECT id FROM investors WHERE profile_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );
```

---

## Phase 5: Testing & Deployment

### 5.1 Local Testing

```bash
# 1. Clean build
npm run build
# Expected: Build successful

# 2. TypeScript check
npm run type-check
# Expected: No errors

# 3. Lint
npm run lint
# Expected: No errors

# 4. Start dev server
npm run dev
# Navigate to: http://localhost:5173/admin/investors
# Expected: Investor list renders with seeded data
```

### 5.2 Database Verification

```sql
-- Count check
SELECT
  (SELECT COUNT(*) FROM investors) as investor_count,
  (SELECT COUNT(*) FROM investor_positions) as position_count,
  (SELECT COUNT(*) FROM funds) as fund_count;

-- Expected: investor_count >= 3, position_count >= 9, fund_count = 5
```

### 5.3 Deploy to Lovable

```bash
git add .
git commit -m "fix: Critical fixes for investor rendering

- Fix import inside JSX in DailyRatesManagement.tsx
- Update asset_symbol references to asset across codebase
- Seed investors and positions data
- Apply RLS security policies

Resolves: Investors not rendering issue"

git push origin main
```

---

## Implementation Checklist

| # | Task | File/Location | Time | Status |
|---|------|---------------|------|--------|
| 1 | Fix import inside JSX | DailyRatesManagement.tsx:302 | 5 min | ⬜ |
| 2 | Fix asset_symbol → asset | investorDataService.ts:55,72 | 5 min | ⬜ |
| 3 | Fix asset_symbol → asset | statementCalculations.ts:87,89 | 5 min | ⬜ |
| 4 | Fix remaining asset_symbol refs | Multiple files (~18) | 20 min | ⬜ |
| 5 | Seed investors | Supabase SQL Editor | 5 min | ⬜ |
| 6 | Seed investor_positions | Supabase SQL Editor | 5 min | ⬜ |
| 7 | Regenerate types | CLI command | 5 min | ⬜ |
| 8 | Apply RLS policies | Supabase SQL Editor | 15 min | ⬜ |
| 9 | Build verification | `npm run build` | 5 min | ⬜ |
| 10 | Local testing | Dev server | 20 min | ⬜ |
| 11 | Git commit & push | Git | 5 min | ⬜ |
| 12 | Verify Lovable deployment | Lovable dashboard | 15 min | ⬜ |

**Total: ~2.5 hours**

---

## Quick Reference: Key Files

```
src/routes/admin/DailyRatesManagement.tsx      # P0: Import inside JSX
src/services/investor/investorDataService.ts   # P0: asset_symbol query bug
src/utils/statementCalculations.ts             # P0: asset_symbol mapping
src/integrations/supabase/types.ts             # Schema reference (correct)
```

---

## Lovable.io Deployment Notes

Per [Lovable Supabase Integration](https://docs.lovable.dev/integrations/supabase):

1. **Auto-deploy**: Changes pushed to `main` branch auto-deploy
2. **Environment Variables**: Configured in Lovable dashboard
3. **Supabase Connection**: Already connected via project settings
4. **Edge Functions**: Deploy separately via Supabase CLI

---

*Document generated: 2025-12-06*
*Platform: Lovable.io + Supabase*
*Repository: indigo-yield-platform-v01*
