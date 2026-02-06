# UI/UX Improvement Action Plan

**Created:** February 3, 2026
**Based on:** Comprehensive UI/UX Audit Report
**Estimated Total Effort:** ~60 hours (1.5 weeks for 2 developers)

---

## Sprint 1 - Critical Fixes (16 hours / 2 days)

### P1-1: Fix Tablet Sidebar Overlap
**File:** `src/components/layout/Sidebar.tsx` (or equivalent)

**Current Issue:**
- Sidebar overlays content at 768px, blocking reading

**Fix:**
```tsx
// Add responsive behavior
<aside className={cn(
  "fixed inset-y-0 left-0 z-50 w-64 transform transition-transform",
  "lg:translate-x-0", // Always visible on desktop
  "md:translate-x-0 md:shadow-xl", // Visible on tablet but with shadow
  isMobileMenuOpen ? "translate-x-0" : "-translate-x-full" // Mobile toggle
)}>
  {/* Sidebar content */}
</aside>

// Add backdrop overlay for mobile/tablet
{isMobileMenuOpen && (
  <div
    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
    onClick={() => setIsMobileMenuOpen(false)}
  />
)}
```

**Effort:** 4 hours
**Testing:** Verify on 768px, 1024px, 1440px viewports

---

### P1-2: Auto-Close Mobile Sidebar on Navigation
**File:** `src/components/layout/Sidebar.tsx`

**Fix:**
```tsx
import { useLocation } from 'react-router-dom';

function Sidebar() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Auto-close on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    // sidebar JSX
  );
}
```

**Effort:** 1 hour
**Testing:** Navigate between pages on mobile, confirm sidebar closes

---

### P1-3: Add Table Horizontal Scroll Indicators
**File:** `src/components/ui/DataTable.tsx` (or table components)

**Fix:**
```tsx
import { useRef, useState, useEffect } from 'react';

function DataTable({ children }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftShadow, setShowLeftShadow] = useState(false);
  const [showRightShadow, setShowRightShadow] = useState(false);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setShowLeftShadow(scrollLeft > 0);
    setShowRightShadow(scrollLeft + clientWidth < scrollWidth - 1);
  };

  useEffect(() => {
    handleScroll(); // Check on mount
  }, []);

  return (
    <div className="relative">
      {showLeftShadow && (
        <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-background to-transparent pointer-events-none z-10" />
      )}
      {showRightShadow && (
        <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-background to-transparent pointer-events-none z-10" />
      )}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="overflow-x-auto"
      >
        <table>{children}</table>
      </div>
    </div>
  );
}
```

**Effort:** 2 hours
**Testing:** Open Admin Investors table on mobile, scroll horizontally

---

### P2-1: Lighten Secondary Text for WCAG AA Compliance
**File:** `src/index.css` or `tailwind.config.ts`

**Current:** `--muted-foreground: #64748B` (likely fails WCAG AA on dark)
**Fix:** `--muted-foreground: #94A3B8`

```css
/* In your CSS variables */
:root {
  --muted-foreground: 148 163 184; /* #94A3B8 */
}
```

**Effort:** 1 hour (includes testing across all pages)
**Verification:** Use browser DevTools Contrast Checker or axe-devtools

---

### P2-2: Add Tooltips to Icon-Only Buttons
**File:** Multiple (Admin Command Center, Quick Actions, etc.)

**Example Fix:**
```tsx
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button variant="ghost" size="icon">
        <RefreshCw className="h-4 w-4" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>
      <p>Refresh Data</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

**Affected Components:**
- Admin Command Center: Refresh, Notification icons
- Quick Actions: All icon buttons
- Investor/IB: Header action buttons

**Effort:** 4 hours (across ~10 components)
**Testing:** Hover each icon button, verify tooltip appears

---

### P2-3: Add Skeleton Loaders
**File:** Create `src/components/ui/Skeleton.tsx` (if not exists)

**shadcn/ui Command:**
```bash
npx shadcn-ui@latest add skeleton
```

**Apply to:**
1. Admin Command Center (fund cards, stats)
2. Investor Portfolio (table rows)
3. IB Dashboard (commission cards)

**Example:**
```tsx
import { Skeleton } from "@/components/ui/skeleton";

function FundCardSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-4 w-16" />
    </div>
  );
}

// In your component
{isLoading ? (
  <FundCardSkeleton />
) : (
  <FundCard data={fundData} />
)}
```

**Effort:** 4 hours
**Testing:** Throttle network to "Slow 3G", verify skeletons appear

---

## Sprint 2 - Formatting & Polish (24 hours / 3 days)

### P2-4: Standardize Number Formatting
**File:** Create `src/utils/formatting.ts`

```typescript
import Decimal from 'decimal.js';

export function formatCurrency(
  amount: number | string,
  currency: string,
  decimals?: number
): string {
  const value = new Decimal(amount);

  // Crypto: 8 decimals, Fiat: 2 decimals
  const defaultDecimals = ['BTC', 'ETH', 'SOL', 'XRP'].includes(currency) ? 8 : 2;
  const precision = decimals ?? defaultDecimals;

  const formatted = value.toFixed(precision);
  const withCommas = formatted.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  // USD prefix, crypto suffix
  return ['USD', 'USDT', 'USDC', 'EURC'].includes(currency)
    ? `$${withCommas}`
    : `${withCommas} ${currency}`;
}

export function formatPercent(value: number, decimals = 2): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

export function formatDate(date: Date | string, format: 'short' | 'long' = 'short'): string {
  const d = new Date(date);
  if (format === 'short') {
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }); // "Feb 3, 26 14:33"
  } else {
    return d.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    }); // "February 3, 2026"
  }
}
```

**Apply to ALL components displaying:**
- Fund AUM values
- Transaction amounts
- Yield percentages
- Dates

**Effort:** 8 hours (touching ~30 components)
**Testing:** Create test file with edge cases (very small crypto, large fiat, negative numbers)

---

### P2-5: Improve Empty State CTAs
**Files:**
- `src/pages/investor/Portfolio.tsx`
- `src/pages/ib/Overview.tsx`

**Current:** Text-only empty states
**Fix:**

```tsx
function EmptyPortfolio() {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <Wallet className="h-16 w-16 text-muted-foreground" />
      <h3 className="text-lg font-semibold">No Positions Found</h3>
      <p className="text-sm text-muted-foreground max-w-md text-center">
        Your fund positions will appear here once you have active investments.
        Start growing your wealth today.
      </p>
      <Button asChild>
        <Link to="/investor/funds">
          <TrendingUp className="mr-2 h-4 w-4" />
          Explore Funds
        </Link>
      </Button>
    </div>
  );
}
```

**Effort:** 3 hours
**Testing:** Verify CTAs link to correct pages, test with QA accounts

---

### P2-6: Standardize Date Formatting
**Files:** All components displaying dates

**Use the `formatDate()` util from P2-4**

**Find & Replace:**
```typescript
// Before
{new Date(transaction.created_at).toLocaleDateString()}

// After
{formatDate(transaction.created_at, 'short')}
```

**Effort:** 4 hours
**Testing:** Check all pages for consistent date format

---

### P3-1: Add Light/Dark Theme Toggle (Optional)
**Files:**
- `src/components/ThemeProvider.tsx`
- `src/pages/settings/Settings.tsx`

**Implementation:**
```tsx
// ThemeProvider.tsx
import { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'dark' | 'light' | 'system';

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
}>({ theme: 'dark', setTheme: () => {} });

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem('theme') as Theme) || 'dark'
  );

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }

    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

// In Settings.tsx
import { useTheme } from '@/components/ThemeProvider';

function Settings() {
  const { theme, setTheme } = useTheme();

  return (
    <div>
      <Label>Appearance</Label>
      <Select value={theme} onValueChange={setTheme}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="light">Light</SelectItem>
          <SelectItem value="dark">Dark</SelectItem>
          <SelectItem value="system">System</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
```

**Effort:** 8 hours (requires CSS variable updates for light theme)
**Testing:** Toggle theme, verify all components render correctly

---

## Sprint 3 - Feature Enhancements (20+ hours / 3-5 days)

### Enhancement 1: Performance Charts (Investor Portal)
**Library:** Recharts (preferred) or Chart.js

**Installation:**
```bash
npm install recharts
```

**File:** `src/pages/investor/Performance.tsx`

**Example:**
```tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function PerformanceChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="value" stroke="#6366F1" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

**Data Schema:**
```typescript
interface PerformanceDataPoint {
  date: string; // "2026-02-03"
  value: number; // Fund value in base currency
}
```

**Effort:** 16 hours (includes API integration, responsive design)
**Testing:** Test with real/mock data, verify on mobile

---

### Enhancement 2: Referral Link Generator (IB Portal)
**File:** `src/pages/ib/Referrals.tsx`

**Add to IB Overview:**
```tsx
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

function ReferralLinkSection({ ibId }) {
  const [copied, setCopied] = useState(false);
  const referralUrl = `https://indigo-yield-platform-v01.lovable.app/signup?ref=${ibId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-2">
      <Label>Your Referral Link</Label>
      <div className="flex gap-2">
        <Input value={referralUrl} readOnly />
        <Button onClick={handleCopy} variant="outline">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Copied!' : 'Copy'}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Share this link with investors. You earn 5% commission on their deposits.
      </p>
    </div>
  );
}
```

**Effort:** 4 hours (includes backend for tracking referral param)
**Testing:** Copy link, open in incognito, verify `ref` param captured

---

## Verification Checklist

After implementing fixes, run:

### Automated Tests
```bash
# Type check
npx tsc --noEmit

# Build check
npm run build

# Accessibility audit
npx @axe-core/cli https://indigo-yield-platform-v01.lovable.app/admin
```

### Manual Testing
- [ ] Login as Admin, Investor, IB on desktop (1440px)
- [ ] Test all portals on tablet (768px)
- [ ] Test all portals on mobile (375px)
- [ ] Verify number formatting on all pages
- [ ] Verify date formatting on all pages
- [ ] Test keyboard navigation (Tab, Enter, Escape)
- [ ] Test screen reader (NVDA or VoiceOver)
- [ ] Check color contrast with browser DevTools

### Regression Testing
- [ ] Create deposit (Admin)
- [ ] Record yield (Admin)
- [ ] Process withdrawal (Admin)
- [ ] View statements (Investor)
- [ ] View commissions (IB)

---

## Success Metrics

**Before Fixes:**
- Lighthouse Accessibility Score: ~78
- Mobile Usability Score: 75
- Time to Interactive: ~3.2s

**Target After Fixes:**
- Lighthouse Accessibility Score: >90
- Mobile Usability Score: >90
- Time to Interactive: <2.5s (with skeleton loaders)

---

## Resources

**Documentation:**
- [shadcn/ui Components](https://ui.shadcn.com/)
- [WCAG 2.2 Guidelines](https://www.w3.org/WAI/WCAG22/quickref/)
- [Recharts Documentation](https://recharts.org/)

**Tools:**
- [axe DevTools](https://www.deque.com/axe/devtools/) (Chrome/Firefox extension)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci) (for CI/CD)
- [Polypane](https://polypane.app/) (Responsive testing)

---

**Last Updated:** February 3, 2026
**Next Review:** After Sprint 1 completion
