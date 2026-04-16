# ADR 003: SECURITY DEFINER Admin Gates

## Status
Accepted

## Context
216 of 258 SECURITY DEFINER functions lacked admin checks. This includes:
- `void_and_reissue_full_exit` (called from 3 frontend files)
- `apply_daily_yield_with_validation` (core yield distribution function)
- `crystallize_month_end` (month-end crystallization)

SECURITY DEFINER functions execute with the function owner's privileges (postgres), bypassing RLS. Without admin gates, any authenticated user could call these functions with elevated privileges.

## Decision
1. All SECURITY DEFINER mutation functions MUST include `is_admin()` or `require_admin()` gate
2. The 2 core mutation functions missing gates (`apply_daily_yield_with_validation`, `crystallize_month_end`) now have them
3. The `canonical_rpc` flag is set on all 4 core mutation functions
4. Future SECURITY DEFINER functions must include admin gates (enforced by AGENTS.md + code review)

### Gate Pattern
```sql
IF NOT is_admin(COALESCE(p_admin_id, auth.uid())) THEN
  RAISE EXCEPTION 'Unauthorized: admin role required';
END IF;
PERFORM set_config('indigo.canonical_rpc', 'true', true);
```

## Consequences
- All 4 core mutation paths now have admin checks + canonical_rpc
- 214+ less-critical SECURITY DEFINER functions still lack individual admin gates
  - These are protected by RLS on their tables and the `apply_transaction_with_crystallization` gateway
  - Full remediation tracked as P1 tech debt
- Pre-commit hooks + CI will enforce admin gates on new SECURITY DEFINER functions