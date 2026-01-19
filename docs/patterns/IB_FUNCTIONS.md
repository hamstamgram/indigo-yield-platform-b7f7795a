# IB Function Patterns

> **Owner**: Engineering  
> **Last Updated**: 2026-01-19  
> **Next Review**: 2026-04-19

## Overview

This document describes the canonical IB (Introducing Broker) database functions and frontend services. IBs earn commission from referrals' yield distributions.

## Trigger Functions (Data Integrity - NEVER DROP)

These functions are attached to active triggers and enforce data integrity:

| Function | Trigger | Table | Purpose |
|----------|---------|-------|---------|
| `audit_ib_allocation_payout()` | `ib_allocation_payout_audit` | `ib_allocations` | Audits payout status changes |
| `sync_ib_account_type()` | `trigger_sync_ib_account_type` | `user_roles` | Syncs account_type to 'ib' when IB role assigned |
| `validate_ib_parent_has_role()` | `trg_validate_ib_parent_role` | `profiles` | Validates ib_parent_id references user with IB role |

## Frontend Services (`src/services/ib/`)

The IB service layer is organized into focused modules:

| Service | Purpose |
|---------|---------|
| `ibService.ts` | Portal operations - commissions, referrals, payouts for IB dashboard |
| `allocations.ts` | Yield allocation calculations during distribution |
| `config.ts` | IB configuration CRUD (get/update ib_parent_id, ib_percentage) |
| `management.ts` | IB role assignment and management |
| `referrals.ts` | IB referral queries |

### Key Data Flow

```
Investor Yield Distribution
         │
         ▼
┌─────────────────────┐
│ Check ib_parent_id  │  (from profiles)
└─────────────────────┘
         │ If has IB parent
         ▼
┌─────────────────────┐
│ Calculate IB fee    │  ib_fee = net_income × ib_percentage / 100
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│ Record to           │
│ ib_allocations      │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│ IB Dashboard shows  │  pending → paid via admin payout
│ commission summary  │
└─────────────────────┘
```

## Hooks (`src/hooks/data/shared/`)

| Hook | Purpose |
|------|---------|
| `useIBData.ts` | Commission summaries, referrals, payouts, positions |
| `useIBSettings.ts` | IB configuration, role assignment, search |

## Admin Services (`src/services/admin/`)

| Service | Purpose |
|---------|---------|
| `ibUsersService.ts` | Fetch users with IB role for investor wizard |
| `ibPayoutService.ts` | Manage IB commission payouts (pending → paid) |

## Database Tables

| Table | Purpose |
|-------|---------|
| `ib_allocations` | Commission records (amount, status, period) |
| `profiles.ib_parent_id` | FK to IB investor |
| `profiles.ib_percentage` | Commission percentage (0-100) |
| `user_roles` | IB role assignment |

## Deprecated Functions (Phase 4 Cleanup)

The following functions were removed as dead code:

| Function | Reason |
|----------|--------|
| `check_duplicate_ib_allocations()` | No frontend/internal callers |
| `is_ib(uuid)` | No frontend/RLS/internal callers |

## Related Documentation

- [INVESTOR_FUNCTIONS.md](./INVESTOR_FUNCTIONS.md) - Investor lookup and position services
- [YIELD_FUNCTIONS.md](./YIELD_FUNCTIONS.md) - Yield distribution canonical RPCs
- [FEE_FUNCTIONS.md](./FEE_FUNCTIONS.md) - Fee calculation hierarchy
