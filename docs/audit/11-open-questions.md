# Open Questions & Blockers

## Migration Blocker: 20260327102803

**Issue**: Local Supabase fails when applying migration `20260327102803_7b93d8c3-6c1c-422a-9a49-de3f4241a375.sql`

**Root Cause**: Migration contains test/assertion logic with hardcoded UUIDs:
- Tests void/unvoid transaction cascade behavior
- Expects specific users, funds, transactions to exist
- Contains ASSERT statements that fail when test data is missing

**Evidence**:
```sql
ASSERT v_recon_count = 0, 'FAIL: Reconciliation violations after void';
ASSERT v_tx_restored = false, 'FAIL: TX still voided';
RAISE NOTICE '=== ALL 6 CHECKS PASSED ===';
```

**Impact**:
- Remote DB works fine (migration applied successfully there)
- Local `supabase start` fails on this migration
- `supabase db reset` blocked

**Current Status**:
- Remote schema dump: GENERATED ✓ (24,686 lines)
- Remote TypeScript types: GENERATED ✓ (8,506 lines)
- Analysis sessions: PROCEEDING (don't need local DB)
- Local DB reset: BLOCKED until this is resolved

## Recommended Resolution

### Option A: Comment Out Test Logic (temporary)
Move assertions into a separate test migration that runs only on demand.

### Option B: Extract Test Data as Seed
Separate the ASSERT checks from the schema changes.

### Option C: Conditional Logic
Add `IF EXISTS` checks before assertions.

## Questions for Code Review

1. **Is migration 20260327102803 a test or production schema change?**
   - The void/unvoid logic looks production-critical
   - The assertions look like test scaffolding

2. **Should test assertions be in migrations at all?**
   - Consider: schema migrations vs. test validation
   - Migrations should be idempotent and safe to replay

3. **Are the hardcoded UUIDs test fixtures or real data?**
   - `b464a3f7-60d5-4bc0-9833-7b413bcc6cae` (investor_id)
   - `0a048d9b-c4cf-46eb-b428-59e10307df93` (fund_id)
   - `4dc8cfc6-f417-4064-a1e9-b3f29bf1a46d` (transaction_id)

## Progress Tracking

- [ ] Decision on migration strategy
- [ ] Test assertion code extracted or fixed
- [ ] Local `supabase start` succeeds
- [ ] Local `supabase db reset` succeeds
- [ ] Local TypeScript types generated

## Analysis Status (Independent of Blocker)

✅ Remote schema analysis CAN proceed
✅ All 7 Claude analysis sessions CAN proceed
✅ Findings can be compiled into docs/audit/
⏳ Codex cleanup batches will need local DB working
