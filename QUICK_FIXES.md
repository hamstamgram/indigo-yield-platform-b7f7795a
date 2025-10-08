# 🔧 Quick Fixes for Critical Issues

Based on design review, here are copy-paste fixes for the critical issues.

## 1. Fix Sentry Double Initialization

**File**: `src/utils/monitoring/sentry.ts`

Replace the entire file with:

```typescript
import * as Sentry from '@sentry/react';

let sentryInitialized = false;

export function initSentry() {
  // Prevent multiple initializations
  if (sentryInitialized) {
    console.warn('[Sentry] Already initialized, skipping');
    return;
  }

  if (!import.meta.env.PROD) {
    console.log('[Sentry] Skipping initialization in development');
    return;
  }

  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) {
    console.warn('[Sentry] No DSN provided, skipping initialization');
    return;
  }

  try {
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: false,
          blockAllMedia: false,
        }),
      ],
      tracesSampleRate: 1.0,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
    });

    sentryInitialized = true;
    console.log('[Sentry] Initialized successfully');
  } catch (error) {
    console.error('[Sentry] Failed to initialize:', error);
  }
}

export function isSentryInitialized() {
  return sentryInitialized;
}
```

**File**: `src/App.tsx`

Update the Sentry initialization:

```typescript
// Find this code block:
useEffect(() => {
  initSentry();
}, []);

// Replace with:
useEffect(() => {
  // Only initialize once
  if (!isSentryInitialized()) {
    initSentry();
  }
}, []); // Empty deps ensures this runs only once
```

---

## 2. Fix Google Fonts CSP Issue

**Option A: Self-host fonts (Recommended)**

```bash
# Install fontsource
npm install @fontsource/montserrat
```

**File**: `src/main.tsx` or `src/index.css`

Add at the top:

```typescript
// src/main.tsx
import '@fontsource/montserrat/400.css'; // Regular
import '@fontsource/montserrat/500.css'; // Medium
import '@fontsource/montserrat/600.css'; // Semi-bold
import '@fontsource/montserrat/700.css'; // Bold
```

**File**: `index.html`

Remove Google Fonts link:

```html
<!-- REMOVE THESE LINES -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">
```

**Option B: Update CSP to allow Google Fonts**

**File**: `index.html`

Find the CSP meta tag and update:

```html
<meta
  http-equiv="Content-Security-Policy"
  content="
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval';
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    font-src 'self' data: https://fonts.gstatic.com;
    img-src 'self' data: https: blob:;
    connect-src 'self' https://*.supabase.co wss://*.supabase.co;
  "
/>
```

---

## 3. Fix X-Frame-Options Warning

**File**: `index.html`

Remove the meta tag:

```html
<!-- REMOVE THIS LINE -->
<meta http-equiv="X-Frame-Options" content="DENY">
```

**File**: `vercel.json` (create if doesn't exist)

Add server headers:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    }
  ]
}
```

---

## 4. Find and Fix Icon Buttons Without Labels

**Step 1**: Search for icon buttons

```bash
# Search for icon-only buttons
grep -r "<button" src/ | grep -i "icon" | grep -v "aria-label"
```

**Step 2**: Add aria-labels to all results

Example fixes:

```tsx
// ❌ Before
<button onClick={handleClose}>
  <X className="h-4 w-4" />
</button>

// ✅ After
<button onClick={handleClose} aria-label="Close">
  <X className="h-4 w-4" />
</button>

// ❌ Before
<Button variant="ghost" size="icon" onClick={handleMenu}>
  <Menu />
</Button>

// ✅ After
<Button
  variant="ghost"
  size="icon"
  onClick={handleMenu}
  aria-label="Open menu"
>
  <Menu />
</Button>

// ❌ Before
<button className="..." onClick={handleEdit}>
  <Pencil size={16} />
</button>

// ✅ After
<button
  className="..."
  onClick={handleEdit}
  aria-label="Edit item"
>
  <Pencil size={16} />
</button>
```

**Common icon buttons to fix**:
- Close/X buttons → `aria-label="Close"`
- Menu buttons → `aria-label="Open menu"`
- Edit buttons → `aria-label="Edit"`
- Delete buttons → `aria-label="Delete"`
- Settings buttons → `aria-label="Settings"`
- Search buttons → `aria-label="Search"`
- Info buttons → `aria-label="More information"`

---

## 5. Implement Code Splitting

**File**: `src/App.tsx`

Update route imports:

```typescript
import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Lazy load route components
const Index = lazy(() => import('./pages/Index'));
const Auth = lazy(() => import('./pages/Auth'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Portfolio = lazy(() => import('./pages/Portfolio'));
const Transactions = lazy(() => import('./pages/Transactions'));
const Statements = lazy(() => import('./pages/Statements'));
const Withdrawals = lazy(() => import('./pages/Withdrawals'));
const Profile = lazy(() => import('./pages/Profile'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

function App() {
  return (
    <Router>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          {/* ... other routes ... */}
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
```

---

## 6. Bundle Optimization

**File**: `vite.config.ts`

Add manual chunk splitting:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React core
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],

          // UI components
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
          ],

          // Charts
          'chart-vendor': ['recharts'],

          // Supabase
          'supabase-vendor': ['@supabase/supabase-js'],

          // Form handling
          'form-vendor': ['react-hook-form', 'zod', '@hookform/resolvers'],

          // Utilities
          'utils-vendor': ['date-fns', 'clsx', 'tailwind-merge'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    sourcemap: false, // Disable in production for smaller builds
  },
});
```

---

## Testing the Fixes

After applying fixes:

```bash
# 1. Clear cache and rebuild
rm -rf node_modules/.vite
npm run dev

# 2. Check console for errors
# Open http://localhost:5173 and check browser console

# 3. Re-run design review
node design-review.cjs

# 4. Build for production
npm run build

# 5. Analyze bundle
npx vite-bundle-visualizer
```

---

## Verification Checklist

After applying fixes:

- [ ] No Sentry double initialization errors
- [ ] No CSP font errors
- [ ] No X-Frame-Options warning
- [ ] All icon buttons have aria-labels
- [ ] Console shows 0 errors
- [ ] Bundle size reduced (check with visualizer)
- [ ] Page loads faster
- [ ] All routes load correctly with code splitting

---

## Performance Testing

```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Run Lighthouse audit
npx lighthouse http://localhost:4173 --view

# Expected improvements:
# - Accessibility score: 90+
# - Performance score: 85+
# - Best Practices score: 95+
# - No console errors
```

---

## Next Steps

1. Apply fixes in order (1 → 6)
2. Test after each fix
3. Commit changes with descriptive messages
4. Re-run design review to verify
5. Deploy to staging for testing
6. Monitor production for issues

---

**Estimated Time**: 30-45 minutes
**Difficulty**: Easy to Medium
**Impact**: High (fixes critical accessibility and performance issues)
