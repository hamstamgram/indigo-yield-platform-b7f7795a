

# Performance Audit — Findings & Recommendations

## Critical Issues

### 1. `useAdminStats` bypasses React Query — causes duplicate fetches & no cache sharing

**File:** `src/features/admin/shared/hooks/useAdminStats.ts`

This hook uses raw `useState`/`useEffect` instead of `useQuery`. Every component that calls `useAdminStats()` creates an independent fetch + realtime subscription. Currently called from both `AdminDashboard` and `UnifiedInvestorsPage` — meaning two parallel Supabase realtime channels and two independent RPC calls to `get_admin_stats` on every navigation between those pages.

**Fix:** Convert to `useQuery` with a stable query key. The realtime subscription should invalidate the query cache instead of calling `loadStats()` directly. This eliminates duplicate fetches and shares cache across pages.

---

### 2. Triple admin role check on every protected page load

On every authenticated page load, the user's admin status is checked **three separate times** via different mechanisms:

1. **AuthProvider** (`context.tsx:139`) — queries `user_roles` table directly
2. **useUserRole** (`useUserRole.ts:52`) — queries `user_roles` table via React Query
3. **DashboardLayout** (`DashboardLayout.tsx:32-33`) — calls both `useAuth()` AND `useUserRole()`

The AuthProvider fetch (#1) is a raw Supabase query with no caching. useUserRole (#2) uses React Query with 5-min staleTime, which is good. But both fire on initial load, creating 2 network round-trips for the same data.

**Fix:** Remove the direct `user_roles` query from AuthProvider. Let `useUserRole` be the single source of truth for role data (it already has caching). AuthProvider should only handle session/profile data.

---

### 3. `useUnifiedInvestors` — 8 parallel Supabase queries in one `queryFn` (waterfall risk)

**File:** `src/features/admin/investors/hooks/useInvestorEnrichment.ts`

The `queryFn` fires 4 initial queries, then 4 more enrichment queries sequentially. While the enrichment uses `Promise.all` (good), the entire 8-query batch is treated as one cache entry with a 30s staleTime — meaning ALL 8 queries re-fire on every stale check, even if only one piece of data changed.

**Fix:** Split into separate `useQuery` hooks so individual parts can be cached and invalidated independently. The enrichment step can use `useQuery` with `select` or be a dependent query.

---

### 4. PostHog initialized twice

**Files:** `src/main.tsx:22` and `src/App.tsx:77`

`initPostHog()` is called both in `main.tsx` (before render) and inside `App` component (via `useEffect`). The function has an `isInitialized` guard so it's not a functional bug, but it's unnecessary work on every `App` mount.

**Fix:** Remove the `initPostHog()` call from `App.tsx` — the one in `main.tsx` is sufficient.

---

## Moderate Issues

### 5. No `React.memo` usage anywhere in the codebase

Zero components use `React.memo`. While `useMemo`/`useCallback` are used in 40+ files (good), expensive child components like `LiquidityRiskPanel`, `ConcentrationRiskPanel`, `FundSnapshotCard`, and list item rows re-render on every parent state change (e.g., toggling a dialog or typing in a search box).

**Fix:** Add `React.memo` to pure presentational components, especially:
- `FundSnapshotCard`
- `MetricStrip`
- Risk panel components
- Table row components in investor lists

---

### 6. Heavy PDF/chart libraries in main bundle chunk

`jspdf`, `html2canvas`, and `jspdf-autotable` are in a `pdf` manual chunk — but they're statically imported in `src/lib/pdf/chart-export.ts`. If any component in the main tree imports from that module, Vite may still include it in the initial load graph.

**Fix:** Ensure all PDF/chart-export imports use dynamic `import()` so the ~200KB+ PDF chunk is only loaded when a user actually generates a report.

---

### 7. 16 font weight files loaded on initial page load

`main.tsx` imports 16 CSS files for 3 font families × 4 weights each. Each weight file includes WOFF2 assets. Most pages only need Inter 400/600 and JetBrains Mono 400.

**Fix:** Reduce to essential weights (Inter 400, 500, 600, 700; Montserrat 700 only; JetBrains Mono 400). Lazy-load the rest via `@font-face` with `font-display: swap` or dynamic imports.

---

### 8. `MemoryCache` runs a global `setInterval` forever

**File:** `src/utils/performance/caching.ts:188`

A `setInterval` runs every 5 minutes to clean up the `MemoryCache`, even if it's empty. This is a minor issue but adds unnecessary wake-ups.

**Fix:** Use a lazy cleanup strategy — run cleanup on `get()` calls instead of on a timer. Or start the interval only when the cache has entries.

---

### 9. AdminDashboard is a 500-line monolith with 10+ hooks

**File:** `src/features/admin/dashboard/pages/AdminDashboard.tsx`

This page renders yield dialogs, transaction dialogs, risk panels, fund pickers, and metric strips all inline. Every state change (e.g., opening a dialog) triggers a re-render of the entire tree including all risk panels and charts.

**Fix:** Extract dialog components (`YieldOperationsDialogs`, `AddTransactionSection`) into separate components that own their own state. This isolates re-renders to only the dialog being interacted with.

---

### 10. `exceljs` and `pdfjs-dist` are production dependencies

These large libraries (~500KB+ combined) are in `dependencies` rather than being dynamically imported. If any module in the import tree references them statically, they'll be included in the initial bundle.

**Fix:** Verify these are only used via dynamic `import()`. If not, convert their consumers to use `React.lazy` or dynamic imports.

---

## Summary Priority List

| # | Issue | Impact | Effort |
|---|-------|--------|--------|
| 1 | `useAdminStats` bypasses React Query | High — duplicate fetches + channels | Low |
| 2 | Triple admin role check | Medium — 2 extra queries per page load | Low |
| 3 | `useUnifiedInvestors` 8-query monolith | Medium — cache thrashing | Medium |
| 4 | Double PostHog init | Low — guarded but wasteful | Trivial |
| 5 | No `React.memo` on heavy components | Medium — unnecessary re-renders | Medium |
| 6 | PDF libs in static import graph | Medium — bundle size | Low |
| 7 | 16 font files on initial load | Low-Medium — LCP impact | Low |
| 8 | Global `setInterval` for empty cache | Low | Trivial |
| 9 | AdminDashboard monolith re-renders | Medium — UX jank on interactions | Medium |
| 10 | Large libs as static dependencies | Medium — bundle size | Low |

