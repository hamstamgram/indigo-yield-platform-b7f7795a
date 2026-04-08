# Security Review

> Generated: 2025-12-26
> Last Security Scan: 2025-12-26

## Executive Summary

| Category | Status | Details |
|----------|--------|---------|
| RLS Enabled | ✅ All tables | 40+ tables with RLS |
| SECURITY DEFINER Functions | ✅ Audited | All include explicit auth checks |
| SECURITY DEFINER Views | ✅ Fixed | Converted to SECURITY INVOKER |
| Sensitive Data Access | ✅ Restricted | Owner-only or admin access |
| API Key Exposure | ⚠️ Manual Fix | .env keys require rotation |

---

## RLS Policy Summary

### Investor-Facing Tables

| Table | SELECT | INSERT | UPDATE | DELETE | Notes |
|-------|--------|--------|--------|--------|-------|
| profiles | Self + Admin | Self | Self + Admin | Admin | `auth.uid() = id` or `is_admin()` |
| investor_positions | Self + Admin | Admin | Admin | Admin | `investor_id = auth.uid()` |
| transactions_v2 | Self + Admin | Admin | Admin | Admin | Non-admin filtered |
| withdrawal_requests | Self + Admin | Self + Admin | Admin | Admin | Owner or admin |
| generated_statements | Self + Admin | Admin | Admin | Admin | `investor_id = auth.uid()` |
| statement_email_delivery | Self + Admin | Admin | Admin | Admin | `investor_id = auth.uid()` |
| notification_settings | Self | Self | Self | - | `user_id = auth.uid()` |
| documents | Self + Admin | Self + Admin | Self + Admin | Self + Admin | Owner-based |

### Admin-Only Tables

| Table | Access Control | Notes |
|-------|----------------|-------|
| withdrawal_audit_logs | `is_admin()` SELECT only | Immutable audit trail |
| yield_distributions | `is_admin()` all operations | Financial operations |
| fee_allocations | `is_admin()` or investor self-read | Distribution breakdown |
| ib_allocations | `is_admin()` or IB self-read | Commission records |
| admin_invites | `is_admin()` all operations | User management |
| correction_runs | `is_admin()` all operations | AUM corrections |
| audit_log | `is_admin()` SELECT, system INSERT | Immutable logs |

### Public Read Tables

| Table | Rationale | Write Access |
|-------|-----------|--------------|
| funds | Fund info is public to authenticated users | Admin only |
| assets | Asset definitions are public | Admin only |
| daily_rates | Exchange rates are public | Admin only |

---

## SECURITY DEFINER Functions

### Critical Financial Functions

| Function | Justification | Auth Check | Risk Level |
|----------|--------------|------------|------------|
| `apply_daily_yield_to_fund_v2` | Needs to write to multiple tables atomically | `is_admin_for_jwt()` at start | Low |
| `preview_daily_yield_to_fund_v2` | Consistent with apply function | `is_admin_for_jwt()` at start | Low |
| `void_yield_distribution` | Needs to void across tables | `is_admin_for_jwt()` at start | Low |
| `admin_create_transaction` | Creates transactions for other users | `is_admin_for_jwt()` at start | Low |
| `add_fund_to_investor` | Creates positions for other users | `is_admin_for_jwt()` at start | Low |

### Withdrawal Functions

| Function | Justification | Auth Check | Risk Level |
|----------|--------------|------------|------------|
| `cancel_withdrawal_by_admin` | Updates status + audit log atomically | `is_admin_for_jwt()` at start | Low |
| `delete_withdrawal` | Soft or hard delete based on flag | `is_admin_for_jwt()` at start | Low |
| `update_withdrawal_status` | State machine transitions | `is_admin_for_jwt()` at start | Low |

### Utility Functions

| Function | Justification | Auth Check | Risk Level |
|----------|--------------|------------|------------|
| `is_admin` | Avoids RLS recursion | None (utility) | Low |
| `is_admin_safe` | SECURITY DEFINER to bypass RLS | None (utility) | Low |
| `is_admin_for_jwt` | JWT-based admin check | None (utility) | Low |
| `has_role` | Generic role lookup | None (utility) | Low |
| `check_is_admin` | Admin verification | None (utility) | Low |

**Recommendation**: All SECURITY DEFINER functions are justified and include proper authorization checks. ✅ KEEP ALL

---

## View Security Analysis

### Previously SECURITY DEFINER (Now Fixed)

All views have been converted to `SECURITY INVOKER` with inline auth checks:

| View | Old State | New State | Inline Check |
|------|-----------|-----------|--------------|
| v_investor_kpis | SECURITY DEFINER | SECURITY INVOKER | `WHERE p.id = auth.uid() OR is_admin()` |
| fund_aum_mismatch | SECURITY DEFINER | SECURITY INVOKER | `WHERE is_admin()` |
| investor_position_ledger_mismatch | SECURITY DEFINER | SECURITY INVOKER | `WHERE is_admin()` |
| yield_distribution_conservation_check | SECURITY DEFINER | SECURITY INVOKER | `WHERE is_admin()` |
| v_period_orphans | SECURITY DEFINER | SECURITY INVOKER | `WHERE is_admin()` |
| v_transaction_distribution_orphans | SECURITY DEFINER | SECURITY INVOKER | `WHERE is_admin()` |
| v_ib_allocation_orphans | SECURITY DEFINER | SECURITY INVOKER | `WHERE is_admin()` |
| v_live_investor_balances | SECURITY DEFINER | SECURITY INVOKER | `WHERE is_admin()` |
| monthly_fee_summary | SECURITY DEFINER | SECURITY INVOKER | `WHERE is_admin()` |
| audit_events_v | SECURITY DEFINER | SECURITY INVOKER | `WHERE is_admin()` |
| import_status | SECURITY DEFINER | SECURITY INVOKER | `WHERE is_admin()` |

**Status**: ✅ All views now respect RLS of querying user

---

## Edge Function Security

### Authentication Required

| Function | Auth Method | Admin Check | Notes |
|----------|-------------|-------------|-------|
| send-email | JWT | `is_admin` in JWT | Validates sender domain |
| send-report-mailersend | JWT | `is_admin` in JWT | Statement delivery (Resend) |
| admin-user-management | JWT | `is_admin` in JWT | CRUD operations |
| excel_import | JWT | `is_admin` in JWT | Data import |
| excel_export | JWT | `is_admin` in JWT | Data export |
| generate-monthly-statements | JWT | `is_admin` in JWT | Statement generation |

### Webhook Functions

| Function | Auth Method | Validation |
|----------|-------------|------------|
| mailersend-webhook | Webhook Signature | HMAC verification (Resend) |
| process-webhooks | Service Role | Internal only |

### Service Role Functions

| Function | Usage | Risk Mitigation |
|----------|-------|-----------------|
| process-report-delivery-queue | Background job | Scheduled invoke only |
| bootstrap-system-users | One-time setup | Manual invoke only |

---

## Outstanding Security Items

### P0 - Fixed in This Audit

1. ✅ **profiles table exposure** - Fixed with restrictive RLS
2. ✅ **statement_email_delivery PII** - Fixed with owner-only access
3. ✅ **v_investor_kpis exposure** - Fixed with inline auth
4. ✅ **SECURITY DEFINER views** - All converted to INVOKER

### P1 - Manual DevOps Required

1. ⚠️ **API Keys in .env** - Requires manual key rotation:
   - RESEND_API_KEY
   - SENTRY_TOKEN
   - Recommendation: Rotate keys, add .env to .gitignore, use Supabase secrets

### P2 - Accepted Risks

1. ℹ️ **Extensions in public schema** - Standard Supabase configuration, non-issue

---

## Recommendations Summary

| Item | Status | Action |
|------|--------|--------|
| Enable RLS on all tables | ✅ Done | - |
| Audit SECURITY DEFINER functions | ✅ Done | All justified |
| Convert SECURITY DEFINER views | ✅ Done | All converted |
| Add inline auth to views | ✅ Done | All protected |
| Rotate exposed API keys | ⚠️ Pending | Manual DevOps task |
| Add .env to .gitignore | ⚠️ Pending | Manual DevOps task |

---

## Security Checklist for Future Changes

When adding new tables/functions, verify:

- [ ] RLS enabled on new tables
- [ ] Policies follow owner-or-admin pattern for sensitive data
- [ ] SECURITY DEFINER only used when absolutely necessary
- [ ] SECURITY DEFINER functions include explicit auth check at start
- [ ] New views use SECURITY INVOKER with inline auth
- [ ] Edge functions validate JWT and check admin role
- [ ] No secrets hardcoded in source code
- [ ] Audit log entries created for sensitive operations
