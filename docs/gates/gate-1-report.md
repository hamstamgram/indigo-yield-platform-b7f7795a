# Gate 1: Functional Smoke Tests

**Date:** ____
**Status:** Pending
**Sign-off:** CTO ☐

---

## 1. Investor Flows

| # | Test Case | Result | Notes |
|---|-----------|--------|-------|
| 1.1 | Login → dashboard loads with portfolio data | ☐ | |
| 1.2 | View transactions list | ☐ | |
| 1.3 | View yield history | ☐ | |
| 1.4 | View/download statements | ☐ | |
| 1.5 | Submit withdrawal request | ☐ | |
| 1.6 | Cancel own withdrawal | ☐ | |
| 1.7 | Update profile (name, phone, avatar) | ☐ | |
| 1.8 | Attempt to update restricted fields → blocked | ☐ | |

---

## 2. Admin Flows

| # | Test Case | Result | Notes |
|---|-----------|--------|-------|
| 2.1 | Login → admin dashboard loads with stats | ☐ | |
| 2.2 | Create manual deposit | ☐ | |
| 2.3 | Create manual withdrawal | ☐ | |
| 2.4 | Process yield distribution (preview → apply) | ☐ | |
| 2.5 | Void a transaction → verify cascade | ☐ | |
| 2.6 | Approve withdrawal | ☐ | |
| 2.7 | Reject withdrawal | ☐ | |
| 2.8 | Complete withdrawal | ☐ | |
| 2.9 | Import Excel data | ☐ | |
| 2.10 | Generate investor report | ☐ | |
| 2.11 | Send investor report | ☐ | |
| 2.12 | Invite new user | ☐ | |
| 2.13 | Set user password | ☐ | |
| 2.14 | Assign/change user roles | ☐ | |

---

## 3. Auth & RBAC

| # | Test Case | Result | Notes |
|---|-----------|--------|-------|
| 3.1 | Non-admin navigating to `/admin/*` → redirected | ☐ | |
| 3.2 | Non-admin RPC call to admin function → UNAUTHORIZED | ☐ | |
| 3.3 | Unauthenticated (anon) mutation RPC → rejected | ☐ | |

---

## 4. Edge Function Tests

| # | Function | Test Case | Result | Notes |
|---|----------|-----------|--------|-------|
| 4.1 | `send-email` | Admin sends test email ✅ | ☐ | |
| 4.2 | `send-email` | Non-admin attempt → 403 | ☐ | |
| 4.3 | `excel_import` | Admin uploads test file | ☐ | |
| 4.4 | `set-user-password` | Admin resets test password | ☐ | |
| 4.5 | `send-investor-report` | Admin sends to test investor | ☐ | |

---

## Summary

| Category | Passed | Failed | Pending |
|----------|--------|--------|---------|
| Investor Flows | 0 | 0 | 8 |
| Admin Flows | 0 | 0 | 14 |
| Auth & RBAC | 0 | 0 | 3 |
| Edge Functions | 0 | 0 | 5 |
| **Total** | **0** | **0** | **30** |

---

*Report template created: 2026-04-08*
*Execute tests → fill results → CTO sign-off*
