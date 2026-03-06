# Admin UI Audit Report

**Date:** 2026-02-19
**Auditor:** Automated code review (Guilfoyle/Jack Roberts/Socrates lens)
**Scope:** All 9 admin pages, sidebar, shared components

---

## Summary

| Severity | Found | Fixed | Needs Decision |
|----------|-------|-------|----------------|
| P0 Critical | 1 | 1 | 0 |
| P1 Important | 7 | 6 | 1 |
| P2 Nice-to-have | 12 | 0 | 12 |

---

## Issues Fixed

### P0: Investor Search Input Unresponsive (FIXED)

**File:** `src/features/admin/investors/components/list/InvestorFiltersBar.tsx`

**Problem:** Every keystroke in the search input called `onSearchChange()` which triggered `setFilter("search", v)` via `useUrlFilters`, updating URL search params on every character. This caused a full URL update -> re-derive filters -> re-filter investors -> re-render cycle on every keystroke, making the search sluggish or broken with rapid typing.

**Fix:** Added local `useState` for the input value (immediate, responsive typing) with a 300ms debounced callback to `onSearchChange` for URL param updates. Added `useEffect` to sync local state when `searchTerm` prop changes externally (browser navigation, clear filters). Used `useRef` for the timeout to avoid stale closures, with cleanup on unmount.

**Lines changed:** Lines 1-85 (imports and component body before the return JSX)

---

### P1: Inconsistent Date Formatting (FIXED - 4 files)

**Problem:** Several admin pages used `toLocaleDateString()`, `toLocaleString()`, or `toLocaleTimeString()` which produce locale-dependent output (e.g., "2/19/2026" in en-US vs "19/2/2026" in en-GB). The standard across the app is `format()` from date-fns with `"MMM d, yyyy"` pattern.

**Files fixed:**

| File | Line | Before | After |
|------|------|--------|-------|
| `src/features/admin/settings/components/AdminUsersList.tsx` | ~150 | `new Date(...).toLocaleDateString()` | `format(new Date(...), "MMM d, yyyy")` |
| `src/features/admin/system/pages/AuditLogViewer.tsx` | ~337 | `new Date(log.created_at).toLocaleString()` | `format(new Date(log.created_at), "MMM d, yyyy HH:mm")` |
| `src/features/admin/ib/pages/IBManagementPage.tsx` | ~313 | `new Date(ib.createdAt).toLocaleDateString()` | `format(new Date(ib.createdAt), "MMM d, yyyy")` |
| `src/features/admin/system/pages/OperationsPage.tsx` | ~143 | `health[0].lastChecked.toLocaleTimeString()` | `format(health[0].lastChecked, "HH:mm:ss")` |

Added `import { format } from "date-fns"` where missing.

---

### P1: Inconsistent Tab Styling on Yield History Page (FIXED)

**File:** `src/features/admin/yields/pages/YieldHistoryPage.tsx`

**Problem:** Used custom glass-style tabs (`bg-black/20 border border-white/10 p-1 rounded-xl` with `data-[state=active]:bg-indigo-600`) while all other tabbed pages (Ledger, Reports, Revenue, Operations, Settings) use the default `<TabsList>` / `<TabsTrigger>` styling.

**Fix:** Replaced with standard `<TabsList>` and added consistent tab icons (`TrendingUp`, `BarChart3`) matching the icon-in-tab pattern used by Ledger, Reports, Revenue, and Operations pages.

---

### P1: Yield History Tab Not URL-Persisted (FIXED)

**File:** `src/features/admin/yields/pages/YieldHistoryPage.tsx`

**Problem:** Used `defaultValue="recorded"` (no URL persistence), unlike Ledger, Reports, Revenue, Operations which all use `useTabFromUrl()` to persist the active tab in `?tab=` search params. Navigating away and back always reset to "Recorded Yields" tab.

**Fix:** Added `useTabFromUrl({ defaultTab: "recorded" })` with controlled `value`/`onValueChange` on the `<Tabs>` component, matching the pattern used by all other tabbed admin pages.

---

### P1: Inconsistent Page Heading Style (FIXED)

**File:** `src/features/admin/yields/pages/YieldHistoryPage.tsx`

**Problem:** Used `text-2xl font-display font-bold tracking-tight` while most admin pages use `text-2xl font-bold`. The `font-display` class adds a different font family and `tracking-tight` adds letter spacing that other pages don't have.

**Fix:** Changed to `text-2xl font-bold` to match the standard pattern used by Ledger, Reports, Revenue, Operations, Settings, and Investors pages.

---

### P1: Sidebar Group Headers Too Prominent (FIXED)

**File:** `src/components/sidebar/NavSection.tsx`

**Problem:** Group headers ("COMMAND", "INVESTORS", "REPORTING", "SYSTEM") used `text-sm font-bold text-sidebar-foreground` making them visually compete with the navigation items for attention. As section dividers, they should be subtle.

**Fix:** Changed to `text-[11px] font-semibold text-muted-foreground` - slightly smaller, lighter weight, and muted color. Still uppercase with tracking for scanability, but clearly subordinate to the nav items.

---

### P1: Revenue Tab Name Mismatch (FIXED)

**File:** `src/features/admin/revenue/pages/RevenuePage.tsx`

**Problem:** Tab was labeled "IB Commissions" but the embedded component is `IBManagementPage` which includes IB creation, referral counts, and earnings breakdown - not just commissions. The sidebar navigation also references this section as management-related.

**Fix:** Renamed tab to "IB Management" to accurately represent the full scope of the tab content.

---

## Issues Needing Decision

### P1: Fund Management and Dashboard Use Different Design Language

**Files:**
- `src/features/admin/funds/pages/FundManagementPage.tsx` - uses `font-display`, glass cards, custom gradients, `text-white` explicit colors
- `src/pages/admin/AdminDashboard.tsx` - uses glass panels, custom indigo tabs, explicit color values
- `src/features/admin/yields/pages/YieldDistributionsPage.tsx` - uses `font-display`

**Observation:** These pages use a "Yield Spectrum" glass-card design aesthetic (intentionally different from the standard card-based layout). They feature gradient backgrounds, glow effects, custom border colors. While visually impressive, they create two distinct design languages within the admin portal.

**Options:**
1. Standardize all pages to the default card-based design (simpler, more consistent)
2. Standardize all pages to the glass-card design (more visually striking)
3. Keep the current mix (dashboard/funds are "showcase" pages, others are functional)

**Recommendation:** Keep current mix (option 3) for now. The dashboard and fund management are "hero" pages that benefit from the dramatic styling. Operations, Ledger, Reports are data-dense and benefit from the simpler layout.

---

## Issues Documented (Not Fixed)

### P2: Remaining `toLocaleDateString()` / `toLocaleString()` Usage

These files still use locale-dependent date formatting. They are in secondary views (dialogs, detail panels, nested tabs) rather than primary admin pages:

| File | Line | Context |
|------|------|---------|
| `VoidAndReissueDialog.tsx` | 414 | Preflow event timestamp |
| `StatementManager.tsx` | 290 | Draft statement created date |
| `InvestorProfileEditor.tsx` | 184, 240 | Investor created date |
| `ExpertPositionsTable.tsx` | 243 | Last transaction date |
| `InvestorTransactionsTab.tsx` | 132 | Transaction date in investor detail |
| `RealtimeNotifications.tsx` | 35 | Notification timestamp |
| `ProfessionalStatementGenerator.tsx` | 176, 263 | Statement generation date |
| `MonthlyReportsTable.tsx` | 41, 215 | Month labels |

**Recommendation:** Fix these in a follow-up PR to keep this PR focused.

---

### P2: No Text Search on Withdrawals Table

**File:** `src/features/admin/withdrawals/pages/AdminWithdrawalsPage.tsx`

**Observation:** The Withdrawals tab (under Ledger) has status and fund filters but no text search for investor name/email. With >10 withdrawals, finding a specific one requires scrolling.

**Recommendation:** Add a search input similar to the Transactions tab. Low priority since withdrawal volume is typically low.

---

### P2: Fund Management Page Has No Search/Filter

**File:** `src/features/admin/funds/pages/FundManagementPage.tsx`

**Observation:** The fund cards don't have a search or filter. With the current small number of funds (likely <10), this is fine. If fund count grows, a filter by status (active/archived) would be useful.

---

### P2: Inconsistent `PageShell` Padding in Embedded Pages

**Observation:** When pages are embedded (via `embedded` prop), some wrap in `PageShell` and some don't:
- `AdminTransactionsPage` - standalone uses `PageShell`, embedded returns raw JSX
- `AdminWithdrawalsPage` - standalone uses `PageShell`, embedded returns raw JSX
- `FeesOverviewPage` - standalone uses custom container, embedded uses raw JSX
- `IBManagementPage` - standalone uses `PageShell`, embedded returns raw JSX

This is actually correct behavior - the parent tabbed page (Ledger, Revenue) provides the `PageShell`. No fix needed.

---

### P2: `font-display` in Yield Distributions Page

**File:** `src/features/admin/yields/pages/YieldDistributionsPage.tsx:432`

Uses `text-2xl font-display font-bold tracking-tight` for its standalone heading. When embedded in Yield History, the heading is hidden. Standalone access is rare. Low priority.

---

### P2: Fees Overview Page Uses `text-3xl` Heading

**File:** `src/features/admin/fees/pages/FeesOverviewPage.tsx:82`

Uses `text-3xl font-display font-bold` for standalone mode heading, while all other pages use `text-2xl font-bold`. Since this page is primarily accessed via the Revenue tab (where the heading is hidden), this is cosmetic only.

---

### P2: Badge Styling Mostly Consistent

**Observation:** Badge usage across admin pages is generally consistent:
- Success/active: `bg-emerald-500/10 text-emerald-400` or `bg-green-600`
- Error/failed: `variant="destructive"` or `text-rose-400`
- Warning/pending: `bg-yellow-500/10 text-yellow-400`
- Info/outline: `variant="outline"`

Minor inconsistency: Reports page uses `<Badge className="bg-green-600">Sent</Badge>` while other pages use `bg-emerald-500/10 text-emerald-400` for success states. The `bg-green-600` is bolder/more opaque. This is acceptable as "sent" is a completed action deserving emphasis.

---

### P2: Table Header Naming Consistency

**Observation:** Table headers are generally consistent across pages. Notable patterns:
- Date columns: "Date" (transactions), "Time" (audit log), "Request Date" (withdrawals)
- Status columns: "Status" (used consistently)
- Amount columns: "Amount" (used consistently)

No conflicting patterns like "Period" vs "Month" or "Status" vs "State" were found.

---

### P2: Empty States Are Present but Inconsistent in Style

**Observation:** Empty states exist on all major pages but vary in presentation:
- Fund Management: Full illustrated empty state with icon, title, description, and CTA button
- Transactions: Simple inline "No transactions found" text
- Withdrawals: Uses `WithdrawalsTable` component with `emptyMessage` prop
- Operations (Crystallization): Illustrated empty state with checkmark icon

**Recommendation:** Standardize empty states in a future PR. The current variety is functional.

---

### P2: Card Padding Is Mostly Consistent

**Observation:** Standard shadcn/ui `<Card>` / `<CardContent>` provides consistent padding across most pages. The glass-card pages (Dashboard, Funds) use custom padding (`p-6`) but this is part of their intentional design language.

---

### P2: Responsive Behavior

**Observation:** All table pages wrap in `overflow-x-auto` divs, allowing horizontal scroll on smaller screens. The Investors page uses `ResizablePanelGroup` for its 2-panel layout. Fund Management supports grid/list view toggle. No major responsive issues found in the admin pages.

---

## Page-by-Page Audit Summary

### 1. `/admin` - Command Center
- **Status:** Good
- **Design:** Glass-card aesthetic (intentional)
- **Naming:** Clear ("Command Center", "Apply Yield", "New Transaction")
- **Search/Filter:** N/A (dashboard, not data table)
- **Empty states:** Loading spinner shown
- **Issues:** None found

### 2. `/admin/investors` - Investors Page
- **Status:** P0 search bug FIXED
- **Design:** Standard card + table layout
- **Naming:** Clear
- **Search/Filter:** Now works correctly with debounce
- **Empty states:** Present in table
- **Issues:** None remaining

### 3. `/admin/ledger` - Ledger Page (Transactions + Withdrawals)
- **Status:** Good
- **Design:** Standard tabbed layout with URL persistence
- **Naming:** Clear
- **Search/Filter:** Transactions has search; Withdrawals has status/fund filters
- **Empty states:** Both tabs have empty states
- **Issues:** P2 - Withdrawals could benefit from text search

### 4. `/admin/yield-history` - Yield History
- **Status:** 3 issues FIXED (tab style, URL persistence, heading)
- **Design:** Now consistent with other tabbed pages
- **Naming:** Clear
- **Search/Filter:** Recorded Yields has date/fund/purpose filters
- **Empty states:** Present
- **Issues:** None remaining

### 5. `/admin/reports` - Reports Page
- **Status:** Good
- **Design:** Standard tabbed layout with URL persistence
- **Naming:** Clear
- **Search/Filter:** Monthly Statements has month/search filters; Historical has month/search
- **Empty states:** Present
- **Issues:** None found

### 6. `/admin/funds` - Fund Management
- **Status:** Good
- **Design:** Glass-card aesthetic (intentional)
- **Naming:** Clear
- **Search/Filter:** No search (low fund count)
- **Empty states:** Full illustrated empty state
- **Issues:** P2 - No search/filter (acceptable for small count)

### 7. `/admin/revenue` - Revenue Page
- **Status:** Tab name FIXED ("IB Commissions" -> "IB Management")
- **Design:** Standard tabbed layout with URL persistence
- **Naming:** Now clear
- **Search/Filter:** Fees has date range + fund filter; IB has no search (low count)
- **Empty states:** Present in both tabs
- **Issues:** None remaining

### 8. `/admin/operations` - Operations Page
- **Status:** Date format FIXED
- **Design:** Standard tabbed layout with URL persistence (4 tabs)
- **Naming:** Clear
- **Search/Filter:** Integrity has run history; Crystallization has fund filter; Audit has full search
- **Empty states:** Present in all tabs
- **Issues:** None remaining

### 9. `/admin/settings` - Settings Page
- **Status:** Date format FIXED (AdminUsersList)
- **Design:** Standard tabbed layout
- **Naming:** Clear
- **Search/Filter:** Admin management shows all admins (low count)
- **Empty states:** Present
- **Issues:** None remaining

### Sidebar
- **Status:** Group headers FIXED (more subtle)
- **Design:** Clean navigation with icons
- **Naming:** Clear professional labels
- **Issues:** None remaining

---

## Verification

- TypeScript check: `npx tsc --noEmit` - PASS (zero errors)
- Build: `npm run build` - PASS (4.01s)
- No `console.log` added
- No hardcoded secrets
- All changes are UI-only (no financial logic touched)
