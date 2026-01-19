# Zero Drift Platform

## Overview

The Zero Drift Platform is a comprehensive system that prevents any frontend↔backend integration errors including enum drift, RPC signature drift, table/column drift, PK misuse, bypass mutations, and crystallization sequencing issues.

**Design Principle**: It must be IMPOSSIBLE for the frontend to send invalid enums, call non-existent RPCs, or bypass canonical mutation paths.

---

## Architecture

### 1. Schema Truth Pack (Source of Truth)

**Location**: `artifacts/schema-truth-pack.json`, `docs/SCHEMA_TRUTH_PACK_LATEST.md`

The Schema Truth Pack is extracted directly from the live database and contains:
- All enum definitions with values
- All tables with columns and PK types
- All RPC function signatures
- All views, triggers, and indexes
- All RLS policies

**Generate**: `npm run schema:truth` (runs `scripts/schema-truth-pack.sh`)

### 2. TypeScript Contracts

**Location**: `src/contracts/`

Generated from the Schema Truth Pack, these provide compile-time and runtime safety:

| File | Purpose |
|------|---------|
| `dbEnums.ts` | Zod schemas for all DB enums with validation |
| `dbSchema.ts` | Table metadata including composite PK detection |
| `rpcSignatures.ts` | RPC function categorization and metadata |
| `index.ts` | Re-exports |

**Generate**: `npm run contracts:generate`
**Verify**: `npm run contracts:verify` (fails if drift detected)

### 3. Strict Gateways

All database access MUST go through these gateways:

#### RPC Gateway (`src/lib/rpc.ts`)
- Only allowed entry for `supabase.rpc()` calls
- Validates enum parameters using Zod before sending
- Maps UI-only types (e.g., FIRST_INVESTMENT → DEPOSIT)
- Normalizes errors into user-friendly messages
- Logs all mutation calls for audit

#### DB Gateway (`src/lib/db.ts`)
- Only allowed entry for `supabase.from()` reads
- Validates table and column existence
- **BLOCKS** `.select("id")` on composite PK tables
- Warns on performance-risky queries

### 4. CI Guardrails

The CI pipeline (`ci.yml`) enforces:

| Check | Script | Fails If |
|-------|--------|----------|
| Contract Drift | `contracts:verify` | Committed contracts differ from regenerated |
| SQL Hygiene | `sql:hygiene` | Forbidden patterns in migrations |
| Gateway Bypass | `gateway:check` | Direct `.rpc()` or `.from().insert/update/delete` outside gateways |
| Protected Tables | bash grep | Direct mutations to `transactions_v2`, `yield_distributions`, etc. |
| Composite PK | bash grep | `.select("id")` on `investor_positions` |
| FIRST_INVESTMENT | bash grep | UI-only type not properly mapped |

---

## Critical Invariants

### 1. Enum Safety

**Problem**: `tx_type="FIRST_INVESTMENT"` sent to DB causes `invalid input value for enum tx_type` error.

**Solution**:
- `FIRST_INVESTMENT` is defined as UI-only in `dbEnums.ts`
- `mapUITypeToDb()` converts `FIRST_INVESTMENT` → `DEPOSIT`
- RPC gateway validates all tx_type params before sending
- CI grep fails if FIRST_INVESTMENT appears in DB-bound code

```typescript
import { mapUITypeToDb, TxTypeSchema } from "@/contracts/dbEnums";

// UI can use FIRST_INVESTMENT
const uiType = "FIRST_INVESTMENT";

// Must convert before RPC
const dbType = mapUITypeToDb(uiType); // "DEPOSIT"

// RPC gateway validates automatically
await rpc.call("apply_deposit_with_crystallization", {
  p_type: dbType, // Validated
});
```

### 2. Composite Primary Key Safety

**Problem**: `investor_positions` has composite PK `(investor_id, fund_id)`. Using `.select("id")` fails.

**Solution**:
- `dbSchema.ts` marks tables with composite PKs
- `db.ts` gateway warns/blocks `.select("id")` on these tables
- CI grep catches the pattern

```typescript
// WRONG - will fail
await db.from("investor_positions").select("id").eq("investor_id", id);

// CORRECT
await db.from("investor_positions")
  .select("investor_id, fund_id, current_value")
  .eq("investor_id", id);
```

### 3. Protected Table Mutation Safety

**Problem**: Direct inserts to `transactions_v2` bypass crystallization and audit.

**Solution**:
- DB trigger `trg_enforce_transaction_via_rpc` blocks direct inserts
- Only canonical RPCs can set the bypass flag via `SET LOCAL`
- Gateway check fails if direct mutations detected
- All blocked attempts logged in `transaction_bypass_attempts`

Protected tables:
- `transactions_v2`
- `yield_distributions`
- `fund_daily_aum`
- `fund_aum_events`
- `yield_allocations`
- `fee_allocations`
- `ib_allocations`

### 4. Crystallization Sequencing

**Problem**: Transactions applied without crystallizing pending yield.

**Solution**:
- All transactions go through `apply_deposit_with_crystallization` or `apply_withdrawal_with_crystallization`
- These RPCs call `crystallize_yield_before_flow()` internally
- `is_crystallization_current()` function validates state
- Admin views show crystallization gaps

---

## Usage Guide

### For Developers

```typescript
// Import from gateways - NEVER from supabase directly
import { rpc } from "@/lib/rpc";
import { db } from "@/lib/db";
import { mapUITypeToDb, TxTypeSchema } from "@/contracts/dbEnums";

// Making RPC calls
const result = await rpc.call("apply_deposit_with_crystallization", {
  p_fund_id: fundId,
  p_investor_id: investorId,
  p_amount: 1000,
  p_type: mapUITypeToDb(uiType), // Always map UI types
  // ...
});

// Reading from DB
const { data } = await db.from("investors")
  .select("id, name, email")
  .eq("id", investorId);

// For investor_positions (composite PK):
const { data: position } = await db.from("investor_positions")
  .select("investor_id, fund_id, current_value") // NOT "id"
  .eq("investor_id", investorId)
  .eq("fund_id", fundId);
```

### For CI/CD

```bash
# Run all checks before merge
npm run integrity:check

# Individual checks
npm run contracts:verify   # Contract drift
npm run sql:hygiene        # SQL patterns
npm run gateway:check      # Gateway bypass
npm run db:smoke-test      # DB schema health

# Full audit
npm run audit:full
```

---

## Maintenance

### Adding New Enums

1. Add to database via migration
2. Run `npm run schema:truth` to update truth pack
3. Run `npm run contracts:generate` to regenerate contracts
4. Commit updated contracts
5. Update any UI mappings if needed

### Adding New RPC Functions

1. Add to database via migration
2. Run `npm run schema:truth`
3. Run `npm run contracts:generate`
4. Add to RPC gateway if it's a canonical mutation
5. Commit updated contracts

### Adding New Tables

1. Add to database via migration
2. Run `npm run schema:truth`
3. Run `npm run contracts:generate`
4. If composite PK, add to `COMPOSITE_PK_TABLES` in `dbSchema.ts`
5. If protected, add to CI check list
6. Commit updated contracts

---

## Files Reference

| File | Purpose |
|------|---------|
| `scripts/schema-truth-pack.sh` | Extract schema from live DB |
| `scripts/generate-contracts.ts` | Generate TS contracts |
| `scripts/verify-contracts.ts` | Detect contract drift |
| `scripts/check-gateway-usage.ts` | Detect gateway bypass |
| `scripts/sql-hygiene-check.ts` | Detect SQL anti-patterns |
| `scripts/db-smoke-test.sh` | Verify DB schema health |
| `scripts/run-full-audit.sh` | Run all checks |
| `src/contracts/dbEnums.ts` | Enum definitions + Zod schemas |
| `src/contracts/dbSchema.ts` | Table metadata |
| `src/contracts/rpcSignatures.ts` | RPC metadata |
| `src/lib/rpc.ts` | RPC gateway |
| `src/lib/db.ts` | DB gateway |
| `.github/workflows/ci.yml` | CI checks |
| `supabase/functions/integrity-monitor/` | Edge function for monitoring |

---

## Verification

Run the full verification suite:

```bash
npm run integrity:check && npm run audit:full
```

Expected output: All checks pass with green checkmarks.
