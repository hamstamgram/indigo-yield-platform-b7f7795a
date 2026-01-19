# Admin Function Architecture

**Version:** 1.0  
**Last Updated:** 2026-01-19  
**Related:** `docs/GO_LIVE_RPC_AUDIT.md`, `memory/admin/rbac-hierarchy-and-enforcement`

---

## Overview

The admin function system provides role-based access control (RBAC) for all administrative operations. This document catalogs the admin utility functions, their purposes, and usage patterns.

---

## Role Hierarchy

```
super_admin
    ├── All admin permissions
    ├── Manage admin roles
    ├── Unlock fund periods
    ├── Void yield distributions
    ├── Edit fee settings
    └── Reset data operations

admin
    ├── View all data
    ├── Create transactions
    ├── Approve withdrawals (within limits)
    ├── Generate reports
    └── Cannot edit investor personal info
```

---

## Function Categories

### 1. Auth Check Functions (RLS Policies)

These functions are used in Row Level Security policies and triggers.

| Function | Purpose | Used By |
|----------|---------|---------|
| `is_admin()` | Current user is admin/super_admin | RLS policies, triggers |
| `is_admin_safe()` | SECURITY DEFINER variant | Views with RLS bypass |
| `is_admin_for_jwt()` | JWT-based check | Edge functions |

**Usage Pattern (RLS):**
```sql
CREATE POLICY "Admins can view all transactions"
ON transactions_v2 FOR SELECT
USING (is_admin() OR auth.uid() = investor_id);
```

### 2. User-Specific Check Functions

These functions check admin status for a specific user (not current user).

| Function | Purpose | Used By |
|----------|---------|---------|
| `check_is_admin(user_id)` | Check if user is admin | Admin management UI |
| `get_user_admin_status(user_id)` | Same (alternative signature) | Admin list page |
| `has_super_admin_role(user_id)` | Check super admin status | Role display |

**Usage Pattern (Frontend):**
```typescript
const { data: isSuperAdmin } = await rpc.call('has_super_admin_role', { p_user_id: userId });
```

### 3. Guard Functions (RPC Bodies)

These functions raise exceptions if the caller lacks required permissions.

| Function | Purpose | Exception Message |
|----------|---------|-------------------|
| `ensure_admin()` | Require admin role | "Permission denied: Admin required" |
| `require_super_admin(op)` | Require super admin | "Permission denied: {op} requires Super Admin" |

**Usage Pattern (RPC):**
```sql
CREATE FUNCTION apply_deposit_with_crystallization(...)
RETURNS ... AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Permission denied: Admin role required';
  END IF;
  -- ... operation logic
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 4. Role Management Functions

Functions for creating and managing admin accounts.

| Function | Purpose | Required Role |
|----------|---------|---------------|
| `create_admin_invite(email, role)` | Create invite code | super_admin |
| `validate_invite_code(code)` | Check if code is valid | Any |
| `use_invite_code(code, user_id)` | Consume code, assign role | Any (during signup) |
| `update_admin_role(user_id, role)` | Change user's role | super_admin |

**Invite Flow:**
```
1. Super Admin calls create_admin_invite('new@admin.com', 'admin')
2. System generates invite code (UUID)
3. New user signs up with invite link
4. use_invite_code() assigns role and marks invite used
5. sync_profile_is_admin() trigger updates profiles.is_admin
```

### 5. Utility Functions

Supporting functions for admin operations.

| Function | Purpose |
|----------|---------|
| `get_admin_name(user_id)` | Get display name for audit logs |
| `current_user_is_admin_or_owner(user_id)` | Combined owner/admin check for RLS |
| `has_role(role_name)` | Generic role check for custom roles |
| `sync_profile_is_admin()` | Trigger to sync is_admin flag |

---

## Best Practices

### 1. Always Use Guards in RPC Functions

```sql
-- ✅ CORRECT
CREATE FUNCTION admin_operation(...)
RETURNS ... AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Permission denied: Admin required';
  END IF;
  -- operation
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ❌ WRONG (no guard)
CREATE FUNCTION admin_operation(...)
RETURNS ... AS $$
BEGIN
  -- operation without permission check!
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. Use Appropriate Check for Context

| Context | Use This Function |
|---------|-------------------|
| RLS policy | `is_admin()` |
| SECURITY DEFINER view | `is_admin_safe()` |
| Edge function | `is_admin_for_jwt()` |
| RPC function body | `is_admin()` with explicit guard |
| Check other user | `check_is_admin(user_id)` |

### 3. Super Admin for Sensitive Operations

These operations MUST use `is_super_admin()` or `require_super_admin()`:

- `unlock_fund_period_snapshot` - Unlocking locked periods
- `void_yield_distribution` - Voiding yield distributions
- `reset_all_data_keep_profiles` - Data reset
- `update_admin_role` - Role management
- `edit_investor_personal_info` - PII changes

### 4. Audit All Admin Actions

All admin operations should log to `audit_log`:

```sql
INSERT INTO audit_log (action, entity, actor_user, meta)
VALUES ('ADMIN_ACTION', 'entity_name', auth.uid(), 
        jsonb_build_object('details', p_details));
```

---

## Edge Function Pattern

For edge functions, use the shared `admin-check.ts` helper:

```typescript
import { checkAdminAccess, createAdminDeniedResponse } from "../_shared/admin-check.ts";

// In handler:
const adminCheck = await checkAdminAccess(supabaseAdmin, userId);
if (!adminCheck.isAdmin) {
  return createAdminDeniedResponse(corsHeaders, adminCheck.error);
}
```

This helper:
1. Checks `user_roles` table first (preferred)
2. Falls back to `profiles.is_admin` (legacy)
3. Returns structured result with email for logging

---

## Removed Functions

The following functions were removed as unused (P2-04 cleanup):

| Function | Reason |
|----------|--------|
| `admin_fix_opening_aum(uuid, numeric)` | Never called from frontend |
| `admin_fix_position(uuid, uuid)` | Never called from frontend |
| `admin_set_distribution_status(uuid, text)` | Never called from frontend |

These were one-off data repair functions that were never exposed to the UI.

---

## Related Files

- `supabase/functions/_shared/admin-check.ts` - Edge function admin check helper
- `src/services/admin/adminInviteService.ts` - Admin invite management
- `src/services/admin/adminUsersService.ts` - Admin user management
- `src/hooks/useAdminCheck.ts` - React hook for admin status
