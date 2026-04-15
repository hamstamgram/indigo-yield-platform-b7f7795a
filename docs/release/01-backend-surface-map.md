# Backend Surface Map — Caller Relationships & Release Risks

**Status:** OPERATIONAL MAPPING  
**Date:** 2026-04-14  
**Focus:** Frontend-reachable surfaces, caller relationships, suspicious patterns, release risks  

---

## A. RPC Caller Map

This section maps which services call which RPCs, grouped by domain. Format: `Service → RPC(rate-limit) — purpose`

### A.1 Admin Features

#### A.1.1 Withdrawal Operations
**Service:** `requestsQueueService.ts`
- `reject_withdrawal(p_request_id, p_reason, p_admin_notes)` — (20/min) Reject pending withdrawal

**Service:** `withdrawalService.ts`  
- *(Direct Supabase client, not RPC)*: Queries `withdrawal_requests` table
- Calls approval/completion RPCs via `rpc.call()` (not named in grep, delegated)

#### A.1.2 Admin Dashboard
**Service:** `adminService.ts`
- `get_funds_aum_snapshot()` — (unlimited) Fund AUM snapshot for dashboard

**Service:** `adminUsersService.ts`  
- *(No RPC calls detected)*

#### A.1.3 Reports & Statements
**Service:** `dataFetch.ts`
- `get_investor_reports_v2(p_period_id)` — (unlimited) High-performance report fetch for admin
- *(Direct Supabase client)*: Queries `investor_fund_performance`, `profiles`, `statement_periods`

#### A.1.4 User Management
**Service:** `profileService.ts`
- `update_admin_role(...)` — (unlimited) Update user role to admin
- `update_user_profile_secure(...)` — (unlimited) Update profile fields
- `get_reporting_eligible_investors(p_period_id)` — (unlimited) Investor list for statements

### A.2 Investor Features

#### A.2.1 Portfolio / Positions
**Service:** `investorPositionService.ts`
- `is_admin()` — (unlimited) Check if current user is admin
- *(Direct Supabase client)*: Queries `investor_positions`, `funds`

#### A.2.2 Withdrawals
**Service:** `withdrawalService.ts`
- *(Direct Supabase client)*: Queries `withdrawal_requests`, `profiles`, `funds`
- Creates/updates via direct Supabase API (not RPC)

### A.3 Utility / Test Functions

#### A.3.1 Data Import (Test / Migration Utility)
**Service:** `fundReplayer.ts` ⚠️ **SUSPICIOUS — See Section C**
- `apply_investor_transaction()` — ❌ **DOES NOT EXIST** (will fail if called)
- `apply_segmented_yield_distribution_v5()` — v5 yield apply

**Service:** `fundReplayer.ts` (continued)
- *(Direct Supabase client)*: Direct deletes on `transactions_v2`, `yield_distributions`, `investor_positions`, etc.
- Creates/updates fund records directly (not via RPC)

#### A.3.2 Error Handling
**Service:** `usePlatformError.ts`
- *(No RPC calls detected)*

### A.4 Core RPC Gateway

**Service:** `src/lib/rpc/client.ts`
- Central dispatch point for all RPC calls
- Rate limiting config defines limits for: `apply_transaction_with_crystallization`, `apply_segmented_yield_distribution_v5`, `approve_and_complete_withdrawal`, `reject_withdrawal`, `adjust_investor_position`, `void_transaction`, `void_yield_distribution`, `edit_transaction`, `set_fund_daily_aum`
- Helper: `applyYield()` → `apply_segmented_yield_distribution_v5`

---

## B. Table/View Caller Map

Direct Supabase client access (not via RPC) to tables:

### B.1 Withdrawal Operations
- `withdrawal_requests` ← READ (paginated, filtered by status/fund)
- `profiles` ← READ (join for investor names)
- `funds` ← READ (join for fund details)

### B.2 Admin Reports
- `investor_fund_performance` ← READ (performance report detail)
- `statement_periods` ← READ (period lookup)
- `generated_statements` ← READ (report history, paginated)
- `statement_email_delivery` ← READ (delivery status)
- `profiles` ← READ (investor names)

### B.3 Portfolio / Positions (Investor)
- `investor_positions` ← READ (investor's position summary)
- `funds` ← READ (join for fund names)

### B.4 Fund Management (Data Import Utility)
- `transactions_v2` ← DELETE (direct — bypasses audit trail)
- `yield_distributions` ← DELETE (direct)
- `investor_positions` ← DELETE (direct)
- `investor_fee_schedule` ← DELETE (direct)
- `ib_commission_schedule` ← DELETE (direct)
- `funds` ← INSERT/UPDATE (direct)
- `profiles` ← INSERT (direct — creates investor profiles)

---

## C. Suspicious / Deprecated Surfaces & Release Risks

### C.1 CRITICAL: FundReplayer Calls Non-Existent RPC

**File:** `src/lib/validation/fundReplayer.ts`  
**Issue:** Calls `apply_investor_transaction()` which does not exist in current DB

```typescript
const result = await this.supabase.rpc('apply_investor_transaction', {...})
// ^ Will fail with: "function apply_investor_transaction(json) does not exist"
```

**Status:** 🔴 **WILL CAUSE PRODUCTION FAILURE IF CALLED**  
**Severity:** HIGH

**Risk:**
- If data import/replay is triggered in production, it will fail
- No fallback path defined
- Function is referenced in `CANONICAL_MUTATION_RPCS` as V6 intent, but not yet implemented

**Remediation (pick one):**
1. **If this is test/migration code:** Remove or conditionally disable
2. **If this is production code:** Implement `apply_investor_transaction()` RPC before going live
3. **If this should use v5 path:** Replace with `apply_transaction_with_crystallization`

**Recommended action:** Check if FundReplayer is ever called in production flow. If not, document as "internal utility only" and add guard check.

---

### C.2 WARNING: FundReplayer Bypasses Audit Trail

**File:** `src/lib/validation/fundReplayer.ts:73–80`  
**Issue:** Direct SQL deletes on core tables without RPC audit logging

```typescript
await this.supabase.from('transactions_v2').delete().eq('fund_id', existingFund.id);
await this.supabase.from('yield_distributions').delete().eq('fund_id', existingFund.id);
// ... more direct deletes
```

**Status:** 🟡 **BY DESIGN (For data import), but dangerous if exported to production**  
**Severity:** MEDIUM

**Risk:**
- No audit trail of what was deleted
- No position/AUM reconciliation after delete
- Could leave orphaned records in related tables
- If used by mistake on live fund, will corrupt financial records

**Safeguards:**
- This code is in `src/lib/validation/fundReplayer.ts` — suggest it's non-production
- No UI access to this function detected
- Not called from active service paths

**Recommendation:** Verify FundReplayer is never accessible from production UI. Document as "internal development utility only."

---

### C.3 RISKY: fundReplayer Creates Profiles Directly

**File:** `src/lib/validation/fundReplayer.ts` (inferred from code pattern)  
**Issue:** Likely creates `profiles` records directly instead of via `update_user_profile_secure` or auth flow

**Risk:**
- Profile creation bypasses any auth-linked onboarding
- Could create orphaned profiles not linked to auth accounts
- Violates separation between data import and auth flows

---

### C.4 Deprecated: investorPositionService Calls `is_admin()`

**File:** `src/features/investor/portfolio/services/investorPositionService.ts`  
**Issue:** Calls legacy helper RPC

```typescript
const { data: isAdmin } = await supabase.rpc("is_admin");
```

**Status:** 🟡 **FUNCTIONAL but should verify role via JWT claims instead**

**Recommendation:**
- Check if JWT already includes role claims
- Consider moving auth checks to client-side JWT inspection
- `is_admin()` is a redundant round-trip if role is in token

---

### C.5 Missing Rate Limit: Multiple Read RPCs

**Services:** Multiple files call unlimited-frequency RPCs:
- `get_investor_reports_v2` — called from admin report page (no rate limit configured)
- `get_reporting_eligible_investors` — called during statement prep (no rate limit)
- `update_admin_role` — called during user management (no rate limit)

**Risk:**
- If report page refreshes rapidly, could cause query storms
- If statement generation retries without backoff, could hammer DB

**Recommendation:**
- Add rate limits to high-frequency read paths (suggest: 5 req/min per actor)
- Add client-side debouncing on report refresh

---

## D. Release Risk Assessment

### D.1 Critical Risks (Must Fix Before Go-Live)

| Risk | Location | Severity | Action Required |
|------|----------|----------|-----------------|
| `apply_investor_transaction()` does not exist | `fundReplayer.ts` | 🔴 HIGH | Verify if function is needed; if so, implement before go-live |
| Direct table deletes bypass audit | `fundReplayer.ts` | 🟡 MEDIUM | Verify FundReplayer is not called from production UI |

### D.2 Warnings (Should Fix Before Go-Live)

| Risk | Location | Severity | Action |
|------|----------|----------|--------|
| FundReplayer may create orphaned profiles | `fundReplayer.ts` | 🟡 MEDIUM | Review profile creation logic; ensure auth linkage |
| `is_admin()` RPC call is redundant | `investorPositionService.ts` | 🟢 LOW | Consider moving to JWT inspection |
| Read RPCs lack rate limits | Multiple | 🟡 MEDIUM | Add rate limits to `get_investor_reports_v2`, `get_reporting_eligible_investors` |

### D.3 Non-Issues (No Action Needed)

- Direct Supabase client reads: RLS policies protect against unauthorized access
- Withdrawal service direct queries: Expected for read operations; only writes via RPC
- Admin report data joins: Performance acceptable for low-frequency admin operations

---

## E. Surface Inventory Summary

### E.1 Active Production Surfaces (Used in Live Flows)

| Category | Count | Examples | Status |
|----------|-------|----------|--------|
| Mutation RPCs | 14 | `apply_transaction_with_crystallization`, `void_transaction`, `apply_segmented_yield_distribution_v5` | ✅ Canonical |
| Read RPCs | 24+ | `get_investor_reports_v2`, `get_funds_aum_snapshot`, `is_admin` | ✅ Canonical |
| Table reads | 8 | `investor_positions`, `withdrawal_requests`, `profiles`, `funds` | ✅ Normal (RLS protected) |
| Reporting surfaces | 4 | `dispatch_report_delivery_run`, `get_investor_reports_v2`, `statement_periods`, `generated_statements` | ✅ Hardened (Phase 4C) |

### E.2 Suspicious / Deprecated Surfaces (Used in Test/Utility Code)

| Category | Count | Examples | Status |
|----------|-------|----------|--------|
| Test/utility RPCs | 1 | `apply_investor_transaction` (non-existent) | ❌ **DANGEROUS** |
| Test/utility table access | 5 | Direct deletes in `fundReplayer.ts` | ⚠️ **RISKY** |
| Redundant RPC calls | 1 | `is_admin()` check | 🟡 **CONSIDER REMOVING** |

### E.3 Rate Limit Coverage

**Configured (10+ req/min limit):**
- ✅ `apply_transaction_with_crystallization`
- ✅ `apply_segmented_yield_distribution_v5`
- ✅ `void_transaction`
- ✅ `approve_and_complete_withdrawal`
- ✅ `reject_withdrawal`
- ✅ `adjust_investor_position`
- ✅ `edit_transaction`
- ✅ `set_fund_daily_aum`

**Not configured (recommend adding):**
- ⚠️ `get_investor_reports_v2` — called from admin report page (frequent refresh risk)
- ⚠️ `get_reporting_eligible_investors` — called during statement prep
- ⚠️ `update_admin_role` — called during user management
- ⚠️ `get_funds_aum_snapshot` — called from admin dashboard

---

## F. Pre-Go-Live Checklist

- [ ] Confirm `fundReplayer.ts` is not called from any production UI code
- [ ] If FundReplayer is production code, implement `apply_investor_transaction()` RPC
- [ ] If FundReplayer is test code, document as "internal development utility only"
- [ ] Verify all `fundReplayer.ts` profile creation links to auth accounts
- [ ] Add rate limits to: `get_investor_reports_v2`, `get_reporting_eligible_investors`, `update_admin_role`, `get_funds_aum_snapshot`
- [ ] Review `investorPositionService.ts:is_admin()` call — can this use JWT claims instead?
- [ ] Confirm withdrawal service reads only use RLS-protected queries
- [ ] Run stress test on `get_investor_reports_v2` (simulate admin dashboard refresh storm)

---

## G. Caller Flow Diagram (Text Format)

```
INVESTOR FEATURES
├─ Portfolio
│  └─ investorPositionService.ts
│     ├─ RPC: is_admin() [check role]
│     └─ QUERY: investor_positions, funds
│
└─ Withdrawals
   └─ withdrawalService.ts
      ├─ QUERY: withdrawal_requests, profiles, funds
      └─ RPC: [approval/rejection via rpc.call() delegation]

ADMIN FEATURES
├─ Dashboard
│  └─ adminService.ts
│     └─ RPC: get_funds_aum_snapshot()
│
├─ Withdrawal Queue
│  └─ requestsQueueService.ts
│     └─ RPC: reject_withdrawal()
│
├─ Reports & Statements
│  └─ dataFetch.ts
│     ├─ RPC: get_investor_reports_v2(period_id)
│     └─ QUERY: investor_fund_performance, statement_periods, generated_statements
│
└─ User Management
   └─ profileService.ts
      ├─ RPC: update_admin_role()
      ├─ RPC: update_user_profile_secure()
      └─ RPC: get_reporting_eligible_investors()

TEST/UTILITY (⚠️ SUSPICIOUS)
└─ fundReplayer.ts [internal data import utility]
   ├─ RPC: apply_investor_transaction() ❌ DOES NOT EXIST
   ├─ RPC: apply_segmented_yield_distribution_v5()
   └─ QUERY: [direct deletes on transactions_v2, yield_distributions, etc.]

RPC GATEWAY
└─ src/lib/rpc/client.ts
   ├─ call(functionName, params) — central dispatch + rate limiting
   ├─ Rate limits active for: mutations (transactions, yield, void)
   └─ Retry logic: network errors only, max 3 attempts
```

---

## H. Recommendations

### H.1 Before Go-Live (24 Hours)

1. **Verify FundReplayer status** — Is it production code or test code?
   - If test: Add comment `// @deprecated — for development/testing only`
   - If production: Implement `apply_investor_transaction()` RPC
   
2. **Add rate limits** to read RPCs called from dashboards:
   - `get_investor_reports_v2` → 5 req/min per actor
   - `get_funds_aum_snapshot` → 10 req/min per actor
   
3. **Review `is_admin()` RPC** — Can this be replaced with JWT claims check?

4. **Stress test** `get_investor_reports_v2` — simulate rapid dashboard refreshes

### H.2 After Go-Live (1 Week)

1. Monitor for `apply_investor_transaction` errors in logs
2. Monitor rate limit rejection counts (should be ~0 unless load spike)
3. Monitor FundReplayer execution logs (if it's production code)

### H.3 Medium-Term (1–3 Months)

1. Consider consolidating read RPC calls into fewer, parametrized endpoints
2. Document FundReplayer as production or development-only utility
3. Consider removing/replacing `is_admin()` RPC with JWT-based auth checks
