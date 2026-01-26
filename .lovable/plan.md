
# Add Missing Asset Logos

## Problem Analysis

Two areas are missing asset logos:

### 1. Investor Fund Details Page (`FundDetailsPage.tsx`)
The page uses raw `<img>` tags with `assetMeta?.logo` instead of the standardized `CryptoIcon` component. This causes:
- No fallback when logos fail to load (the `onError` just hides the image completely)
- Inconsistency with the rest of the platform

**Affected locations:**
- Line 41-48: Large header logo (h-full w-full inside a 24x24 container)
- Line 60: Description inline logo (h-5 w-5)
- Line 88: Balance card logo (h-4 w-4)

### 2. Investor Overview Page - Recent Activity Section (`InvestorOverviewPage.tsx`)
The Recent Activity section shows transactions but the asset is displayed as text only without a logo.

**Affected location:**
- Line 279: Asset shown as text `{tx.asset}` without an icon

---

## Solution

Replace raw `<img>` tags with the standardized `CryptoIcon` component which:
- Uses the same centralized `getAssetLogo` utility
- Provides graceful fallback (displays asset code abbreviation if image fails)
- Maintains consistent styling across the platform

---

## Files to Modify

### 1. `src/pages/investor/funds/FundDetailsPage.tsx`

**Location 1 - Header Logo (lines 41-48):**

Replace the raw `<img>` tag with `CryptoIcon`:

```tsx
// Before (lines 41-48)
<img
  src={assetMeta?.logo}
  alt={assetCode}
  className="h-full w-full object-contain drop-shadow-md"
  onError={(e) => {
    (e.target as HTMLImageElement).style.display = "none";
  }}
/>

// After
<CryptoIcon
  symbol={assetCode}
  className="h-full w-full object-contain drop-shadow-md"
/>
```

**Location 2 - Description Logo (line 60):**

```tsx
// Before
<img src={assetMeta?.logo} alt="logo" className="h-5 w-5 object-contain opacity-50" />

// After
<CryptoIcon symbol={assetCode} className="h-5 w-5 opacity-50" />
```

**Location 3 - Balance Card Logo (line 88):**

```tsx
// Before
<img src={assetMeta?.logo} alt="logo" className="h-4 w-4 object-contain opacity-50" />

// After
<CryptoIcon symbol={assetCode} className="h-4 w-4 opacity-50" />
```

**Import Statement:**

Add at the top of the file:
```tsx
import { CryptoIcon } from "@/components/CryptoIcons";
```

---

### 2. `src/pages/investor/InvestorOverviewPage.tsx`

**Location - Recent Activity Asset Display (line 279):**

The asset is currently shown as plain text. Add a `CryptoIcon` next to it:

```tsx
// Before (line 279)
<p className="text-[10px] text-slate-500 font-bold uppercase">{tx.asset}</p>

// After
<div className="flex items-center gap-1 justify-end">
  <CryptoIcon symbol={tx.asset} className="h-3 w-3" />
  <p className="text-[10px] text-slate-500 font-bold uppercase">{tx.asset}</p>
</div>
```

Note: `CryptoIcon` is already imported in this file (line 11).

---

## Summary of Changes

| File | Location | Current State | Change |
|------|----------|---------------|--------|
| `FundDetailsPage.tsx` | Header (line 41-48) | Raw `<img>` tag | Replace with `CryptoIcon` |
| `FundDetailsPage.tsx` | Description (line 60) | Raw `<img>` tag | Replace with `CryptoIcon` |
| `FundDetailsPage.tsx` | Balance card (line 88) | Raw `<img>` tag | Replace with `CryptoIcon` |
| `InvestorOverviewPage.tsx` | Recent Activity (line 279) | Text only | Add `CryptoIcon` with text |

---

## Technical Notes

- The `CryptoIcon` component uses `getAssetLogo()` from `@/utils/assets` - the same utility the current code uses
- `CryptoIcon` provides a fallback UI showing the asset abbreviation if the image fails to load
- No database or API changes required
- Follows the platform's established pattern (as documented in memory: `style/asset-logo-standard`)

---

## Expected Result

After implementation:
- Fund Details page shows logos consistently with proper fallback
- Recent Activity section in Investor Overview displays asset logos alongside the asset code
- All logos use the centralized `CryptoIcon` component for consistent behavior
