# Cleanup Batches — Execution Plan

**Status**: FRAMEWORK READY — Awaiting migration blocker fix + Codex implementation
**Phase**: Day 4+ (after local DB is stabilized)

## Pre-Cleanup Checklist

Before starting any Codex cleanup batches:

- [ ] Fix migration blocker (20260327102803)
- [ ] Verify `supabase start` succeeds
- [ ] Verify `supabase db reset` succeeds
- [ ] Run `npm run typecheck` — should pass
- [ ] Run `npm run lint` — should pass
- [ ] Run `npm test` — should pass
- [ ] Review all docs/audit/ files

**Current Status**: ⏳ Awaiting migration fix

---

## Batch 1: Dead Code Removal (Week 1)

**Scope**: QA code + backup tables + test migrations
**Risk Level**: LOW
**Estimated Time**: 2-3 hours

### Batch 1a: QA Function Deletion

**Files to Edit**:
- `supabase/migrations/` — Remove QA creation functions
- `src/` — Remove any QA imports/calls

**Functions to Delete**:
- `qa_seed_world()`
- `qa_admin_id()`
- `qa_fund_id()`
- `qa_investor_id()`
- `block_test_profiles()`

**Execution Steps**:
1. Create migration: `supabase/migrations/20260414_remove_qa_code.sql`
2. Add: `DROP FUNCTION IF EXISTS public.qa_seed_world();`
3. Add: `DROP FUNCTION IF EXISTS public.qa_admin_id();`
4. Add: `DROP FUNCTION IF EXISTS public.qa_fund_id();`
5. Add: `DROP FUNCTION IF EXISTS public.qa_investor_id();`
6. Add: `DROP FUNCTION IF EXISTS public.block_test_profiles();`
7. Verify no code references these functions
8. Test: `supabase db reset`
9. Commit: `refactor(db): remove QA helper functions`

**Validation**:
```bash
rg "qa_seed_world|qa_admin_id|qa_fund_id|block_test_profiles" src/
# Should return 0 results
```

---

### Batch 1b: Backup Table Archival

**Tables to Archive**:
- `_fee_schedule_backup`
- `_fund_aum_backup`
- `_funds_backup`
- `_ib_schedule_backup`
- `_positions_backup`
- `_profiles_backup`
- `_transactions_backup`
- `_user_roles_backup`

**Execution Steps**:
1. Verify these tables are NOT referenced anywhere:
   ```bash
   rg "_backup" src/ tests/
   # Should return 0 results
   ```
2. Create migration: `supabase/migrations/20260414_archive_backup_tables.sql`
3. Add: `DROP TABLE IF EXISTS public._fee_schedule_backup CASCADE;`
4. (Repeat for all 8 tables)
5. Test: `supabase db reset`
6. Commit: `refactor(db): archive backup tables`

---

### Batch 1c: Test Assertion Migration Fix

**Problem Migration**: `20260327102803_*.sql`

**Execution Steps**:
1. Copy migration content to `tests/migrations/20260327102803_void_unvoid_tests.sql`
2. Edit original migration to comment out assertions:
   ```sql
   -- ASSERT v_recon_count = 0, 'FAIL: Reconciliation violations after void';
   -- RAISE NOTICE 'PASS: Reconciliation clean after void (% violations)', v_recon_count;
   ```
3. Keep the function definition, remove assertions
4. Test: `supabase db reset`
5. Commit: `chore: move void/unvoid test assertions to test suite`

---

### Batch 1 Validation

```bash
# 1. All tests pass
npm run typecheck
npm run lint
npm test

# 2. Local DB resets cleanly
supabase db reset

# 3. No references to deleted code
rg "qa_|_backup" src/ tests/

# 4. Generated types match schema
supabase gen types typescript --local > docs/audit/_local-db-types.ts
# Compare size with _remote-db-types.ts
```

---

## Batch 2: Canonical Yield Functions (Week 2)

**Scope**: Determine v3 vs v5 canonical, deprecate unused versions
**Risk Level**: MEDIUM (business-critical)
**Estimated Time**: 4-6 hours

### Execution Steps:

1. **Investigate which version is canonical**:
   - Check git history: When was v3 created? v5?
   - Check hooks: Which version do they call?
   - Check migrations: Which version was last updated?

2. **Create decision document**:
   ```markdown
   # Yield Distribution Version Decision
   
   ## Investigated
   - Created dates in migrations
   - Hook references
   - Production call sites
   - Test coverage
   
   ## Decision
   [Canonical version is: v3 or v5]
   [Reason: ...]
   
   ## Deprecation Plan
   - v3: [Keep|Deprecated]
   - v4: Dropped (delete references)
   - v5: [Keep|Deprecated]
   ```

3. **Consolidate canonical version**:
   - If v3: Delete v5 and overloads
   - If v5: Delete v3 and consolidate overloads

4. **Update hooks**:
   - Change all yield calls to canonical version only
   - Remove conditional logic (if v3 then... else v5)

5. **Create migration**:
   - Drop unused versions
   - Keep canonical only

6. **Test thoroughly**:
   ```bash
   npm test -- --grep "yield|crystal"
   supabase db reset
   npm run dev
   # Test yield distribution in UI
   ```

---

## Batch 3: Void Logic Consolidation (Week 2)

**Scope**: Consolidate 4 void functions into 1 atomic function
**Risk Level**: HIGH (transaction ledger)
**Estimated Time**: 6-8 hours

### Current Functions:
- `void_and_reissue_transaction()`
- `void_and_reissue_full_exit()`
- `void_transactions_bulk()`
- `cascade_void_from_transaction()`

### Execution Steps:

1. **Create unified function**:
   ```sql
   CREATE OR REPLACE FUNCTION void_transaction_atomic(
     tx_id uuid,
     reason text,
     user_id uuid
   )
   RETURNS TABLE (void_result boolean)
   LANGUAGE plpgsql
   SECURITY DEFINER
   AS $$
   BEGIN
     -- Void the transaction
     UPDATE transactions_v2 SET is_voided = true WHERE id = tx_id;
     
     -- Trigger cascade (via trigger)
     -- (cascade_void_from_transaction becomes automatic trigger)
     
     -- Reissue if applicable
     -- ...
     
     -- Log to audit
     INSERT INTO audit_log (...) VALUES (...);
     
     RETURN QUERY SELECT true;
   END;
   $$;
   ```

2. **Test**:
   ```bash
   npm test -- --grep "void|reissue"
   ```

3. **Update hook calls**:
   - Remove `void_and_reissue_transaction()` calls
   - Replace with `void_transaction_atomic()`

4. **Deprecate old functions**:
   - Create migration with `DROP` statements
   - Verify no remaining references

---

## Batch 4: Position Sync Consolidation (Week 3)

**Scope**: Single sync path via transaction trigger
**Risk Level**: HIGH (position integrity)
**Estimated Time**: 8-10 hours

### Current Paths:
- `sync_aum_on_position_change()`
- `sync_aum_on_transaction()`
- `sync_fund_aum_events_voided_by_profile()`
- `update_fund_aum_baseline()`
- Multiple other sync functions

### Execution Plan:

1. **Pick canonical path**:
   - Transaction → Position update (recommended)

2. **Create unified trigger**:
   ```sql
   CREATE OR REPLACE TRIGGER trg_sync_position_on_tx
   AFTER INSERT OR UPDATE ON transactions_v2
   FOR EACH ROW
   EXECUTE FUNCTION sync_position_from_tx();
   ```

3. **Create single sync function**:
   ```sql
   CREATE OR REPLACE FUNCTION sync_position_from_tx()
   RETURNS trigger AS $$
   BEGIN
     -- Update position
     -- Sync AUM
     -- Update snapshots
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql;
   ```

4. **Deprecate other sync functions**
5. **Validate with comprehensive tests**

---

## Batch 5: Hook Consolidation (Week 3)

**Scope**: Merge overlapping data hooks
**Risk Level**: LOW
**Estimated Time**: 4-6 hours

### Hooks to Consolidate:
- `useAvailableFunds` + `useActiveFunds` + `useFunds`
- `useRealtimeNotifications` + `useRealtimeSubscription`
- `useNotifications` + `useNotificationBell`

### Execution Plan:

1. **Create unified hook**:
   ```typescript
   // src/hooks/data/shared/useFunds.ts
   export function useFunds(options: {
     status?: 'all' | 'active' | 'available'
   } = {}) {
     // Single implementation, parametrized
   }
   ```

2. **Update all call sites**
3. **Remove old hooks**
4. **Update imports throughout codebase**
5. **Test all routes that use these hooks**

---

## Batch 6: AUM Reconciliation View Cleanup (Week 4)

**Scope**: Reduce 21 views to 5 essential ones
**Risk Level**: MEDIUM
**Estimated Time**: 4-6 hours

### Views to Keep:
- `v_fund_aum_position_health` — Main reconciliation
- `aum_position_reconciliation` — AUM vs position detail
- `v_ledger_reconciliation` — Transaction consistency
- `position_transaction_reconciliation` — Ledger consistency
- `v_yield_conservation_violations` — Yield math check

### Views to Archive:
- `v_potential_duplicate_profiles`
- `v_orphaned_positions` (use v_fund_aum_position_health instead)
- `v_orphaned_transactions` (use v_ledger_reconciliation instead)
- ... (11 others)

### Execution Plan:

1. Create `DROP VIEW` migration for deprecated views
2. Update any dashboards/reports that use them
3. Document which view to use for each use case
4. Monitor consolidated views for violations

---

## Batch Validation Template

After each batch:

```bash
# 1. Type checking
npm run typecheck

# 2. Linting
npm run lint

# 3. Tests
npm test

# 4. Database consistency
supabase db reset
supabase gen types typescript --local > /tmp/types.ts
diff /tmp/types.ts docs/audit/_local-db-types.ts
# Should be minimal changes

# 5. Application startup
npm run dev
# Test the specific feature area

# 6. Git status
git status
git diff --stat
```

---

## Rollback Strategy

If any batch causes issues:

```bash
# 1. Revert the last commit
git revert --no-commit HEAD

# 2. Fix the issue
# (edit files)

# 3. Commit the fix
git commit -m "fix: revert and fix [batch name]"

# 4. OR: Hard revert if too broken
git reset --hard HEAD~1
```

---

## Codex Execution Template

For each batch, use this Codex prompt:

```
Act as a senior software engineer executing controlled cleanup.

Context:
The analysis for this domain is complete (see docs/audit/).
You must only work within the proven scope.

Goal:
Execute cleanup batch [N]: [Batch Name]

Evidence:
[Paste findings from docs/audit/0X-*.md]

Tasks:
1. Apply the smallest safe set of changes needed.
2. Do not touch unrelated files.
3. Preserve existing business logic.
4. Update only what needs changing.

Scope:
[List exact files/migrations]

Output:
A. Planned changes (file, reason, risk)
B. Patch order
C. Test plan
D. Rollback signals

Rules:
- No broad rewrites
- No speculative deletions
- Preserve business logic
- Small reversible changes

After completion:
npm run typecheck && npm run lint && npm test
supabase db reset
git add . && git commit -m "refactor: [batch name]"
```

---

## Success Criteria

After all batches complete:

- [ ] 318 functions → ~200 functions (30% reduction)
- [ ] 98 migrations → ~50 consolidated migrations
- [ ] 21 views → 5 essential views
- [ ] 4 void functions → 1 atomic function
- [ ] 42 hooks → 30 hooks (cleaner API)
- [ ] Zero QA code in production
- [ ] All tests passing
- [ ] All linting passing
- [ ] Local DB stable & resetable
- [ ] No hidden dependencies
- [ ] Business logic unchanged
