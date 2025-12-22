# INDIGO Platform Role Matrix

## Generated: 2024-12-22

## User Roles

| Role | Description | Stored In |
|------|-------------|-----------|
| `investor` | Standard investor user | `user_roles` table |
| `ib` | Introducing Broker | `user_roles` table |
| `admin` | Platform administrator | `user_roles` table |
| `super_admin` | Super administrator | `user_roles` table |

## Role Hierarchy

- **super_admin** > **admin** > **ib** > **investor**
- IB users always have BOTH `ib` AND `investor` roles (dual-role)
- INDIGO FEES is a special `investor` with `is_system_account=true`

## Route Access Matrix

### Investor Routes (`/investor/*`)

| Route | investor | ib | admin |
|-------|----------|-----|-------|
| `/investor/dashboard` | ✅ | ✅ | ✅ |
| `/investor/portfolio` | ✅ | ✅ | ✅ |
| `/investor/transactions` | ✅ | ✅ | ✅ |
| `/investor/statements` | ✅ | ✅ | ✅ |
| `/investor/documents` | ✅ | ✅ | ✅ |
| `/investor/settings` | ✅ | ✅ | ✅ |
| `/investor/security` | ✅ | ✅ | ✅ |

### IB Routes (`/ib/*`)

| Route | investor | ib | admin |
|-------|----------|-----|-------|
| `/ib/overview` | ❌ | ✅ | ✅ |
| `/ib/network` | ❌ | ✅ | ✅ |
| `/ib/earnings` | ❌ | ✅ | ✅ |
| `/ib/transactions` | ❌ | ✅ | ✅ |
| `/ib/dashboard` | ❌ | ✅ | ✅ |

### Admin Routes (`/admin/*`)

| Route | investor | ib | admin | super_admin |
|-------|----------|-----|-------|-------------|
| `/admin/dashboard` | ❌ | ❌ | ✅ | ✅ |
| `/admin/investors` | ❌ | ❌ | ✅ | ✅ |
| `/admin/transactions` | ❌ | ❌ | ✅ | ✅ |
| `/admin/funds` | ❌ | ❌ | ✅ | ✅ |
| `/admin/yields` | ❌ | ❌ | ✅ | ✅ |
| `/admin/settings/admins` | ❌ | ❌ | ❌ | ✅ |
| `/admin/settings/tools` | ❌ | ❌ | ✅ | ✅ |
| `/admin/settings/invites` | ❌ | ❌ | ✅ | ✅ |
| `/admin/system-health` | ❌ | ❌ | ✅ | ✅ |

## RLS Enforcement

All role checks are performed via:
1. `has_role(user_id, role)` - Security definer function
2. `is_admin()` - Checks for admin role in user_roles
3. `check_is_admin(user_id)` - Direct admin check

**CRITICAL**: Roles are stored in `user_roles` table, NOT in `profiles` to prevent privilege escalation.
