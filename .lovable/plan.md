

# Remediation Plan: Fix All Open Audit Issues

## Summary
5 open issues remain from the platform audit. This plan addresses all of them in 3 migrations plus 1 edge function update pass.

---

## Migration 1: P0 — Profile Privilege Escalation (Critical)

**Problem:** Users can `UPDATE profiles SET is_admin = true WHERE id = auth.uid()`. Additionally, `can_insert_notification()` and `ensure_admin()` still read `profiles.is_admin` as a fallback, and 4 edge functions (`set-user-password`, `send-email`, `excel_import`, `send-investor-report`) check `profiles.is_admin` instead of `user_roles`.

**Database changes:**

1. **Drop** `profiles_update_own_or_admin` policy
2. **Create** a restricted self-update policy that uses a column list — users can only update: `first_name`, `last_name`, `phone`, `avatar_url`, `preferences`, `totp_enabled`, `totp_verified`. Blocked columns: `is_admin`, `role`, `account_type`, `is_system_account`, `include_in_reporting`, `kyc_status`, `email`.
3. **Rewrite `can_insert_notification()`** — remove `profiles.is_admin` read, use only `user_roles` check
4. **Rewrite `ensure_admin()`** — remove `profiles.is_admin` fallback, use only `user_roles`
5. **Patch 9 remaining functions** that read `profiles.is_admin` for admin checks — replace with `is_admin()` or `user_roles` join:
   - `get_all_investors_summary` and `get_paged_investor_summaries` — change `WHERE p.is_admin = false` to `LEFT JOIN user_roles` exclusion
   - `get_platform_stats`, `void_and_reissue_full_exit`, `get_investor_reports_v2`, `finalize_statement_period`, `unvoid_transaction`, `run_invariant_checks`, `rebuild_position_from_ledger` — replace `is_admin` column reads with `is_admin()` or `check_is_admin()`
   - `update_user_profile_secure` — block `is_admin` from updatable fields
   - `create_profile_on_signup` — sets `is_admin = false` by default (safe, but remove reference for clarity)
   - `sync_profile_is_admin`, `sync_profile_role_from_profiles`, `sync_profile_role_from_roles` — these sync roles bidirectionally; keep as-is since they derive from `user_roles` (the source of truth)

**Edge function changes (4 files):**

6. **`set-user-password/index.ts`** — replace `profiles.is_admin` check with `checkAdminAccess()` from shared admin-check module
7. **`send-email/index.ts`** — same replacement
8. **`excel_import/index.ts`** — same replacement  
9. **`send-investor-report/index.ts`** — same replacement

---

## Migration 2: P2 + P4 — Config & Policy Cleanup

1. **Drop** `system_config_read` policy (all-authenticated SELECT) — admin-only access remains via `system_config_admin_all`
2. **Drop** `system_config_write` policy (redundant with `system_config_admin_all`)
3. **Add** `investor_position_snapshots_select_own` policy: `USING (investor_id = auth.uid())` (P3 fix)

**Frontend impact:** `systemConfigService.getPlatformSettings()` is only called from `usePlatformSettings` hook which is used exclusively on admin settings pages. No investor-side breakage.

---

## Migration 3: P1 — Void Orphaned Distribution

1. Call `void_yield_distribution('63b032b8-7b16-4335-844e-b6d49e53dba0')` to cascade-void all linked transactions, fee allocations, and ledger entries
2. This restores conservation integrity for fund `2c123c4f`

This is a data operation (not schema), so it will use the insert/update tool.

---

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/set-user-password/index.ts` | Use `checkAdminAccess()` |
| `supabase/functions/send-email/index.ts` | Use `checkAdminAccess()` |
| `supabase/functions/excel_import/index.ts` | Use `checkAdminAccess()` |
| `supabase/functions/send-investor-report/index.ts` | Use `checkAdminAccess()` |
| 1 migration: profiles policy + 11 DB functions | Security hardening |
| 1 migration: system_config + snapshots policies | Cleanup |
| 1 data operation: void distribution | Integrity fix |

## Risk Assessment

- **P0 (profiles):** Critical fix, low risk — strictly more restrictive. Self-update column list tested against existing frontend forms.
- **P1 (void):** Tiny amount (0.09 USDT test distribution), cascade is well-tested.
- **P2/P4 (config):** Zero risk — only admin pages use config, admin policy remains.
- **P3 (snapshots):** Low risk — additive policy, no existing investor UI depends on it yet.

