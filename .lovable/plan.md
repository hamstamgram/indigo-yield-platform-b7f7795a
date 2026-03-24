

# Cosmetic Fixes Plan

## Issue 1: Calendar Month Dropdown Text Not Visible

The calendar uses native `<select>` dropdowns for month/year selection (`captionLayout="dropdown"`). The dropdown styling on line 36 sets `text-white` and `[color-scheme:dark]`, but the native `<option>` elements inside the `<select>` inherit the OS/browser default styling. On many platforms, the option list renders with a white/light background but the text color stays white — making months invisible.

**Fix in `src/components/ui/calendar.tsx` (line 36):**
Add explicit option styling to the dropdown class so that the native option elements are readable on all platforms:
- Add a CSS rule in `src/index.css` targeting `.calendar-dropdown option` with dark background and white text
- OR simpler: add inline Tailwind classes `[&_option]:bg-[#1e293b] [&_option]:text-white` to the `dropdown` classNames entry

This ensures the month/year option list has a dark background with white text, matching the rest of the dark theme.

## Issue 2: Yield Preview Shows Wrong Gross Amount

The distribute yield dialog header shows the sum of individual allocations (~5.9975) instead of the true gross yield (6.000). The difference is rounding dust.

**Fix in `src/services/admin/yields/yieldPreviewService.ts`:**
Compute `grossYield` as `recordedAum - openingAum` instead of using the sum-of-allocations value, so the headline matches the actual AUM delta.

---

## Files to Change

| File | Change |
|------|--------|
| `src/components/ui/calendar.tsx` line 36 | Add `[&_option]:bg-[#1e293b] [&_option]:text-white` to the `dropdown` class string |
| `src/services/admin/yields/yieldPreviewService.ts` | Compute `grossYield` from `recordedAum - openingAum` |

Both changes are purely cosmetic — no database or RPC modifications.

