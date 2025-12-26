# Admin Roles Flow

## Overview
Role-based access control with admin and super_admin tiers.

## Roles
- `investor`: Base investor access
- `ib`: Introducing Broker access
- `admin`: Platform administration (read + limited write)
- `super_admin`: Full platform control

## Operations

### Assign Role
**Insert**: user_roles (user_id, role)
**Restriction**: Super admin only for admin roles
**Idempotency**: Unique on (user_id, role)

### Create Admin Invite
**Insert**: admin_invites (email, invite_code, intended_role)
**Restriction**: Admin only

### Use Invite
**Update**: admin_invites.used = true
**Insert**: user_roles with intended_role

## Auth Checks
- `is_admin()`: Has admin or super_admin role
- `has_role(user_id, role)`: Specific role check
- `is_super_admin()`: Has super_admin role

## Status: ✅ PASS
