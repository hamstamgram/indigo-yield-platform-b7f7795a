# UI Test Inventory - Go-Live Verification

## Route/Screen Inventory

### Public Routes (No Auth)
| Route | Purpose | User Role | Critical |
|-------|---------|-----------|----------|
| `/login` | Authentication entry | Public | ✅ CRITICAL |
| `/forgot-password` | Password recovery | Public | ⚠️ DEFER |
| `/reset-password/:token` | Password reset | Public | ⚠️ DEFER |
| `/invite/:token` | Investor invitation | Public | ⚠️ DEFER |
| `/terms` | Legal | Public | 🔲 NON-CRITICAL |
| `/privacy` | Legal | Public | 🔲 NON-CRITICAL |
| `/health` | System health check | Public | 🔲 NON-CRITICAL |

### Investor Routes
| Route | Purpose | User Role | Critical |
|-------|---------|-----------|----------|
| `/investor` | Dashboard/Overview | Investor | ✅ CRITICAL |
| `/investor/portfolio` | Holdings & allocation | Investor | ✅ CRITICAL |
| `/investor/yield-history` | Yield history table | Investor | ✅ CRITICAL |
| `/investor/transactions` | Transaction history | Investor | ✅ CRITICAL |
| `/investor/withdrawals` | Withdrawal requests | Investor | ✅ CRITICAL |
| `/investor/withdrawals/new` | Create withdrawal | Investor | ✅ CRITICAL |
| `/investor/statements` | Document statements | Investor | ✅ CRITICAL |
| `/investor/settings` | Profile/settings | Investor | ⚠️ DEFER |

### Admin Routes
| Route | Purpose | User Role | Critical |
|-------|---------|-----------|----------|
| `/admin` | Command Center dashboard | Admin | ✅ CRITICAL |
| `/admin/revenue` | Revenue metrics | Admin | ✅ CRITICAL |
| `/admin/investors` | Investor management | Admin | ✅ CRITICAL |
| `/admin/investors/:id` | Investor details | Admin | ✅ CRITICAL |
| `/admin/ledger` | Transaction ledger | Admin | ✅ CRITICAL |
| `/admin/yield-history` | Yield distribution admin | Admin | ✅ CRITICAL |
| `/admin/reports` | Report generation | Admin | ✅ CRITICAL |
| `/admin/operations` | System operations | Admin | ⚠️ DEFER |
| `/admin/settings` | Admin settings | Admin | ⚠️ DEFER |

---

## Action Inventory by Screen

### 1. Login (`/login`)
- **Purpose**: Authenticate users
- **User Role**: Public → Investor/Admin
- **Buttons**: Login button, Forgot password link
- **Forms**: Email, password
- **Backend Calls**: POST /auth/login
- **Success**: Redirect to role-based dashboard
- **Error**: Invalid credentials message, rate limit warning
- **Critical**: YES

### 2. Investor Dashboard (`/investor`)
- **Purpose**: Portfolio overview
- **User Role**: Investor
- **Widgets**: AUM display, holdings cards, yield summary, recent activity
- **Tables**: Recent transactions (5)
- **Filters**: Time period selector
- **Backend Calls**: GET /investor/summary, GET /investor/holdings
- **Success**: Dashboard renders with data
- **Error**: Loading states, empty states
- **Critical**: YES

### 3. Portfolio (`/investor/portfolio`)
- **Purpose**: Holdings breakdown
- **User Role**: Investor
- **Buttons**: View details per holding, export
- **Tables**: Holdings by token, allocation pie
- **Filters**: Sort by value, filter by token
- **Backend Calls**: GET /investor/portfolio
- **Success**: Holdings display
- **Error**: Empty state if no holdings
- **Critical**: YES

### 4. Yield History (`/investor/yield-history`)
- **Purpose**: View yield distributions
- **User Role**: Investor
- **Buttons**: Filter, export
- **Tables**: Yield entries with date, amount, token
- **Filters**: Date range, token filter
- **Backend Calls**: GET /investor/yields
- **Success**: Yield table populated
- **Error**: Empty state message
- **Critical**: YES

### 5. Transactions (`/investor/transactions`)
- **Purpose**: Transaction history
- **User Role**: Investor
- **Buttons**: Filter, export, view details
- **Tables**: Transaction list with status, type, amount
- **Filters**: Date range, type (deposit/withdrawal), status
- **Backend Calls**: GET /investor/transactions
- **Success**: Transaction list
- **Error**: Empty state, loading
- **Critical**: YES

### 6. Withdrawals (`/investor/withdrawals`)
- **Purpose**: Withdrawal management
- **User Role**: Investor
- **Buttons**: New withdrawal, view details
- **Tables**: Withdrawal history
- **Filters**: Status, date
- **Backend Calls**: GET /investor/withdrawals
- **Success**: List displays
- **Error**: Empty state
- **Critical**: YES

### 7. New Withdrawal (`/investor/withdrawals/new`)
- **Purpose**: Create withdrawal request
- **User Role**: Investor
- **Buttons**: Submit, cancel
- **Forms**: Amount, destination wallet, confirmation
- **Validation**: Required fields, amount limits, wallet format
- **Backend Calls**: POST /investor/withdrawals
- **Success**: Redirect to history, success toast
- **Error**: Validation errors, insufficient balance, server error
- **Critical**: YES

### 8. Statements (`/investor/statements`)
- **Purpose**: Download statements
- **User Role**: Investor
- **Buttons**: Download PDF, view list
- **Tables**: Available statements by period
- **Backend Calls**: GET /investor/statements
- **Success**: Statement list with download links
- **Error**: Empty state
- **Critical**: YES

### 9. Admin Command Center (`/admin`)
- **Purpose**: Admin dashboard overview
- **User Role**: Admin
- **Widgets**: Total AUM, active investors, pending operations, revenue metrics
- **Buttons**: Quick actions, refresh
- **Backend Calls**: GET /admin/dashboard
- **Success**: Metrics display
- **Error**: Loading, error state
- **Critical**: YES

### 10. Revenue (`/admin/revenue`)
- **Purpose**: Revenue tracking
- **User Role**: Admin
- **Widgets**: Revenue by period, fee collection
- **Tables**: Revenue breakdown
- **Filters**: Date range
- **Backend Calls**: GET /admin/revenue
- **Success**: Data displays
- **Critical**: YES

### 11. Investors (`/admin/investors`)
- **Purpose**: Investor management
- **User Role**: Admin
- **Buttons**: Create investor invite, search, view details, edit
- **Tables**: Investor list with status, AUM, actions
- **Filters**: Search, status filter, sort
- **Backend Calls**: GET /admin/investors, POST /admin/investors/invite
- **Success**: Investor list
- **Error**: Empty state, error state
- **Critical**: YES

### 12. Investor Details (`/admin/investors/:id`)
- **Purpose**: Single investor management
- **User Role**: Admin
- **Buttons**: Edit, fund, withdraw, view history, disable
- **Widgets**: Profile, holdings, activity
- **Backend Calls**: GET /admin/investors/:id
- **Critical**: YES

### 13. Ledger (`/admin/ledger`)
- **Purpose**: Transaction ledger
- **User Role**: Admin
- **Buttons**: Create transaction, void, export, filter
- **Tables**: Full transaction list
- **Filters**: Date, type, status, investor, fund
- **Backend Calls**: GET /admin/transactions, POST /admin/transactions
- **Success**: Transaction list
- **Error**: Loading, error
- **Critical**: YES

### 14. Yield History Admin (`/admin/yield-history`)
- **Purpose**: Yield distribution management
- **User Role**: Admin
- **Buttons**: Preview distribution, apply distribution, view history
- **Tables**: Yield entries
- **Filters**: Date, fund, status
- **Backend Calls**: GET /admin/yields, POST /admin/yields/apply
- **Success**: Yield history
- **Critical**: YES

### 15. Reports (`/admin/reports`)
- **Purpose**: Generate reports
- **User Role**: Admin
- **Buttons**: Generate report, download, filter
- **Forms**: Report type, date range, investor filter
- **Backend Calls**: GET /admin/reports, POST /admin/reports/generate
- **Success**: Report list/display
- **Error**: Validation, generation errors
- **Critical**: YES

---

## Critical vs Non-Critical Classification

### CRITICAL (Must work today)
1. `/login` - Authentication entry
2. `/investor` - Investor dashboard
3. `/investor/portfolio` - Holdings view
4. `/investor/yield-history` - Yield visibility
5. `/investor/transactions` - Transaction visibility
6. `/investor/withdrawals` - Withdrawal management
7. `/investor/withdrawals/new` - Withdrawal creation
8. `/admin` - Admin dashboard
9. `/admin/investors` - Investor management
10. `/admin/investors/:id` - Investor details
11. `/admin/ledger` - Transaction management
12. `/admin/yield-history` - Yield management
13. `/admin/reports` - Report generation

### DEFER (Can be disabled)
1. `/investor/settings` - Settings (post-launch)
2. `/admin/operations` - Operations (non-critical today)
3. `/admin/settings` - Admin settings (post-launch)

### NON-CRITICAL (Can ignore today)
1. `/terms` - Legal page
2. `/privacy` - Legal page
3. `/health` - Health check (automated)
4. `/forgot-password` - Password recovery
5. `/reset-password/:token` - Password reset
6. `/invite/:token` - Invitation flow

---

## Same-Day Execution Order

### Phase A - Authentication (START HERE)
1. Login page renders → `✅`
2. Invalid credentials error → `✅`
3. Successful login redirects → `✅`

### Phase B - Core Investor Flows
4. Investor dashboard loads → `✅`
5. Portfolio renders correctly → `✅`
6. Yield history displays → `✅`
7. Transaction list displays → `✅`
8. Withdrawal list displays → `✅`
9. New withdrawal form submits → `✅`
10. Statements list displays → `✅`

### Phase C - Core Admin Flows
11. Admin dashboard loads → `✅`
12. Revenue page loads → `✅`
13. Investor list displays → `✅`
14. Investor details accessible → `✅`
15. Ledger displays transactions → `✅`
16. Yield history displays → `✅`
17. Reports page accessible → `✅`

### Phase D - Cross-Page Validation
18. Investor → deposit → see in transactions → `✅`
19. Investor → withdrawal → see in history → `✅`
20. Admin → create deposit → investor sees it → `✅`
21. Admin → yield apply → investor sees it → `✅`

### Phase E - Mutation Validation
22. Create deposit (admin) → verify in ledger → `✅`
23. Create withdrawal (investor) → verify status → `✅`
24. Void transaction (admin) → verify status change → `✅`
25. Apply yield (admin) → verify in yield history → `✅`