# Architecture Verification Checklist

> Phase 2 Cleanup Complete - Final Architecture Documentation

## Overview

This checklist validates the Phase 2 cleanup work and documents the final service layer organization. Use this to verify the platform architecture is correctly structured and maintainable.

---

## 1. Service Layer Organization

### 1.1 Domain-Specific Services

| Module | Path | Purpose |
|--------|------|---------|
| Admin Services | `src/services/admin/` | Fund management, yield operations, investor administration, dashboard metrics |
| IB Services | `src/services/ib/` | Introducing Broker operations, allocations, referrals, management |
| Investor Services | `src/services/investor/` | Portal operations, deposits, withdrawals, transactions, portfolio |
| Shared Services | `src/services/shared/` | Cross-cutting utilities: audit, notifications, positions, storage |
| Operations Services | `src/services/operations/` | Operations metrics and monitoring |
| Core Services | `src/services/core/` | Low-level utilities |
| Auth Services | `src/services/auth/` | Authentication operations (moved from lib/auth) |
| Reports Services | `src/services/reports/` | Report generation (moved from lib/reports) |

### 1.2 Barrel Exports Structure

```
src/services/
├── index.ts              # Unified barrel (curated exports)
├── admin/index.ts        # Admin domain barrel
├── ib/index.ts           # IB domain barrel
├── investor/index.ts     # Investor domain barrel
├── shared/index.ts       # Shared services barrel
├── operations/index.ts   # Operations barrel
├── core/index.ts         # Core utilities barrel
└── api/                  # API-specific services
```

---

## 2. Type System Verification

### 2.1 Canonical Type Sources

| Domain | Canonical Path | Examples |
|--------|---------------|----------|
| Fund | `@/types/domains/fund` | `Fund`, `FundRef`, `FundStatus` |
| Investor | `@/types/domains/investor` | `InvestorPosition`, `InvestorSummary` |
| Transaction | `@/types/domains/transaction` | `CreateTransactionUIParams`, `TransactionType` |
| Enums | `@/types/domains/enums` | `AumPurpose`, `WithdrawalStatus` |
| Yield | `@/types/domains/yield` | `YieldDistributionRecord` |
| Notification | `@/lib/typeAdapters` | `Notification` |

### 2.2 Type Re-export Status (Post-Cleanup)

| Type | Status | Notes |
|------|--------|-------|
| `fundService` | Deprecated re-export in `shared/index.ts` | Points to `../admin/fundService` |
| `ibManagementService` | Deprecated re-export in `shared/index.ts` | Points to `../ib/management` |
| `CreateTransactionParams` | **REMOVED** | Import from `@/types/domains/transaction` |

---

## 3. Contracts and Gateway Verification

### 3.1 Zero Drift Platform Components

| Component | Path |
|-----------|------|
| Schema Truth Pack | `artifacts/schema-truth-pack.json` |
| DB Enums Contract | `src/contracts/dbEnums.ts` |
| DB Schema Contract | `src/contracts/dbSchema.ts` |
| RPC Signatures | `src/contracts/rpcSignatures.ts` |

### 3.2 Strict Gateways

| Gateway | Path | Purpose |
|---------|------|---------|
| RPC Gateway | `src/lib/rpc.ts` | All RPC calls go through `rpc.call()` |
| DB Gateway | `src/lib/db.ts` | Direct reads go through `db.from()` |

**Rule**: No direct `supabase.rpc()` or `supabase.from().insert/update/delete()` on protected tables outside gateways.

---

## 4. Config Centralization

### 4.1 Config Module Structure

```
src/config/
├── index.ts          # Central barrel export
├── environment.ts    # Environment variables
├── features.ts       # Feature flags
└── navigation.tsx    # Navigation configuration
```

### 4.2 Config Exports

| Export | Source | Type |
|--------|--------|------|
| `config` | `environment.ts` | `AppConfig` |
| `FEATURE_FLAGS` | `features.ts` | `FeatureFlags` |
| `investorNav`, `adminNavGroups` | `navigation.tsx` | `NavGroup` |

---

## 5. Hooks Organization

### 5.1 Data Hooks Structure

```
src/hooks/data/
├── index.ts           # Unified exports
├── admin/             # Admin-specific hooks
│   ├── exports/       # Tiered barrel exports by domain
│   ├── useFundsWithMetrics.ts
│   ├── useAuditLogs.ts
│   └── ... (50+ hooks)
├── investor/          # Investor portal hooks
└── shared/            # Cross-cutting hooks
```

### 5.2 React Query Standards

| Pattern | Standard |
|---------|----------|
| Critical balances | 10s stale time |
| Positions | 30s stale time |
| Static lists | 5m stale time |
| Mutations | Use `onMutate` for optimistic updates with rollback |

---

## 6. Naming Conventions

### 6.1 Full-Stack Naming Standard

| Layer | Convention | Example |
|-------|------------|---------|
| Database (source of truth) | `snake_case` | `investor_id`, `fund_class`, `tx_type` |
| RPC Parameters | `snake_case` with `p_` prefix | `p_investor_id`, `p_amount` |
| UI View Models | `camelCase` | `investorId`, `fundClass`, `txType` |
| Transform Functions | `transform*` | `transformFeeAllocation()` |

### 6.2 Transaction Ledger Columns

| Column | Type | Convention |
|--------|------|------------|
| `type` | TEXT | Transaction type (DEPOSIT, WITHDRAWAL, YIELD, etc.) |
| `value_date` | DATE | Effective date of transaction |
| `asset` | TEXT | Asset symbol (BTC, ETH, USDC) |
| `fund_class` | TEXT | Set to asset symbol |
| `source` | TEXT | 'manual_admin', 'yield_distribution', etc. |

---

## 7. Security Standards

### 7.1 Protected Tables

| Table | Protection |
|-------|------------|
| `transactions_v2` | PROTECTED - use canonical RPCs |
| `yield_distributions` | PROTECTED - use canonical RPCs |
| `investor_positions` | RLS enabled |
| `access_logs` | Permissive write, restricted read |

### 7.2 Function Security

All SECURITY DEFINER functions must use `SET search_path = public`.

---

## 8. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                │
├─────────────────────────────────────────────────────────────────┤
│  Pages/Components                                               │
│       ↓                                                         │
│  Hooks (src/hooks/data/)                                        │
│       ↓                                                         │
│  Services (src/services/)                                       │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐      │
│  │  admin/  │   ib/    │ investor/│  shared/ │   core/  │      │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘      │
│       ↓                                                         │
│  Gateways (src/lib/)                                            │
│  ┌──────────────────────┬───────────────────────┐              │
│  │  rpc.ts (RPC calls)  │  db.ts (Direct reads) │              │
│  └──────────────────────┴───────────────────────┘              │
│       ↓                                                         │
│  Contracts (src/contracts/)                                     │
│  ┌──────────────────────────────────────────────┐              │
│  │  dbEnums  │  dbSchema  │  rpcSignatures      │              │
│  └──────────────────────────────────────────────┘              │
├─────────────────────────────────────────────────────────────────┤
│                         BACKEND (Supabase)                      │
├─────────────────────────────────────────────────────────────────┤
│  Edge Functions  │  RPC Functions  │  Tables + RLS             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. Verification Checklist

- [ ] All service barrels export correctly (no TypeScript errors)
- [ ] `fundService` imports from `@/services/admin` in consumer files
- [ ] `ibManagementService` imports from `@/services/ib` in consumer files
- [ ] `CreateTransactionParams` imports from `@/types/domains/transaction`
- [ ] Config barrel (`@/config`) exports environment, features, and navigation
- [ ] Contracts barrel (`@/contracts`) exports dbEnums, dbSchema, rpcSignatures
- [ ] No cross-layer re-exports causing circular dependencies
- [ ] Build completes without TypeScript errors
- [ ] All admin pages load correctly
- [ ] Transaction creation works from both modal and direct entry

---

## 10. Changelog

### Phase 2 Cleanup (January 2026)

1. **Config Centralization**: Created `src/config/` barrel with environment, features, navigation
2. **Contracts Export**: Updated `src/contracts/index.ts` to export all contract modules
3. **IB Service Consolidation**: Merged `ibManagementService` into `src/services/ib/management.ts`
4. **Fund Service Migration**: Moved `fundService` from shared to `src/services/admin/fundService.ts`
5. **Type Re-export Cleanup**: Removed `CreateTransactionParams` re-export, updated consumers

### Phase 1 Cleanup (Prior)

1. Moved `lib/auth` to `services/auth`
2. Moved `lib/reports` to `services/reports`
3. Standardized transaction type imports
4. Removed cross-layer re-exports from barrel files
