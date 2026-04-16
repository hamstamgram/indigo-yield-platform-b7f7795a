# Sprint Plan: Financial Integrity + Security Hardening

## Status: READY FOR EXECUTION

---

## Phase 1: Financial Precision Fix (2 days)

### Step 1.1: Add `toDisplayString()` helper to `src/utils/financial.ts`

Add before `formatFinancialDisplay()` (around line 412):

```ts
export function toDisplayString(
  value: string | number | Decimal | null | undefined,
  maxDecimals: number = 18
): string {
  const dec = parseFinancial(value);
  const fixed = dec.toFixed(maxDecimals);
  return fixed.replace(/\.?0+$/, "") || "0";
}
```

This preserves full precision from DB and removes trailing zeros. Use instead of `.toNumber()` for all values passed to UI components.

### Step 1.2: Update InvestorPositionRow interface

In `src/features/investor/portfolio/services/investorPositionService.ts`, the interface at ~line 24 has:
```ts
export interface InvestorPositionRow {
  fund_id: string;
  fund_name: string;
  asset: string;
  fund_class: string;
  shares: number;          // → string
  cost_basis: number;      // → string
  current_value: number;   // → string
  total_earnings: string;  // already string — fix computation
  allocationPercentage: number; // → string
  investor_count: number;  // ok, this is a count not money
  fund_yield_pct: number;  // → string
}
```

Change `shares`, `cost_basis`, `current_value`, `allocationPercentage`, `fund_yield_pct` from `number` to `string`.

Also update `InvestorFundPosition` interface (~line 160):
```ts
shares: number;       // → string
currentValue: number; // → string
costBasis: number;    // → string
unrealizedPnl: number; // → string
realizedPnl: number;  // → string
ownershipPct: number; // → string
```

### Step 1.3: Replace `.toNumber()` in investorPositionService.ts

Replace all `parseFinancial(x).toNumber()` with `parseFinancial(x).toString()` in the mapping functions (lines 112-118, 166, 174-178, 185, 498-518).

For `allocationPercentage`, change from:
```ts
allocationPercentage: totalValue > 0 ? parseFinancial(fp.current_value || 0).div(totalValue).times(100).toNumber() : 0,
```
to:
```ts
allocationPercentage: totalValue.gt(0) ? parseFinancial(fp.current_value || 0).div(totalValue).times(100).toString() : "0",
```

Note: `totalValue` should be a Decimal, not a number. Change the computation at line 165 to keep it as Decimal.

### Step 1.4: Replace `.toNumber()` in other service files

Same pattern across these files:
- `src/features/investor/portfolio/services/investorPortfolioService.ts` (lines 66-67, 100-101)
- `src/features/admin/dashboard/services/dashboardMetricsService.ts` (lines 195-198, 226, 229)
- `src/features/admin/yields/services/yields/yieldHistoryService.ts` (lines 94, 184, 220-222)
- `src/features/admin/reports/components/AdminStatementGenerator.tsx` (lines 91-103)
- `src/features/admin/reports/hooks/useAdminStatementsPage.ts` (lines 84-85)
- `src/features/admin/reports/components/StatementManager.tsx` (lines 112, 137)
- `src/features/admin/reports/lib/statementGenerator.ts` (lines 465-466)
- `src/features/admin/ib/hooks/useIBManagementPage.ts` (lines 75, 85)
- `src/features/admin/ib/services/ibReferralsService.ts` (line 48)
- `src/features/admin/funds/services/fundService.ts` (lines 156, 185, 214)
- `src/features/shared/services/feeScheduleService.ts` (lines 34, 194)
- `src/features/shared/services/transactionsV2Service.ts` (lines 204-206)
- `src/utils/statementCalculations.ts` (lines 327-369)
- `src/features/admin/system/services/dataIntegrityService.ts` (lines 350-364)

### Step 1.5: Fix `.toNumber().toFixed(N)` → `parseFinancial(x).toFixed(N)`

In `csv-export.ts` (lines 216-297), replace patterns like:
```ts
parseFinancial(v).toNumber().toFixed(4)
```
with:
```ts
parseFinancial(v).toFixed(4)
```

This avoids the float intermediate step entirely.

### Step 1.6: Fix `Number()` on financial data

In `YieldDistributionsPage.tsx` (lines 821, 972, 1112, 1124) and `YieldsTable.tsx` (lines 294, 424, 431), replace:
```ts
Number(distribution.total_fees || 0) > 0
```
with:
```ts
parseFinancial(distribution.total_fees || 0).gt(0)
```

In `yieldManagementService.ts` (lines 121-122), replace:
```ts
Number(result.voided_count ?? 0)
```
This is fine — voided_count is a count, not money. Leave as-is.

In `yieldApplyService.ts` (lines 96, 193), same — investor_count is a count. Leave.

---

## Phase 2: Stale Closure + Dead Code (0.5 day)

### Step 2.1: Fix useAssetData stale closure

File: `src/hooks/data/shared/useAssetData.ts`

Change line 111 from:
```ts
}, [isAdmin]);
```
to:
```ts
}, []);
```

The effect should run once on mount. The `isAdmin` state is SET inside the effect, not used as a condition to trigger it. Having it as a dep creates an infinite re-render loop potential (setIsAdmin triggers re-run, which sets isAdmin again).

### Step 2.2: Create get_platform_stats RPC + wire it

**DB Migration:**
```sql
CREATE OR REPLACE FUNCTION public.get_platform_stats()
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
STABLE
AS $$
  SELECT jsonb_build_object(
    'totalAum', COALESCE(SUM(ip.current_value), 0),
    'investorCount', COUNT(DISTINCT CASE WHEN p.account_type = 'investor' THEN ip.investor_id END),
    'adminCount', COUNT(DISTINCT CASE WHEN p.is_admin = true THEN ip.investor_id END)
  )
  FROM investor_positions ip
  JOIN profiles p ON p.id = ip.investor_id
  WHERE ip.is_active = true;
$$;
```

**Frontend fix** in `investorPositionService.ts:253-263`:
```ts
export async function getPlatformStats(): Promise<{
  totalAum: number;
  investorCount: number;
  adminCount: number;
}> {
  const { data, error } = await supabase.rpc("get_platform_stats");
  if (error) {
    logError("getPlatformStats", error);
    return { totalAum: 0, investorCount: 0, adminCount: 0 };
  }
  return {
    totalAum: Number(data?.totalAum ?? 0),
    investorCount: Number(data?.investorCount ?? 0),
    adminCount: Number(data?.adminCount ?? 0),
  };
}
```

---

## Phase 3: Voided Transaction Consistency (1 day)

### Step 3.1: Add missing `is_active=true` filter to position queries

Files missing the filter (found via grep):
1. `src/hooks/data/shared/useAssetData.ts:48` — `.from("investor_positions").select(...).eq("investor_id", user.id)` → add `.eq("is_active", true)`
2. Any other `investor_positions` query without `is_active` filter

### Step 3.2: Add missing `is_voided=false` filter to transaction queries

Files that query `transactions_v2` without filtering voided:
1. `src/services/shared/investorDataExportService.ts:15` — already has `.eq("is_voided", false)` ✅
2. `src/hooks/data/shared/useAssetData.ts` — queries positions, not transactions (covered by 3.1)

Most transaction queries already filter. The main gap is position queries missing `is_active=true`.

### Step 3.3: Handle negative current_value in UI

In position display components, add guards:
```ts
const displayValue = parseFinancial(pos.current_value).lt(0) ? "0" : pos.current_value;
```

This prevents showing negative balances from voided/partial states.

---

## Phase 4: Edge Function Auth Hardening (0.5 day)

### Step 4.1: Update config.toml

In `supabase/config.toml`, change:
```toml
[functions.set-user-password]
verify_jwt = false    # → true

[functions.admin-user-management]
verify_jwt = false    # → true
```

### Step 4.2: Verify edge functions handle JWT

Read and verify that `set-user-password` and `admin-user-management` edge functions properly handle the `Authorization` header when JWT verification is enabled. If they have fallback auth (e.g., checking a token in the request body), that needs to be updated to use the verified JWT from the Supabase gateway.

---

## Phase 5: Document Admin Auth (0.5 day)

No code changes needed. Add comments clarifying:

### Step 5.1: AdminRoute.tsx comment

The existing comment at line 56-60 is already good. No change needed.

### Step 5.2: Document .eq("is_admin", false) pattern

In one key file (e.g., `useInvestorData.ts`), add:
```ts
// NOTE: Filtering by is_admin column is for LIST FILTERING only (exclude admins from 
// investor dropdowns). Authorization decisions use the is_admin() DB function via RLS.
```

---

## Phase 6: Polish (1 day)

### Step 6.1: Replace document.write() in feeUtils.ts

File: `src/features/admin/fees/components/utils/feeUtils.ts:133-138`

Replace:
```ts
const printWindow = window.open("", "_blank");
if (!printWindow) return;
printWindow.document.write(html);
printWindow.document.close();
```
with:
```ts
const blob = new Blob([html], { type: "text/html" });
const url = URL.createObjectURL(blob);
const printWindow = window.open(url, "_blank");
if (!printWindow) return;
// Revoke after print window loads
printWindow.addEventListener("load", () => URL.revokeObjectURL(url), { once: true });
```

### Step 6.2: Fix yieldSources type in useAssetData.ts

File: `src/hooks/data/shared/useAssetData.ts:11`

Replace:
```ts
const [yieldSources, setYieldSources] = useState<any[]>([]);
```
with:
```ts
interface YieldSource {
  source: string;
  tables: string[];
  realData: boolean;
}
const [yieldSources, setYieldSources] = useState<YieldSource[]>([]);
```

### Step 6.3: Upgrade PostHog hash

File: `src/utils/analytics/posthog.ts:186-195`

Replace the DJB2 hash with:
```ts
async function hashId(id: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(id);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}
```

Note: This makes `hashId` async. Update the caller accordingly.

### Step 6.4: Remove PostHog placeholder key

File: `src/utils/analytics/posthog.ts:6`

Replace:
```ts
const apiKey = import.meta.env.VITE_POSTHOG_API_KEY || "your_posthog_key_here";
```
with:
```ts
const apiKey = import.meta.env.VITE_POSTHOG_API_KEY || "";
```

---

## Execution Order

1. Phase 1 (Steps 1.1-1.6) — Financial precision, highest impact
2. Phase 2 (Steps 2.1-2.2) — Stale closure + RPC
3. Phase 4 (Steps 4.1-4.2) — JWT auth (quick security win)
4. Phase 3 (Steps 3.1-3.3) — Voided filter consistency
5. Phase 5 (Step 5.1-5.2) — Comments
6. Phase 6 (Steps 6.1-6.4) — Polish
7. Run `npx tsc --noEmit` + lint check
8. Git commit + push

## Verification

After all phases:
- `npx tsc --noEmit` passes
- All financial display components render correctly (manual spot-check)
- `getPlatformStats()` returns real data (not zeros)
- `useAssetData` doesn't re-render loop
- Edge functions with `verify_jwt=true` still work