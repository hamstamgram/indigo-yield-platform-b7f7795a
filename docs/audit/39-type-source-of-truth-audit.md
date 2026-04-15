# Type Source-of-Truth Audit - Release Validation

**Purpose:** Ensure frontend and backend share consistent type contracts  
**Scope:** Generated types, local types, DTOs, validators  
**Date:** 2026-04-14

---

## A. Type Source-of-Truth Map

### Category 1: Generated Types (Canonical - DO NOT EDIT)

| Source File | Type | Purpose | Regeneration |
|-------------|------|---------|--------------|
| `src/integrations/supabase/types.ts` | `Database["public"]["Tables"]` | Table row types | `npm run contracts:generate` |
| `src/integrations/supabase/types.ts` | `Database["public"]["Functions"]` | RPC function signatures | `npm run contracts:generate` |
| `src/integrations/supabase/types.ts` | `Database["public"]["Enums"]` | Enum types | `npm run contracts:generate` |
| `src/contracts/rpcSignatures.ts` | `RPCFunctionName`, `RPC_SIGNATURES` | RPC registry + schemas | `npm run contracts:generate` |
| `src/contracts/dbSchema.ts` | `DB_TABLES` | Table metadata | `npm run contracts:generate` |
| `src/contracts/dbEnums.ts` | Zod enum schemas | Enum validation | `npm run contracts:generate` |

### Category 2: Domain Types (Canonical - EDITABLE)

| Source File | Types | Source-of-Truth |
|-------------|-------|-----------------|
| `src/types/domains/transaction.ts` | `Transaction`, `TransactionType`, `CreateTransactionParams` | DB + local extensions |
| `src/types/domains/yieldDistributionRecord.ts` | `YieldDistributionRow`, `YieldDistributionRecord` | DB types + local extensions |
| `src/types/domains/withdrawal.ts` | `Withdrawal`, `WithdrawalStatus` | DB types + local extensions |
| `src/types/domains/feeAllocation.ts` | `FeeAllocationRow`, `FeeAllocationInsert` | DB types |

### Category 3: Service Return Types (Local - EDITABLE)

| Source File | Type | Maps To |
|-------------|------|---------|
| `src/features/shared/services/transactionsV2Service.ts` | `TransactionRecord` | `transactions_v2.Row` (partial) |
| `src/features/admin/transactions/services/adminTransactionHistoryService.ts` | `TransactionRow`, `VoidTransactionParams` | DB + local |
| `src/features/admin/yields/services/yields/yieldApplyService.ts` | Yield result mapping | RPC response |
| `src/services/investor/investmentService.ts` | Investment result | RPC response |

### Category 4: Form Validation Schemas (Local - EDITABLE)

| Source File | Schema | Validates |
|-------------|--------|-----------|
| `src/lib/validation/schemas.ts` | `depositSchema`, `withdrawalRequestSchema`, `adminDepositSchema` | Form inputs |
| `src/lib/validation/deposit.ts` | `depositSchema` | Deposit form |
| `src/lib/validation/investment.ts` | `investmentFormSchema` | Investment form |

---

## B. Drift Report

### Identified Drifts

| ID | Type Location | Drift Type | Severity | Fix |
|----|---------------|------------|----------|-----|
| D1 | `TransactionRecord` (transactionsV2Service.ts:13) | Duplicated from DB type | P2 | Remove, import from `types/domains/transaction.ts` |
| D2 | `TransactionRow` (adminTransactionHistoryService.ts:29) | Duplicated from DB type | P2 | Remove, import from `types/domains/transaction.ts` |
| D3 | `TransactionType` (dbEnums.ts:757) vs (transaction.ts:12) | Dual definition | P1 | Consolidate to `transaction.ts` only |
| D4 | `TransactionStatus` (dbEnums.ts:721) vs (enums.ts:40) | Dual definition | P2 | Consolidate |
| D5 | `YieldDistributionRow` generated vs `YieldDistributionRecord` local | Both exist | P2 | Use generated, extend in domain file |
| D6 | Form schemas duplicate DB types | Validation uses separate types | P3 | Schemas are form-specific, acceptable |
| D7 | `VoidTransactionParams` (transaction.ts:478) vs actual RPC params | Local params may not match RPC | P1 | Verify against `rpcSignatures.ts` |

### Nullability Drift

| Field | Frontend Expects | Actual DB | Risk |
|-------|-----------------|-----------|------|
| `transactions_v2.reference_id` | `string` | `string \| null` | Low - handled by `??` |
| `transactions_v2.notes` | `string` | `string \| null` | Low - handled by `??` |
| `investor_positions.current_value` | `number` | `numeric` (can be null) | **HIGH** - Parsing may fail |

### Enum Drift Risk

| Enum | Frontend Defines | Backend Has | Status |
|------|-----------------|-------------|--------|
| `tx_type` | `deposit`, `withdrawal`, `yield`, `fee`, `transfer`, `adjustment` | Query DB | ⚠️ Unverified - compare against `dbEnums.ts` |
| `withdrawal_status` | `PENDING`, `APPROVED`, `PROCESSING`, `COMPLETED`, `CANCELLED`, `REJECTED` | Query DB | ⚠️ Unverified |
| `fund_class` | `STRATEGY`, `INDEX`, `STRUCTURED` | Query DB | ⚠️ Unverified |

---

## C. Release Risk Items

### P0 - Must Fix Before Release

| Risk | Location | Issue | Fix |
|------|----------|-------|-----|
| **R1** | `types/domains/transaction.ts` + `dbEnums.ts` | `TransactionType` defined in two places, may diverge | Keep only in `transaction.ts`, remove from `dbEnums.ts` |
| **R2** | `adminTransactionHistoryService.ts` | `VoidTransactionParams` not validated against actual RPC | Run `npm run contracts:generate` to sync |

### P1 - Should Fix Before Release

| Risk | Location | Issue | Fix |
|------|----------|-------|-----|
| **R3** | `transactionsV2Service.ts` | `TransactionRecord` duplicates DB type | Import from domain types |
| **R4** | `adminTransactionHistoryService.ts` | `TransactionRow` duplicates DB type | Import from domain types |
| **R5** | `dbEnums.ts` vs `types/domains/enums.ts` | `TransactionStatus` duplicated | Consolidate |

### P2 - Defer (Technical Debt)

| Risk | Location | Issue | Fix |
|------|----------|-------|-----|
| R6 | Form schemas | Duplicate field lists from DB types | Acceptable - schemas are form-specific |
| R7 | Multiple `YieldDistribution*` types | Generated + local + domain | Document, standardize on domain file |

---

## D. Canonical Type Recommendations

### Recommended Pattern

```
DB Types (Generated) → Domain Types (Local Extension) → Service/Component Types
```

### By Domain

| Domain | Canonical Source | Import Path |
|--------|-----------------|-------------|
| **Transactions** | `src/types/domains/transaction.ts` | Use `Transaction`, `TransactionType` from here |
| **Yield Distributions** | `src/types/domains/yieldDistributionRecord.ts` | Use `YieldDistributionRow` from here |
| **Withdrawals** | `src/types/domains/withdrawal.ts` | Use `Withdrawal`, `WithdrawalStatus` from here |
| **Fee Allocations** | Generated from Supabase | Use `Database["public"]["Tables"]["fee_allocations"]["Row"]` |
| **Investor Positions** | Generated from Supabase | Use `Database["public"]["Tables"]["investor_positions"]["Row"]` |
| **Funds** | Generated from Supabase | Use `Database["public"]["Tables"]["funds"]["Row"]` |
| **Enums** | `src/contracts/dbEnums.ts` | Use Zod schemas for validation, not for runtime |

### Migration Path (Post-Release)

1. **Remove duplicated Transaction types** - Delete `TransactionRecord`, `TransactionRow` from service files, import from domain
2. **Consolidate enum exports** - Keep only in `dbEnums.ts` (validation) and domain files (runtime)
3. **Add run-time enum validation** - Query DB enums on app load to verify frontend matches backend

---

## E. Pre-Release Type Check Commands

```bash
# 1. Verify generated types are up-to-date
npm run contracts:generate
git diff src/integrations/supabase/types.ts  # Should be empty or minimal

# 2. Check for unused type imports
grep -r "import.*from.*types.ts" src --include="*.ts" | grep -v "integrations/supabase"

# 3. Verify schema regeneration didn't break imports
npx tsc --noEmit 2>&1 | grep "Cannot find"

# 4. Count duplicate type definitions (should be 0 for core types)
grep -r "export interface Transaction" src --include="*.ts" | wc -l
```

---

## F. Summary

| Category | Status |
|----------|--------|
| Generated types | ✅ Up-to-date (must run `contracts:generate` before release) |
| Domain types | ⚠️ Some duplication - recommended cleanup post-release |
| Service types | ⚠️ Duplicated from DB types - should import from domain |
| Form schemas | ✅ Separate from DB types - correct pattern |
| Enums | ⚠️ Dual definitions exist - risk of drift |

### Immediate Actions

1. **Run `npm run contracts:generate`** - Ensure generated types match live DB
2. **Verify no TypeScript errors** - `npx tsc --noEmit`
3. **Verify void_transaction params match** - Should be `p_transaction_id`, `p_admin_id`, `p_reason`

### Post-Release Cleanup (Recommended)

1. Remove `TransactionRecord`, `TransactionRow` duplicates
2. Consolidate `TransactionType` to single source
3. Add runtime enum validation against DB