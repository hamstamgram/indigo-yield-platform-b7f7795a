# FIX PLAN: Zero-Drift Restoration (P0)

## ❌ Drift Issue 1: Missing `is_test` Column
**Table:** `profiles`
**Root Cause:** Frontend expects a way to flag test accounts for reporting exclusion, but column was never migrated.
**Fix:**
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_test BOOLEAN DEFAULT false;
COMMENT ON COLUMN profiles.is_test IS 'Flag to exclude test/verification accounts from financial reporting.';
```

## ❌ Drift Issue 2: Enum Mismatch `FIRST_INVESTMENT`
**Context:** `tx_type` enum.
**Root Cause:** TypeScript domain types include `FIRST_INVESTMENT` but the database `tx_type` enum (and mission rules) only allow `DEPOSIT`.
**Fix:**
1. Update `src/types/domains/transaction.ts` (or relevant mapping) to treat `FIRST_INVESTMENT` as a UI-only state.
2. Ensure the gateway/mapper converts it to `DEPOSIT` before calling `admin_create_transaction`.

## ❌ Guardrail Enhancement
**Action:** Add a pre-commit check to validate `src/contracts/rpcSignatures.ts` against the live DB schema to prevent future drift.

---
**Status:** BLOCKED until patches are applied.
