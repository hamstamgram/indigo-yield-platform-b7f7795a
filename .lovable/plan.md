

# Fix: Align All Transaction & Withdrawal Filters with Database

## Analysis Summary

### Transaction Page Filters vs Database Reality

| UI Filter Value | UI Label | Database Reality | Match? |
|-----------------|----------|------------------|--------|
| `DEPOSIT` | Deposits | 8 records exist | Yes |
| `WITHDRAWAL` | Withdrawals | 0 records (valid type) | Yes |
| `FEE` | Fees | **0 records - type not used** | **BROKEN** |
| `YIELD` | Yield | 8 records exist | Yes |
| - | - | `FEE_CREDIT`: 7 records | **Missing** |
| - | - | `IB_CREDIT`: 7 records | **Missing** |

### Database tx_type Enum (Full List)
```
DEPOSIT, WITHDRAWAL, INTEREST, FEE, ADJUSTMENT, 
FEE_CREDIT, IB_CREDIT, YIELD, INTERNAL_WITHDRAWAL, 
INTERNAL_CREDIT, IB_DEBIT
```

### Withdrawal Page Filters vs Database Reality

| UI Filter Value | UI Label | Database Reality | Match? |
|-----------------|----------|------------------|--------|
| `pending` | Pending | Valid enum value | Yes |
| `approved` | Approved | Valid enum value | Yes |
| `processing` | Processing | Valid enum value | Yes |
| `completed` | Completed | Valid enum value | Yes |
| `rejected` | Rejected | Valid enum value | Yes |
| `cancelled` | Cancelled | Valid enum value | Yes |

**Withdrawal filters are already correct** - they match the database `withdrawal_status` enum exactly.

---

## Changes Required

### File 1: `src/features/admin/transactions/pages/AdminTransactionsPage.tsx`

**Lines 337-358: Update Base Type and Category filters**

Current Base Type filter options:
```typescript
<SelectItem value="DEPOSIT">Deposits</SelectItem>
<SelectItem value="WITHDRAWAL">Withdrawals</SelectItem>
<SelectItem value="FEE">Fees</SelectItem>          // BROKEN - no data
<SelectItem value="YIELD">Yield</SelectItem>
```

Updated Base Type filter options:
```typescript
<SelectItem value="DEPOSIT">Deposits</SelectItem>
<SelectItem value="WITHDRAWAL">Withdrawals</SelectItem>
<SelectItem value="YIELD">Yield</SelectItem>
<SelectItem value="FEE_CREDIT">Fee Credits</SelectItem>     // NEW
<SelectItem value="IB_CREDIT">IB Credits</SelectItem>       // NEW
<SelectItem value="ADJUSTMENT">Adjustments</SelectItem>     // NEW (for completeness)
```

Current Category filter options:
```typescript
<SelectItem value="First Investment">First Investment</SelectItem>
<SelectItem value="Top-up">Top-up</SelectItem>
<SelectItem value="Withdrawal">Withdrawal</SelectItem>
<SelectItem value="Withdrawal All">Withdrawal All</SelectItem>
<SelectItem value="Fee">Fee</SelectItem>              // BROKEN - no data matches
<SelectItem value="Yield">Yield</SelectItem>
```

Updated Category filter options:
```typescript
<SelectItem value="First Investment">First Investment</SelectItem>
<SelectItem value="Top-up">Top-up</SelectItem>
<SelectItem value="Withdrawal">Withdrawal</SelectItem>
<SelectItem value="Withdrawal All">Withdrawal All</SelectItem>
<SelectItem value="Yield">Yield</SelectItem>
<SelectItem value="Fee Credit">Fee Credit</SelectItem>      // NEW
<SelectItem value="IB Credit">IB Credit</SelectItem>        // NEW
<SelectItem value="Adjustment">Adjustment</SelectItem>      // NEW
```

### File 2: `src/services/admin/adminTransactionHistoryService.ts`

**Lines 70-78: Update SUBTYPE_DISPLAY_MAP**

Add mappings for fee credit and IB credit subtypes:
```typescript
const SUBTYPE_DISPLAY_MAP: Record<string, string> = {
  first_investment: "First Investment",
  deposit: "Top-up",
  redemption: "Withdrawal",
  full_redemption: "Withdrawal All",
  fee_charge: "Fee",
  yield_credit: "Yield",
  adjustment: "Adjustment",
  fee_credit: "Fee Credit",      // NEW
  ib_credit: "IB Credit",        // NEW
};
```

**Lines 154-160: Update fallback displayType logic**

Current:
```typescript
if (tx.type === "DEPOSIT") displayType = "Top-up";
else if (tx.type === "WITHDRAWAL") displayType = "Withdrawal";
else if (tx.type === "INTEREST") displayType = "Yield";
else if (tx.type === "FEE") displayType = "Fee";
```

Updated:
```typescript
if (tx.type === "DEPOSIT") displayType = "Top-up";
else if (tx.type === "WITHDRAWAL") displayType = "Withdrawal";
else if (tx.type === "INTEREST" || tx.type === "YIELD") displayType = "Yield";
else if (tx.type === "FEE") displayType = "Fee";
else if (tx.type === "FEE_CREDIT") displayType = "Fee Credit";
else if (tx.type === "IB_CREDIT") displayType = "IB Credit";
else if (tx.type === "ADJUSTMENT") displayType = "Adjustment";
```

---

## Withdrawals Page Status

The withdrawal filters in `WithdrawalsTable.tsx` (lines 391-399) are already correctly aligned with the database:

```typescript
<SelectItem value="all">All Status</SelectItem>
<SelectItem value="pending">Pending</SelectItem>
<SelectItem value="approved">Approved</SelectItem>
<SelectItem value="processing">Processing</SelectItem>
<SelectItem value="completed">Completed</SelectItem>
<SelectItem value="rejected">Rejected</SelectItem>
<SelectItem value="cancelled">Cancelled</SelectItem>
```

These match the database enum `withdrawal_status` exactly. **No changes needed.**

---

## Visual Summary of Changes

```text
TRANSACTION FILTERS
===================

Base Type Dropdown (Before):
+------------------+
| Deposits         |  -> DEPOSIT (works)
| Withdrawals      |  -> WITHDRAWAL (works)
| Fees             |  -> FEE (BROKEN - 0 records)
| Yield            |  -> YIELD (works)
+------------------+

Base Type Dropdown (After):
+------------------+
| Deposits         |  -> DEPOSIT
| Withdrawals      |  -> WITHDRAWAL
| Yield            |  -> YIELD
| Fee Credits      |  -> FEE_CREDIT (7 records)
| IB Credits       |  -> IB_CREDIT (7 records)
| Adjustments      |  -> ADJUSTMENT
+------------------+

Category Dropdown (Before):
+------------------+
| First Investment |
| Top-up           |
| Withdrawal       |
| Withdrawal All   |
| Fee              |  <- BROKEN
| Yield            |
+------------------+

Category Dropdown (After):
+------------------+
| First Investment |
| Top-up           |
| Withdrawal       |
| Withdrawal All   |
| Yield            |
| Fee Credit       |  <- NEW
| IB Credit        |  <- NEW
| Adjustment       |  <- NEW
+------------------+
```

---

## Testing Verification

After implementation:

1. Navigate to `/admin/transactions`
2. Apply "Fee Credits" base type filter -> Should show 7 FEE_CREDIT transactions
3. Apply "IB Credits" base type filter -> Should show 7 IB_CREDIT transactions
4. Apply "Yield" base type filter -> Should show 8 YIELD transactions
5. Apply "Deposits" base type filter -> Should show 8 DEPOSIT transactions
6. Try Category filter "Fee Credit" -> Should match `displayType="Fee Credit"`
7. Try Category filter "IB Credit" -> Should match `displayType="IB Credit"`

For withdrawals (no changes needed):
1. Navigate to `/admin/withdrawals`
2. Verify all status filters work (pending, approved, processing, completed, rejected, cancelled)

