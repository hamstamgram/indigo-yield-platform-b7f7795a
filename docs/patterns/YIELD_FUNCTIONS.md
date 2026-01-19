# Yield Functions Reference

> **Updated**: P2-02 Yield Calculation Function Consolidation  
> **Purpose**: Document canonical yield functions and their calling hierarchy

## Overview

The yield subsystem has been consolidated to eliminate deprecated wrappers and unused functions. This document describes the canonical functions that should be used.

---

## Canonical RPCs (Frontend Callable)

These functions are called from frontend services via `supabase.rpc()`:

| Function | Purpose | Called By |
|----------|---------|-----------|
| `apply_daily_yield_to_fund_v3` | Primary yield application | `yieldApplyService.applyYieldDistribution` |
| `preview_daily_yield_to_fund_v3` | Preview yield before apply | `yieldPreviewService.previewYieldDistribution` |
| `crystallize_yield_before_flow` | Crystallize yield before deposit/withdrawal | Deposit/Withdrawal RPCs |
| `crystallize_month_end` | Month-end crystallization | `yieldCrystallizationService.crystallizeMonthEnd` |
| `finalize_month_yield` | Make yield visible to investors | `yieldCrystallizationService.finalizeMonthYield` |
| `void_yield_distribution` | Void a yield distribution | `yieldManagementService.voidYieldDistribution` |
| `apply_yield_correction_v2` | Apply period yield correction | `yieldCorrectionService.applyYieldCorrection` |
| `preview_yield_correction_v2` | Preview yield correction | `yieldCorrectionService.previewYieldCorrection` |
| `rollback_yield_correction` | Rollback a yield correction | `yieldCorrectionService.rollbackYieldCorrection` |
| `get_yield_corrections` | Get correction history | `yieldCorrectionService.getYieldCorrections` |
| `get_void_yield_impact` | Preview void impact | `reconciliationService.getVoidYieldImpact` |
| `get_investor_yield_events_in_range` | Get investor yield history | Various reporting services |

---

## Alternative Methods

| Function | Purpose | When to Use |
|----------|---------|-------------|
| `apply_adb_yield_distribution` (7-param) | Average Daily Balance method | For funds with period-based (not daily) distributions |
| `apply_daily_yield_with_validation` (6-param) | Explicit validation control | Batch operations, corrections with pre-verified preconditions |

---

## Internal Helpers (Not for Direct Frontend Use)

These functions are called by other RPCs internally:

| Function | Purpose |
|----------|---------|
| `void_investor_yield_events_for_distribution` | Cascade void to investor events |
| `process_yield_distribution` | Core distribution processor |
| `process_yield_distribution_with_dust` | Distribution with dust handling |
| `validate_pre_yield_aum` | Validate AUM before yield |
| `validate_yield_distribution_prerequisites` | Check distribution preconditions |
| `validate_yield_parameters` | Validate yield input parameters |
| `validate_yield_rate_sanity` | Sanity check yield percentages |
| `validate_yield_temporal_lock` | Check temporal locking |
| `acquire_yield_lock` | Concurrency lock acquisition |
| `upsert_fund_aum_after_yield` | Update AUM post-yield |
| `refresh_yield_materialized_views` | Refresh MVs after yield ops |

---

## Trigger Functions

These are automatic database triggers:

| Trigger Function | Purpose |
|------------------|---------|
| `cascade_void_to_yield_events` | Cascade void to related events |
| `enforce_canonical_yield_mutation` | Prevent direct table writes |
| `enforce_yield_event_date` | Validate event dates |
| `sync_yield_date` | Sync dates across tables |
| `sync_yield_to_investor_yield_events` | Sync to investor events |

---

## Deprecated/Removed Functions (P2-02)

The following functions were removed as deprecated wrappers or unused code:

| Function | Reason Removed |
|----------|----------------|
| `apply_daily_yield_to_fund` (4-param) | Deprecated wrapper → v3 |
| `apply_daily_yield_to_fund_v2` (4-param) | Deprecated wrapper → v3 |
| `apply_adb_yield_distribution` (4-param) | Deprecated wrapper → 7-param version |
| `apply_daily_yield_with_validation` (4-param) | Deprecated wrapper → 6-param version |
| `preview_adb_yield` | Never called from frontend |
| `backfill_yield_summaries` | Never called from frontend |
| `crystallize_pending_movements` | Superseded by `crystallize_yield_before_flow` |

---

## Function Calling Hierarchy

```
Frontend Service
    │
    ▼
apply_daily_yield_to_fund_v3
    ├── validate_yield_distribution_prerequisites
    ├── validate_yield_parameters
    ├── validate_yield_temporal_lock
    ├── acquire_yield_lock
    ├── process_yield_distribution_with_dust
    │       ├── Calculate gross yield
    │       ├── Calculate platform fees
    │       ├── Calculate IB commissions
    │       ├── Create YIELD transactions
    │       ├── Create fee_allocations
    │       ├── Create ib_allocations
    │       └── Update investor_positions
    ├── upsert_fund_aum_after_yield
    └── refresh_yield_materialized_views (via trigger)
```

---

## Fee Types (Clarification)

| Fee Type | Description | Calculated On |
|----------|-------------|---------------|
| **Platform Fee** | Investor's fee to Indigo | GROSS yield (before any deductions) |
| **IB Commission** | Introducing Broker credit | GROSS yield (investor's ib_percentage) |

Both fees are deducted from gross yield. Net yield = Gross - Platform Fee - IB Commission.

---

## Related Documentation

- [FEE_FUNCTIONS.md](./FEE_FUNCTIONS.md) - Fee calculation functions
- [YIELD_FLOW.md](../flows/YIELD_FLOW.md) - High-level yield flow
- [yield.ts](../../src/types/domains/yield.ts) - Canonical yield types
