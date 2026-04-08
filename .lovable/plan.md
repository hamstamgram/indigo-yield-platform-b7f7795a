

# Plan: Update `docs/roadmap.md` with All Post-Creation Fixes

## What Changed Since the Roadmap Was Written

Four additional migrations and four edge function updates were applied after the roadmap was created. The roadmap already has Section 4 (Resolved Issues) updated, but several other sections still contain stale data.

## Changes to Make

### 1. Section 8 — Database Table Inventory (lines 305-346)
- **Row 20** (`investor_position_snapshots`): Change `✅ Admin-only` → `✅ Admin + Investor SELECT` (P3 fix)
- **Row 25** (`profiles`): Remove `⚠️ P0` marker → `✅ Restricted` (privilege escalation fixed)
- **Row 33** (`system_config`): Remove `⚠️ P2` marker → `✅ Admin-only` (policy cleanup done)

### 2. Section 9 — Database Function Inventory (line 361)
- **`can_insert_notification`**: Change `⚠️ Uses profiles.is_admin` → `✅ Uses user_roles` (patched in Migration 1)
- **`ensure_admin`**: Same update if marked with warning

### 3. Section 11 — Financial Integrity Report (lines 797-832)
- **Line 810**: Change `0 (except P1 asymmetric void)` → `0 ✅`
- **Asymmetric Void Summary** (lines 812-822): Change Status from `Pending void` → `✅ Voided (April 8, 2026)`
- **Leakage Audit** (line 828): Change `⚠️ 1 found (P1)` → `✅ Resolved — voided`

### 4. Appendix — Migration History (lines 835-843)
Add 4 new migration entries:

| Migration | Content | Status |
|-----------|---------|--------|
| `20260408191318` | P0: Profiles privilege escalation fix — restricted UPDATE policy + sensitive field trigger + 11 functions rewritten | ✅ Applied |
| `20260408191426` | P2-P4: Drop `system_config_read/write` + add `investor_position_snapshots_select_own` | ✅ Applied |
| `20260408191518` | P1: Void orphaned distribution `63b032b8` — cascade-voided 5 transactions | ✅ Applied |
| `20260408195502` | P0-C: Bulk REVOKE EXECUTE from `anon` on all functions + selective GRANT-back whitelist + REVOKE from PUBLIC on critical mutations | ✅ Applied |

### 5. Add New Section: Edge Function Security Updates (after Section 7)
Document the 4 edge functions patched to use `checkAdminAccess()`:
- `set-user-password/index.ts`
- `send-email/index.ts`
- `excel_import/index.ts`
- `send-investor-report/index.ts`

### 6. Section 5 — Verification Checklist
Add 2 new verification rows:
- `anon` role EXECUTE revoked on all functions (bulk REVOKE) — ✅ PASS
- Edge functions use `checkAdminAccess()` — ✅ PASS (4 functions)

## Scope
- Single file edit: `docs/roadmap.md`
- No code changes, no migrations — documentation only

