
# Fix Overlay Issue on Investor Transactions Page

## Problem Analysis

The Investor Transactions page (`src/pages/investor/InvestorTransactionsPage.tsx`) has a layout issue where the main content container uses `overflow-hidden`, which can cause visual clipping problems with overlays, dropdowns, and other floating elements.

**Current code (line 146):**
```tsx
<div className="glass-panel rounded-3xl border border-white/5 overflow-hidden p-6 space-y-6">
```

The `overflow-hidden` class clips any content that extends beyond the container boundaries. While the Select dropdowns use portals (which render outside the DOM hierarchy), the visual effect can still be impacted by stacking contexts and clip-path behaviors.

---

## Solution

Remove `overflow-hidden` from the glass-panel container. The rounded corners can be preserved using `rounded-3xl` without clipping child content.

---

## Files to Modify

### 1. `src/pages/investor/InvestorTransactionsPage.tsx`

**Change line 146** from:
```tsx
<div className="glass-panel rounded-3xl border border-white/5 overflow-hidden p-6 space-y-6">
```

**To:**
```tsx
<div className="glass-panel rounded-3xl border border-white/5 p-6 space-y-6">
```

This removes `overflow-hidden` while preserving all other styling (rounded corners, border, padding, and spacing).

---

## Technical Details

| Property | Before | After | Effect |
|----------|--------|-------|--------|
| Container overflow | `overflow-hidden` | (removed) | Prevents clipping of overlays and dropdowns |
| Rounded corners | `rounded-3xl` | `rounded-3xl` | Preserved - no change |
| Border/styling | Preserved | Preserved | No visual change to the panel |

---

## Expected Behavior After Fix

- Select dropdown menus display correctly without being clipped
- All overlay elements (tooltips, popovers) render properly
- No visual regression to the glass-panel styling
- Proper z-index layering for floating elements
