

# Codebase Architecture Audit Report

## Executive Summary

The project is a financial platform (Indigo Yield) built with React, Vite, TypeScript, Tailwind, and Supabase. It follows a feature-based architecture with admin and investor domains. The overall structure is well-intentioned, but has accumulated significant architectural debt: duplicated abstraction layers, ghost shim files, misplaced logic, and inconsistent module boundaries.

---

## Findings by Category

### 1. CRITICAL: Dual-Location Anti-Pattern (Services + Features)

The same domain logic lives in two places:

```text
src/services/admin/         ← 28 service files
src/features/admin/*/services/ ← additional service files per feature
```

For example, investor services exist in both `src/services/admin/adminService.ts` and `src/features/admin/investors/services/investorDetailService.ts`. The barrel file `src/services/admin/index.ts` then re-exports from `src/features/` to bridge the gap. This creates circular dependency risk, makes it unclear where new services should go, and bloats the import graph.

**Recommendation**: Pick one canonical location. Since the project already has `src/features/admin/*/services/`, move all admin services there and delete `src/services/admin/` (make it a pure re-export shim during migration).

---

### 2. CRITICAL: Bloated Shared Hooks Directory

`src/hooks/data/shared/` contains **35 hook files** covering admin operations (fund CRUD, IB settings, investor mutations, yield data, statements) alongside genuine shared concerns (auth flow, notifications). This violates separation of concerns — admin-only hooks like `useInvestorMutations`, `useFundYieldLock`, `useIBSettings` are not shared.

**Recommendation**: Move admin-specific hooks to `src/hooks/data/admin/` or into `src/features/admin/*/hooks/`. Only keep truly cross-role hooks (auth, notifications, profile) in shared.

---

### 3. CRITICAL: `src/templates/index.ts` Uses Node.js APIs in Browser Bundle

This file imports `fs`, `path`, and uses `__dirname` — all Node.js-only APIs. It is included in the client-side Vite bundle and causes Rollup build failures. This is the root cause of the recurring Error #1 in every build attempt.

**Recommendation**: Either (a) move template rendering to a Supabase Edge Function (where Node APIs are available), or (b) refactor to use `fetch()` to load HTML templates at runtime, or (c) inline templates as string constants.

---

### 4. HIGH: Ghost Shim/Re-export Layers

Multiple barrel files exist solely to re-export from the canonical location:

- `src/components/admin/index.ts` — re-exports everything from `src/features/admin/`
- `src/components/investor/index.ts` — re-exports from `src/features/investor/`
- `src/hooks/data/investor/index.ts` — 134-line re-export shim
- `src/utils/assets.ts` — re-exports from `src/types/asset.ts`

These shims add no value (no consumers import from them based on search results) and increase maintenance burden. Every interface change requires updating both the source and the shim.

**Recommendation**: Delete unused shims. For still-referenced ones, update consumers to import directly from canonical sources.

---

### 5. HIGH: Formatting Utilities Scattered Across 4 Files

Formatting functions are spread across:
- `src/utils/formatters/index.ts` — `formatAUM`, `formatPercentage`, `formatAssetValue`
- `src/utils/assets.ts` — `formatAssetAmount`, `formatSignedAssetAmount`, `formatPercentage` (re-exported from financial)
- `src/utils/financial.ts` — `formatCrypto`
- `src/utils/index.ts` — re-exports from all of the above

Consumers import from different paths (`@/utils/formatters`, `@/utils/assets`, `@/utils`), and `formatPercentage` is exported from at least 3 sources. This is a direct cause of the recurring `Module has no exported member 'formatPercentage'` errors.

**Recommendation**: Consolidate all formatting into `src/utils/formatters/index.ts` as the single canonical source. Remove duplicate re-exports.

---

### 6. HIGH: `src/types/domains/report.ts` Contains Runtime Logic

This types file exports `getFundIconByAsset` (a runtime function with side effects) and uses `Buffer` (Node.js API). Type files should contain only type definitions, interfaces, and enums.

**Recommendation**: Move `getFundIconByAsset` to a service or utility file (e.g., `src/utils/assetUtils.ts`). Replace `Buffer` with `Uint8Array`/`ArrayBuffer`.

---

### 7. MEDIUM: Stale `src/pages/` Directory

Pages have been migrated to `src/features/*/pages/`, but remnants remain:
- `src/pages/investor/portfolio/index.tsx`
- `src/pages/reports/CustomReport.tsx`, `ReportsPage.tsx`
- Various public pages (`Login.tsx`, `ForgotPassword.tsx`, etc.)

The public pages are fine (no feature folder for public), but the investor/reports pages are duplicates.

**Recommendation**: Verify `src/pages/investor/` and `src/pages/reports/` are unused, then delete them.

---

### 8. MEDIUM: `src/contracts/` vs `src/types/` vs `src/integrations/supabase/`

Database schema types live in three places:
- `src/contracts/dbSchema.ts`, `dbEnums.ts`, `rpcSignatures.ts`
- `src/types/domains/` — domain-level type abstractions
- `src/integrations/supabase/types.ts` — auto-generated Supabase types

The `contracts` folder is conceptually sound but its relationship to the other two is undocumented and creates confusion about which is canonical for DB shapes.

**Recommendation**: Document the layer hierarchy: `integrations/supabase/types` (auto-generated) → `contracts/` (curated DB shapes) → `types/domains/` (app-level abstractions).

---

### 9. MEDIUM: Service Layer Fragmentation

Services are split across 5+ directories:
- `src/services/admin/`, `src/services/investor/`, `src/services/shared/`, `src/services/core/`, `src/services/auth/`
- `src/services/operations/`, `src/services/notifications/`, `src/services/profile/`
- `src/features/*/services/`

`src/services/profile/` has a single file. `src/services/operations/` has two files. These could be absorbed into `shared` or their respective feature folders.

---

### 10. LOW: `src/lib/` is a Catch-All

Contains unrelated modules: `pdf/`, `rpc/`, `security/`, `gdpr/`, `email.ts`, `performance.ts`, `logger.ts`, `correlationId.ts`, `errorHandler.ts`. Some belong in `utils` (pure functions) while others are proper library modules.

---

### 11. LOW: `src/features/admin/investors/utils/formatters.ts` Missing

This file is imported by `ExpertPositionsTable.tsx` but doesn't exist — created as a fix in prior iterations but keeps getting lost. This is a symptom of the formatting fragmentation issue (Finding #5).

---

## Prioritized Action Plan

| Priority | Step | Impact | Effort |
|----------|------|--------|--------|
| **P0** | 1. Fix `src/templates/index.ts` — remove Node.js APIs from client bundle | Unblocks build | Small |
| **P0** | 2. Consolidate `formatPercentage` into one canonical source (`@/utils/formatters`) and update all imports | Eliminates recurring TS errors | Medium |
| **P0** | 3. Move `getFundIconByAsset` out of `src/types/domains/report.ts` into a utils file; replace `Buffer` with `Uint8Array` | Fixes Rollup crash + type purity | Small |
| **P1** | 4. Audit and delete unused shim barrels (`src/components/admin/index.ts`, `src/components/investor/index.ts`) | Reduces confusion | Small |
| **P1** | 5. Move admin-specific hooks out of `src/hooks/data/shared/` into admin barrel or feature folders | Proper separation of concerns | Medium |
| **P1** | 6. Consolidate `src/services/` small directories (`profile/`, `operations/`) into `shared/` or features | Reduces directory sprawl | Small |
| **P2** | 7. Decide on single service location: either `src/services/admin/` or `src/features/admin/*/services/` — eliminate the dual pattern | Clean architecture | Large |
| **P2** | 8. Delete stale `src/pages/investor/` and `src/pages/reports/` if unused | Removes dead code | Small |
| **P2** | 9. Document the types layer hierarchy (`integrations` → `contracts` → `types/domains`) in a README | Onboarding clarity | Small |
| **P3** | 10. Reorganize `src/lib/` — move pure utilities to `utils/`, keep only true library modules | Cleaner boundaries | Medium |

