

# Go-Live Operational Report -- Pre-Launch SRE Audit

## Executive Summary

The platform has strong CI/CD and audit infrastructure. Two critical gaps remain: (1) no high-concurrency stress test (50+ parallel workers), and (2) the `golden-path.yml` workflow is not enforced as a required status check. Everything else is well-architected.

---

## PHASE 1: Load, Stress, and Deadlock Testing

### What EXISTS (Good)

| Test | File | Coverage |
|------|------|----------|
| Concurrent withdrawals (same investor, 2 parallel) | `tests/integration/yield-engine/13-concurrent-withdrawals.test.ts` | Double-spend prevention, position-ledger consistency |
| Concurrent deposit + yield distribution (2 parallel) | `tests/integration/yield-engine/12-concurrent-deposit-yield.test.ts` | Serialization via advisory locks, zero ledger drift |
| RPC abuse / direct write blocking | `tests/sql/rpc_abuse.sql` | Canonical guard trigger enforcement |

### What is MISSING (Gap)

**GAP 1 (P1): No high-concurrency stress test (N=50+)**

The existing tests fire 2 concurrent operations via `Promise.allSettled`. This validates serialization logic but does NOT stress-test `pg_advisory_xact_lock` under contention (queue depth, timeout behavior, connection pool exhaustion).

There is no K6, Artillery, or parallel Playwright worker configuration anywhere in the repository.

**Recommended action:** Create a dedicated stress test that fires `apply_segmented_yield_distribution_v5` concurrently with 20-50 `approve_and_complete_withdrawal` calls against the same fund. This can be a Vitest test using `Promise.allSettled` with 50 concurrent RPC calls, or a K6 script. This is a **post-launch hardening** item -- the existing 2-way concurrency tests plus advisory locks provide adequate protection for the current small AUM / low-traffic phase.

**File to create:** `tests/integration/yield-engine/14-stress-concurrent-yield-withdrawals.test.ts`

```typescript
// Stress test: 1 yield distribution + 20 concurrent withdrawals
// Verifies advisory locks queue without deadlock under contention
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { supabase } from "./helpers/supabase-client";
// ... seed helpers ...

describe("Stress: Yield + 20 Concurrent Withdrawals", () => {
  // Setup: 1 fund, 20 investors each with 10 BTC positions
  
  it("should process all operations without deadlock", async () => {
    const withdrawalPromises = investors.map((inv, i) =>
      supabase.rpc("apply_investor_transaction", {
        p_investor_id: inv.id,
        p_fund_id: fund.id,
        p_type: "WITHDRAWAL",
        p_amount: "5",
        p_tx_date: "2025-03-15",
        p_reference_id: `stress_w_${i}_${Date.now()}`,
        p_admin_id: admin.id,
        p_new_aum: String(totalAum - 5),
        p_purpose: "transaction",
      })
    );

    const yieldPromise = supabase.rpc("apply_segmented_yield_distribution_v5", {
      // ... yield params for the fund
    });

    const results = await Promise.allSettled([yieldPromise, ...withdrawalPromises]);
    
    // No rejections with "deadlock detected"
    const deadlocks = results.filter(
      r => r.status === "rejected" && String(r.reason).includes("deadlock")
    );
    expect(deadlocks).toHaveLength(0);
    
    // Ledger reconciliation: zero drift
    const { data: recon } = await supabase
      .from("v_ledger_reconciliation")
      .select("*")
      .eq("fund_id", fund.id);
    expect(recon?.length || 0).toBe(0);
  }, 60000); // 60s timeout for stress
});
```

---

## PHASE 2: Disaster Recovery and Audit Logs

### 2A: PITR / Backup Documentation

**STATUS: DOCUMENTED but not machine-enforced**

`docs/DISASTER_RECOVERY.md` explicitly documents:
- Supabase daily backups (7-day retention on Pro plan)
- Point-in-time recovery (PITR) procedure with step-by-step instructions
- Recovery time objectives (RTO) table
- Pre-launch backup verification checklist

`supabase/config.toml` is the local dev config and does not control production PITR -- that is a Supabase dashboard setting.

**Recommendation:** No code change needed. Before go-live, verify in the Supabase Dashboard that PITR is enabled: **Settings > Database > Backups > Point-in-time Recovery**.

### 2B: Audit Log Completeness

**STATUS: COMPREHENSIVE -- PASS**

The `audit_log` table captures `actor_user` (from `auth.uid()`) and full `old_values` / `new_values` JSON diffs via multiple mechanisms:

| Mechanism | Tables Covered | Captures |
|-----------|---------------|----------|
| `delta_audit_*` triggers | `transactions_v2`, `investor_positions`, `yield_distributions`, `withdrawal_requests` | Full `to_jsonb(OLD)` vs `to_jsonb(NEW)` on every UPDATE, full record on INSERT/DELETE |
| `audit_transaction_changes` trigger | `transactions_v2` | Redundant deep audit with trigger source metadata |
| `audit_fee_schedule_changes` trigger | `investor_fee_schedule` | old/new fee percentages, effective dates |
| `audit_role_changes` trigger | `user_roles` | Role grants/revokes |
| Inline RPC audit inserts | `void_transaction`, `apply_segmented_yield_distribution_v5`, `approve_and_complete_withdrawal` | Action-specific metadata (voided amounts, distribution params) |

The `audit_log` table is **fully immutable** -- RLS policies block UPDATE and DELETE for all roles. Insert policy requires `actor_user = auth.uid()`.

**No gaps found.**

---

## PHASE 3: CI/CD Pipeline and Deployment Gates

### 3A: Integrity Check as Merge Gate

**STATUS: EXISTS in `golden-path.yml` but needs enforcement as Required Status Check**

The `golden-path.yml` workflow has a robust 6-stage pipeline:

```text
db-integrity --> contract-validation --> flow-pack-tests --> golden-path-tests
            \--> sql-proof-suite --> integrity-monitor
                                          |
                                    summary (FAIL gate)
```

The `summary` job (line 509) explicitly fails if any critical job fails:
```yaml
if: needs.db-integrity.result == 'failure' || needs.sql-proof-suite.result == 'failure' || ...
run: exit 1
```

The `sql-proof-suite` job runs `run_integrity_pack()` and **fails the pipeline** if `overall_status != 'pass'` (lines 396-406).

**GAP 2 (P0): `golden-path.yml` is NOT a GitHub Required Status Check**

The workflow runs on `pull_request` to `main` and `develop`, but there is nothing preventing a maintainer from merging even if it fails. GitHub branch protection rules must be configured to make the `summary` job a **required status check**.

**Action (manual, not code):** In GitHub repo Settings > Branches > Branch protection rules for `main`:
1. Enable "Require status checks to pass before merging"
2. Add `CI Summary` (from `golden-path.yml`) as a required check
3. Add `Lint & Type Check` (from `ci.yml`) as a required check

### 3B: E2E Golden Path as Merge Blocker

**STATUS: PRESENT but not enforced**

`golden-path.yml` runs `tests/e2e/golden-path-smoke.spec.ts` via Playwright (lines 294-313). The `summary` job treats `golden-path-tests` failure as a pipeline failure. However, same gap as above -- it is not a GitHub Required Status Check.

**Same fix as 3A above.**

### 3C: `ci.yml` Pipeline Assessment

The `ci.yml` pipeline is well-structured with 5 parallel jobs:
- `lint-and-type` -- ESLint + `tsc --noEmit`
- `test-unit` -- Unit tests
- `sql-checks` -- Migration dry-run, admin gate verification, ledger integrity views, yield conservation
- `contract-integrity` -- Enum contracts, SQL hygiene, gateway enforcement, protected table mutation scan
- `qa-invariants` -- Raw enum check, dust references
- `security-scan` -- `pnpm audit` + TruffleHog secrets scan

All of these run on PR to `main`/`develop`. The `sql-checks` job runs the integrity views against a clean Postgres and verifies zero violations.

---

## Implementation Plan

### Priority 1 (Before Launch -- Manual Config)
**GitHub Branch Protection:** Configure `main` branch to require `CI Summary` and `Lint & Type Check` as required status checks. This is a 2-minute GitHub UI change, not a code change.

### Priority 2 (Before Launch -- Manual Verification)
**PITR Verification:** Confirm in Supabase Dashboard > Settings > Database > Backups that Point-in-Time Recovery is enabled for production.

### Priority 3 (Post-Launch Hardening -- 1 new test file)
**Stress Test:** Create `tests/integration/yield-engine/14-stress-concurrent-yield-withdrawals.test.ts` with 20+ concurrent operations to verify advisory lock queue behavior under contention. Not blocking for soft launch with small AUM.

### No Code Changes Required
All three phases surface **operational configuration gaps** (GitHub settings, Supabase dashboard), not code defects. The CI/CD pipelines, audit triggers, and concurrency tests are already well-implemented in the codebase.

---

## Certification Matrix

| Check | Status | Action |
|-------|--------|--------|
| Advisory lock concurrency (2-way) | PASS | Exists in tests 12, 13 |
| Advisory lock stress (50-way) | MISSING | Post-launch hardening |
| PITR documentation | PASS | Documented in DR guide |
| PITR enabled in production | VERIFY | Check Supabase dashboard |
| Audit log: auth.uid() capture | PASS | All triggers use `auth.uid()` |
| Audit log: old/new JSON diff | PASS | `to_jsonb(OLD)` / `to_jsonb(NEW)` |
| Audit log immutability | PASS | RLS blocks UPDATE/DELETE |
| Integrity pack in CI | PASS | `run_integrity_pack()` in golden-path.yml |
| E2E golden path in CI | PASS | Playwright smoke in golden-path.yml |
| CI as required merge gate | MISSING | Configure GitHub branch protection |
| Security scan (secrets + audit) | PASS | TruffleHog + pnpm audit |

