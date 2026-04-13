# Domain Canonical Contracts

**Status**: PROPOSED — Based on schema + migrations + code analysis
**Next Step**: Stakeholder validation + implementation planning

## Core Business Domains

### 1. Yield Distribution (Crystallization)

#### Current State
- **Functions**: v3, v4, v5 implementations coexist
- **Migrations**: 15+ touch yield logic
- **Status**: UNCLEAR — v4 dropped, v5 has overloads

#### Proposed Canonical Contract

**Source of Truth**:
```
RPC: process_yield_distribution()
├── Input: fund_id, yield_date, aum_amount
├── Logic: Distribute yields to investors per fee schedule
├── Output: yield_distributions, investor_yield_events
└── Idempotency: Safe to replay on same date
```

**Related Functions** (Deprecated):
- `preview_adb_yield_distribution_v3()` — Archive
- `apply_adb_yield_distribution_v3()` — Archive
- `preview_segmented_yield_distribution_v5()` — Keep one preview function
- `apply_segmented_yield_distribution_v5()` — Archive overloads

**Hooks**:
- `useAssetData()` → Fee rates
- `useFinalizedPortfolio()` → Position snapshots
- `useLivePlatformMetrics()` → AUM data

**Safe Transition**:
1. Identify if v3 or v5 is production-canonical
2. Document both in migrations
3. Deprecate unused versions
4. Update hooks to call canonical only
5. Retire old migrations

---

### 2. Transaction Ledger

#### Current State
- **Tables**: `transactions_v2` canonical, v1 missing/deleted
- **Functions**: 20+ transaction-related functions
- **Status**: STABLE but version history unclear

#### Proposed Canonical Contract

**Source of Truth**:
```
Table: transactions_v2
├── Columns: id, investor_id, fund_id, type, amount, aum_after
├── Types: 'deposit', 'withdrawal', 'yield', 'fee', 'rebalance'
├── Immutable: Once created (enforce with trigger)
└── Voidable: Only via explicit unvoid_transaction()

Functions (in order of precedence):
1. apply_deposit_with_crystallization() — Deposits
2. apply_withdrawal_with_crystallization() — Withdrawals
3. apply_daily_yield_with_validation() — Yields
4. insert_yield_transaction() — Manual yield entries
```

**Deprecated**: All v1 references removed

**Mutation Pattern**:
- Create transaction via RPC
- Trigger fires → Updates positions, AUM, allocations
- Validation layer runs → Reconciliation checks
- Errors → Automatic rollback

**Safe Transition**:
1. Archive v1 migration references
2. Standardize all RPC calls to use v2
3. Remove any remaining v1 function calls
4. Document why v1 was replaced

---

### 3. Position Management

#### Current State
- **Table**: `investor_positions` is source of truth
- **Syncing**: 8 different sync functions (inconsistent)
- **Calculation**: Multiple calculation methods (v3, v5, rebuild, etc.)
- **Status**: FRAGMENTED — Multiple sync paths

#### Proposed Canonical Contract

**Source of Truth**:
```
Table: investor_positions
├── Canonical fields: investor_id, fund_id, current_value, is_active
├── Derived fields: cost_basis (from ledger), unrealized_pnl
├── Updates: Only via approved RPCs, never direct SQL
└── Rebuilding: Use rebuild_position_from_ledger() if corrupted
```

**Single Sync Path**:
1. Transaction posted to ledger (transactions_v2)
2. Trigger fires → sync_aum_on_transaction()
3. Position updated via reconcile_investor_position()
4. Health check via v_fund_aum_position_health view

**Deprecated Syncs**:
- `sync_aum_on_position_change()` — Merge into transaction sync
- `sync_position_last_tx_date()` — Automated via trigger
- Multiple `audit_*` functions — Single audit log entry
- Old position calculation methods → Use `rebuild_position_from_ledger()`

**Safe Transition**:
1. Pick single sync path (via transaction)
2. Disable redundant sync functions
3. Rebuild all positions from ledger (one-time)
4. Monitor v_fund_aum_position_health for issues

---

### 4. Void & Reissue Lifecycle

#### Current State
- **Functions**: 4 separate void implementations
- **Complexity**: Cascade void, reissue, unvoid all separate
- **Status**: DANGEROUS — Multiple void paths, unclear canonical

#### Proposed Canonical Contract

**Source of Truth**:
```
RPC: void_and_reissue_transaction(tx_id, reason)
├── Atomicity: All-or-nothing (void + reissue)
├── Cascade: Void allocations, yield, fees automatically
├── Validation: Check no dependent withdrawals
├── Audit: Log reason and user in audit_log
└── Undo: Via unvoid_transaction(tx_id)

Trigger: cascade_void_*
├── Listen to transactions_v2 is_voided flag
├── Auto-void dependent allocations
├── Recalculate positions
├── Sync AUM
```

**Deprecated Voids**:
- `void_cascade_dust_sweeps()` → Consolidate into main void logic
- `void_transactions_bulk()` → Use void loop instead
- Separate cascade functions → Use single trigger

**Undo Path**:
- `unvoid_transaction()` — Restore and reissue
- Check: No newer transactions depend on it
- Atomicity: Same as void

**Safe Transition**:
1. Document which void is canonical
2. Consolidate cascade logic into single function
3. Add comprehensive tests for void/unvoid
4. Audit all existing void audit trail

---

### 5. AUM (Assets Under Management)

#### Current State
- **Tables**: `fund_daily_aum`, `fund_aum_events`
- **Functions**: 15+ AUM-related functions
- **Syncing**: Multiple sync paths, 21 reconciliation views
- **Status**: MESSY — Over-instrumented, unclear canonical

#### Proposed Canonical Contract

**Source of Truth**:
```
Table: fund_daily_aum
├── Canonical: One row per fund per date
├── Calculation: SUM(investor_positions.current_value) per fund per date
├── Materialized: Computed daily via scheduled task
└── Immutable: Once finalized (flag: is_finalized)

Sync Pattern**:
1. Position changes → update fund_daily_aum for affected date
2. Manual AUM entry → validates against position reconciliation
3. End-of-day: Finalize yesterday's AUM, compute today's baseline

Validation Views** (Keep only these):
- v_fund_aum_position_health — Position vs AUM balance
- aum_position_reconciliation — Reconcile AUM entries vs positions
- v_missing_withdrawal_transactions — Orphan detection
```

**Deprecated AUM Functions**:
- `sync_aum_on_position_change()` → Merge into position sync
- `sync_fund_aum_events_voided_by_profile()` → Automated via trigger
- `update_fund_aum_baseline()` → One-time migration, can delete
- Duplicate reconciliation checks → Keep only v_fund_aum_position_health

**Safe Transition**:
1. Verify fund_daily_aum = SUM(positions) for all dates
2. Fix any discrepancies manually
3. Disable manual AUM updates (make read-only or admin-only)
4. Delete redundant sync functions
5. Monitor v_fund_aum_position_health daily

---

### 6. Reporting & Statements

#### Current State
- **Functions**: statement_periods, generated_statements, statement_email_delivery
- **Delivery**: Email via MailerSend, tracking in database
- **Status**: WORKING but process opaque

#### Proposed Canonical Contract

**Source of Truth**:
```
RPC: dispatch_report_delivery_run()
├── Trigger: Monthly (cron) or manual
├── Process: Generate statements, queue emails, track delivery
├── Atomicity: All statements or none for a period
└── Idempotency: Safe to retry for failed addresses

Tables**:
- statement_periods — Period definition
- generated_statements — Generated PDFs
- statement_email_delivery — Email queue + status
- audit_log — All modifications
```

**Deprecated**: None, but document the flow

**Safe Transition**:
1. Document statement generation workflow in ADR
2. Add tests for multi-investor bulk delivery
3. Add retry logic for failed email sends
4. Monitor delivery_status table for failures

---

## Deprecation Plan

### Tier 1: Remove Immediately (Next Week)
- QA functions (`qa_*`)
- Test assertion migrations
- Incomplete migrations (`draft_*`)
- Backup tables (if verified unused)

### Tier 2: Deprecate This Month
- Old yield versions (v3, v4)
- Duplicate void functions (keep canonical only)
- Redundant position sync functions
- Test data and hardcoded UUIDs

### Tier 3: Refactor Next Quarter
- Consolidate 21 reconciliation views → 5 essential ones
- Merge overlapping data hooks
- Unify real-time subscription patterns
- Extract test assertion migrations

---

## Canonicalization Checklist

- [ ] **Yield**: Declare v3 or v5 canonical, deprecate other
- [ ] **Transactions**: Confirm v2 is only version, archive v1 refs
- [ ] **Positions**: Single sync path via transaction trigger
- [ ] **Void Logic**: Single canonical void_and_reissue_transaction(), consolidate cascades
- [ ] **AUM**: Remove manual sync functions, keep only reconciliation views
- [ ] **Statements**: Document workflow, add tests

---

## Human Review Required

**Questions for Stakeholders**:

1. **Yield Distribution**: Is v3 or v5 canonical? Why did we iterate so many times?

2. **Transactions v1 → v2**: What corruption caused the migration? Is root cause fixed?

3. **Void Logic**: Why 4 separate void functions? Should be atomic void_and_reissue_transaction() only?

4. **Position Sync**: Why 8 sync functions? Pick one correct path and eliminate the rest.

5. **Restoration Migrations**: Why do we have 5 "restore_*" migrations? Indicates what went wrong?

6. **Reconciliation Views**: Are all 21 views used? Or are some obsolete monitoring?

7. **Admin Tools**: Are dangerous functions like `force_delete_investor()` ever used? Remove them.

---

## Implementation Strategy

**Phase 1: Inventory** (Complete)
- Identified all functions, tables, views
- Categorized by status: active, deprecated, dead

**Phase 2: Canonicalize** (Next)
- Pick canonical version for each domain
- Deprecate alternatives
- Mark for removal

**Phase 3: Consolidate** (Week after)
- Merge sync functions
- Reduce view proliferation
- Standardize hook patterns

**Phase 4: Validate** (Final)
- Run full regression tests
- Monitor production for issues
- Verify no hidden dependencies

**Estimated Timeline**: 4-6 weeks
