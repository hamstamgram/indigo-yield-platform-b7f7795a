# Batch 4: Position Sync Architecture Guide

**Status:** Documentation & Clarification Only (Option C)  
**Risk Level:** 🟢 LOW  
**Time Invested:** 2-3 hours documentation  
**Code Changes:** NONE

---

## Quick Reference: Position Function Decision Tree

### When You Need To...

#### Investor Position Value Changed or Wrong
```
Is it a production issue (investor reports wrong balance)?
├─ YES: Use recompute_investor_position(investor_id, fund_id)
│       OR rebuild_position_from_ledger(investor_id, fund_id, admin_id, reason, dry_run=true)
│
└─ NO: Check if data integrity issue
       ├─ Single position mismatched: reconcile_investor_position_internal(fund_id, investor_id)
       └─ Multiple positions: reconcile_all_positions(dry_run=true)
```

#### Many Positions Are Wrong
```
Is this a widespread issue or isolated?
├─ Isolated (1-10 positions): Use reconcile_investor_position_internal() for each
│
├─ Moderate (11-100 positions): Use batch_reconcile_all_positions()
│
└─ Widespread (all positions): STOP - Call architect before using repair_all_positions()
```

#### Validating Position Accuracy
```
Are you checking strict correctness or lenient tolerance?
├─ Strict (accounting audit): validate_aum_matches_positions_strict()
│
├─ Lenient (operational check): validate_aum_matches_positions()
│
└─ Historical validation: validate_aum_against_positions_at_date(date)
```

---

## Production Trigger Chain (DO NOT MODIFY)

### The Flow: Transaction → Position → AUM

```
INSERT INTO transactions_v2 (investor_id, fund_id, amount, type, ...)
│
├─ Trigger 1: trg_ledger_sync (CRITICAL PRODUCTION)
│  │ Calls: fn_ledger_drives_position()
│  │ Action: UPDATE investor_positions (computes position from ledger)
│  │ Fires: ON INSERT, UPDATE of is_voided
│  │ Purpose: Keep position in sync with transaction ledger
│  │
│  └─ Position updates trigger position triggers:
│     │
│     ├─ Trigger 2: trg_sync_aum_on_position (CRITICAL)
│     │  Calls: sync_aum_on_position_change()
│     │  Action: INSERT/UPDATE fund_daily_aum
│     │  Purpose: Recalculate fund AUM when positions change
│     │
│     └─ Trigger 3: trg_sync_aum_after_position
│        Calls: sync_fund_aum_after_position()
│        Action: INSERT/UPDATE fund_daily_aum
│        Purpose: Alternative AUM sync (may be redundant)
│
├─ Trigger 4: trg_recompute_position_on_tx (REDUNDANT?)
│  Calls: trigger_recompute_position()
│  Action: Recalculates position (same as fn_ledger_drives_position?)
│  Purpose: UNCLEAR - investigate if this is needed
│
└─ Trigger 5: trg_sync_aum_on_transaction (OPTIMIZATION)
   Calls: sync_aum_on_transaction()
   Purpose: Direct AUM update without recomputing positions
```

**⚠️ Potential Issue:** Triggers 2 and 3 both update fund_daily_aum. Verify they don't conflict.

---

## Position Computation Functions (Tier 1: Production)

| Function | Purpose | When to Use | Risk |
|----------|---------|------------|------|
| **fn_ledger_drives_position()** | Canonical ledger→position calculation (trigger) | Automatic on transaction INSERT | CRITICAL - Don't change |
| **trigger_recompute_position()** | Alternative position recomputation (trigger) | Automatic on transaction INSERT | MEDIUM - May be redundant |
| **sync_aum_on_position_change()** | Recalculate AUM when position changes | Automatic on position UPDATE | CRITICAL - Don't change |
| **sync_fund_aum_after_position()** | Alternative AUM recalculation | Automatic on position UPDATE | MEDIUM - May be redundant |
| **sync_position_last_tx_date()** | Update last_transaction_date field | Automatic on position UPDATE | LOW - Minor field |

---

## Admin Repair Functions (Tier 2: Manual Operations)

| Function | Purpose | Parameters | Return | Dry-Run? |
|----------|---------|-----------|--------|----------|
| **recompute_investor_position(investor_id, fund_id)** | Recompute single position from ledger | investor UUID, fund UUID | void | NO |
| **recompute_investor_positions_for_investor(investor_id)** | Recompute all positions for one investor | investor UUID | void | NO |
| **rebuild_position_from_ledger(investor_id, fund_id, admin_id, reason, dry_run)** | Rebuild position from scratch | 5 params | jsonb | YES ✅ |
| **adjust_investor_position(investor_id, fund_id, amount, reason, ...)** | Manual position adjustment | 5 params | jsonb | NO |
| **reconcile_investor_position_internal(fund_id, investor_id)** | Reconcile one position | 2 params | void | NO |

**How to Choose:**
- **Routine fix:** Use `recompute_investor_position()`
- **Severe corruption:** Use `rebuild_position_from_ledger(..., dry_run=true)` first to preview
- **Manual adjustment:** Use `adjust_investor_position()` with reason audit trail

---

## Batch Repair Functions (Tier 3: Bulk Operations)

| Function | Purpose | Impact | Dry-Run? |
|----------|---------|--------|----------|
| **batch_reconcile_all_positions()** | Find and reconcile all mismatched positions | Scans all positions | Built-in |
| **reconcile_all_positions(dry_run)** | Reconcile all positions (different from above?) | Fixes mismatches | YES ✅ |
| **reconcile_fund_aum_with_positions()** | Adjust AUM to match positions | Fund-level fix | NO |
| **repair_all_positions()** | Emergency repair of all positions | DESTRUCTIVE - Clarify before use | NO ⚠️ |

**Caution:** `repair_all_positions()` is DESTRUCTIVE. Unclear purpose/behavior. **Requires architect approval before use.**

---

## Validation Functions (Tier 4: Health Checks)

| Function | Purpose | Strictness | Use Case |
|----------|---------|-----------|----------|
| **validate_aum_matches_positions()** | Check AUM = sum(positions) | Lenient (accounting rounding OK) | Operational monitoring |
| **validate_aum_matches_positions_strict()** | Check AUM = sum(positions) | Strict (exact match) | Audit/compliance |
| **validate_aum_against_positions()** | Alternative validation | Lenient | Operational check |
| **validate_aum_against_positions_at_date(date)** | Historical validation | Strict | Historical audit |
| **check_aum_position_health()** | Full health check with status | Grades (OK/WARNING/CRITICAL) | Dashboard monitoring |
| **validate_position_fund_status()** | Ensure position has active fund | N/A | Integrity check (trigger) |

**Redundancy:** Functions 1-4 seem redundant. Recommend consolidating to 2: `validate_position_lenient()` and `validate_position_strict()`.

---

## Computation Helper Functions (Tier 5: Internal Utilities)

| Function | Purpose | Used By |
|----------|---------|---------|
| **compute_position_from_ledger(investor_id, fund_id, as_of)** | Calculate position value from transactions | Production triggers, admin tools |
| **calculate_position_at_date_fix(investor_id, fund_id, as_of_date)** | Historical position calculation | Reporting, reconciliation |
| **get_position_reconciliation(as_of_date, fund_id)** | Retrieve reconciliation view | Admin queries |
| **get_aum_position_reconciliation(date)** | AUM vs position reconciliation | Admin queries |
| **initialize_fund_aum_from_positions(fund_id, admin_id, aum_date)** | Bootstrap AUM from current positions | Initial setup |
| **initialize_all_hwm_values()** | Bootstrap high-water-mark values | Initial setup |

**Bootstrap Functions:** `initialize_*` are one-time setup utilities. Only use during initial data migration.

---

## Emergency/Debug Functions (Tier 6: Use Sparingly)

| Function | Purpose | Destructiveness | When to Use |
|----------|---------|-----------------|------------|
| **reset_all_investor_positions()** | RESET ALL POSITIONS TO NULL | ⚠️⚠️⚠️ VERY DESTRUCTIVE | Only during database reset/migration |
| **cleanup_dormant_positions()** | Remove zero-value positions | ⚠️ Moderate | Ad-hoc cleanup (use dry_run=true first) |
| **acquire_position_lock(investor_id, fund_id)** | Lock position for atomic operations | None (locking mechanism) | Concurrent operation coordination |

**WARNING:** `reset_all_investor_positions()` requires confirmation code. Only use if explicitly instructed by architect.

---

## Tables & Views (Tier 7: Derived Data)

### Tables (Source Data)
- **investor_positions** - Current investor position values (denormalized from ledger)
- **investor_position_snapshots** - Historical snapshots of positions

### Views (Read-Only Analysis)
- **aum_position_reconciliation** - Compares AUM records vs actual positions
- **investor_position_ledger_mismatch** - Finds positions that don't match ledger
- **position_transaction_reconciliation** - Validates position = sum(transactions)
- **v_fund_aum_position_health** - Overall health monitoring view
- **v_orphaned_positions** - Positions with no investor/fund match
- **v_position_transaction_variance** - Detailed variance analysis

**Note:** These views were analyzed in Batch 6. Some may have been dropped. Check BATCH_6_COMPLETION.md.

---

## Identified Issues (For Future Resolution)

### Issue 1: Redundant Position Recomputation
- `fn_ledger_drives_position()` computes positions
- `trigger_recompute_position()` also computes positions
- Both fire on transaction INSERT
- **Action Needed:** Determine if both are necessary or if one is redundant

### Issue 2: Duplicate AUM Updates
- `sync_aum_on_position_change()` updates fund_daily_aum
- `sync_fund_aum_after_position()` also updates fund_daily_aum
- Both fire on position UPDATE
- **Risk:** Potential race conditions, duplicate updates
- **Action Needed:** Verify they don't conflict

### Issue 3: Function Naming Confusion
- `batch_reconcile_all_positions()` vs `reconcile_all_positions()`
- `rebuild_position_from_ledger()` vs `repair_all_positions()` vs `reset_all_investor_positions()`
- **Action Needed:** Clarify purpose and consolidate similar functions

### Issue 4: Unknown Function Purpose
- `repair_all_positions()` - What does it do? When should it be used?
- **Action Needed:** Document purpose and risks

### Issue 5: Dead Code Candidates
- `reset_all_investor_positions()` - Only used during database reset?
- `cleanup_dormant_positions()` - Ad-hoc utility, unclear if needed
- **Action Needed:** Mark for removal if not used in production

---

## Recommended Actions (Future Batches)

### Short Term (Batch 4b - If Consolidation Proceeds)
1. Determine if `trigger_recompute_position` is redundant
2. Verify `sync_aum_*` functions don't conflict
3. Consolidate validation functions (6 → 2)
4. Consolidate reconcile functions (clarify naming)
5. Document or remove `repair_all_positions()`

### Medium Term (Batch 5)
1. Create unified position reconciliation function
2. Create unified validation function
3. Remove obviously dead code
4. Add comprehensive test coverage

### Long Term (Architecture Review)
1. Evaluate trigger chain for performance bottlenecks
2. Consider async position updates if scaling needed
3. Evaluate alternative position calculation strategies

---

## Testing Position Sync

### Basic Validation
```sql
-- Check if position = sum(transactions)
SELECT 
  ip.investor_id, ip.fund_id,
  ip.current_value as position_value,
  (SELECT SUM(CASE 
    WHEN type IN ('DEPOSIT', 'YIELD') THEN amount
    WHEN type IN ('WITHDRAWAL', 'FEE') THEN -amount
    ELSE 0 END)
   FROM transactions_v2
   WHERE investor_id = ip.investor_id 
   AND fund_id = ip.fund_id
   AND is_voided = false) as ledger_value,
  ip.current_value - (SELECT SUM(...)) as variance
FROM investor_positions ip
WHERE variance > 0.01;
```

### Production Health Check
```sql
SELECT * FROM check_aum_position_health();
```

### Reconciliation Audit
```sql
SELECT * FROM position_transaction_reconciliation;
SELECT * FROM aum_position_reconciliation;
```

---

## Summary: Function Maturity Levels

| Level | Functions | Status | Change Risk |
|-------|-----------|--------|------------|
| 🟢 Stable | fn_ledger_drives_position, sync_aum_* | Production-critical | DO NOT CHANGE |
| 🟡 Stable+Redundant | trigger_recompute_position, sync_fund_aum_after_position | May be redundant | Investigate |
| 🟠 Maintenance | Admin repair functions | Used occasionally | Document better |
| 🔴 Unclear Purpose | repair_all_positions, reset_all_* | Rarely used | Document or remove |
| ⚪ Redundant | Validation functions (6) | Consolidate | Future cleanup |

---

## Conclusion

The position sync system is **complex but functional**. Current architecture works in production but would benefit from:

1. ✅ **Immediate:** Better documentation (THIS DOCUMENT)
2. ✅ **Immediate:** Clear decision tree for admins (ABOVE)
3. 🔄 **Near-term:** Identify and remove redundancy
4. 🔄 **Near-term:** Consolidate similar functions
5. 🔮 **Long-term:** Consider architectural improvements if performance demands it

**Status:** Current system is safe to use as-is. Aggressive refactoring should only proceed after:
- Comprehensive test coverage is added
- Architect review is completed
- Performance issues are demonstrated
- Timeline allows for thorough testing

---

## Related Documentation

- BATCH_4_POSITION_SYNC_ANALYSIS.md - Detailed risk assessment
- BATCH_6_COMPLETION.md - Views that were dropped (affected views)
- Trigger definitions in: supabase/migrations/20260307000000_definitive_baseline.sql
