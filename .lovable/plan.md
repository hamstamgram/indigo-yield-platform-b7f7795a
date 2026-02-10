

## Fix: Navigation Active State Bug + Reorganize INDIGO Fees Position

### Problem 1: Two nav items highlighted simultaneously

When clicking a sidebar menu item, the previous item sometimes stays highlighted. The root cause is in `NavSection.tsx`'s `isActive` function. For investor routes, the logic checks:

```
href !== "/" && location.pathname.startsWith(href + "/")
```

This means when you're on `/investor/portfolio`, the path starts with `/investor/` — so both "Overview" (`/investor`) and "Portfolio" (`/investor/portfolio`) show as active.

**Fix**: Add an exception for base routes like `/investor` so they only match on exact path equality, not prefix matching.

### Problem 2: INDIGO Fees should be right after Command Center

Currently, INDIGO Fees lives inside the "Yield & Reporting" nav group. It needs to move into the "Command" group, positioned immediately after "Command Center".

**Fix**: Move the INDIGO Fees entry from the "Yield & Reporting" group to the "Command" group in `src/config/navigation.tsx`.

### Problem 3: Build error (periodEndDate)

`InvestorOverviewPage.tsx` references `assetStats.periodEndDate` but the return type of `usePerAssetStats` only has `{ assets, activeFunds }`. This property doesn't exist.

**Fix**: Remove the `periodEndDate` conditional block (lines 222-230) since the data source never provides this field.

---

### Technical Changes

**File 1: `src/components/sidebar/NavSection.tsx`**
- Update `isActive()` to treat `/investor` and `/dashboard` as exact-match-only routes, preventing them from prefix-matching child routes like `/investor/portfolio`

**File 2: `src/config/navigation.tsx`**
- Move the "INDIGO Fees" nav item from the "Yield & Reporting" group into the "Command" group, right after "Command Center"

**File 3: `src/pages/investor/InvestorOverviewPage.tsx`**
- Remove lines 222-230 that reference the non-existent `periodEndDate` property to fix the TypeScript build error

