# Finance-Grade Hardening Sign-Off Pack

**Date:** 2026-01-14
**Version:** 3.0.0
**Prepared By:** Engineering Team

---

## 1. Verification Commands

Run these commands to verify all hardening is in place.

### 1.1 Health Check (ALL MUST PASS)

```sql
SELECT check_name, check_status, violation_count, severity
FROM run_comprehensive_health_check()
ORDER BY severity, check_name;
```

**Expected:** 12 rows, all `check_status = 'PASS'`

### 1.2 Management Fee Frozen

```sql
-- All funds have mgmt_fee_bps = 0
SELECT code, name, mgmt_fee_bps FROM funds WHERE mgmt_fee_bps != 0;
```

**Expected:** 0 rows (empty result)

```sql
-- Constraint exists
SELECT conname FROM pg_constraint WHERE conname = 'chk_no_management_fee';
```

**Expected:** 1 row

### 1.3 Native Currency Enforcement

```sql
-- Trigger exists
SELECT tgname FROM pg_trigger WHERE tgname = 'trg_enforce_transaction_asset';
```

**Expected:** 1 row

```sql
-- Test: Insert with wrong asset should fail
-- (DO NOT RUN IN PRODUCTION - for documentation only)
-- INSERT INTO transactions_v2 (fund_id, investor_id, type, amount, tx_date, asset, ...)
-- VALUES ('<fund_id>', '<investor_id>', 'DEPOSIT', 100, CURRENT_DATE, 'WRONG_ASSET', ...);
-- Expected: ERROR: Transaction asset must match fund base asset
```

### 1.4 Purpose Guardrails

```sql
-- crystallize_yield_before_flow requires explicit purpose
SELECT pg_get_function_arguments(oid)
FROM pg_proc
WHERE proname = 'crystallize_yield_before_flow';
```

**Expected:** No `DEFAULT` on `p_purpose` parameter

```sql
-- Only service_role can execute
SELECT grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_name = 'crystallize_yield_before_flow'
  AND privilege_type = 'EXECUTE';
```

**Expected:** Only `service_role` (not `authenticated`, not `anon`)

### 1.5 Conservation Constraints

```sql
-- Event conservation constraint exists
SELECT conname FROM pg_constraint WHERE conname = 'chk_yield_event_conservation';
```

**Expected:** 1 row

```sql
-- Verify constraint definition
SELECT pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'chk_yield_event_conservation';
```

**Expected:** `CHECK ((abs(((gross_yield_amount - net_yield_amount) - COALESCE(fee_amount, ...))) < 0.0001...))`

### 1.6 Preflow AUM Functions

```sql
-- Idempotent ensure function exists
SELECT proname, pg_get_function_arguments(oid)
FROM pg_proc
WHERE proname IN ('get_existing_preflow_aum', 'ensure_preflow_aum');
```

**Expected:** 2 rows

### 1.7 Void & Reissue Functions

```sql
-- Void functions exist
SELECT proname, pg_get_function_arguments(oid)
FROM pg_proc
WHERE proname IN ('void_transaction', 'void_and_reissue_transaction');
```

**Expected:** 2 rows

### 1.8 Period Lifecycle Tables

```sql
-- Tables exist
SELECT tablename FROM pg_tables
WHERE tablename IN ('system_config', 'accounting_periods', 'admin_approvals');
```

**Expected:** 3 rows

### 1.9 Staging Import Pipeline

```sql
-- Staging table and functions exist
SELECT tablename FROM pg_tables WHERE tablename = 'transaction_import_staging';
SELECT proname FROM pg_proc
WHERE proname IN ('validate_staging_row', 'validate_staging_batch', 'promote_staging_batch');
```

**Expected:** 1 table, 3 functions

### 1.10 Reconciliation Pack

```sql
-- Table and function exist
SELECT tablename FROM pg_tables WHERE tablename = 'reconciliation_packs';
SELECT proname FROM pg_proc WHERE proname = 'generate_reconciliation_pack';
```

**Expected:** 1 table, 1 function

### 1.11 Asset-Aware Dust Tolerance

```sql
-- Config exists
SELECT key, value FROM system_config WHERE key = 'dust_tolerance';
```

**Expected:** 1 row with JSON containing asset-specific tolerances

```sql
-- Function exists
SELECT proname FROM pg_proc WHERE proname = 'get_dust_tolerance_for_fund';
```

**Expected:** 1 row

---

## 2. Regression Test Commands

```sql
-- Run all regression tests
SELECT * FROM run_regression_tests();
```

**Expected:** All `passed = true`

---

## 3. Manual Test Scenarios

### 3.1 Test NULL Date Rejection

```sql
-- Should fail with: "tx_date (economic date) is required and cannot be NULL"
SELECT apply_deposit_with_crystallization(
  '<fund_id>', '<investor_id>', 100, 1000000, NULL,
  '<admin_id>', 'Test null date', 'transaction'
);
```

### 3.2 Test Preflow AUM Reuse

```sql
-- First call creates new
SELECT ensure_preflow_aum('<fund_id>', '2026-01-15', 'transaction', 1000000, '<admin_id>');
-- Result: action = 'created_new'

-- Second call reuses existing
SELECT ensure_preflow_aum('<fund_id>', '2026-01-15', 'transaction', 1000000, '<admin_id>');
-- Result: action = 'reused_existing'
```

### 3.3 Test Void Transaction

```sql
-- Void a test transaction
SELECT void_transaction('<transaction_id>', '<admin_id>', 'Test void');
-- Result: success = true, cascade info
```

### 3.4 Test Period Lock

```sql
-- Lock a period
SELECT lock_accounting_period('<fund_id>', '2026-01-01', '2026-01-31', '<admin_id>', 'Q1 close');
-- Result: success = true

-- Insert into locked period should fail (in live mode)
-- UPDATE system_config SET value = '"live"' WHERE key = 'system_mode';
-- INSERT INTO transactions_v2 ... with tx_date in locked period
-- Expected: ERROR: Cannot insert transaction into locked period
```

---

## 4. Sign-Off Checklist

### Database Layer
- [x] 12 health checks created and all PASS
- [x] Management fee frozen (CHECK constraint)
- [x] Native currency enforced (trigger)
- [x] Purpose guardrails (no default)
- [x] Conservation constraints (gross = net + fee)
- [x] Dust tolerance (asset-aware trigger)
- [x] Period lifecycle (system_config, accounting_periods)
- [x] Staging import pipeline (validation + promotion)
- [x] Reconciliation pack generation
- [x] Void cascade functions
- [x] Preflow AUM idempotency
- [x] Security (service_role only for critical functions)

### Frontend Layer
- [x] Management fee display removed
- [x] fundService.ts default changed to 0
- [x] Comment updated to "performance fees"
- [x] DepositsTable.tsx: Edit replaced with Void & Reissue
- [x] yieldPreviewService.ts: Negative yield blocking removed
- [x] MonthlyDataEntry.tsx: "AUM must be greater" validation removed

### Documentation
- [x] CFO_ACCOUNTING_GUIDE.md updated
- [x] HARDENING_REPORT_V2.md updated
- [x] EXECUTIVE_HARDENING_PLAN.md created
- [x] SIGN_OFF_PACK.md created

---

## 5. Approval Signatures

### CTO Sign-Off
**Name:** _______________________
**Date:** _______________________
**Signature:** ___________________

### CFO Sign-Off
**Name:** _______________________
**Date:** _______________________
**Signature:** ___________________

### Operations Sign-Off
**Name:** _______________________
**Date:** _______________________
**Signature:** ___________________

---

## 6. Post-Deployment Monitoring

### Daily
- Run `SELECT * FROM run_comprehensive_health_check()` via cron
- Alert on any `check_status != 'PASS'`

### Weekly
- Review `audit_log` for unusual patterns
- Generate reconciliation packs for active periods

### Monthly
- Lock completed accounting periods
- Archive and finalize reconciliation packs

---

*Document generated by Indigo Platform Engineering Team*
