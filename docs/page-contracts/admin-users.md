# Admin Users Page Contract

## Route
`/admin/settings/users`

## Purpose
Manage administrator users, send invitations, and control access roles for the platform.

## Data Dependencies

### Primary Tables
- `profiles` - User profile information
- `admin_invites` - Pending admin invitations
- `user_roles` (via auth.users metadata) - Role assignments

### Query Keys
- `QUERY_KEYS.profiles`
- `QUERY_KEYS.adminInvites`
- `QUERY_KEYS.userRoles()`

## User Actions

### View Admin Users
- List all users with admin roles
- See role assignments
- View last login timestamps
- Search by name or email

### Send Invitation
- Enter email address
- Select intended role
- Generate unique invite code
- Send invitation email

### Manage Invites
- View pending invitations
- Resend invitation email
- Revoke unused invitations
- See invitation status

### Update Roles
- Change user role assignments
- Promote/demote admin level
- Deactivate user access

## Cache Invalidation
After user operations:
- `QUERY_KEYS.profiles`
- `QUERY_KEYS.adminInvites`
- `QUERY_KEYS.userRoles()`

Use `invalidateAfterAdminInviteOp()` for invites

## Components
- `AdminUsersPage` - Main page container
- `AdminUserTable` - User list with actions
- `InviteAdminDialog` - New invitation form
- `PendingInvitesTable` - Invitation list
- `RoleEditor` - Role assignment controls

## Hooks
- `useProfiles` - User data
- `useAdminInvites` - Invitation management
- `useSystemAdmin` - Admin operations

## Permissions
- Requires `super_admin` role
- Cannot modify own role
- Cannot delete last super_admin

## Security Considerations
- Invite codes expire after 7 days
- One-time use invite links
- Audit log all role changes
- Require 2FA for super_admin
