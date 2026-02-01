# Schema Hardening Report

**Version:** 2.0  
**Date:** 2026-01-20  
**Status:** ✅ COMPLETE

## Executive Summary

This report documents the Go-Live Schema Hardening implementation for the crypto yield platform. All changes have been successfully applied ensuring data integrity, consistent identity model, and deterministic queries.

## Issues Addressed

### 1. Duplicate Foreign Key Constraints ✅
| Table | Column | Issue | Resolution | Status |
|-------|--------|-------|------------|--------|
| `transactions_v2` | `investor_id` | 2 FKs to same target | Kept `fk_transactions_v2_investor`, dropped duplicate | ✅ |
| `yield_distributions` | `fund_id` | 2 FKs to same target | Kept `fk_yield_distributions_fund_new`, dropped old | ✅ |

### 2. Duplicate Unique Indexes ✅
| Table | Column | Issue | Resolution | Status |
|-------|--------|-------|------------|--------|
| `transactions_v2` | `reference_id` | 3+ unique indexes | Kept `idx_transactions_v2_reference_unique` (partial) | ✅ |

### 3. Inconsistent Identity Model ✅
| Table | Old Column | New Column | Status |
|-------|------------|------------|--------|
| `statements` | `investor_id` | `investor_profile_id` | ✅ Added + sync trigger |
| `documents` | `user_id` | `user_profile_id` | ✅ Added + sync trigger |
| `documents` | `created_by` | `created_by_profile_id` | ✅ Added + sync trigger |
| `transactions_v2` | `voided_by` | `voided_by_profile_id` | ✅ Added + sync trigger |
| `fee_allocations` | `voided_by` | `voided_by_profile_id` | ✅ Added + sync trigger |
| `ib_allocations` | `voided_by` | `voided_by_profile_id` | ✅ Added + sync trigger |
| `fund_daily_aum` | `voided_by` | `voided_by_profile_id` | ✅ Added + sync trigger |
| `fund_aum_events` | `voided_by` | `voided_by_profile_id` | ✅ Added + sync trigger |

### 4. Missing Purpose Uniqueness ✅
| Table | Constraint Added | Status |
|-------|-----------------|--------|
| `daily_nav` | `idx_daily_nav_fund_date_purpose_unique` | ✅ |
| `fund_daily_aum` | `fund_daily_aum_unique_active` (partial, non-voided) | ✅ |

## Migration Files Applied

### Release A (Additive)
| Migration | Description | Status |
|-----------|-------------|--------|
| A1 | Add purpose uniqueness to daily_nav | ✅ |
| A2 | Add investor_profile_id to statements | ✅ |
| A3 | Add profile columns to documents | ✅ |
| A4 | Add voided_by_profile_id to transactions_v2, fee_allocations, ib_allocations | ✅ |
| A5 | Create compatibility views | ✅ |

### Release B (Backfill + Validate)
| Migration | Description | Status |
|-----------|-------------|--------|
| B1 | Backfill all profile columns | ✅ |
| B2 | Validate FK constraints | ✅ |

### Release C (Cleanup)
| Migration | Description | Status |
|-----------|-------------|--------|
| C1 | Remove duplicate FK constraints | ✅ |
| C2 | Remove duplicate unique indexes | ✅ |
| C3 | Daily NAV PK update | ⏭️ Skipped (unique index sufficient) |

### Release D (Fund AUM Profile Columns)
| Migration | Description | Status |
|-----------|-------------|--------|
| D1 | Add voided_by_profile_id to fund_daily_aum | ✅ |
| D2 | Add voided_by_profile_id to fund_aum_events | ✅ |
| D3 | Create sync triggers for fund_daily_aum, fund_aum_events | ✅ |
| D4 | Backfill existing voided records | ✅ |

## RPC Updates ✅

| RPC | Change | Status |
|-----|--------|--------|
| `void_transaction` | Now sets `voided_by_profile_id = p_admin_id` | ✅ |
| `void_yield_distribution` | Now sets `voided_by_profile_id = p_admin_id` | ✅ |
| `void_fund_daily_aum` | Now sets `voided_by_profile_id = p_admin_id` on all tables | ✅ |

## Sync Triggers Installed ✅

| Trigger | Table | Purpose |
|---------|-------|---------|
| `trg_statements_sync_profile_id` | statements | investor_id → investor_profile_id |
| `trg_documents_sync_profile_ids` | documents | user_id → user_profile_id, created_by → created_by_profile_id |
| `trg_transactions_v2_sync_voided_by` | transactions_v2 | voided_by → voided_by_profile_id |
| `trg_fee_allocations_sync_voided_by` | fee_allocations | voided_by → voided_by_profile_id |
| `trg_ib_allocations_sync_voided_by` | ib_allocations | voided_by → voided_by_profile_id |
| `trg_fund_daily_aum_sync_voided_by` | fund_daily_aum | voided_by → voided_by_profile_id |
| `trg_fund_aum_events_sync_voided_by` | fund_aum_events | voided_by → voided_by_profile_id |

## Compatibility Views ✅

| View | Purpose |
|------|---------|
| `v_statements_compat` | Exposes both investor_id and investor_profile_id |
| `v_documents_compat` | Exposes both legacy and canonical columns |

## Verification Results

| Check | Result |
|-------|--------|
| voided_by_profile_id columns exist | ✅ 5 tables |
| Sync triggers installed | ✅ 7 triggers |
| Backfill complete (0 NULL gaps) | ✅ |
| void_fund_daily_aum RPC updated | ✅ |
| Duplicate FK constraints removed | ✅ |
| Purpose uniqueness enforced | ✅ |

## Go/No-Go Checklist

| Criterion | Status |
|-----------|--------|
| Release A migrations applied | ✅ |
| Release B backfills complete (0 NULL) | ✅ |
| Release C cleanup complete | ✅ |
| Release D fund AUM profile columns | ✅ |
| `schema_invariants.sql` passes | ✅ |
| `identity_model.sql` passes | ✅ |
| `period_integrity.sql` passes | ✅ |
| `aum_determinism.sql` passes | ✅ |
| No duplicate FK constraints | ✅ |
| Purpose uniqueness enforced | ✅ |
| Frontend works | ✅ |
| RPCs updated | ✅ |

## Appendix: Constraint Naming Convention

- FK: `{table}_{column}_fkey` or `fk_{table}_{column}`
- Unique: `idx_{table}_{columns}_unique`
- Partial unique: `idx_{table}_{columns}_active` (WHERE is_voided = false)
