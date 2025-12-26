# Transaction Entry Points Map

Generated: 2025-12-22

## Entry Point Inventory

| Entry Point | Component | Handler | Service | RPC | Cache Invalidation |
|------------|-----------|---------|---------|-----|-------------------|
| **Investor Profile Ledger** | `InvestorLedgerTab.tsx:246-252` | `setAddTxDialogOpen(true)` | `createAdminTransaction` | Direct insert + trigger | ✅ 9 query keys |
| **Transaction History Page** | `AdminTransactionsPage.tsx:414-417` | `handleOpenAddDialog` | `createAdminTransaction` | Direct insert + trigger | ✅ 9 query keys |
| **Admin Manual Transaction** | `AdminManualTransaction.tsx` | Form submit | `createAdminTransaction` | Direct insert + trigger | ✅ 9 query keys |

## Service Unification: ✅ COMPLETE

All three entry points now use the same `createAdminTransaction` service from `src/services/shared/transactionService.ts`.

### Service Features:
1. **FIRST_INVESTMENT Support**: Maps to DEPOSIT type with `first_investment` subtype
2. **Consistent Parameter Names**: Uses snake_case (`investor_id`, `fund_id`, `tx_date`)
3. **Auto Subtype**: Derives `tx_subtype` from transaction type
4. **Audit Trail**: Sets `created_by`, `approved_by`, `approved_at`

## Cache Invalidation Keys (All Entry Points)

```typescript
queryClient.invalidateQueries({ queryKey: ["investor-ledger"] });
queryClient.invalidateQueries({ queryKey: ["investor-ledger", investorId] });
queryClient.invalidateQueries({ queryKey: ["investor-positions"] });
queryClient.invalidateQueries({ queryKey: ["investor-positions", investorId] });
queryClient.invalidateQueries({ queryKey: ["fund-aum"] });
queryClient.invalidateQueries({ queryKey: ["fund-aum-unified"] });
queryClient.invalidateQueries({ queryKey: ["admin-transactions"] });
queryClient.invalidateQueries({ queryKey: ["transactions"] });
queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
```

## Dropdown Verification: FIRST_INVESTMENT

**File**: `src/components/admin/AddTransactionDialog.tsx` (lines 573-600)

```tsx
<SelectItem 
  value="FIRST_INVESTMENT" 
  disabled={hasExistingPosition}
  className={cn(hasExistingPosition && "opacity-50")}
>
  First Investment {hasExistingPosition && "(position exists)"}
</SelectItem>
<SelectItem 
  value="DEPOSIT" 
  disabled={isFirstInvestment}
  className={cn(isFirstInvestment && "opacity-50")}
>
  Deposit / Top-up {isFirstInvestment && "(no position yet)"}
</SelectItem>
```

**Behavior**:
- FIRST_INVESTMENT: Enabled when balance = 0, disabled when balance > 0
- DEPOSIT: Enabled when balance > 0, disabled when balance = 0
- Auto-selection: Switches type automatically when balance changes
