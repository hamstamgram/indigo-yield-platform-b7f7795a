# Dead Code & Legacy Workflow Register

**Source**: Schema + migrations + hook/service analysis
**Status**: PRELIMINARY — Requires reference checks

## Definitely Dead (Remove)

### Database Objects

| Object | Type | Evidence | Action |
|--------|------|----------|--------|
| `draft_calculate_yield_distribution.sql` | Migration | Incomplete filename (no timestamp) | Delete |
| `20260327102803_*.sql` | Migration | Test assertions, hardcoded UUIDs | Move to tests/ |
| Backup tables (8 total) | Table | Not referenced in any service | Archive |

### Functions with QA/Test Markers

| Function | Type | Evidence | Action |
|----------|------|----------|--------|
| `qa_seed_world()` | RPC | Test data seeding | Delete or archive |
| `qa_admin_id()` | Function | Returns hardcoded UUID | Delete |
| `qa_fund_id()` | Function | Returns hardcoded UUID | Delete |
| `qa_investor_id()` | Function | Returns hardcoded UUID | Delete |
| `block_test_profiles()` | Function | Prevents test execution | Delete |
| `create_profile_on_signup()` | Trigger | May not be used | Verify & remove |

---

## Probably Dead (Verify Before Deleting)

### Migrations

| Migration | Purpose | Questions |
|-----------|---------|-----------|
| `20260307000009_drop_v4_crystallizations.sql` | Drop v4 | Is v4 referenced anywhere? |
| `20260315000001_drop_stale_yield_v5_overload.sql` | Drop v5 | Is dropped overload still called? |
| 13 UUID migrations (20260319) | Unknown | Purpose unclear, investigate git history |

### Functions

| Function | Risk | Check |
|----------|------|-------|
| `preview_segmented_yield_distribution_v3()` | Version mismatch | Is this v3 still used or v5 canonical? |
| `apply_adb_yield_distribution_v3()` | Version mismatch | Latest is v5, why have v3? |
| `void_cascade_dust_sweeps()` | Duplicate logic | Compare with `cascade_void_from_transaction()` |
| `initialize_crystallization_dates()` | Legacy | Called only during setup? |
| `initialize_fund_aum_from_positions()` | Legacy | One-time migration helper? |

### Tables

| Table | Risk | Check |
|-------|------|-------|
| `error_code_metadata` | Unused? | Referenced in code? Used for error mapping? |
| `qa_entity_manifest` | QA code | Delete this QA table |
| `rate_limit_config` | Dead? | Is rate limiting implemented? |
| `risk_alerts` | Abandoned? | Are alerts triggered anywhere? |

---

## Likely Stale (Low Priority But Clean Up)

### Views (Reconciliation Heavy)
21 reconciliation views suggest:
- Data integrity problems are ongoing
- Views may not be actively monitored
- Some may be abandoned monitoring

**Candidates for Review**:
- `v_potential_duplicate_profiles` — Is duplicate detection working?
- `v_orphaned_transactions` — Why do orphans exist?
- `v_ledger_reconciliation` — Is this used for automated fixes or just reporting?

### Functions (Utility/Admin Heavy)
- `export_investor_data()` — GDPR export helper, probably rarely used
- `cleanup_dormant_positions()` — Maintenance function, may be dead
- `merge_duplicate_profiles()` — Dangerous admin function
- `force_delete_investor()` — Dangerous, likely never used in prod
- `reset_all_data_keep_profiles()` — One-time migration helper?

---

## Hidden Dependencies

### Risk: Functions Calling Dead Functions
Some functions may call other functions that appear dead:

**To Check**:
- Does `process_yield_distribution()` call deprecated `_resolve_investor_fee_pct()`?
- Does `approve_and_complete_withdrawal()` call any v3/v4 functions?
- Do mutation functions use old position update methods?

**Method**: Search functions for `SELECT `, `CALL `, function names

---

## Legacy Workflows Still Active

### Workflow 1: Multi-Version Yield Logic
**Evidence**:
- v3, v4, v5 functions coexist in schema
- Multiple migrations touch crystallization logic
- Migrations suggest v4 was dropped, v5 has overloads

**Status**: ACTIVE but confused
**Question**: Which is canonical? V3 or V5?
**Risk**: Frontend calls v3 while backend runs v5 = mismatch

### Workflow 2: Multiple Void Paths
**Evidence**:
- `void_and_reissue_transaction()`
- `void_and_reissue_full_exit()`
- `cascade_void_from_transaction()`
- `unvoid_transaction()`

**Status**: UNCLEAR
**Question**: When to use which?
**Risk**: Inconsistent void behavior

### Workflow 3: Restore Pattern
**Evidence**:
- 5 migrations with "restore" in name
- Suggest prior schema corruption or loss
- Suggests recovery procedures in place

**Status**: LEGACY
**Question**: Why were restores needed? Is underlying issue fixed?
**Risk**: Suggests system instability history

---

## Dead Code Inventory

### Tier 1: Safe to Delete
- QA functions (`qa_seed_world`, `qa_admin_id`, etc.)
- Test migrations with assertions
- Incomplete migrations (`draft_*`)
- Backup tables (if not referenced)

**Estimated lines to delete**: 500-1000

### Tier 2: Verify Then Delete
- Unused v3/v4 yield functions
- Duplicate void functions
- Orphaned admin functions

**Estimated lines**: 1000-2000

### Tier 3: Refactor Instead of Delete
- Multiple real-time hooks → unify
- Overlapping data hooks → consolidate
- Duplicate sync functions → canonicalize

**Estimated lines**: 2000-3000

---

## Cleanup Checklist

- [ ] Identify which yield version is canonical (v3 or v5)
- [ ] Verify backup tables are not referenced
- [ ] Check if QA functions are called anywhere
- [ ] Determine if void_cascade_dust_sweeps is used
- [ ] Extract test assertion migrations to test suite
- [ ] Document reason for "restore" migrations
- [ ] Archive or delete old migration versions
- [ ] Consolidate overlapping hooks (useAvailable* family)
- [ ] Remove hardcoded QA UUIDs from functions
- [ ] Create "deprecated" folder for archival

---

## Questions for Human Review

1. **Why do we have both `void_and_reissue_transaction()` and `void_cascade_dust_sweeps()`?**
   - Are these for different use cases?
   - Should they call the same underlying logic?

2. **What are the 13 UUID-named migrations doing?**
   - Data reconciliation?
   - Merge artifacts?
   - Can they be deleted?

3. **Is `transactions_v1` truly gone or just hidden?**
   - Any lingering references?
   - Why was it replaced?

4. **Why 5 "restore_*" migrations?**
   - Indicates what underlying corruption?
   - Is it fixed in current baseline?

5. **Are the 21 reconciliation views actively monitored?**
   - Or just legacy monitoring?
   - Can any be deleted?

---

## Recommendation Priority

**Week 1**: Delete QA code + test assertion migrations
**Week 2**: Verify & delete unused backup tables
**Week 3**: Consolidate overlapping hooks
**Week 4**: Document canonical functions (yield, void, etc.)
