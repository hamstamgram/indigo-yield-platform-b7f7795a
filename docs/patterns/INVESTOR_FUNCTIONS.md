# Investor Functions Reference

> **Owner**: Engineering  
> **Last Updated**: 2026-01-19  
> **Next Review**: 2026-04-19

## Overview

This document catalogs the canonical investor-related functions and services, providing guidance on their usage patterns and the standardized service layer for investor data access.

## Canonical Lookup Service

All investor profile lookups should use **`src/services/investor/investorLookupService.ts`**:

```typescript
import { 
  getInvestorById,      // Full profile for detail views
  getInvestorsForList,  // Filtered list for admin views
  getInvestorRef,       // Minimal reference for dropdowns
  getInvestorRefs,      // Bulk lookup for transaction lists
  investorExists,       // Lightweight existence check
  getActiveInvestorCount // Dashboard metrics
} from "@/services/investor/investorLookupService";
```

### Migration Guide

| Old Pattern | New Pattern |
|-------------|-------------|
| `supabase.from("profiles").select().eq("id", id)` | `getInvestorById(id)` |
| `getAllInvestorsWithSummary()` | `getInvestorsForList()` |
| `fetchInvestorDetail()` | `getInvestorById()` |
| Direct profile queries in components | Import from `investorLookupService` |

---

## Position Services

Use **`src/services/investor/investorPositionService.ts`** for position queries:

```typescript
import {
  getInvestorPositions,      // Positions with fund details
  getUserPositions,          // Self-service position lookup
  fetchInvestorPositions,    // Raw position data
  getPositionsByFund,        // All positions for a fund
  getTotalAUM,               // Platform AUM calculation
  getActiveInvestorCount,    // Investor count with positions
  fetchInvestorsForSelector  // Dropdown items
} from "@/services/investor/investorPositionService";
```

---

## Database RPCs (Retained)

### Authorization & Access

| Function | Purpose | Called By |
|----------|---------|-----------|
| `can_access_investor(investor_uuid)` | RLS helper - checks if current user can access investor data | RLS policies, views |
| `force_delete_investor(p_investor_id, p_admin_id)` | Cascading investor deletion | Admin UI (reconciliationService.ts) |

### Balance & Withdrawal Validation

| Function | Purpose | Called By |
|----------|---------|-----------|
| `get_available_balance(p_investor_id, p_fund_id)` | Returns balance minus pending withdrawals | `validate_withdrawal_request` trigger |
| `can_withdraw(p_investor_id, p_fund_id, p_amount)` | Validates withdrawal eligibility | `create_withdrawal_request` RPC |

### Reconciliation

| Function | Purpose | Called By |
|----------|---------|-----------|
| `get_position_reconciliation(p_as_of_date, p_fund_id)` | Compares positions to ledger totals | Admin reconciliation UI |

---

## Dropped Functions (Phase 3)

The following functions were removed as dead code (no frontend callers, no internal usage):

| Function | Reason |
|----------|--------|
| `get_investor_period_summary` | Replaced by frontend calculations |
| `get_investor_position_as_of` | Replaced by direct ledger queries |
| `get_investor_positions_by_class` | Unused |
| `get_investor_yield_events_in_range` | Replaced by yield history service |
| `preview_investor_balances` | Unused |
| `get_position_at_date` | Only caller was dropped |
| `get_all_positions_at_date` | Replaced by position service queries |

---

## Best Practices

### 1. Use Service Layer for Lookups
Never query `profiles` directly in components. Use `investorLookupService` functions.

### 2. Filter System Accounts
When displaying investor lists, always filter by `account_type = 'investor'` to exclude:
- Fees accounts (`account_type = 'fees_account'`)
- IB accounts (check `ib_parent_id` or specific types)

### 3. Position Queries
Always use `shares > 0` or `current_value > 0` filters to exclude dormant positions.

### 4. Withdrawal Balance
Always use `get_available_balance` RPC (via trigger) rather than calculating manually—it accounts for pending withdrawals.

---

## Related Documentation

- [FEE_FUNCTIONS.md](./FEE_FUNCTIONS.md) - Fee resolution and calculation
- [YIELD_FUNCTIONS.md](./YIELD_FUNCTIONS.md) - Yield distribution RPCs
- [TRANSACTION_FUNCTIONS.md](./TRANSACTION_FUNCTIONS.md) - Transaction mutation lifecycle
- [ADMIN_FUNCTIONS.md](./ADMIN_FUNCTIONS.md) - Admin RBAC patterns
