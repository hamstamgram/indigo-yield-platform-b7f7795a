# RPC Audit Quick Start

## TL;DR

**Status**: 🔴 CRITICAL ISSUES FOUND
**Total Mismatches**: 763
**Critical Mismatches**: 292
**Audited RPCs**: 253 / 360

## Top 3 Critical Issues

### 1. Parameter Order Mismatches (282 RPCs)
**Impact**: Wrong data being passed to functions
**Example**:
```typescript
// DB expects: (investor_id, fund_id, date)
// Frontend sends: (date, fund_id, investor_id)
// Result: Date value goes to investor_id field! 💥
```

### 2. Missing Required Parameters (7 RPCs)
**Impact**: RPC calls fail completely
**Affected**:
- `adjust_investor_position` - missing p_amount, p_reason
- `batch_crystallize_fund` - missing p_effective_date, p_force_override
- `force_delete_investor` - missing p_admin_id
- `get_kpi_metrics` - missing metric_type, user_id
- `require_super_admin` - missing p_actor_id
- `route_withdrawal_to_fees` - missing p_actor_id
- `upsert_fund_aum_after_yield` - missing 3 params

### 3. Non-Existent Functions (3 RPCs)
**Impact**: RPC not found errors
**Affected**:
- `fix_cost_basis_anomalies`
- `fix_doubled_cost_basis`
- `fix_position_metadata`

## Quick Fix Checklist

### Phase 1 - Critical (DO NOW)
- [ ] Remove 3 non-existent RPCs from `rpcSignatures.ts`
- [ ] Fix 7 required param count mismatches
- [ ] **Regenerate contract with correct param order** (fixes 282 mismatches)

### Phase 2 - Important (DO NEXT)
- [ ] Fix optional param mismatches (81)
- [ ] Update securityDefiner flags (244)
- [ ] Update returnsSet flags (44)

### Phase 3 - Cleanup (NICE TO HAVE)
- [ ] Document trigger functions exclusion
- [ ] Add missing utility RPCs
- [ ] Update PLATFORM_INVENTORY.md

## Files Generated

| File | Purpose |
|------|---------|
| `scripts/RPC_AUDIT_SUMMARY.md` | Detailed analysis with examples |
| `scripts/rpc-audit-report.txt` | Full 763-line raw report |
| `scripts/rpc-audit-mismatches.csv` | Spreadsheet-friendly summary |
| `scripts/db-functions.json` | Raw DB function metadata |

## How to Use

### View Full Report
```bash
cat scripts/rpc-audit-report.txt | less
```

### View Summary
```bash
cat scripts/RPC_AUDIT_SUMMARY.md | less
```

### Open in Spreadsheet
```bash
open scripts/rpc-audit-mismatches.csv
```

### Re-run Audit
```bash
npx tsx scripts/audit-rpc-signatures-v2.ts
```

## Next Steps

1. **Read** `RPC_AUDIT_SUMMARY.md` (this has detailed examples)
2. **Prioritize** the 3 critical issue categories above
3. **Create** a fix branch: `git checkout -b fix/rpc-signature-audit`
4. **Implement** Phase 1 fixes
5. **Verify** with `npx tsx scripts/audit-rpc-signatures-v2.ts`
6. **Test** affected RPCs with integration tests
7. **Commit** and deploy

## Questions?

- **Why so many mismatches?** The contract appears to have been hand-written or auto-generated incorrectly. Parameter order is critical for Supabase RPCs.
- **Will this break production?** Possibly - parameter order mismatches could cause data corruption. Priority fix.
- **Can I regenerate automatically?** Yes - recommended. Query pg_proc with correct param order.
- **What about triggers?** They're expected to be missing from frontend contract (they run on DB side only).

---
**Generated**: 2026-02-02
**Audit Script**: `scripts/audit-rpc-signatures-v2.ts`
**Database**: Supabase Production (360 functions)
**Contract**: `src/contracts/rpcSignatures.ts` (256 signatures)
