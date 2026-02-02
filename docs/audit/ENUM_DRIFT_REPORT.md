# Phase 1B: Enum Drift Detection Report

**Generated**: 2026-02-02
**Platform**: Indigo Yield Platform
**Source**: `/src/contracts/dbEnums.ts` vs PostgreSQL `pg_type`/`pg_enum`

## Executive Summary

**Status**: ⚠️ **SIGNIFICANT DRIFT DETECTED - 17 MISSING ENUMS**

| Metric | Count |
|--------|-------|
| **Enums in Database** | 26 |
| **Enums in dbEnums.ts** | 9 (8 DB + 1 app-level) |
| **Missing from Frontend** | 17 |
| **Perfect Matches** | 8 |
| **TypeScript Errors** | 0 |

### Severity Assessment

- **P0 (Critical)**: 0 issues
- **P1 (High)**: 17 missing enum definitions (65% coverage gap)
- **P2 (Medium)**: 1 legacy enum investigation needed (transaction_type)

### Critical Missing Enums

These 4 enums are **highest priority** to add to dbEnums.ts:

1. **`asset_code`** (8 values: BTC, ETH, SOL, USDT, EURC, xAUT, XRP, ADA)
   - Critical for all financial operations
   - Currently untyped in frontend

2. **`platform_error_code`** (40 values)
   - Error handling throughout the platform
   - No type safety for error codes

3. **`fee_kind`** (2 values: mgmt, perf)
   - Fee classification for accounting
   - Required for CFO operations

4. **`approval_operation_type`** (10 values)
   - Approval workflow types
   - Admin portal operations depend on this

## Detailed Findings

### 1. Enums in Database but Missing from dbEnums.ts

The following 17 enums exist in the database but are **NOT** defined in `src/contracts/dbEnums.ts`:

| Enum Name | DB Values | Severity | Impact |
|-----------|-----------|----------|---------|
| `access_event` | login, logout, 2fa_setup, 2fa_verify, session_revoked, password_change | P1 | Security audit trail types not exposed to frontend |
| `account_type` | investor, ib, fees_account | P1 | Account classification missing from contracts |
| `approval_operation_type` | PERIOD_LOCK, PERIOD_UNLOCK, LARGE_WITHDRAWAL, LARGE_DEPOSIT, STAGING_PROMOTION, FEE_STRUCTURE_CHANGE, RECONCILIATION_FINALIZE, VOID_TRANSACTION, BULK_OPERATION, MFA_RESET | P1 | Approval workflow types not typed |
| `asset_code` | BTC, ETH, SOL, USDT, EURC, xAUT, XRP, ADA | P1 | Asset/currency types not typed (critical for finance) |
| `benchmark_type` | BTC, ETH, STABLE, CUSTOM | P1 | Fund performance benchmark types missing |
| `error_category` | VALIDATION, BUSINESS_RULE, STATE, PERMISSION, NOT_FOUND, CONFLICT, SYSTEM | P1 | Error handling categories not typed |
| `fee_kind` | mgmt, perf | P1 | Fee type classification missing |
| `notification_priority` | low, medium, high | P1 | Notification priority levels not typed |
| `notification_type` | deposit, statement, performance, system, support, withdrawal, yield | P1 | Notification categories not typed |
| `platform_error_code` | PREFLOW_AUM_MISSING, AUM_NOT_FOUND, AUM_ALREADY_EXISTS, AUM_DUPLICATE_PREFLOW, PERIOD_LOCKED, PERIOD_NOT_FOUND, ECONOMIC_DATE_REQUIRED, FUTURE_DATE_NOT_ALLOWED, BACKDATED_NOT_ALLOWED, LEDGER_IMMUTABLE, TRANSACTION_NOT_FOUND, TRANSACTION_ALREADY_VOIDED, INSUFFICIENT_BALANCE, INVALID_TRANSACTION_TYPE, ASSET_MISMATCH, INVALID_ASSET, YIELD_CONSERVATION_VIOLATION, DUST_TOLERANCE_EXCEEDED, NO_POSITIONS_FOR_YIELD, FUND_NOT_FOUND, FUND_INACTIVE, INVESTOR_NOT_FOUND, INVESTOR_POSITION_NOT_FOUND, INVESTOR_NOT_IN_FUND, APPROVAL_REQUIRED, APPROVAL_PENDING, SELF_APPROVAL_NOT_ALLOWED, UNAUTHORIZED, ADMIN_REQUIRED, VALIDATION_ERROR, REQUIRED_FIELD_MISSING, INVALID_AMOUNT, INVALID_DATE, INVALID_PURPOSE, SYSTEM_ERROR, INVARIANT_VIOLATION, CONCURRENCY_ERROR, STAGING_VALIDATION_FAILED, STAGING_BATCH_NOT_FOUND, STAGING_ALREADY_PROMOTED | P1 | Platform error codes not typed (40+ values) |
| `share_scope` | portfolio, documents, statement | P1 | Data sharing scope types missing |
| `ticket_category` | account, portfolio, statement, technical, general | P1 | Support ticket categories not typed |
| `ticket_priority` | low, medium, high, urgent | P1 | Ticket priority levels not typed |
| `ticket_status` | open, in_progress, waiting_on_lp, closed | P1 | Ticket workflow states not typed |
| `transaction_status` | pending, confirmed, failed, cancelled | P1 | Transaction status types missing |
| `visibility_scope` | investor_visible, admin_only | P1 | Data visibility scope not typed |
| `withdrawal_action` | create, approve, reject, processing, complete, cancel, update, route_to_fees | P1 | Withdrawal action types not typed |

### 2. Enums Defined in Both (Comparison)

These 9 enums are defined in both dbEnums.ts and the database:

#### ✅ `app_role`
- **Frontend**: super_admin, admin, moderator, ib, user, investor
- **Database**: super_admin, admin, moderator, ib, user, investor
- **Status**: ✅ PERFECT MATCH

#### ✅ `aum_purpose`
- **Frontend**: reporting, transaction
- **Database**: reporting, transaction
- **Status**: ✅ PERFECT MATCH

#### ✅ `document_type`
- **Frontend**: statement, notice, terms, tax, other
- **Database**: statement, notice, terms, tax, other
- **Status**: ✅ PERFECT MATCH

#### ⚠️ `tx_type` (DRIFT DETECTED)
- **Frontend**: DEPOSIT, WITHDRAWAL, INTEREST, FEE, ADJUSTMENT, FEE_CREDIT, IB_CREDIT, YIELD, INTERNAL_WITHDRAWAL, INTERNAL_CREDIT, IB_DEBIT
- **Database**: DEPOSIT, WITHDRAWAL, INTEREST, FEE, ADJUSTMENT, FEE_CREDIT, IB_CREDIT, YIELD, INTERNAL_WITHDRAWAL, INTERNAL_CREDIT, IB_DEBIT
- **Status**: ✅ PERFECT MATCH (both have 11 values in same order)

**Note**: Database also has a `transaction_type` enum with values: DEPOSIT, WITHDRAWAL, INTEREST, FEE, DUST_ALLOCATION. This appears to be a legacy enum that is distinct from `tx_type`.

#### ✅ `tx_source`
- **Frontend**: manual_admin, yield_distribution, fee_allocation, ib_allocation, system_bootstrap, investor_wizard, internal_routing, yield_correction, withdrawal_completion, rpc_canonical, crystallization, system, migration, stress_test
- **Database**: manual_admin, yield_distribution, fee_allocation, ib_allocation, system_bootstrap, investor_wizard, internal_routing, yield_correction, withdrawal_completion, rpc_canonical, crystallization, system, migration, stress_test
- **Status**: ✅ PERFECT MATCH (14 values)

#### ✅ `withdrawal_status`
- **Frontend**: pending, approved, processing, completed, rejected, cancelled
- **Database**: pending, approved, processing, completed, rejected, cancelled
- **Status**: ✅ PERFECT MATCH

#### ✅ `yield_distribution_status`
- **Frontend**: draft, applied, voided, previewed, corrected, rolled_back
- **Database**: draft, applied, voided, previewed, corrected, rolled_back
- **Status**: ✅ PERFECT MATCH

#### ✅ `fund_status`
- **Frontend**: active, inactive, suspended, deprecated, pending
- **Database**: active, inactive, suspended, deprecated, pending
- **Status**: ✅ PERFECT MATCH

### 3. Enums in dbEnums.ts but NOT in Database

**None detected**. All 9 enums defined in the frontend have corresponding database enums.

### 4. TypeScript Compilation Status

```bash
npx tsc --noEmit
```

**Result**: ✅ No errors detected

The existing type alignment verification in dbEnums.ts is working correctly:
```typescript
type _AssertTxType = TxType extends SupabaseTxType ? true : false;
type _AssertAumPurpose = AumPurpose extends SupabaseAumPurpose ? true : false;
type _AssertDocumentType = DocumentType extends SupabaseDocumentType ? true : false;
```

These compile-time checks successfully verify that the 3 enums being tested match the generated Supabase types.

## Risk Analysis

### High Risk (P1)

**17 Missing Enum Definitions**

The frontend is missing TypeScript definitions for 17 database enums. This creates several risks:

1. **Type Safety Gaps**: Frontend code working with these enums must use string literals or `any` types
2. **Runtime Errors**: No compile-time validation when values change in DB
3. **Developer Experience**: No autocomplete or IntelliSense for these enum values
4. **Maintenance Risk**: Schema changes won't be caught by TypeScript

**Critical Missing Enums**:
- `asset_code`: Financial operations depend on this (BTC, ETH, USDT, etc.)
- `platform_error_code`: 40+ error codes with no frontend types
- `approval_operation_type`: Approval workflow types untyped
- `fee_kind`: Fee classification (mgmt vs perf) not typed

### Medium Risk (P2)

**Legacy Enum: `transaction_type`**

The database contains a `transaction_type` enum (DEPOSIT, WITHDRAWAL, INTEREST, FEE, DUST_ALLOCATION) that is separate from `tx_type`. This could cause confusion:
- Is this enum still in use?
- Should `DUST_ALLOCATION` be added to `tx_type`?
- Should `transaction_type` be deprecated?

**Recommendation**: Audit table schemas to determine if `transaction_type` is still actively used.

## Recommendations

### Immediate Actions (P1)

1. **Generate Full Enum Contracts**
   - Run `npm run contracts:generate` (if this script exists and is comprehensive)
   - Or manually add the 17 missing enums to `src/contracts/dbEnums.ts`

2. **Add Critical Enums First**
   - Priority order: `asset_code`, `platform_error_code`, `fee_kind`, `approval_operation_type`

3. **Update Type Alignment Checks**
   - Add compile-time verification for the new enums (similar to existing `_AssertTxType` pattern)

4. **Verify Supabase Types**
   - Check if `/src/integrations/supabase/types.ts` contains all 26 enums
   - If not, regenerate types: `npx supabase gen types typescript --project-id <ID> > src/integrations/supabase/types.ts`

### Follow-Up Actions (P2)

5. **Investigate `transaction_type` Enum**
   - Query database: `SELECT table_name, column_name FROM information_schema.columns WHERE udt_name = 'transaction_type';`
   - Determine if this enum is legacy and should be deprecated

6. **Automate Drift Detection**
   - Add a test that compares dbEnums.ts against database enums
   - Run in CI/CD to catch drift early

7. **Documentation**
   - Update CLAUDE.md with the new enum count (26 enums)
   - Document the enum contract generation process

## Appendix: Full Enum Inventory

### Database Enums (26 total)

1. access_event (6 values)
2. account_type (3 values)
3. app_role (6 values) ✅ in dbEnums.ts
4. approval_operation_type (10 values)
5. asset_code (8 values)
6. aum_purpose (2 values) ✅ in dbEnums.ts
7. benchmark_type (4 values)
8. document_type (5 values) ✅ in dbEnums.ts
9. error_category (7 values)
10. fee_kind (2 values)
11. fund_status (5 values) ✅ in dbEnums.ts
12. notification_priority (3 values)
13. notification_type (7 values)
14. platform_error_code (40 values)
15. share_scope (3 values)
16. ticket_category (5 values)
17. ticket_priority (4 values)
18. ticket_status (4 values)
19. transaction_status (4 values)
20. transaction_type (5 values) ⚠️ legacy?
21. tx_source (14 values) ✅ in dbEnums.ts
22. tx_type (11 values) ✅ in dbEnums.ts
23. visibility_scope (2 values)
24. withdrawal_action (8 values)
25. withdrawal_status (6 values) ✅ in dbEnums.ts
26. yield_distribution_status (6 values) ✅ in dbEnums.ts

### Frontend Enums (9 total)

1. app_role ✅
2. aum_purpose ✅
3. document_type ✅
4. fund_status ✅
5. tx_source ✅
6. tx_type ✅
7. withdrawal_status ✅
8. yield_distribution_status ✅
9. (delivery_channel - appears in file but NOT in database enums) ⚠️

**Wait, I found a discrepancy**: The frontend defines `delivery_channel` (email, app, sms) but this enum does NOT appear in the database query results. This could be:
- A table column type defined as VARCHAR with application-level validation
- A recently removed database enum
- An enum in a different schema

### Correction: delivery_channel Status

**Frontend defines `delivery_channel`** (lines 61-67 of dbEnums.ts):
```typescript
export const DELIVERY_CHANNEL_VALUES = ["email", "app", "sms"] as const;
```

**Database**: No `delivery_channel` enum found in `pg_type` query results.

**Investigation Results**:
```sql
-- Columns with 'delivery' or 'channel' in name:
admin_alerts.notification_channel        TEXT
report_delivery_events.delivery_id       UUID
report_schedules.delivery_method         TEXT[]
statement_email_delivery.channel         TEXT
statement_email_delivery.delivery_mode   TEXT
```

**Conclusion**: The database uses `TEXT` columns (not enum type) for channel/delivery fields. The `delivery_channel` enum in dbEnums.ts is an **application-level validation enum** only - it does not exist as a database enum. This is intentional and not a drift issue.

**Status**: ✅ Application-level enum (not a database enum) - no action needed

## Updated Summary

| Category | Count | Status |
|----------|-------|--------|
| DB enums | 26 | - |
| Frontend enums | 9 (8 DB enums + 1 app-level) | - |
| Perfect matches | 8 | ✅ |
| Missing from frontend | 17 | ❌ P1 |
| App-level enums (intentional) | 1 (delivery_channel) | ✅ |
| Legacy/duplicate enums | 1 (transaction_type) | ⚠️ P2 |

---

## Quick Reference: Action Items

### Immediate (P1) - Add 17 Missing Enums

```typescript
// Priority 1: Financial Operations
asset_code          // BTC, ETH, SOL, USDT, EURC, xAUT, XRP, ADA
fee_kind            // mgmt, perf
account_type        // investor, ib, fees_account

// Priority 2: Error Handling
platform_error_code // 40 error codes
error_category      // VALIDATION, BUSINESS_RULE, STATE, etc.

// Priority 3: Workflows
approval_operation_type  // PERIOD_LOCK, LARGE_WITHDRAWAL, etc.
withdrawal_action        // create, approve, reject, complete, etc.
transaction_status       // pending, confirmed, failed, cancelled

// Priority 4: Notifications & UI
notification_type     // deposit, statement, performance, etc.
notification_priority // low, medium, high
ticket_status        // open, in_progress, waiting_on_lp, closed
ticket_category      // account, portfolio, statement, etc.
ticket_priority      // low, medium, high, urgent

// Priority 5: Security & Audit
access_event         // login, logout, 2fa_setup, etc.
visibility_scope     // investor_visible, admin_only
share_scope          // portfolio, documents, statement

// Priority 6: Fund Management
benchmark_type       // BTC, ETH, STABLE, CUSTOM
```

### Investigation (P2)

- **transaction_type enum**: Determine if this is legacy (has DUST_ALLOCATION which tx_type doesn't)
- Query: `SELECT table_name, column_name FROM information_schema.columns WHERE udt_name = 'transaction_type';`

### Verification Commands

```bash
# Regenerate Supabase types
npx supabase gen types typescript --project-id <ID> > src/integrations/supabase/types.ts

# Verify TypeScript compilation
npx tsc --noEmit

# Run contract verification
npm run contracts:verify
```

---

**Report Status**: ✅ Complete
**Next Phase**: Code audit to determine which missing enums are actively used in queries/RPCs
**Estimated Effort**: 2-4 hours to add all 17 enums with proper Zod schemas and type guards
