# Database Contract Enforcement System

This document describes the type-safe contract enforcement system that prevents enum mismatches between the frontend and database.

## Problem Statement

The platform experienced runtime errors like:
```
invalid input value for enum tx_type: "FIRST_INVESTMENT"
```

This happened because:
1. The UI allowed `FIRST_INVESTMENT` as a transaction type
2. The database enum `tx_type` doesn't include `FIRST_INVESTMENT`
3. TypeScript types for RPC calls used `string` instead of the enum type

## Solution Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   UI Layer      │───▶│  Contract Layer  │───▶│   Database      │
│                 │    │                  │    │                 │
│ FIRST_INVESTMENT│    │  mapUITypeToDb() │    │  DEPOSIT        │
│ DEPOSIT         │    │  validateRPC()   │    │  WITHDRAWAL     │
│ WITHDRAWAL      │    │  Zod schemas     │    │  YIELD          │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Components

### 1. Database Enum Contracts (`src/contracts/dbEnums.ts`)

Single source of truth for database enum values:

```typescript
import { TxTypeSchema, mapUITypeToDb, isValidTxType } from "@/contracts/dbEnums";

// Runtime validation
const validated = TxTypeSchema.parse(userInput); // throws if invalid
const result = TxTypeSchema.safeParse(userInput); // { success, data?, error? }

// Map UI types to DB types
const dbType = mapUITypeToDb("FIRST_INVESTMENT"); // "DEPOSIT"

// Type checking
if (isValidTxType(value)) {
  // value is TxType here
}
```

### 2. Typed RPC Layer (`src/lib/supabase/typedRPC.ts`)

Runtime validation before RPC calls:

```typescript
import { callRPC } from "@/lib/supabase/typedRPC";

// Automatically validates enum parameters
const { data, error } = await callRPC("admin_create_transaction", {
  p_type: "DEPOSIT", // ✅ Valid
  // p_type: "FIRST_INVESTMENT", // ❌ Throws helpful error
  // ...
});
```

### 3. Error Handler (`src/lib/errors/rpcErrors.ts`)

User-friendly error messages:

```typescript
import { getUserFriendlyError, createToastError } from "@/lib/errors";

try {
  await someRPCCall();
} catch (error) {
  const message = getUserFriendlyError(error);
  // "Transaction type error: 'First Investment' should be processed as a regular deposit."

  // Or for toast notifications:
  const toast = createToastError(error);
  showToast(toast);
}
```

### 4. CI Verification (`scripts/verify-enum-contracts.ts`)

Detects enum drift between contracts and database:

```bash
npm run contracts:verify
```

Output:
```
🔍 Verifying Database Enum Contracts

✓ Read src/integrations/supabase/types.ts
✓ Read src/contracts/dbEnums.ts

✓ tx_type: 11 values match
✓ aum_purpose: 2 values match

✓ All enum contracts are in sync
```

## Valid Transaction Types

### Database Enum (`tx_type`)
| Value | Description |
|-------|-------------|
| DEPOSIT | Investor deposits funds |
| WITHDRAWAL | Investor withdraws funds |
| INTEREST | Interest payment |
| FEE | Fee charge |
| ADJUSTMENT | Manual balance adjustment |
| FEE_CREDIT | Fee credit (refund) |
| IB_CREDIT | Introducing Broker credit |
| YIELD | Yield distribution |
| INTERNAL_WITHDRAWAL | Internal transfer out |
| INTERNAL_CREDIT | Internal transfer in |
| IB_DEBIT | Introducing Broker debit |

### UI-Only Type
| Value | Maps To | tx_subtype |
|-------|---------|------------|
| FIRST_INVESTMENT | DEPOSIT | `first_investment` |

## Usage Guidelines

### ✅ Correct Pattern

```typescript
import { mapUITypeToDb, getDefaultSubtype } from "@/contracts/dbEnums";

// In UI form handler
const uiType = formData.type; // "FIRST_INVESTMENT" or "DEPOSIT"
const dbType = mapUITypeToDb(uiType); // Always valid DB type
const subtype = getDefaultSubtype(uiType); // "first_investment" or "top_up"

await callRPC("admin_create_transaction", {
  p_type: dbType, // ✅ Always passes validation
  // ...
});
```

### ❌ Incorrect Pattern

```typescript
// DON'T send UI types directly to RPC
await supabase.rpc("admin_create_transaction", {
  p_type: "FIRST_INVESTMENT", // ❌ Will fail at database level
});
```

## Adding New Enum Values

When the database enum changes:

1. **Update Supabase types**:
   ```bash
   npx supabase gen types typescript --local > src/integrations/supabase/types.ts
   ```

2. **Update contracts**:
   Edit `src/contracts/dbEnums.ts` to add the new value to `TX_TYPE_VALUES`

3. **Run verification**:
   ```bash
   npm run contracts:verify
   ```

4. **Update tests**:
   The unit tests in `src/test/unit/contracts/dbEnums.test.ts` will fail if values don't match

## Testing

```bash
# Run contract tests
npm test -- --testPathPattern="dbEnums"

# Run CI verification
npm run contracts:verify
```

## Related Files

- `src/contracts/dbEnums.ts` - Zod schemas and mapping utilities
- `src/contracts/index.ts` - Barrel export
- `src/lib/supabase/typedRPC.ts` - Type-safe RPC with validation
- `src/lib/errors/rpcErrors.ts` - User-friendly error messages
- `src/types/domains/transaction.ts` - Transaction type definitions
- `scripts/verify-enum-contracts.ts` - CI verification script
- `src/test/unit/contracts/dbEnums.test.ts` - Unit tests
