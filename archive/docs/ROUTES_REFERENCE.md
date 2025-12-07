# Indigo Yield Platform - Routes Reference Guide

## Profile Module Routes (User-Facing - Protected)
- /profile - Profile Overview
- /profile/personal-info - Personal Information Editor
- /profile/security - Security Settings (Password, 2FA, Sessions)
- /profile/preferences - User Preferences (Notifications, Language, Timezone)
- /profile/privacy - Privacy Settings and Data Export
- /profile/linked-accounts - Bank Accounts and Wallets
- /profile/kyc-verification - KYC Verification and Document Upload
- /profile/referrals - Referral Program Dashboard

## Reports Module Routes (User-Facing - Protected)
- /reports - Reports Dashboard
- /reports/portfolio-performance - Portfolio Performance Report
- /reports/tax-report - Tax Report (1099 Generation)
- /reports/monthly-statement - Monthly Statement Viewer
- /reports/custom - Custom Report Builder
- /reports/history - Report History and Downloads

## Admin Module Routes (Admin-Only with AdminGuard)
- /admin - Admin Dashboard with Metrics
- /admin/investors-management - Investor Management List
- /admin/investor/:id - Individual Investor Details
- /admin/transactions-all - All Transactions View
- /admin/withdrawals-queue - Withdrawal Approval Queue
- /admin/documents-queue - Document Review Queue
- /admin/compliance - KYC/AML Compliance Dashboard
- /admin/reports-admin - Admin Reports Generation
- /admin/fees-management - Fee Management
- /admin/settings-platform - Platform Settings
- /admin/audit-logs - Audit Log Viewer
- /admin/users - User Management (Admin Accounts)

## Access Control

### Protected Routes
All profile and reports routes require authentication via ProtectedRoute component.

### Admin Routes
All admin routes require:
1. User authentication
2. Admin role (profile.is_admin = true)
3. Protected via AdminGuard component
4. Enforced by Supabase RLS policies

## File Locations
- Profile: /src/pages/profile/
- Reports: /src/pages/reports/
- Admin: /src/pages/admin/
- Admin Guard: /src/components/admin/AdminGuard.tsx
- Routes Config: /src/routing/AppRoutes.tsx

## Testing Checklist
See NEW_PAGES_SUMMARY.md for complete testing recommendations.
