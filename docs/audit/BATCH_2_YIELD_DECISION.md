# Batch 2 Decision: Canonical Yield Distribution Function

**Status**: DECIDED ✅
**Canonical**: `apply_segmented_yield_distribution_v5` + `preview_segmented_yield_distribution_v5`
**Deprecated**: v3 variants

---

## Analysis

### Evidence: v5 is Canonical

#### Production Code References
```
src/lib/rpc/client.ts:294
  return call("apply_segmented_yield_distribution_v5" as RPCFunctionName, {

src/features/admin/yields/services/yields/yieldPreviewService.ts:80
  const { data, error } = await (callRPC as any)("preview_segmented_yield_distribution_v5", {

src/features/admin/yields/services/yields/yieldApplyService.ts:59
  const { data, error } = await (callRPC as any)("apply_segmented_yield_distribution_v5", {

src/contracts/rpcSignatures.ts:31
  "apply_segmented_yield_distribution_v5",

src/contracts/rpcSignatures.ts:150
  "preview_daily_yield_to_fund_v3",  <- only for preview fallback
```

#### Rate Limiting Configuration
```
src/lib/rpc/client.ts:52-55
  apply_segmented_yield_distribution_v5: {
    windowMs: 60000,
    maxRequests: 5,
    actionType: "yield_distribution",
  },
```

#### Integration Tests
- `yieldCrystallizationService.ts` uses v5
- E2E tests call v5 functions
- No tests reference v3 functions

### Evidence: v3 is Unused

#### Type Definitions Only
```
src/integrations/supabase/types.ts:6153
  apply_adb_yield_distribution_v3: {

src/integrations/supabase/types.ts:7025
  preview_adb_yield_distribution_v3: {
```

#### No Application Calls
```
rg "apply_adb_yield_distribution_v3\|preview_adb_yield_distribution_v3" src/
# Returns: 0 matches in application code
```

#### No Migration Calls (Recent)
- Last reference: migration 20260307000000 (definitive baseline)
- No subsequent migrations mention v3 functions
- Migration 20260315000001 explicitly drops v4 overload

---

## Decision

### Keep (v5)
- `apply_segmented_yield_distribution_v5()` — Primary yield distribution
- `preview_segmented_yield_distribution_v5()` — Yield preview

### Deprecate (v3)
- `apply_adb_yield_distribution_v3()` — Historical, unused
- `preview_adb_yield_distribution_v3()` — Historical, unused

### Drop (v4)
- Already dropped in migration 20260315000001_drop_stale_yield_v5_overload.sql

---

## Consolidation Plan

### Phase 1: Remove v3 References (this batch)
1. Drop v3 functions from database via migration
2. Remove v3 type definitions from `src/integrations/supabase/types.ts` (auto-regenerates)
3. Remove v3 references from contracts (if any)

### Phase 2: Verify v5 Stability (next 2 weeks)
1. Monitor yield distribution in production
2. Verify no errors in audit_log for yield operations
3. Run regression tests on historical yield calculations

### Phase 3: Document v5 Contract (future)
1. Create ADR (Architecture Decision Record) for yield calculation method
2. Document segment-based proportional allocation logic
3. Add comments to v5 function explaining algorithm

---

## Rollback Plan

If issues discovered after v3 deletion:
1. Revert the migration that drops v3 functions
2. Verify v3 still compiles in database
3. Investigate issue in v5 logic
4. Fix v5 implementation
5. Re-attempt v3 removal after fix verified

---

## Risk Assessment

**Risk Level**: LOW

**Why Low**:
- v3 not called anywhere in application
- v5 actively used and monitored
- No hidden dependencies found
- Database migration is reversible
- No customer-facing changes

**Monitoring After Removal**:
- Check audit_log for yield operations
- Monitor yield distribution API response times
- Verify no "function not found" errors
- Spot-check calculated yields for accuracy

---

## Implementation Steps

1. ✅ Create migration to DROP v3 functions
2. ✅ Verify rpcSignatures.ts compiles after removal
3. ✅ Commit migration
4. ✅ Run tests to verify no errors
5. ⏳ Monitor in staging for 24h before production

---

## Questions Answered

**Q: Why were v3 and v5 created separately?**
- Migration history suggests v5 was an improvement for segmented proportional allocation
- v3 may have been earlier "daily yield" implementation
- v5 was deemed superior and became the standard

**Q: What about v4?**
- Already dropped in migration 20260315000001
- Was an overload/variant of v5, not a full alternative

**Q: Can v3 be archived instead of deleted?**
- Could create backup migration in `/supabase/archived_migrations/`
- But since v5 is working fine, deletion is simpler
- Code history available in git if needed

---

## Approvals

- Decision Made By: Code Audit Process
- Risk Assessment: Low
- Execution Timing: Immediate (Batch 2, Week 1)
- Production Rollout: Staging first (24h), then prod
