

# Bug Fixes -- Actively Used Code Only

All 6 fixes target code and tables confirmed in active use. No legacy/unused items included.

---

## Fix 1: Missing FK breaks `yield_allocations` join (CRITICAL)

**Where it breaks**: `src/services/admin/yields/yieldCrystallizationService.ts` line 297 -- PostgREST `!inner` join requires a FK.

**SQL migration**:
```sql
ALTER TABLE yield_allocations
ADD CONSTRAINT yield_allocations_distribution_id_fkey
FOREIGN KEY (distribution_id) REFERENCES yield_distributions(id);
```

---

## Fix 2: Notifications UPDATE policy missing (HIGH)

**Where it breaks**: `src/services/shared/notificationService.ts` lines 37-50 (`markAsRead`, `markAllAsRead`) -- both call `.update()` on `notifications`, which silently fails.

**SQL migration**:
```sql
CREATE POLICY notifications_update_own ON notifications
FOR UPDATE USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

---

## Fix 3: RLS on 4 actively-queried reconciliation tables (HIGH - Security)

Only the tables actually queried from frontend code:
- `fund_aum_mismatch` (used in `integrityService.ts` + `systemAdminService.ts`)
- `yield_distribution_conservation_check` (used in `integrityService.ts`)
- `ib_allocation_consistency` (used in `integrityService.ts`)
- `investor_position_ledger_mismatch` (used in `integrityService.ts`)

**SQL migration**:
```sql
ALTER TABLE fund_aum_mismatch ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_only ON fund_aum_mismatch FOR SELECT USING (is_admin());

ALTER TABLE yield_distribution_conservation_check ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_only ON yield_distribution_conservation_check FOR SELECT USING (is_admin());

ALTER TABLE ib_allocation_consistency ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_only ON ib_allocation_consistency FOR SELECT USING (is_admin());

ALTER TABLE investor_position_ledger_mismatch ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_only ON investor_position_ledger_mismatch FOR SELECT USING (is_admin());
```

---

## Fix 4: Remove `as never` casts in `requestsQueueService.ts` (MEDIUM)

**File**: `src/services/admin/requestsQueueService.ts` lines 39-46

Replace `rpc.call("approve_and_complete_withdrawal" as never, { ... } as never)` with a properly typed call. The function exists in generated types (`src/integrations/supabase/types.ts` line 6167) so the casts are unnecessary.

---

## Fix 5: Operator precedence bug in `feesService.ts` (MEDIUM)

**File**: `src/services/admin/feesService.ts` lines 318-321

Change:
```typescript
investor_name:
  a.investor_name || profile
    ? `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() || profile?.email
    : "Unknown",
```
To:
```typescript
investor_name:
  a.investor_name || (profile
    ? `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() || profile?.email
    : "Unknown"),
```

---

## Fix 6: `finalize_month_yield` date format (LOW)

**File**: `src/services/admin/yields/yieldCrystallizationService.ts` line 59

The DB parameter `p_month` is typed as `date`. Current code sends `"2026-02"` which PostgreSQL parses as `2026-02-01` by accident.

Change:
```typescript
p_month: `${year}-${String(month).padStart(2, '0')}`,
```
To:
```typescript
p_month: `${year}-${String(month).padStart(2, '0')}-01`,
```

---

## Files Changed

| File | Change |
|------|--------|
| SQL migration | FK + notifications UPDATE policy + RLS on 4 tables |
| `src/services/admin/requestsQueueService.ts` | Remove `as never` casts |
| `src/services/admin/feesService.ts` | Add parentheses for operator precedence |
| `src/services/admin/yields/yieldCrystallizationService.ts` | Append `-01` to date string |

