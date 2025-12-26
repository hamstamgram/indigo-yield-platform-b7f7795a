# RLS Policy Matrix

**Generated:** 2024-12-21  
**Supabase Project:** nkfimvovosdehmyyjubn  
**Total Tables with RLS:** 72

---

## Key Tables Security Matrix

### transactions_v2

| Operation | Role | Policy Name | Predicate |
|-----------|------|-------------|-----------|
| SELECT | investor | investor_can_view_own_transactions | `investor_id = auth.uid()` |
| SELECT | admin | admin_can_view_all_transactions | `public.has_role(auth.uid(), 'admin')` |
| INSERT | admin | admin_can_insert_transactions | `public.has_role(auth.uid(), 'admin')` |
| UPDATE | admin | admin_can_update_transactions | `public.has_role(auth.uid(), 'admin')` |
| DELETE | none | - | No delete policy |

### investor_positions

| Operation | Role | Policy Name | Predicate |
|-----------|------|-------------|-----------|
| SELECT | investor | investor_can_view_own_positions | `investor_id = auth.uid()` |
| SELECT | admin | admin_can_view_all_positions | `public.has_role(auth.uid(), 'admin')` |
| INSERT | admin | admin_can_insert_positions | `public.has_role(auth.uid(), 'admin')` |
| UPDATE | admin | admin_can_update_positions | `public.has_role(auth.uid(), 'admin')` |
| DELETE | admin | admin_can_delete_positions | `public.has_role(auth.uid(), 'admin')` |

### investor_fund_performance

| Operation | Role | Policy Name | Predicate |
|-----------|------|-------------|-----------|
| SELECT | investor | investor_can_view_own_performance | `investor_id = auth.uid()` |
| SELECT | admin | admin_can_view_all_performance | `public.has_role(auth.uid(), 'admin')` |
| INSERT | admin | admin_can_insert_performance | `public.has_role(auth.uid(), 'admin')` |
| UPDATE | admin | admin_can_update_performance | `public.has_role(auth.uid(), 'admin')` |

### generated_statements

| Operation | Role | Policy Name | Predicate |
|-----------|------|-------------|-----------|
| SELECT | investor | investor_can_view_own_statements | `investor_id = auth.uid()` |
| SELECT | admin | admin_can_view_all_statements | `public.has_role(auth.uid(), 'admin')` |
| INSERT | admin | admin_can_insert_statements | `public.has_role(auth.uid(), 'admin')` |

### fund_daily_aum

| Operation | Role | Policy Name | Predicate |
|-----------|------|-------------|-----------|
| SELECT | admin | admin_can_view_aum | `public.has_role(auth.uid(), 'admin')` |
| INSERT | admin | admin_can_insert_aum | `public.has_role(auth.uid(), 'admin')` |
| UPDATE | admin | admin_can_update_aum | `public.has_role(auth.uid(), 'admin')` |

### fee_allocations

| Operation | Role | Policy Name | Predicate |
|-----------|------|-------------|-----------|
| SELECT | admin | admin_can_view_fee_allocations | `public.has_role(auth.uid(), 'admin')` |
| INSERT | admin | admin_can_insert_fee_allocations | `public.has_role(auth.uid(), 'admin')` |

### ib_allocations

| Operation | Role | Policy Name | Predicate |
|-----------|------|-------------|-----------|
| SELECT | ib | ib_can_view_own_allocations | `ib_investor_id = auth.uid()` |
| SELECT | admin | admin_can_view_all_ib_allocations | `public.has_role(auth.uid(), 'admin')` |
| INSERT | admin | admin_can_insert_ib_allocations | `public.has_role(auth.uid(), 'admin')` |

### withdrawal_requests

| Operation | Role | Policy Name | Predicate |
|-----------|------|-------------|-----------|
| SELECT | investor | investor_can_view_own_withdrawals | `investor_id = auth.uid()` |
| SELECT | admin | admin_can_view_all_withdrawals | `public.has_role(auth.uid(), 'admin')` |
| INSERT | investor | investor_can_request_withdrawal | `investor_id = auth.uid()` |
| UPDATE | admin | admin_can_update_withdrawals | `public.has_role(auth.uid(), 'admin')` |

### profiles

| Operation | Role | Policy Name | Predicate |
|-----------|------|-------------|-----------|
| SELECT | investor | user_can_view_own_profile | `id = auth.uid()` |
| SELECT | admin | admin_can_view_all_profiles | `public.has_role(auth.uid(), 'admin')` |
| UPDATE | investor | user_can_update_own_profile | `id = auth.uid()` |
| UPDATE | admin | admin_can_update_all_profiles | `public.has_role(auth.uid(), 'admin')` |

### user_roles

| Operation | Role | Policy Name | Predicate |
|-----------|------|-------------|-----------|
| SELECT | self | user_can_view_own_roles | `user_id = auth.uid()` |
| SELECT | admin | admin_can_view_all_roles | `public.has_role(auth.uid(), 'admin')` |
| INSERT | super_admin | super_admin_can_assign_roles | `public.has_role(auth.uid(), 'super_admin')` |
| DELETE | super_admin | super_admin_can_revoke_roles | `public.has_role(auth.uid(), 'super_admin')` |

---

## SECURITY DEFINER Functions

These functions bypass RLS using SECURITY DEFINER with proper search_path:

| Function | Purpose | Usage |
|----------|---------|-------|
| `has_role(uuid, app_role)` | Check if user has specific role | RLS policies, route guards |
| `is_admin()` | Check if current user is admin | Simplified admin checks |
| `is_admin_safe()` | Safe admin check (non-recursive) | Internal use |
| `is_admin_for_jwt()` | JWT-based admin verification | Edge functions |
| `is_super_admin()` | Check super_admin role | Super admin only features |
| `is_ib(uuid)` | Check IB role | IB dashboard access |
| `check_is_admin(uuid)` | Admin check by user ID | RPC calls |
| `apply_daily_yield_to_fund_v2()` | Yield distribution | Admin operations |
| `force_delete_investor()` | Investor deletion | Danger zone |

---

## Verification Query

```sql
-- Get all RLS policies
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual as using_clause,
    with_check as check_clause
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;
```

---

## Security Status: ✅ PASS

- All 72 public tables have RLS enabled
- Role checks use SECURITY DEFINER functions with proper search_path
- No direct auth.users references (uses profiles + user_roles)
- Admin checks use database functions, not client storage
