# Service & Hook Map

**Source**: Analysis of TypeScript/React application code
**Scope**: src/hooks/ and src/services/
**Total**: 42 custom hooks + 32 services

## Custom Hooks Directory

### Authentication Hooks (src/hooks/auth/)
- `useAuthMutations.ts` — Auth state mutations
- `useHasInvestorPositions.ts` — Check if investor has positions
- `useUserRole.ts` — Get user role
- Purpose: Authentication & authorization checks

### Data Hooks (src/hooks/data/shared/)
**Query hooks** (fetch & subscribe):
- `useActiveFunds.ts` — Funds available for investment
- `useAssetData.ts` — Asset pricing/composition
- `useAvailableBalance.ts` — Investor available cash
- `useAvailableFunds.ts` — Funds available to investor
- `useFinalizedPortfolio.ts` — Settled positions
- `useFundAUM.ts` — Fund valuation
- `useFunds.ts` — Fund list
- `useLivePlatformMetrics.ts` — Real-time platform KPIs
- `useNotifications.ts` — Investor notifications
- `useProfiles.ts` — User profiles
- `useUserAssets.ts` — Investor asset holdings
- `useWithdrawalFormData.ts` — Withdrawal form state

**Real-time hooks**:
- `useRealtimeNotifications.ts` — Pusher/Realtime notif subscriptions
- `useRealtimeSubscription.ts` — Generic realtime listener

**Supporting data hooks**:
- `useAuthFlow.ts` — Auth flow state
- `useDocuments.ts` — Document retrieval
- `useNotificationBell.ts` — Notification count
- `useProfileSettings.ts` — User settings
- `useStorage.ts` — File storage ops
- `useTransactionHooks.ts` — Transaction queries

### UI Hooks (src/hooks/ui/)
- `use-mobile.tsx` — Responsive breakpoint detection
- `use-toast.ts` — Toast notifications (shadcn/ui)
- `useBreadcrumbs.ts` — Navigation breadcrumbs
- `useDebounce.ts` — Input debouncing
- `useFocusManagement.ts` — Focus trap/management
- `useKeyboardShortcuts.ts` — Keyboard bindings
- `useLocalStorage.ts` — Browser local storage
- `useSortableColumns.ts` — Table column sorting
- `useTabFromUrl.ts` — URL-based tab state
- `useUrlFilters.ts` — URL query parameters

### Specialized Hooks (src/hooks/)
- `useAdminInitialPrefetch.ts` — Admin dashboard prefetch
- `useCorrelatedMutation.ts` — Mutation with correlation tracking
- `usePlatformError.ts` — Error handling & display
- `usePrefetchOnHover.ts` — Prefetch data on hover
- `useVersionCheck.ts` — App version checking

---

## Services Directory

### Authentication Services (src/services/auth/)
- `authService.ts` — Sign-up, sign-in, sign-out, password reset
- `inviteService.ts` — Invite generation and validation
- `context.tsx` — Auth context provider
- Dependency: Supabase Auth + Custom RPCs

### Investor Services (src/services/investor/)
- `depositService.ts` — Deposit workflow (validate, execute, notify)
- `investmentService.ts` — Add/remove from fund, position management
- `investorDataService.ts` — Investor data aggregation
- `investorLookupService.ts` — Search investors, investor details
- `investorPortalService.ts` — Portal UI data assembly
- `fundViewService.ts` — Fund detail page data
- Dependency: investor_positions, transactions_v2, funds

### IB (Introducing Broker) Services (src/services/ib/)
- `management.ts` — IB account setup, configuration
- `referrals.ts` — Track referrals, commissions
- `config.ts` — IB constants/configuration
- Dependency: ib_allocations, ib_commission_ledger, user_roles

### Notification Services (src/services/notifications/)
- `depositNotifications.ts` — Deposit status emails/SMS
- `yieldNotifications.ts` — Yield distribution notifications
- `withdrawalNotifications.ts` — Withdrawal status updates
- Dependency: notifications, statement_email_delivery tables

### Core Services (src/services/core/)
- `dataIntegrityService.ts` — Run integrity checks, repairs
- `reportUpsertService.ts` — Generate/store reports
- `systemHealthService.ts` — System monitoring, alerts
- Dependency: audit_log, admin_alerts, admin_integrity_runs

### Shared Services (src/services/shared/)
- `assetService.ts` — Asset data, pricing
- `auditLogService.ts` — Audit trail queries
- `documentService.ts` — Document CRUD ops
- `investorDataExportService.ts` — Export investor data
- `notificationService.ts` — Notification dispatch
- `performanceService.ts` — Performance metrics calculation
- `profileService.ts` — User profile management
- `statementsService.ts` — Statement generation/retrieval
- `storageService.ts` — File storage (Supabase Storage)
- `systemConfigService.ts` — System configuration
- `transactionService.ts` — Transaction CRUD & queries
- Dependency: Multiple tables, Edge Functions

---

## Service-to-Backend Dependency Map

### Investment Workflow
```
depositService.ts
├── apply_deposit_with_crystallization() [RPC]
├── investor_positions [table]
├── transactions_v2 [table]
└── funds [table]

investmentService.ts
├── add_fund_to_investor() [function]
├── adjust_investor_position() [function]
├── investor_positions [table]
└── funds [table]
```

### Yield Distribution
```
Services (via triggers/RPCs):
├── apply_daily_yield_with_validation() [RPC]
├── process_yield_distribution() [RPC]
├── crystallize_month_end() [RPC]
└── yield_distributions [table]

Hooks:
├── useAssetData → asset pricing
└── useFinalizedPortfolio → settled positions
```

### Withdrawal Pipeline
```
depositService/investorPortalService
├── create_withdrawal_request() [RPC]
├── approve_withdrawal() [RPC]
├── approve_and_complete_withdrawal() [RPC]
├── withdrawal_requests [table]
├── transactions_v2 [table]
└── withdrawalNotifications [service]
```

### Admin & Reporting
```
systemHealthService.ts
├── run_integrity_check() [RPC]
├── run_daily_health_check() [RPC]
├── admin_integrity_runs [table]
├── admin_alerts [table]
└── audit_log [table]

statementsService.ts
├── generate_statement_path() [RPC]
├── dispatch_report_delivery_run() [RPC]
├── generated_statements [table]
├── statements [table]
└── statement_email_delivery [table]
```

---

## Suspicious Patterns

### Pattern 1: Hook Proliferation
**42 custom hooks** across different concerns:
- Query hooks (24)
- UI utility hooks (11)
- Specialized hooks (7)

**Question**: Are all necessary? Could some be consolidated?
**Examples**:
- `useAvailableBalance` vs `useFinalizedPortfolio` — Overlap?
- `useNotifications` vs `useRealtimeNotifications` — Difference?
- `useActiveFunds` vs `useAvailableFunds` — When to use each?

---

### Pattern 2: Data Hook Dependencies
Multiple hooks touch overlapping data:
- `useFunds` — All funds
- `useActiveFunds` — Active funds subset
- `useAvailableFunds` — Available to investor

**Question**: Is there a caching/deduplication strategy?
**Risk**: Multiple queries for same data = performance issue

---

### Pattern 3: Service Dependency Clarity
Services don't clearly export types or interfaces.

**Examples**:
- `investorDataService.ts` — What does it return exactly?
- `investorPortalService.ts` — Aggregates from where?
- `reportUpsertService.ts` — Upsert logic or just storage?

**Action**: Add JSDoc / TypeScript signatures

---

### Pattern 4: Real-time Subscriptions
Two real-time hooks exist:
- `useRealtimeNotifications.ts` — Notification subscriptions
- `useRealtimeSubscription.ts` — Generic real-time

**Question**: Why both? Should one wrap the other?
**Risk**: Duplicate subscription logic

---

### Pattern 5: Error Handling Inconsistency
`usePlatformError.ts` exists as a hook, but:
- Services may have their own error handling
- Hooks may have their own try-catch

**Question**: Is error handling consistent across codebase?

---

## Dependency Graph

### Core Dependencies (Most Used)
```
Hooks → Services → Supabase RPC/Tables

Examples:
useDepositForm → depositService → apply_deposit_with_crystallization()
usePortfolio → investorPortalService → investor_positions + transactions_v2
useWithdrawal → depositService → create_withdrawal_request()
```

### Realtime Flow
```
useRealtimeNotifications
→ Pusher/Supabase Realtime
→ notifications table
→ statement_email_delivery tracking
```

---

## Questions for Code Review

1. **Hook Consolidation**: Can `useAvailableBalance`, `useFinalizedPortfolio`, and `useAvailableFunds` be unified?

2. **Service Naming**: Is `investorPortalService` the right name, or should it be `investorDashboardService`?

3. **Error Handling**: Where is platform error handling centralized? (usePlatformError vs service-level vs RPC-level)

4. **Caching Strategy**: Do hooks use SWR, TanStack Query, or manual caching? Should be consistent.

5. **Type Safety**: Are all service methods properly typed? Return shapes clear?

6. **Audit Trail**: How do services log mutations? (investorDataExportService vs auditLogService)

7. **Real-time Subscriptions**: Why separate useRealtimeNotifications and useRealtimeSubscription?

---

## Recommendations

### High Priority
- [ ] Document all service return types (add JSDoc or interfaces)
- [ ] Clarify overlapping hooks (consolidate where possible)
- [ ] Centralize error handling (pick one pattern)
- [ ] Establish naming convention for hooks (use*, query*, mutation*)

### Medium Priority
- [ ] Add caching layer (SWR or TanStack Query)
- [ ] Document dependency graph visually
- [ ] Refactor overlapping queries
- [ ] Standardize real-time subscription pattern

### Low Priority
- [ ] Profile hook usage for performance bottlenecks
- [ ] Consider service factory pattern
- [ ] Add integration tests for service/hook interactions
