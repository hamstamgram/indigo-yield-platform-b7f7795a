# FK Relationship Diagrams

**Visual representation of FK constraints for cleanup planning**

---

## Current State (With Duplicates)

### transactions_v2 Relationships

```
┌─────────────────────┐
│  transactions_v2    │
├─────────────────────┤
│ id (PK)             │
│ investor_id         │─┐ FK 1: fk_transactions_v2_investor (RESTRICT)
│                     │─┤ FK 2: transactions_v2_investor_id_fkey (CASCADE) ⚠️
│                     │ │ ↓↓↓ DUPLICATE & CONFLICTING ↓↓↓
│                     │─┘
│ fund_id             │─┐ FK 3: fk_transactions_v2_fund (RESTRICT)
│                     │─┤ FK 4: transactions_v2_fund_id_fkey (RESTRICT) ⚠️
│                     │ │ ↓↓↓ DUPLICATE (same behavior) ↓↓↓
│                     │─┘
│ distribution_id     │── FK 5: fk_transactions_v2_distribution (RESTRICT)
│ approved_by         │── FK 6: transactions_v2_approved_by_fkey (RESTRICT)
│ created_by          │── FK 7: transactions_v2_created_by_fkey (RESTRICT)
│ voided_by           │── FK 8: transactions_v2_voided_by_fkey (RESTRICT)
└─────────────────────┘
```

**Issues:**
- `investor_id`: 2 FKs with **conflicting CASCADE/RESTRICT** 🚨 HIGH RISK
- `fund_id`: 2 FKs with same behavior (redundant)

---

### investor_positions Relationships

```
┌─────────────────────┐
│ investor_positions  │
├─────────────────────┤
│ investor_id (PK)    │─┐ FK 1: fk_investor_positions_investor (RESTRICT)
│                     │─┤ FK 2: fk_investor_positions_profile (RESTRICT) ⚠️
│                     │─┤ FK 3: investor_positions_investor_id_fkey (CASCADE) ⚠️
│                     │ │ ↓↓↓ TRIPLE FK & CONFLICTING ↓↓↓
│                     │─┘
│ fund_id (PK)        │─┐ FK 4: fk_investor_positions_fund (RESTRICT)
│                     │─┤ FK 5: investor_positions_fund_id_fkey (RESTRICT) ⚠️
│                     │ │ ↓↓↓ DUPLICATE (same behavior) ↓↓↓
│                     │─┘
└─────────────────────┘
```

**Issues:**
- `investor_id`: 3 FKs! 🚨 CRITICAL
- `fund_id`: 2 FKs (redundant)

---

### fund_daily_aum Relationships

```
┌─────────────────────┐
│  fund_daily_aum     │
├─────────────────────┤
│ id (PK)             │
│ fund_id             │── FK 1: fund_daily_aum_fund_id_fkey (RESTRICT)
│ created_by          │── FK 2: fund_daily_aum_created_by_fkey (RESTRICT)
│ voided_by           │── FK 3: fund_daily_aum_voided_by_fkey (RESTRICT)
│ updated_by          │── FK 4: fund_daily_aum_updated_by_fkey (RESTRICT) [if exists]
└─────────────────────┘
```

**Issues:**
- Relatively clean
- May have hidden duplicates

---

## Target State (After Cleanup)

### transactions_v2 Relationships (Target)

```
┌─────────────────────┐
│  transactions_v2    │
├─────────────────────┤
│ id (PK)             │
│ investor_id         │── fk_transactions_v2_investor_id_profiles (RESTRICT) ✅
│                     │   [Changed from CASCADE to RESTRICT]
│ fund_id             │── fk_transactions_v2_fund_id_funds (RESTRICT) ✅
│ distribution_id     │── fk_transactions_v2_distribution_id_yield_distributions (RESTRICT) ✅
│ approved_by         │── fk_transactions_v2_approved_by_profiles (RESTRICT) ✅
│ created_by          │── fk_transactions_v2_created_by_profiles (RESTRICT) ✅
│ voided_by           │── fk_transactions_v2_voided_by_profiles (RESTRICT) ✅
└─────────────────────┘

Total: 6 FK constraints (down from 8-10)
```

---

### investor_positions Relationships (Target)

```
┌─────────────────────┐
│ investor_positions  │
├─────────────────────┤
│ investor_id (PK)    │── fk_investor_positions_investor_id_profiles (RESTRICT) ✅
│ fund_id (PK)        │── fk_investor_positions_fund_id_funds (RESTRICT) ✅
└─────────────────────┘

Total: 2 FK constraints (down from 5-7)
```

---

### fund_daily_aum Relationships (Target)

```
┌─────────────────────┐
│  fund_daily_aum     │
├─────────────────────┤
│ id (PK)             │
│ fund_id             │── fk_fund_daily_aum_fund_id_funds (RESTRICT) ✅
│ created_by          │── fk_fund_daily_aum_created_by_profiles (RESTRICT) ✅
│ voided_by           │── fk_fund_daily_aum_voided_by_profiles (RESTRICT) ✅
│ updated_by          │── fk_fund_daily_aum_updated_by_profiles (RESTRICT) ✅
└─────────────────────┘

Total: 3-4 FK constraints (stable)
```

---

## Full Entity Relationship Diagram

### Current (Simplified - Showing Duplicates)

```
                    profiles
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        │              │              │
    (RESTRICT)    (CASCADE) ⚠️   (RESTRICT)
        │              │              │
        ↓              ↓              ↓
    ┌────────────────────────────┐
    │     transactions_v2        │
    │  (has 2 FKs to profiles!)  │
    └────────────────────────────┘
                 │
                 │ (RESTRICT) x2 duplicates
                 ↓
              funds ─────────────┐
                 │               │
                 │               │
            (RESTRICT)      (RESTRICT)
                 │               │
                 ↓               ↓
    ┌──────────────────┐  ┌──────────────────┐
    │ investor_positions│  │  fund_daily_aum  │
    │ (3 FKs to profiles)│ │   (3-4 FKs)     │
    │ (2 FKs to funds!) │  └──────────────────┘
    └──────────────────┘
          │
          │ (CASCADE + 2xRESTRICT) ⚠️
          ↓
       profiles (circular reference)
```

**Legend:**
- ⚠️ = Problem area (duplicates or CASCADE)
- Single line = One FK
- Multiple lines = Duplicate FKs

---

### Target (Clean)

```
                    profiles
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        │              │              │
    (RESTRICT)    (RESTRICT)     (RESTRICT)
        │              │              │
        ↓              ↓              ↓
    ┌────────────────────────────┐
    │     transactions_v2        │
    │   (1 FK to profiles)       │
    └────────────────────────────┘
                 │
                 │ (RESTRICT)
                 ↓
              funds ─────────────┐
                 │               │
                 │               │
            (RESTRICT)      (RESTRICT)
                 │               │
                 ↓               ↓
    ┌──────────────────┐  ┌──────────────────┐
    │ investor_positions│  │  fund_daily_aum  │
    │ (1 FK to profiles)│  │   (3-4 FKs)     │
    │ (1 FK to funds)   │  └──────────────────┘
    └──────────────────┘
          │
          │ (RESTRICT)
          ↓
       profiles
```

**Legend:**
- ✅ = Clean, single FK
- All use RESTRICT for data protection

---

## Relationship Matrix

### Before Cleanup

| Source Column | Target Table | FK Count | Delete Rules | Status |
|---------------|--------------|----------|--------------|---------|
| transactions_v2.investor_id | profiles | **2** | RESTRICT + CASCADE | 🚨 CONFLICT |
| transactions_v2.fund_id | funds | **2** | RESTRICT + RESTRICT | ⚠️ DUPLICATE |
| investor_positions.investor_id | profiles | **3** | 2×RESTRICT + CASCADE | 🚨 CRITICAL |
| investor_positions.fund_id | funds | **2** | RESTRICT + RESTRICT | ⚠️ DUPLICATE |
| fund_daily_aum.fund_id | funds | 1 | RESTRICT | ✅ OK |

### After Cleanup

| Source Column | Target Table | FK Count | Delete Rule | Status |
|---------------|--------------|----------|-------------|---------|
| transactions_v2.investor_id | profiles | **1** | RESTRICT | ✅ FIXED |
| transactions_v2.fund_id | funds | **1** | RESTRICT | ✅ FIXED |
| investor_positions.investor_id | profiles | **1** | RESTRICT | ✅ FIXED |
| investor_positions.fund_id | funds | **1** | RESTRICT | ✅ FIXED |
| fund_daily_aum.fund_id | funds | 1 | RESTRICT | ✅ OK |

---

## CASCADE vs RESTRICT Impact

### Current Dangerous Behavior (CASCADE)

```
User requests profile deletion:

DELETE FROM profiles WHERE id = 'user-123';

    ↓ CASCADE delete triggered

DELETE FROM transactions_v2 WHERE investor_id = 'user-123';
    ↓ Financial history LOST! 🚨

DELETE FROM investor_positions WHERE investor_id = 'user-123';
    ↓ Position data LOST! 🚨

SUCCESS: Profile and ALL financial data deleted
```

**Problem**: Accidental deletion destroys financial records!

---

### Target Safe Behavior (RESTRICT)

```
User requests profile deletion:

DELETE FROM profiles WHERE id = 'user-123';

    ↓ Check for transactions

SELECT COUNT(*) FROM transactions_v2 WHERE investor_id = 'user-123';
    ↓ Found transactions!

ERROR: FK constraint violation
"Cannot delete profile with existing transactions"

BLOCKED: Profile NOT deleted, financial data protected ✅
```

**Solution**: Force explicit cleanup or use soft delete pattern

---

## Naming Convention Standard

### Before (Inconsistent)

```
✗ fk_transactions_v2_investor
✗ transactions_v2_investor_id_fkey
✗ fk_investor_positions_profile
✗ investor_positions_fund_id_fkey
```

Different patterns, hard to maintain

### After (Consistent)

```
✓ fk_transactions_v2_investor_id_profiles
✓ fk_transactions_v2_fund_id_funds
✓ fk_investor_positions_investor_id_profiles
✓ fk_investor_positions_fund_id_funds
```

Format: `fk_<source_table>_<column>_<target_table>`

Benefits:
- Immediately shows relationship
- Searchable in code
- No ambiguity
- Follows PostgreSQL conventions

---

## Migration Path Visualization

```
┌─────────────────────────────────────────────────────────┐
│                    STARTING STATE                       │
│  transactions_v2: 10-12 FKs (duplicates + conflicts)   │
│  investor_positions: 5-7 FKs (duplicates + conflicts)  │
│  fund_daily_aum: 3-5 FKs (mostly clean)                │
└─────────────────────────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────┐
│                    PHASE 1: Drop Duplicates             │
│  Remove 8-10 redundant constraints                      │
│  Risk: LOW  │  Downtime: 5 min  │  Safe: YES           │
└─────────────────────────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────┐
│                    PHASE 2: Standardize Names           │
│  Rename constraints to follow convention                │
│  Risk: LOW  │  Downtime: 5 min  │  Safe: YES           │
└─────────────────────────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────┐
│              🚨 APPLICATION CODE UPDATE 🚨               │
│  Implement new profile deletion logic                   │
│  Risk: HIGH  │  Time: 1-2 weeks  │  Testing: CRITICAL  │
└─────────────────────────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────┐
│                    PHASE 3: CASCADE → RESTRICT          │
│  Change ON DELETE behavior on critical FKs              │
│  Risk: HIGH  │  Downtime: 5 min  │  Safe: AFTER CODE   │
└─────────────────────────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────┐
│                    TARGET STATE ✅                       │
│  transactions_v2: 6 FKs (all RESTRICT)                  │
│  investor_positions: 2 FKs (all RESTRICT)               │
│  fund_daily_aum: 3-4 FKs (all RESTRICT)                 │
│  Zero duplicates, consistent naming, safe behavior      │
└─────────────────────────────────────────────────────────┘
```

---

## Stakeholder Impact Map

```
                    FK Constraint Cleanup
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ↓                   ↓                   ↓
    DATABASE            APPLICATION         END USERS
        │                   │                   │
   Phase 1 & 2          Phase 3             Notice Nothing
        │              Code Changes        (if done right)
        ↓                   ↓                   │
   Schema cleanup     Profile deletion          │
   5-10 min down      workflow changes          │
   Low risk           High risk                 │
        │                   │                   │
        └───────────────────┴───────────────────┘
                            │
                    Testing & Validation
```

**Key Stakeholders:**
- **DBA**: Executes migration, monitors performance
- **Backend Devs**: Update application code for Phase 3
- **DevOps**: Schedules maintenance, manages deployment
- **QA**: Tests profile deletion workflows
- **Product**: Communicates to users (if needed)

---

## Visual Checklist

```
PREPARATION
├─ [□] Diagnostic queries run
├─ [□] Duplicates identified
├─ [□] Orphaned records checked (0 found)
├─ [□] Backup created
└─ [□] Staging environment ready

PHASE 1 & 2 (Safe)
├─ [□] Drop duplicate constraints
├─ [□] Rename to standard format
├─ [□] Verify FK counts
└─ [□] Test application (should work)

APPLICATION UPDATE
├─ [□] Profile deletion code updated
├─ [□] Soft delete implemented
├─ [□] Error handling added
└─ [□] Tested in staging

PHASE 3 (After App Deploy)
├─ [□] CASCADE → RESTRICT migration
├─ [□] Verify constraint behavior
├─ [□] Test profile deletion (should be blocked)
└─ [□] Monitor for FK violations

VALIDATION
├─ [□] FK counts match target (6, 2, 3-4)
├─ [□] All financial FKs use RESTRICT
├─ [□] Application works correctly
└─ [□] Documentation updated
```

---

## Summary Metrics

### Cleanup Impact

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Total FKs | 18-24 | 11-12 | ↓ 40-50% |
| Duplicate FKs | 8-10 | 0 | ↓ 100% |
| CASCADE on financial data | 2-3 | 0 | ↓ 100% |
| Naming inconsistencies | 100% | 0% | ↓ 100% |
| Data safety | MEDIUM | HIGH | ↑ |

### Expected Outcomes

✅ Cleaner schema
✅ Consistent naming
✅ Better data protection
✅ Easier maintenance
✅ Reduced confusion
✅ Improved security

---

**For detailed implementation, see FK_CONSTRAINT_CLEANUP_PLAN.md**
