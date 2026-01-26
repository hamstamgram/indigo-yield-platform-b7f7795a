
# Fix Scroll Issue on the Platform

## Problem Analysis

The dashboard layout has a broken scroll configuration that prevents page content from scrolling:

```text
┌─────────────────────────────────────────────────┐
│ DashboardLayout (h-screen, overflow-hidden) ❌  │
│ ┌─────────────────────────────────────────────┐ │
│ │ Main Content (overflow-hidden) ❌            │ │
│ │ ┌─────────────────────────────────────────┐ │ │
│ │ │ Inner Div (h-full, no scroll) ❌        │ │ │
│ │ │                                         │ │ │
│ │ │  Page Content (long, can't scroll)      │ │ │
│ │ │                                         │ │ │
│ │ └─────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

The `<main>` element on line 110 has `overflow-hidden` which clips all content. The inner wrapper also lacks scroll capability.

---

## Solution

Change the main content area to allow vertical scrolling while keeping the sidebar and header fixed:

```text
┌─────────────────────────────────────────────────┐
│ DashboardLayout (h-screen, overflow-hidden) ✓   │
│ ┌─────────────────────────────────────────────┐ │
│ │ Main Content (overflow-y-auto) ✓             │ │
│ │ ┌─────────────────────────────────────────┐ │ │
│ │ │ ScrollArea or native scroll             │ │ │
│ │ │                                         │ │ │
│ │ │  Page Content (scrolls normally)  ✓     │ │ │
│ │ │                                         │ │ │
│ │ └─────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

---

## Files to Modify

### 1. `src/components/layout/DashboardLayout.tsx`

**Change line 110** from:
```tsx
<main className="flex-1 overflow-hidden px-4 pb-4 sm:px-6 sm:pb-6 lg:px-8 lg:pb-8">
```

**To:**
```tsx
<main className="flex-1 overflow-y-auto px-4 pb-4 sm:px-6 sm:pb-6 lg:px-8 lg:pb-8">
```

This single change enables vertical scrolling on the main content area.

**Additionally, update line 112** from:
```tsx
<div className="h-full w-full rounded-2xl animate-fade-in relative z-10 mx-auto max-w-[1600px]">
```

**To:**
```tsx
<div className="min-h-full w-full rounded-2xl animate-fade-in relative z-10 mx-auto max-w-[1600px]">
```

Using `min-h-full` instead of `h-full` allows content to grow beyond the viewport height.

---

## Technical Details

| Property | Before | After | Effect |
|----------|--------|-------|--------|
| `<main>` overflow | `overflow-hidden` | `overflow-y-auto` | Enables vertical scroll |
| Inner div height | `h-full` | `min-h-full` | Allows content to exceed viewport |

---

## Expected Behavior After Fix

- All dashboard pages will scroll vertically when content exceeds viewport
- Header remains fixed at top
- Sidebar remains fixed on the left
- Smooth native scroll behavior
- Works on all pages (Admin Dashboard, Investor Overview, Fund Management, etc.)

---

## Testing Checklist

1. Navigate to Admin Dashboard - verify long content scrolls
2. Navigate to Investor Overview - verify asset cards scroll
3. Navigate to Fund Management - verify fund cards scroll
4. Test on mobile viewport - verify touch scroll works
5. Verify sidebar and header stay fixed during scroll
