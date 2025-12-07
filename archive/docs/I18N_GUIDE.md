# Internationalization (i18n) Implementation Guide

**Version:** 1.0.0
**Last Updated:** November 22, 2025
**Framework:** Next.js 14 + next-intl
**Supported Languages:** EN, ES, FR, DE, ZH, JA

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Setup & Configuration](#setup--configuration)
4. [Translation Workflow](#translation-workflow)
5. [Usage in Components](#usage-in-components)
6. [Locale-Specific Formatting](#locale-specific-formatting)
7. [RTL Support](#rtl-support)
8. [Best Practices](#best-practices)
9. [Testing](#testing)
10. [Deployment](#deployment)

---

## Overview

The Indigo Yield Platform supports **6 languages** with full localization for:
- UI strings and messages
- Date and time formatting
- Number and currency formatting
- Pluralization rules
- RTL (Right-to-Left) layout support

### Supported Locales

| Language | Code | Region | RTL |
|----------|------|--------|-----|
| English | `en` | US/UK | No |
| Spanish | `es` | ES/LATAM | No |
| French | `fr` | FR/CA | No |
| German | `de` | DE | No |
| Chinese | `zh` | CN | No |
| Japanese | `ja` | JP | No |

**Future Support:** Arabic (`ar`), Portuguese (`pt`), Russian (`ru`)

---

## Architecture

### Technology Stack

```json
{
  "dependencies": {
    "next-intl": "^3.15.0",
    "date-fns": "^3.3.1"
  }
}
```

**Why next-intl?**
- Native Next.js App Router support
- Type-safe translations
- Automatic route localization
- Server and client component support
- Lightweight (10KB gzipped)

### File Structure

```
src/
├── i18n/
│   ├── config.ts              # i18n configuration
│   ├── request.ts             # Server-side locale detection
│   └── navigation.ts          # Localized navigation helpers
├── messages/                  # Translation files
│   ├── en.json
│   ├── es.json
│   ├── fr.json
│   ├── de.json
│   ├── zh.json
│   └── ja.json
├── app/
│   └── [locale]/             # Localized routes
│       ├── layout.tsx        # Root layout with locale provider
│       ├── page.tsx
│       └── dashboard/
│           └── page.tsx
└── middleware.ts             # Locale detection middleware
```

---

## Setup & Configuration

### Step 1: Install Dependencies

```bash
npm install next-intl date-fns
```

### Step 2: Create i18n Configuration

**File:** `/src/i18n/config.ts`

```typescript
export const locales = ['en', 'es', 'fr', 'de', 'zh', 'ja'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export const localeNames: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  zh: '中文',
  ja: '日本語',
};

export const localeFlags: Record<Locale, string> = {
  en: '🇺🇸',
  es: '🇪🇸',
  fr: '🇫🇷',
  de: '🇩🇪',
  zh: '🇨🇳',
  ja: '🇯🇵',
};
```

### Step 3: Setup Middleware

**File:** `/middleware.ts`

```typescript
import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './src/i18n/config';

export default createMiddleware({
  // All supported locales
  locales,

  // Default locale
  defaultLocale,

  // Locale detection from:
  // 1. URL pathname (/es/dashboard)
  // 2. Cookie (NEXT_LOCALE)
  // 3. Accept-Language header
  localeDetection: true,

  // Prefix all routes with locale
  localePrefix: 'always', // /en/dashboard, /es/dashboard
});

export const config = {
  // Match all pathnames except static files
  matcher: [
    '/((?!api|_next|_vercel|.*\\..*).*)',
    '/',
    '/(en|es|fr|de|zh|ja)/:path*'
  ],
};
```

### Step 4: Configure Request Locale

**File:** `/src/i18n/request.ts`

```typescript
import { getRequestConfig } from 'next-intl/server';
import { locales } from './config';

export default getRequestConfig(async ({ locale }) => {
  // Validate locale
  if (!locales.includes(locale as any)) {
    return { locale: 'en', messages: {} };
  }

  // Load messages for current locale
  return {
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
```

### Step 5: Setup App Layout

**File:** `/app/[locale]/layout.tsx`

```typescript
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales } from '@/i18n/config';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  // Validate locale
  if (!locales.includes(locale as any)) {
    notFound();
  }

  // Load messages for current locale
  const messages = await getMessages();

  return (
    <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <body>
        <NextIntlClientProvider messages={messages} locale={locale}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

### Step 6: Create Navigation Helpers

**File:** `/src/i18n/navigation.ts`

```typescript
import { createSharedPathnamesNavigation } from 'next-intl/navigation';
import { locales } from './config';

export const { Link, redirect, usePathname, useRouter } =
  createSharedPathnamesNavigation({ locales });
```

**Usage:**
```tsx
import { Link } from '@/i18n/navigation';

// Automatically includes current locale
<Link href="/dashboard">Dashboard</Link>
// Renders: /en/dashboard or /es/dashboard based on current locale
```

---

## Translation Workflow

### Message File Structure

**File:** `/messages/en.json`

```json
{
  "common": {
    "app_name": "Indigo Yield",
    "welcome": "Welcome",
    "loading": "Loading...",
    "error": "An error occurred",
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "confirm": "Confirm"
  },

  "auth": {
    "login": "Log In",
    "logout": "Log Out",
    "email": "Email",
    "password": "Password",
    "forgot_password": "Forgot password?",
    "sign_up": "Sign Up",
    "errors": {
      "invalid_credentials": "Invalid email or password",
      "email_required": "Email is required",
      "password_required": "Password is required"
    }
  },

  "dashboard": {
    "title": "Dashboard",
    "total_value": "Total Portfolio Value",
    "monthly_return": "Monthly Return",
    "ytd_return": "YTD Return",
    "recent_transactions": "Recent Transactions"
  },

  "portfolio": {
    "overview": "Portfolio Overview",
    "assets": "Assets",
    "performance": "Performance",
    "allocation": "Asset Allocation",
    "balance": "Balance: {amount}",
    "investments_count": "{count, plural, =0 {No investments} =1 {1 investment} other {# investments}}"
  },

  "transactions": {
    "title": "Transactions",
    "type": {
      "deposit": "Deposit",
      "withdrawal": "Withdrawal",
      "dividend": "Dividend",
      "fee": "Fee"
    },
    "status": {
      "pending": "Pending",
      "completed": "Completed",
      "failed": "Failed"
    },
    "date_range": "From {start, date, short} to {end, date, short}"
  },

  "settings": {
    "title": "Settings",
    "profile": "Profile",
    "security": "Security",
    "language": "Language",
    "theme": "Theme",
    "theme_options": {
      "light": "Light",
      "dark": "Dark",
      "system": "System"
    },
    "saved": "Settings saved successfully"
  },

  "errors": {
    "not_found": "Page not found",
    "unauthorized": "You don't have permission to access this page",
    "server_error": "Server error. Please try again later.",
    "network_error": "Network error. Check your connection."
  }
}
```

### Translation Guidelines

**Naming Conventions:**
- Use `snake_case` for keys
- Group related translations under namespaces
- Keep keys descriptive but concise

**Message Formatting:**
- Use ICU message format for plurals and variables
- Avoid hardcoded values in translations
- Keep messages context-aware

**Variable Interpolation:**
```json
{
  "greeting": "Hello, {name}!",
  "balance": "Current balance: {amount, number, currency}"
}
```

**Pluralization:**
```json
{
  "items": "{count, plural, =0 {No items} =1 {One item} other {# items}}"
}
```

**Rich Text:**
```json
{
  "terms": "I agree to the <link>Terms of Service</link>"
}
```

### Translation Process

#### 1. Extract Strings (Manual)

Search codebase for hardcoded strings:
```bash
# Find potential untranslated strings
grep -r "\"[A-Z]" src/ --include="*.tsx" --include="*.ts"
```

#### 2. Add to English Messages

Add new keys to `/messages/en.json`:
```json
{
  "new_feature": {
    "title": "New Feature",
    "description": "Description of the feature"
  }
}
```

#### 3. Translate to Other Languages

**Option A: Professional Translation Service**
- Export `en.json`
- Send to translation service (e.g., Lokalise, Crowdin)
- Import translated files

**Option B: Google Translate API** (initial draft)
```bash
# Script to auto-translate (requires review)
node scripts/translate.js --from=en --to=es,fr,de,zh,ja
```

**Option C: Manual Translation**
- Duplicate structure from `en.json`
- Replace values with translations
- Validate pluralization rules per language

#### 4. Validation

```bash
# Validate all message files have same structure
node scripts/validate-translations.js
```

**Validation Script:** `/scripts/validate-translations.js`

```javascript
const fs = require('fs');
const path = require('path');

const locales = ['en', 'es', 'fr', 'de', 'zh', 'ja'];
const messagesDir = path.join(__dirname, '../messages');

// Load English as reference
const enMessages = JSON.parse(
  fs.readFileSync(path.join(messagesDir, 'en.json'), 'utf-8')
);

// Extract all keys recursively
function getKeys(obj, prefix = '') {
  let keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && !Array.isArray(value)) {
      keys = keys.concat(getKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

const enKeys = getKeys(enMessages);

// Check each locale
for (const locale of locales) {
  if (locale === 'en') continue;

  const messages = JSON.parse(
    fs.readFileSync(path.join(messagesDir, `${locale}.json`), 'utf-8')
  );
  const localeKeys = getKeys(messages);

  // Find missing keys
  const missing = enKeys.filter(k => !localeKeys.includes(k));
  const extra = localeKeys.filter(k => !enKeys.includes(k));

  if (missing.length > 0) {
    console.error(`[${locale}] Missing keys:`, missing);
  }
  if (extra.length > 0) {
    console.warn(`[${locale}] Extra keys:`, extra);
  }

  if (missing.length === 0 && extra.length === 0) {
    console.log(`[${locale}] ✅ All keys match`);
  }
}
```

---

## Usage in Components

### Server Components

```tsx
import { useTranslations } from 'next-intl';

export default function DashboardPage() {
  const t = useTranslations('dashboard');

  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('total_value')}</p>
    </div>
  );
}
```

### Client Components

```tsx
'use client';

import { useTranslations } from 'next-intl';

export default function LoginForm() {
  const t = useTranslations('auth');

  return (
    <form>
      <label>{t('email')}</label>
      <input type="email" placeholder={t('email')} />

      <label>{t('password')}</label>
      <input type="password" placeholder={t('password')} />

      <button type="submit">{t('login')}</button>
    </form>
  );
}
```

### With Variables

```tsx
const t = useTranslations('portfolio');

<p>{t('balance', { amount: '$10,000' })}</p>
// Output: "Balance: $10,000"
```

### With Pluralization

```tsx
const t = useTranslations('portfolio');

<p>{t('investments_count', { count: 5 })}</p>
// Output: "5 investments"

<p>{t('investments_count', { count: 1 })}</p>
// Output: "1 investment"

<p>{t('investments_count', { count: 0 })}</p>
// Output: "No investments"
```

### Rich Text Messages

```tsx
import { useTranslations } from 'next-intl';
import Link from 'next/link';

const t = useTranslations('settings');

<p>
  {t.rich('terms', {
    link: (chunks) => <Link href="/terms">{chunks}</Link>
  })}
</p>
// Output: "I agree to the <a href="/terms">Terms of Service</a>"
```

### Fallback Messages

```tsx
// With default value
const t = useTranslations('dashboard');
<p>{t('new_key', 'Default message')}</p>

// With nested fallback
const t = useTranslations('dashboard');
<p>{t('title', { defaultValue: 'Dashboard' })}</p>
```

### Namespace Composition

```tsx
// Multiple namespaces
const tCommon = useTranslations('common');
const tDashboard = useTranslations('dashboard');

<div>
  <h1>{tDashboard('title')}</h1>
  <button>{tCommon('save')}</button>
</div>
```

---

## Locale-Specific Formatting

### Date Formatting

```tsx
import { useFormatter } from 'next-intl';

function TransactionDate({ date }: { date: Date }) {
  const format = useFormatter();

  return (
    <time dateTime={date.toISOString()}>
      {format.dateTime(date, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}
    </time>
  );
}
// en: "November 22, 2025"
// es: "22 de noviembre de 2025"
// fr: "22 novembre 2025"
// de: "22. November 2025"
// zh: "2025年11月22日"
// ja: "2025年11月22日"
```

**Date Format Options:**
```tsx
const format = useFormatter();

// Short date
format.dateTime(date, { dateStyle: 'short' });
// en: "11/22/25"

// Medium date
format.dateTime(date, { dateStyle: 'medium' });
// en: "Nov 22, 2025"

// Long date
format.dateTime(date, { dateStyle: 'long' });
// en: "November 22, 2025"

// Full date
format.dateTime(date, { dateStyle: 'full' });
// en: "Friday, November 22, 2025"

// Time
format.dateTime(date, { hour: 'numeric', minute: 'numeric' });
// en: "2:30 PM"

// Date and time
format.dateTime(date, {
  dateStyle: 'medium',
  timeStyle: 'short'
});
// en: "Nov 22, 2025, 2:30 PM"
```

### Number Formatting

```tsx
import { useFormatter } from 'next-intl';

function PortfolioValue({ value }: { value: number }) {
  const format = useFormatter();

  return (
    <div>
      <span>
        {format.number(value, {
          style: 'currency',
          currency: 'USD'
        })}
      </span>
    </div>
  );
}
// en: "$10,000.00"
// es: "10.000,00 US$"
// fr: "10 000,00 $US"
// de: "10.000,00 $"
// zh: "US$10,000.00"
// ja: "$10,000.00"
```

**Number Format Options:**
```tsx
const format = useFormatter();

// Currency
format.number(10000, { style: 'currency', currency: 'USD' });
// en: "$10,000.00"

// Percentage
format.number(0.15, { style: 'percent' });
// en: "15%"

// Decimal places
format.number(10000.123, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});
// en: "10,000.12"

// Compact notation
format.number(1500000, { notation: 'compact' });
// en: "1.5M"

// Unit formatting
format.number(100, { style: 'unit', unit: 'megabyte' });
// en: "100 MB"
```

### Relative Time Formatting

```tsx
import { useFormatter } from 'next-intl';

function RelativeTime({ date }: { date: Date }) {
  const format = useFormatter();

  return (
    <span>
      {format.relativeTime(date)}
    </span>
  );
}
// en: "2 hours ago"
// es: "hace 2 horas"
// fr: "il y a 2 heures"
// de: "vor 2 Stunden"
// zh: "2小时前"
// ja: "2時間前"
```

### List Formatting

```tsx
import { useFormatter } from 'next-intl';

function AssetList({ assets }: { assets: string[] }) {
  const format = useFormatter();

  return (
    <span>
      {format.list(assets, { type: 'conjunction' })}
    </span>
  );
}
// assets = ['Stocks', 'Bonds', 'Real Estate']
// en: "Stocks, Bonds, and Real Estate"
// es: "Stocks, Bonds y Real Estate"
// fr: "Stocks, Bonds et Real Estate"
```

---

## RTL Support

### Configuration

**File:** `/app/[locale]/layout.tsx`

```tsx
const rtlLocales = ['ar', 'he', 'fa'];

export default function LocaleLayout({
  params: { locale },
  children
}: {
  params: { locale: string };
  children: React.ReactNode;
}) {
  const dir = rtlLocales.includes(locale) ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir}>
      <body>{children}</body>
    </html>
  );
}
```

### CSS Adjustments

**Tailwind RTL Plugin:**

```bash
npm install tailwindcss-rtl
```

**File:** `/tailwind.config.ts`

```typescript
import type { Config } from 'tailwindcss';
import rtlPlugin from 'tailwindcss-rtl';

const config: Config = {
  plugins: [rtlPlugin],
  // ... other config
};

export default config;
```

**Usage:**
```tsx
// Auto-reverse margins and padding
<div className="ms-4 me-8">
  {/* ms = margin-start, me = margin-end */}
  {/* LTR: ml-4 mr-8 */}
  {/* RTL: mr-4 ml-8 */}
</div>

// Directional borders
<div className="border-s-2">
  {/* LTR: border-l-2 */}
  {/* RTL: border-r-2 */}
</div>

// Text alignment
<p className="text-start">
  {/* LTR: text-left */}
  {/* RTL: text-right */}
</p>
```

### Manual RTL Adjustments

```tsx
'use client';

import { useLocale } from 'next-intl';

function ComponentWithRTL() {
  const locale = useLocale();
  const isRTL = ['ar', 'he', 'fa'].includes(locale);

  return (
    <div className={isRTL ? 'flex-row-reverse' : 'flex-row'}>
      {/* RTL-aware layout */}
    </div>
  );
}
```

### Icons and Images

Certain icons need flipping in RTL:
- Arrows (→ becomes ←)
- Chevrons
- Navigation icons

```tsx
import { ChevronRightIcon } from 'lucide-react';
import { useLocale } from 'next-intl';

function NavigationIcon() {
  const locale = useLocale();
  const isRTL = ['ar', 'he', 'fa'].includes(locale);

  return (
    <ChevronRightIcon
      className={isRTL ? 'rotate-180' : ''}
    />
  );
}
```

---

## Best Practices

### 1. Avoid String Concatenation

**Bad:**
```tsx
const message = t('hello') + ', ' + userName + '!';
```

**Good:**
```tsx
const message = t('greeting', { name: userName });
// en.json: { "greeting": "Hello, {name}!" }
```

### 2. Use Pluralization

**Bad:**
```tsx
const text = count === 1 ? '1 item' : `${count} items`;
```

**Good:**
```tsx
const text = t('items', { count });
// en.json: { "items": "{count, plural, =1 {1 item} other {# items}}" }
```

### 3. Keep Context

**Bad:**
```json
{
  "submit": "Submit"
}
```

**Good:**
```json
{
  "form": {
    "submit_button": "Submit Form"
  },
  "payment": {
    "submit_button": "Complete Payment"
  }
}
```

### 4. Provide Translator Context

**Bad:**
```json
{
  "read": "Read"
}
// Ambiguous: verb or past tense?
```

**Good:**
```json
{
  "button": {
    "read_article": "Read Article"
  },
  "status": {
    "already_read": "Already read"
  }
}
```

### 5. Handle Long Translations

Some languages expand significantly (German +30%, Arabic +25%):

```tsx
// Use flex layouts that accommodate varying text lengths
<div className="flex flex-col gap-2">
  <Button className="w-full">{t('button_text')}</Button>
</div>

// Avoid fixed widths for text containers
<p className="max-w-prose">{t('description')}</p>
```

### 6. Test with Pseudo-Locale

Create a test locale to identify issues:

**File:** `/messages/pseudo.json`
```json
{
  "common": {
    "welcome": "[!!! Welcome !!!]"
  }
}
```

This helps identify:
- Hardcoded strings (not wrapped in brackets)
- UI overflow issues (longer text)
- Missing translations

### 7. Lazy Load Messages

For large applications, split message files:

```tsx
// Load only needed namespace
const tDashboard = useTranslations('dashboard');
// Not loading 'settings', 'profile', etc.
```

---

## Testing

### Unit Tests

**File:** `/tests/i18n.test.tsx`

```typescript
import { NextIntlClientProvider } from 'next-intl';
import { render, screen } from '@testing-library/react';
import DashboardPage from '@/app/[locale]/dashboard/page';

// Mock messages
const messages = {
  dashboard: {
    title: 'Dashboard',
    welcome: 'Welcome, {name}!',
  },
};

describe('Dashboard i18n', () => {
  it('renders translated title', () => {
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <DashboardPage />
      </NextIntlClientProvider>
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('interpolates variables', () => {
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <WelcomeMessage name="John" />
      </NextIntlClientProvider>
    );

    expect(screen.getByText('Welcome, John!')).toBeInTheDocument();
  });
});
```

### E2E Tests

**File:** `/tests/e2e/i18n.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Internationalization', () => {
  test('switches to Spanish', async ({ page }) => {
    await page.goto('/en');

    // Open language selector
    await page.click('[aria-label="Change language"]');

    // Select Spanish
    await page.click('text=Español');

    // Verify URL changed
    await expect(page).toHaveURL(/\/es/);

    // Verify content is in Spanish
    await expect(page.locator('h1')).toHaveText('Panel de Control');
  });

  test('formats dates correctly', async ({ page, context }) => {
    // Set French locale
    await context.addCookies([
      { name: 'NEXT_LOCALE', value: 'fr', url: 'http://localhost:3000' }
    ]);

    await page.goto('/fr/transactions');

    // Check date format (French uses DD/MM/YYYY)
    await expect(page.locator('[data-testid="transaction-date"]').first())
      .toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  test('displays currency correctly', async ({ page }) => {
    await page.goto('/de/dashboard');

    // German uses . for thousands and , for decimals
    await expect(page.locator('[data-testid="portfolio-value"]'))
      .toHaveText(/\d{1,3}\.\d{3},\d{2}\s*€/);
  });
});
```

### Translation Coverage

```bash
# Run coverage check
node scripts/validate-translations.js

# Expected output:
# [en] ✅ 100% coverage (base locale)
# [es] ✅ 100% coverage (327/327 keys)
# [fr] ⚠️  98% coverage (321/327 keys) - 6 missing
# [de] ✅ 100% coverage (327/327 keys)
# [zh] ⚠️  95% coverage (311/327 keys) - 16 missing
# [ja] ✅ 100% coverage (327/327 keys)
```

---

## Deployment

### Build Configuration

**File:** `/next.config.js`

```javascript
const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ... other config
};

module.exports = withNextIntl(nextConfig);
```

### Environment Variables

No environment variables needed - all configuration is in code.

### Static Export

For static hosting (optional):

```javascript
// next.config.js
module.exports = withNextIntl({
  output: 'export',
  // Disable automatic locale detection for static exports
  trailingSlash: true,
});
```

Generate static pages:
```bash
npm run build
# Generates: out/en/, out/es/, out/fr/, etc.
```

### CDN Configuration

Configure CDN to route by locale:
- `/en/*` → `en` build
- `/es/*` → `es` build
- `/` → Redirect to `/en/` (or detect from headers)

**Vercel Configuration:**
```json
{
  "redirects": [
    {
      "source": "/",
      "destination": "/en",
      "permanent": false
    }
  ]
}
```

### Language Switcher

**Component:** `/src/components/LanguageSwitcher.tsx`

```tsx
'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import { locales, localeNames, localeFlags } from '@/i18n/config';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { GlobeIcon } from 'lucide-react';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const handleLocaleChange = (newLocale: string) => {
    // Navigate to same page with new locale
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label="Change language">
          <GlobeIcon className="h-4 w-4 mr-2" />
          <span className="text-sm">
            {localeFlags[locale as keyof typeof localeFlags]}{' '}
            {localeNames[locale as keyof typeof localeNames]}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => handleLocaleChange(loc)}
            className={loc === locale ? 'bg-accent' : ''}
          >
            <span className="mr-2">{localeFlags[loc]}</span>
            {localeNames[loc]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

---

## Resources

### Official Documentation
- [next-intl Documentation](https://next-intl-docs.vercel.app/)
- [Next.js Internationalization](https://nextjs.org/docs/app/building-your-application/routing/internationalization)
- [ICU Message Format](https://unicode-org.github.io/icu/userguide/format_parse/messages/)

### Translation Services
- **Lokalise**: Professional translation management platform
- **Crowdin**: Collaborative translation platform
- **Google Cloud Translation API**: Machine translation for drafts
- **DeepL API**: High-quality machine translation

### Testing Tools
- **Pseudo-Localization**: Test UI with extended strings
- **Playwright**: E2E testing with locale switching
- **Jest**: Unit testing translations

### Related Documentation
- [Design System](./DESIGN_SYSTEM.md)
- [Component Reference](./COMPONENT_REFERENCE.md)
- [Developer Onboarding](./DEVELOPER_ONBOARDING.md)

---

**Last Updated:** November 22, 2025
**Maintained By:** Engineering Team
**Version:** 1.0.0

For questions or contributions, please refer to [CONTRIBUTING.md](../CONTRIBUTING.md).
