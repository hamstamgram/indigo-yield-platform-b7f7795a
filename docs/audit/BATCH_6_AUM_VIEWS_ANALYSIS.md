# Batch 6: AUM Reconciliation View Cleanup - Analysis

## Current State
**Total Views:** 23 reconciliation/monitoring views

## All Views Categorized

### Tier 1: Core Business Views (Essential, Production Use)
1. **v_fund_aum_position_health** - Fund AUM vs positions alignment with health status
   - Used by: Dashboard, fund overview
   - Status: Active (health_status enum for monitoring)

### Tier 2: Reconciliation Views (Admin/Ops Use)
2. **aum_position_reconciliation** - Compares AUM records with total positions
   - Used by: Admin reconciliation dashboards
   - Dependencies: fund_daily_aum, investor_positions
   
3. **position_transaction_reconciliation** - Validates position values vs transaction sums
   - Used by: Admin verification tools
   - Dependencies: investor_positions, transactions_v2

4. **investor_position_ledger_mismatch** - Detects ledger-position mismatches
   - Used by: Audit/compliance
   - Dependencies: investor_positions, transactions_v2

5. **fund_aum_mismatch** - Flags AUM records that don't match position totals
   - Used by: Admin alerts
   - Dependencies: fund_daily_aum, investor_positions

6. **v_ledger_reconciliation** - Transaction ledger validation
   - Used by: Financial audit
   - Dependencies: transactions_v2

7. **v_position_transaction_variance** - Detailed position-transaction differences
   - Used by: Admin investigation
   - Dependencies: investor_positions, transactions_v2

### Tier 3: Orphan Detection Views (Data Integrity)
8. **v_orphaned_positions** - Positions with no matching investor/fund
   - Used by: Data cleanup
   - Dependencies: investor_positions, profiles, funds

9. **v_orphaned_transactions** - Transactions with no matching investor/fund
   - Used by: Data cleanup
   - Dependencies: transactions_v2, profiles, funds

10. **v_fee_calculation_orphans** - Fee calculations with issues
    - Used by: Fee validation
    - Dependencies: investor_fee_schedule

11. **v_fee_allocation_orphans** - Unallocated fee amounts
    - Used by: Fee audit
    - Dependencies: fee-related tables

12. **v_ib_allocation_orphans** - IB commission allocation issues
    - Used by: IB partner audit
    - Dependencies: ib_commission_schedule

13. **v_transaction_distribution_orphans** - Distribution transactions with issues
    - Used by: Yield audit
    - Dependencies: transactions_v2, daily_yield_applications

14. **v_potential_duplicate_profiles** - Duplicate investor detection
    - Used by: Data deduplication
    - Dependencies: profiles

15. **v_missing_withdrawal_transactions** - Unrecorded withdrawals
    - Used by: Audit
    - Dependencies: withdrawal_requests, transactions_v2

### Tier 4: Crystallization/Yield Views (Yield Operations)
16. **v_crystallization_dashboard** - Yield crystallization status
    - Used by: Yield operations UI
    - Dependencies: daily_yield_applications, investor_positions

17. **v_crystallization_gaps** - Periods missing yield crystallization
    - Used by: Yield audit
    - Dependencies: daily_yield_applications

18. **v_yield_conservation_violations** - Violations of yield conservation rule
    - Used by: Yield validation
    - Dependencies: daily_yield_applications, investor_positions

19. **yield_distribution_conservation_check** - Validates yield conservation math
    - Used by: Yield audit
    - Dependencies: daily_yield_applications

### Tier 5: Cost & Risk Views (Specialized)
20. **v_cost_basis_mismatch** - Cost basis calculation errors
    - Used by: Tax/accounting audit
    - Dependencies: investor_positions, transactions_v2

21. **ib_allocation_consistency** - IB allocation validation
    - Used by: IB partner audit
    - Dependencies: ib_commission_schedule

22. **v_liquidity_risk** - Fund liquidity risk assessment
    - Used by: Risk monitoring
    - Dependencies: fund_daily_aum, investor_positions

23. **v_transaction_sources** - View of transaction sources/purposes
    - Used by: Reporting
    - Dependencies: transactions_v2

## Usage Analysis

**Searches for component usage:**
- None of these views are directly used by React components
- They are admin-facing SQL views for debugging, auditing, and ops
- No frontend queries found to these views

## Consolidation Opportunities

### Option A: Aggressive Consolidation (3-5 views)
**Keep only:**
1. v_fund_aum_position_health (core business)
2. aum_position_reconciliation (primary audit view)
3. v_orphaned_positions (data cleanup)
4. v_crystallization_dashboard (yield ops)
5. yield_distribution_conservation_check (yield validation)

**Drop:**
- 18 other views (may be recreated via queries if needed)

**Risk:** High - lose diagnostic/audit capabilities if bugs occur

### Option B: Moderate Consolidation (8-10 views)
**Keep:**
- v_fund_aum_position_health
- aum_position_reconciliation
- position_transaction_reconciliation
- investor_position_ledger_mismatch
- v_orphaned_positions
- v_orphaned_transactions
- v_crystallization_dashboard
- yield_distribution_conservation_check
- v_yield_conservation_violations
- v_cost_basis_mismatch

**Drop:**
- 13 other views

**Risk:** Moderate - keep primary audit/diagnostic views

### Option C: Light Consolidation (15-17 views)
**Keep most, drop only:**
- v_fee_allocation_orphans (can query directly)
- v_ib_allocation_orphans (can query directly)
- v_transaction_distribution_orphans (can query directly)
- v_potential_duplicate_profiles (can query directly)
- v_missing_withdrawal_transactions (can query directly)
- v_transaction_sources (can query directly)
- v_liquidity_risk (ad-hoc analysis only)

**Drop:** 7 views

**Risk:** Low - minimal functional impact, views can be recreated

## Recommendation

**Option B: Moderate Consolidation** is recommended because:

1. **Balances cleanup with safety**: Reduces 23 → 10 views (57% reduction)
2. **Preserves core functionality**: Keeps audit, reconciliation, orphan detection
3. **Maintains diagnostics**: Keeps crystallization monitoring and yield validation
4. **Minimal rebuilding**: Dropped views are specialty/analytical only
5. **Recovery path clear**: Easy to recreate dropped views if needed via migrations

## Implementation Plan

**Phase 1: Identify Drop List**
- Create migration that drops 13 views
- Views to drop: fee_allocation_orphans, ib_allocation_orphans, transaction_distribution_orphans, potential_duplicate_profiles, missing_withdrawal_transactions, transaction_sources, liquidity_risk, fund_aum_mismatch (consolidate to aum_position_reconciliation), position_transaction_variance (consolidate to position_transaction_reconciliation), crystallization_gaps (consolidate to crystallization_dashboard), cost_basis_mismatch (keep - important for accounting), ib_allocation_consistency (keep - important for IB audits)

**Revised drop list (13 total):**
1. v_fee_allocation_orphans
2. v_ib_allocation_orphans
3. v_transaction_distribution_orphans
4. v_potential_duplicate_profiles
5. v_missing_withdrawal_transactions
6. v_transaction_sources
7. v_liquidity_risk
8. fund_aum_mismatch (consolidate into aum_position_reconciliation)
9. v_crystallization_gaps (consolidate into v_crystallization_dashboard)
10. v_position_transaction_variance (consolidate into position_transaction_reconciliation)

**Phase 2: Final View List (13 views)**
1. aum_position_reconciliation
2. investor_position_ledger_mismatch
3. position_transaction_reconciliation
4. v_cost_basis_mismatch
5. v_crystallization_dashboard
6. v_fund_aum_position_health
7. v_ledger_reconciliation
8. v_orphaned_positions
9. v_orphaned_transactions
10. v_yield_conservation_violations
11. yield_distribution_conservation_check
12. ib_allocation_consistency
13. v_transaction_sources (keep for reporting)

**Phase 3: Document Dropped Views**
- Create reference doc showing dropped views and how to recreate if needed

## Files Affected

**To Create:**
- `supabase/migrations/20260414000003_drop_aum_views_batch_6.sql` - Drop 10 views

**To Document:**
- docs/audit/BATCH_6_DROPPED_VIEWS_REFERENCE.md

## Risk Assessment

- **Overall Risk:** LOW-MEDIUM
- **Data Loss:** None (views are derived, not data)
- **Reversibility:** High (views can be recreated from migrations)
- **Breaking Changes:** None (no application code uses these views)
- **Admin Impact:** Medium (loses some diagnostic views)

## Next Steps

1. Present analysis and get confirmation on Option B
2. Create migration to drop views
3. Document dropped views for future reference
4. Test that remaining views still function
5. Commit and move to deferred Batch 4 if time permits
