

# Go-Live Gate Plan — Indigo Yield Platform

Based on the completed audit roadmap (all 10 issues fixed, 8 migrations applied), this plan defines a staged gate process from pre-launch validation through production go-live.

---

## Gate 0: Audit Closure & Baseline Lock

**Goal:** Confirm all remediation work is applied and nothing has regressed.

**Tasks:**
1. Run the full integrity suite against the live database:
   - `run_invariant_checks()` — position-ledger drift, negative balances, orphans
   - `audit_leakage_report()` — asymmetric voids, fee leakage, IB leakage
   - `run_comprehensive_health_check()` — all 13 health checks
2. Verify all 8 migrations are applied (query `supabase_migrations` table)
3. Verify `anon` role has EXECUTE on only the whitelisted ~15 functions (not 200+)
4. Verify all 4 edge functions (`set-user-password`, `send-email`, `excel_import`, `send-investor-report`) use `checkAdminAccess()` — grep for `profiles.is_admin` should return zero hits in edge function code
5. Verify `profiles` UPDATE policy blocks sensitive fields — attempt `UPDATE profiles SET is_admin = true` as a non-admin (should fail)
6. Verify `system_config` has no public SELECT — query as authenticated non-admin (should return 0 rows)
7. Produce a signed-off Gate 0 report in `docs/gates/gate-0-report.md`

**Sign-off:** CTO + CFO

---

## Gate 1: Functional Smoke Tests

**Goal:** Confirm all critical user journeys work end-to-end after the security tightening.

**Tasks:**
1. **Investor flows:**
   - Login → dashboard loads with correct portfolio data
   - View transactions, yield history, statements
   - Submit a withdrawal request → verify state machine works
   - Cancel own withdrawal
   - Update profile (allowed fields only: name, phone, avatar)
   - Attempt to update restricted fields (should be blocked)
2. **Admin flows:**
   - Login → admin dashboard loads with stats
   - Create manual transaction (deposit/withdrawal)
   - Process yield distribution (preview → apply)
   - Void a transaction → verify cascade
   - Approve/reject/complete a withdrawal
   - Import Excel data
   - Generate and send investor reports
   - Manage users (invite, set password, assign roles)
3. **Auth & RBAC:**
   - Non-admin cannot access `/admin/*` routes
   - Non-admin RPC calls to admin functions return UNAUTHORIZED
   - Unauthenticated (anon) calls to mutation RPCs are rejected
4. **Edge functions:**
   - `send-email` — send test email as admin, verify non-admin is rejected
   - `excel_import` — upload test file as admin
   - `set-user-password` — reset a test user password
   - `send-investor-report` — send to a test investor
5. Document results in `docs/gates/gate-1-report.md`

**Sign-off:** CTO

---

## Gate 2: Financial Integrity Validation

**Goal:** CFO confirms all financial data is accurate and the ledger is sound.

**Tasks:**
1. Run `batch_reconcile_all_positions()` — confirm 0 drift
2. Cross-check AUM totals: `get_funds_aum_snapshot()` vs sum of `investor_positions` where `is_active = true`
3. Verify fee conservation: for each yield distribution, `total_amount = investor_amount + platform_fee + ib_commission`
4. Verify the voided distribution `63b032b8` shows as voided in all related tables (transactions, fee_allocations, yield_allocations)
5. Spot-check 3 investor accounts: compare dashboard figures against raw ledger queries
6. Run `create_daily_position_snapshot()` and verify snapshot matches current positions
7. Document in `docs/gates/gate-2-report.md`

**Sign-off:** CFO + CTO

---

## Gate 3: Performance & Monitoring Readiness

**Goal:** Confirm the platform can handle production load and has proper observability.

**Tasks:**
1. Verify all 68 triggers are enabled (`SELECT count(*) FROM information_schema.triggers WHERE trigger_schema = 'public'`)
2. Confirm `integrity-monitor` edge function (cron) is deployed and running nightly
3. Confirm `monthly-report-scheduler` cron is active
4. Check that `admin_alerts` and `admin_integrity_runs` tables are receiving data
5. Review Supabase dashboard: connection pool usage, query performance, storage size
6. Verify audit log is healthy (~32 MB, not growing uncontrollably)
7. Test the admin Operations page (`/admin/operations`) — health checks, integrity runs display correctly
8. Document in `docs/gates/gate-3-report.md`

**Sign-off:** CTO

---

## Gate 4: Go-Live Authorization

**Goal:** Final sign-off with all gate reports collected.

**Tasks:**
1. Compile all gate reports into `docs/gates/go-live-authorization.md`
2. Checklist summary:

| Gate | Status | Signed By |
|------|--------|-----------|
| Gate 0: Audit Closure | Pending | CTO + CFO |
| Gate 1: Functional Smoke | Pending | CTO |
| Gate 2: Financial Integrity | Pending | CFO + CTO |
| Gate 3: Performance & Monitoring | Pending | CTO |
| Gate 4: Go-Live Authorization | Pending | CTO + CFO |

3. Record go-live date and any conditional items
4. Publish to production domain

**Sign-off:** CTO + CFO

---

## Implementation

This plan creates:
- `docs/gates/gate-0-report.md` — template with all verification queries and pass/fail fields
- `docs/gates/gate-1-report.md` — functional test checklist
- `docs/gates/gate-2-report.md` — financial validation checklist
- `docs/gates/gate-3-report.md` — performance and monitoring checklist
- `docs/gates/go-live-authorization.md` — consolidated sign-off document

For Gate 0, we will also run the actual database verification queries and populate the report with live results.

