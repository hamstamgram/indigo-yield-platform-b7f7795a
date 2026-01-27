
# Fix Scroll Issues Across All Pages

## Problem Identified
When recording a yield event (and potentially in other dialogs/sheets), users cannot scroll down to see all content. This is caused by conflicting CSS classes that block scrolling.

## Root Causes

### 1. Yield Operations Dialog - CRITICAL FIX
**File:** `src/pages/admin/YieldOperationsPage.tsx` (Line 167)

The DialogContent has conflicting overflow classes:
```tsx
className="max-w-4xl max-h-[90vh] overflow-y-auto glass-panel border-white/10 p-0 overflow-hidden"
```

The `overflow-hidden` at the end **overrides** the earlier `overflow-y-auto`, preventing scrolling inside the dialog.

**Fix:** Remove the conflicting `overflow-hidden` class:
```tsx
className="max-w-4xl max-h-[90vh] overflow-y-auto glass-panel border-white/10 p-0"
```

---

### 2. Yield Correction Panel Sheet - SECONDARY FIX
**File:** `src/components/admin/yields/YieldCorrectionPanel.tsx` (Line 169)

The SheetContent has `overflow-hidden` which could block scrolling:
```tsx
className="w-full sm:max-w-2xl overflow-hidden flex flex-col"
```

While it uses a `ScrollArea` inside, the parent `overflow-hidden` combined with the flex column layout may cause issues on smaller viewports.

**Fix:** Change to use `overflow-y-auto` or rely on the internal ScrollArea:
```tsx
className="w-full sm:max-w-2xl flex flex-col overflow-y-auto"
```

---

### 3. DashboardLayout Main Content - ALREADY CORRECT
**File:** `src/components/layout/DashboardLayout.tsx`

The layout structure is correct:
- Root container: `overflow-hidden` (to contain the layout)
- Main element: `overflow-y-auto` (allows page scrolling)

This is working as designed. The memory note confirms this was previously fixed.

---

### 4. ActionBar Bottom Padding - ALREADY IMPLEMENTED
The fixed ActionBar at the bottom requires pages to have `pb-20` to prevent content being hidden. This is already applied on affected pages (YieldOperationsPage has `pb-20`).

---

## Implementation Steps

### Step 1: Fix Yield Dialog Scroll
Remove conflicting `overflow-hidden` from the DialogContent in YieldOperationsPage.

### Step 2: Fix Yield Correction Panel Scroll
Update SheetContent to allow scrolling properly.

### Step 3: Audit Other Dialogs (Optional)
Review other dialog/sheet components for similar issues.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/admin/YieldOperationsPage.tsx` | Remove `overflow-hidden` from DialogContent (line 167) |
| `src/components/admin/yields/YieldCorrectionPanel.tsx` | Replace `overflow-hidden` with `overflow-y-auto` (line 169) |

---

## Testing Checklist
After implementation:
1. Open Yield Operations page
2. Click "Record Yield" on any fund
3. Fill in the form and click Preview
4. Verify the preview results section is fully scrollable
5. Test the Apply Yield confirmation dialog
6. Open the Yield Correction panel (from Recorded Yields page)
7. Verify all content is scrollable in the sheet

---

## Technical Details

The issue stems from CSS specificity:
- When multiple overflow classes are present, the **last one wins**
- `overflow-hidden` on a parent blocks scrolling even if children have `overflow-y-auto`
- `max-h-[90vh]` requires `overflow-y-auto` to work correctly for tall content

### CSS Order of Application
```css
/* What's happening: */
.element {
  overflow-y: auto;    /* First: enables scroll */
  overflow: hidden;    /* Last: OVERRIDES, disables scroll */
}
```

The fix ensures scroll is preserved while maintaining the visual design.
