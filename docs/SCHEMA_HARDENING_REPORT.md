# Schema Hardening Report

**Version:** 1.0  
**Date:** 2026-01-20  
**Status:** Implementation Complete

## Executive Summary

This report documents the Go-Live Schema Hardening implementation for the crypto yield platform. The changes ensure data integrity, consistent identity model, and deterministic queries without breaking the frontend.

## Issues Addressed

### 1. Duplicate Foreign Key Constraints
| Table | Column | Issue | Resolution |
|-------|--------|-------|------------|
| `transactions_v2` | `investor_id` | 2 FKs to same target | Keep `fk_transactions_v2_investor`, drop duplicate |
| `yield_distributions` | `fund_id` | 2 FKs to same target | Keep `fk_yield_distributions_fund_new`, drop old |

### 2. Duplicate Unique Indexes
| Table | Column | Issue | Resolution |
|-------|--------|-------|------------|
| `transactions_v2` | `reference_id` | 3+ unique indexes | Keep `idx_transactions_v2_reference_unique` (partial) |

### 3. Inconsistent Identity Model
| Table | Old Column | New Column | Status |
|-------|------------|------------|--------|
| `documents` | `user_id` | `user_profile_id` | Added + sync trigger |
| `documents` | `created_by` | `created_by_profile_id` | Added + sync trigger |
| `transactions_v2` | `voided_by` | `voided_by_profile_id` | Added + sync trigger |
| `fee_allocations` | `voided_by` | `voided_by_profile_id` | Added + sync trigger |
| `ib_allocations` | `voided_by` | `voided_by_profile_id` | Added + sync trigger |
| `fund_daily_aum` | `voided_by` | `voided_by_profile_id` | Added + sync trigger |
| `fund_aum_events` | `voided_by` | `voided_by_profile_id` | Added + sync trigger |

### 4. Missing Purpose Uniqueness
| Table | Constraint Added |
|-------|-----------------|
| `daily_nav` | `idx_daily_nav_fund_date_purpose_unique` |
| `fund_daily_aum` | `idx_fund_daily_aum_fund_date_purpose_active` (partial, non-voided) |

## Migration Files

### Release A (Additive)
1. `20260120000001_A1_daily_nav_purpose_unique.sql` - Add purpose uniqueness to daily_nav
2. `20260120000002_A2_fund_daily_aum_purpose_unique.sql` - Add purpose uniqueness to fund_daily_aum
3. `20260120000003_A3_documents_profile_columns.sql` - Add profile columns to documents
4. `20260120000004_A4_voided_by_profile_columns.sql` - Add voided_by_profile_id columns

### Release B (Backfill + Validate)
5. `20260120000005_B1_backfill_profile_columns.sql` - Backfill all profile columns
6. `20260120000006_B2_validate_constraints.sql` - Validate FK constraints

### Release C (Cleanup)
7. `20260120000007_C1_remove_duplicate_fks.sql` - Remove duplicate FK constraints
8. `20260120000008_C2_remove_duplicate_indexes.sql` - Remove duplicate unique indexes
9. `20260120000009_C3_compatibility_views.sql` - Create compatibility views

## Proof Suite

### Test Files
| File | Purpose |
|------|---------|
| `tests/sql/schema_invariants.sql` | Uniqueness, orphans, duplicate constraints |
| `tests/sql/identity_model.sql` | Profile column consistency |
| `tests/sql/period_integrity.sql` | Period uniqueness and validity |
| `tests/sql/aum_determinism.sql` | AUM query determinism |

### Running Tests
```bash
# Local Supabase
psql "postgresql://postgres:postgres@localhost:54322/postgres" -f tests/sql/schema_invariants.sql
psql "postgresql://postgres:postgres@localhost:54322/postgres" -f tests/sql/identity_model.sql
psql "postgresql://postgres:postgres@localhost:54322/postgres" -f tests/sql/period_integrity.sql
psql "postgresql://postgres:postgres@localhost:54322/postgres" -f tests/sql/aum_determinism.sql
```

## RPC and RLS Impact

### RPCs Requiring Update
| RPC | Change Required |
|-----|-----------------|
| `void_transaction` | Also set `voided_by_profile_id` |
| `void_yield_distribution` | Also set `voided_by_profile_id` |
| `void_fund_daily_aum` | Also set `voided_by_profile_id` |

### RLS Policies
No changes required - policies already use `auth.uid()` which maps to `profiles.id`.

## Compatibility Layer

### Views Created
- `v_documents_compat` - Exposes both legacy and canonical columns
- `v_transactions_voided_actors` - Voided transactions with actor profiles

### Sync Triggers
- `trg_documents_sync_profile_ids` - Syncs user_id → user_profile_id
- `trg_transactions_v2_sync_voided_by` - Syncs voided_by → voided_by_profile_id
- `trg_fee_allocations_sync_voided_by`
- `trg_ib_allocations_sync_voided_by`
- `trg_fund_daily_aum_sync_voided_by`
- `trg_fund_aum_events_sync_voided_by`

## Rollback Strategy

Each migration file contains a `-- ROLLBACK` section with reverse operations.

**Release A:** Drop new columns/indexes/triggers
**Release B:** Set backfilled columns to NULL
**Release C:** Recreate dropped constraints/indexes

## Go/No-Go Checklist

| Criterion | Gate |
|-----------|------|
| Release A migrations applied | ☐ |
| Release B backfills complete (0 NULL) | ☐ |
| Release C cleanup complete | ☐ |
| `schema_invariants.sql` passes | ☐ |
| `identity_model.sql` passes | ☐ |
| `period_integrity.sql` passes | ☐ |
| `aum_determinism.sql` passes | ☐ |
| No duplicate FK constraints | ☐ |
| Purpose uniqueness enforced | ☐ |
| Frontend works | ☐ |
| RPCs updated | ☐ |

## Appendix: Constraint Naming Convention

- FK: `{table}_{column}_fkey` or `fk_{table}_{column}`
- Unique: `idx_{table}_{columns}_unique`
- Partial unique: `idx_{table}_{columns}_active` (WHERE is_voided = false)
