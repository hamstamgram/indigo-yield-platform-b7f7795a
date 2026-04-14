# PS-4: Position & AUM Trigger Map

**Phase:** 4B  
**Status:** Analysis Complete  
**Last Updated:** 2026-04-14

---

## Executive Summary

After analyzing the trigger architecture, the system has **justified redundancy** rather than accidental duplication:

1. **Position triggers** — Two paths with different purposes (delta vs recompute)
2. **AUM triggers** — Already protected by guard flags

---

## Position Trigger Map

| Trigger | Function | Table | Event | Path Type | Purpose |
|----------|-----------|-------|-------|-----------|---------|
| `trg_recompute_position_on_tx` | `trigger_recompute_position()` | transactions_v2 | INSERT/DELETE/UPDATE | **CANONICAL** | Full recompute from ledger |
| `trg_ledger_sync` | `fn_ledger_drives_position()` | transactions_v2 | INSERT / UPDATE is_voided | **SECONDARY** | Incremental delta |
| `trg_recompute_on_void` | `recompute_on_void()` | transactions_v2 | UPDATE is_voided | **DISABLED** | Legacy void handler |

### Analysis

#### `trigger_recompute_position()` (CANONICAL)
- **Fires on:** INSERT, DELETE, UPDATE of transactions_v2
- **Action:** Full recompute from transactions_v2 ledger
- **Algorithm:** SUM(amount) WHERE is_voided = false
- **When to use:** Authoritative repair, data integrity fixes
- **Overlap:** With `fn_ledger_drives_position()` on INSERT only

#### `fn_ledger_drives_position()` (SECONDARY)
- **Fires on:** INSERT, UPDATE is_voided
- **Action:** Incremental delta (current_value + delta)
- **Algorithm:** Increment/decrement by transaction amount
- **When to use:** Real-time sync for new transactions
- **Overlap:** With `trigger_recompute_position()` on INSERT

#### `recompute_on_void()` (DISABLED CANDIDATE)
- **Fires on:** UPDATE is_voided = true
- **Action:** Calls reconciliation function
- **Guard:** Checks `indigo.canonical_rpc` flag
- **Status:** Most logic already bypassed

---

## AUM Trigger Map

| Trigger | Function | Table | Event | Purpose |
|---------|----------|-------|-------|---------|
| `trg_sync_aum_on_position` | `sync_aum_on_position_change()` | investor_positions | INSERT/DELETE/UPDATE current_value | **CANONICAL** |
| `trg_sync_aum_after_position` | `sync_fund_aum_after_position()` | investor_positions | UPDATE current_value | **SECONDARY** |

### Analysis

#### `sync_aum_on_position_change()` (CANONICAL)
- **Fires on:** INSERT, DELETE, UPDATE of current_value
- **Guard:** Checks `indigo.aum_synced` flag to prevent duplicates
- **Purpose:** Transaction-purpose AUM
- **Algorithm:** UPDATE-then-INSERT

#### `sync_fund_aum_after_position()` (SECONDARY)
- **Fires on:** UPDATE of current_value only
- **Guard:** Also checks similar flags
- **Purpose:** Backup/validation
- **Note:** May be redundant with canonical path

---

## Trigger Execution Order

When a transaction is inserted (e.g., DEPOSIT):

```
1. INSERT into transactions_v2
   ↓
2. trg_ledger_sync (fn_ledger_drives_position) fires
   - Incremental update: current_value = current_value + amount
   ↓
3. trg_recompute_position_on_tx (trigger_recompute_position) fires
   - Full recompute: current_value = SUM(transactions)
   - Overwrites step 2 (authoritative)
   ↓
4. trg_sync_aum_on_position fires
   - AUM updated based on new position sum
```

**Result:** Last writer wins, with `trigger_recompute_position()` being authoritative (full recompute).

---

## Deduplication Mechanisms

### Flags in Use

| Flag | Set By | Purpose |
|------|----------|---------|
| `indigo.canonical_rpc` | repair functions | Bypass canonical guards |
| `indigo.aum_synced` | transaction functions | Prevent AUM duplicate writes |

### How It Works

1. When `void_transaction()` calls `recompute_investor_position()`, it sets `indigo.canonical_rpc = 'true'`
2. Triggers check this flag and skip if already handled
3. This prevents double-writing from trigger chains

---

## Recommended Actions

### PS-4.1: Document Coexistence (No Changes)

Keep both position triggers as they serve different purposes:
- `fn_ledger_drives_position()` — Fast incremental updates
- `trigger_recompute_position()` — Authoritative recompute

**Rationale:** The last trigger (`trigger_recompute_position`) wins, ensuring correctness.

### PS-4.2: Disable Redundant AUM Trigger

Based on analysis:
- `sync_aum_on_position_change()` is canonical (handles INSERT/DELETE/UPDATE)
- `sync_fund_aum_after_position()` is secondary (UPDATE only)

**Option A:** Keep both (justified redundancy)
**Option B:** Disable secondary trigger

### PS-4.3: Disable `trg_recompute_on_void`

The `trg_recompute_on_void` trigger checks `indigo.canonical_rpc` and mostly skips anyway. It can be disabled safely after verification.

---

## Classification Summary

| Path | Classification | Canonical | Action |
|------|----------------|-----------|--------|
| Position: INSERT | Secondary (fast delta) | No | Keep |
| Position: Full recompute | Canonical | Yes | Keep |
| AUM: Position change | Canonical | Yes | Keep |
| AUM: After UPDATE | Redundant | Candidate | Disable |
| Void recompute | Legacy | Candidate | Disable |

---

## Invariants Preserved

1. ✅ Ledger (transactions_v2) is source of truth
2. ✅ Position recompute sums non-voided transactions
3. ✅ AUM = SUM(investor_positions.current_value)
4. ✅ Void cascade reverses correctly

---

## Migration Plan

### Step 1: Observe (No changes)
- Document current behavior
- Monitor for 48 hours

### Step 2: Disable Candidate Triggers
```sql
-- Disable secondary AUM trigger (if confirmed redundant)
DROP TRIGGER IF EXISTS trg_sync_aum_after_position ON investor_positions;

-- Or disable via DO$:
-- DO $trigger$ BEGIN; END $trigger$;
```

### Step 3: Verify
- Run position validation tests
- Check AUM reconciliation
- Monitor for discrepancies

---

## Regression Checks Required

After any trigger changes:

1. **Position Drift Test**
```sql
SELECT p.investor_id, p.fund_id, p.current_value, 
       (SELECT SUM(amount) FROM transactions_v2 t 
        WHERE t.investor_id = p.investor_id AND t.fund_id = p.fund_id AND NOT t.is_voided) as ledger_balance
FROM investor_positions p
WHERE ABS(p.current_value - (
  SELECT COALESCE(SUM(amount), 0) FROM transactions_v2 t 
  WHERE t.investor_id = p.investor_id AND t.fund_id = p.fund_id AND NOT t.is_voided
)) > 0.01;
```

2. **AUM Drift Test**
```sql
SELECT f.id as fund_id, f.name as fund_name, 
       fda.total_aum as recorded_aum,
       (SELECT SUM(current_value) FROM investor_positions ip WHERE ip.fund_id = f.id) as position_aum
FROM funds f
LEFT JOIN fund_daily_aum fda ON fda.fund_id = f.id AND fda.aum_date = CURRENT_DATE AND fda.purpose = 'transaction'
WHERE fda.total_aum != (SELECT SUM(current_value) FROM investor_positions ip WHERE ip.fund_id = f.id);
```

---

## Rollback Strategy

If issues occur after trigger changes:

```sql
-- Re-enable triggers
CREATE TRIGGER trg_sync_aum_after_position 
  AFTER UPDATE OF current_value ON investor_positions 
  FOR EACH ROW EXECUTE FUNCTION sync_fund_aum_after_position();

CREATE TRIGGER trg_recompute_on_void
  AFTER UPDATE OF is_voided ON transactions_v2
  FOR EACH ROW WHEN (NEW.is_voided = true) 
  EXECUTE FUNCTION recompute_on_void();
```

---

## Document History

| Date | Change | Author |
|------|--------|--------|
| 2026-04-14 | Initial PS-4 trigger map | Phase 4 Execution |