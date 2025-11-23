# Indigo Yield Platform - Deployment Guide

**Version:** 1.0.0
**Last Updated:** November 22, 2025
**Platform:** Vercel (Web) + Supabase (Backend) + TestFlight (iOS)

---

## Table of Contents

1. [Overview](#overview)
2. [Environments](#environments)
3. [Prerequisites](#prerequisites)
4. [Web Application Deployment](#web-application-deployment)
5. [Supabase Backend Deployment](#supabase-backend-deployment)
6. [iOS Application Deployment](#ios-application-deployment)
7. [CI/CD Pipeline](#cicd-pipeline)
8. [Environment Variables](#environment-variables)
9. [Database Migrations](#database-migrations)
10. [Monitoring & Alerts](#monitoring--alerts)
11. [Rollback Procedures](#rollback-procedures)
12. [Troubleshooting](#troubleshooting)

---

## Overview

The Indigo Yield Platform uses a **multi-environment deployment strategy** with automated CI/CD pipelines:

**Architecture:**
```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  Web Frontend   │      │  Supabase       │      │  iOS App        │
│  (Next.js)      │─────▶│  (PostgreSQL +  │◀─────│  (SwiftUI)      │
│  Vercel         │      │   Edge Functions)│      │  TestFlight     │
└─────────────────┘      └─────────────────┘      └─────────────────┘
         │                        │                        │
         └────────────────────────┴────────────────────────┘
                           GitHub Actions
```

**Deployment Targets:**
- **Web**: Vercel (production + staging + preview)
- **Backend**: Supabase (production + development)
- **iOS**: TestFlight (beta) → App Store (production)
- **Database**: Supabase PostgreSQL with automated backups

---

## Environments

### Development
**Purpose:** Local development and testing

| Component | Endpoint/Location |
|-----------|------------------|
| Web | `http://localhost:3000` |
| API | `http://localhost:54321/functions/v1` |
| Database | Local Supabase (Docker) |
| Storage | Local Supabase Storage |

**Access:** All developers

---

### Staging
**Purpose:** Pre-production testing and QA

| Component | Endpoint/Location |
|-----------|------------------|
| Web | `https://staging.indigoyield.com` |
| API | `https://staging-ref.supabase.co/functions/v1` |
| Database | Supabase Staging Project |
| Storage | Supabase Staging Storage |

**Access:** Developers + QA team
**Data:** Sanitized production data

---

### Production
**Purpose:** Live customer-facing environment

| Component | Endpoint/Location |
|-----------|------------------|
| Web | `https://app.indigoyield.com` |
| API | `https://mdngruhkxlrsgwwlfqru.supabase.co/functions/v1` |
| Database | Supabase Production Project |
| Storage | Supabase Production Storage |

**Access:** Admins only
**Deployment:** Automated via GitHub Actions (requires approval)

---

## Prerequisites

### Required Tools

```bash
# Node.js & npm
node --version  # v20.x or higher
npm --version   # v10.x or higher

# Git
git --version   # v2.x or higher

# Vercel CLI (for manual deployments)
npm install -g vercel

# Supabase CLI
npm install -g supabase

# GitHub CLI (optional)
gh --version
```

### Required Accounts

- **GitHub**: Repository access with appropriate permissions
- **Vercel**: Team account with deployment permissions
- **Supabase**: Project admin access
- **Apple Developer** (for iOS): Account with TestFlight access

### Access Credentials

Store these securely in your password manager:

1. **GitHub Personal Access Token** (repo, workflow permissions)
2. **Vercel Token** (deployment access)
3. **Supabase Service Role Key** (backend operations)
4. **Supabase Database Password**
5. **Apple Developer Credentials** (for iOS builds)

---

## Web Application Deployment

### Automatic Deployment (Recommended)

**Trigger:** Push to `main` or `staging` branch

```bash
# Deploy to production
git checkout main
git pull origin main
git merge feature/your-feature
git push origin main
# ✓ Automatically deploys to production

# Deploy to staging
git checkout staging
git pull origin staging
git merge feature/your-feature
git push origin staging
# ✓ Automatically deploys to staging
```

**Deployment Flow:**
1. GitHub Actions workflow triggers
2. Build process runs (Next.js build)
3. Tests execute (unit + integration)
4. Build artifacts uploaded to Vercel
5. Vercel deploys to environment
6. Health checks validate deployment
7. Slack notification sent

**Expected Duration:** 3-5 minutes

---

### Manual Deployment via Vercel CLI

**When to use:** Emergency hotfixes, testing specific branches

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to preview (development)
vercel

# Deploy to production
vercel --prod

# Deploy specific branch to staging
vercel --target=staging --branch=staging
```

**Production Deployment Checklist:**
- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] Database migrations tested
- [ ] Environment variables verified
- [ ] Rollback plan prepared

---

### Build Configuration

**File:** `/next.config.js`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Output standalone for optimized Docker/Vercel deployment
  output: 'standalone',

  // Disable telemetry
  telemetry: false,

  // Strict mode for development
  reactStrictMode: true,

  // Image optimization
  images: {
    domains: ['mdngruhkxlrsgwwlfqru.supabase.co'],
    formats: ['image/avif', 'image/webp'],
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version,
  },

  // Headers for security
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },

  // Redirects
  async redirects() {
    return [
      {
        source: '/',
        destination: '/en',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
```

---

### Vercel Configuration

**File:** `/vercel.json`

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["iad1"],
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase-url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase-anon-key"
  },
  "build": {
    "env": {
      "NEXT_PUBLIC_APP_ENV": "production"
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-store, max-age=0"
        }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ],
  "redirects": [
    {
      "source": "/",
      "destination": "/en",
      "permanent": false
    }
  ]
}
```

---

## Supabase Backend Deployment

### Edge Functions Deployment

**Deploy all functions:**
```bash
cd supabase/functions
supabase functions deploy

# Deploy specific function
supabase functions deploy generate-report

# Deploy with secrets
supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx
supabase functions deploy process-deposit
```

**Environment-specific deployment:**
```bash
# Production
supabase link --project-ref mdngruhkxlrsgwwlfqru
supabase functions deploy --project-ref mdngruhkxlrsgwwlfqru

# Staging
supabase link --project-ref staging-ref
supabase functions deploy --project-ref staging-ref
```

---

### Database Migrations

**Create migration:**
```bash
# Generate new migration
supabase migration new add_new_feature

# Edit migration file
# supabase/migrations/20251122_add_new_feature.sql
```

**Apply migrations:**
```bash
# Local database
supabase db push

# Production database
supabase db push --db-url postgresql://postgres:[PASSWORD]@db.mdngruhkxlrsgwwlfqru.supabase.co:5432/postgres

# Staging database
supabase db push --db-url postgresql://postgres:[PASSWORD]@db.staging-ref.supabase.co:5432/postgres
```

**Rollback migration:**
```bash
# Reset to specific migration
supabase db reset --version 20251120_previous_migration

# Completely reset (DANGEROUS - development only)
supabase db reset
```

---

### Database Backup & Restore

**Automated Backups:**
- **Frequency**: Daily at 2:00 AM UTC
- **Retention**: 7 days (free tier), 30 days (pro tier)
- **Location**: Supabase managed storage

**Manual Backup:**
```bash
# Export full database
pg_dump -h db.mdngruhkxlrsgwwlfqru.supabase.co \
  -U postgres \
  -d postgres \
  -F c \
  -f backup_$(date +%Y%m%d).dump

# Export specific table
pg_dump -h db.mdngruhkxlrsgwwlfqru.supabase.co \
  -U postgres \
  -d postgres \
  -t portfolios \
  -F c \
  -f portfolios_backup.dump
```

**Restore from Backup:**
```bash
# Restore full database
pg_restore -h db.mdngruhkxlrsgwwlfqru.supabase.co \
  -U postgres \
  -d postgres \
  -c \
  backup_20251122.dump

# Restore specific table
pg_restore -h db.mdngruhkxlrsgwwlfqru.supabase.co \
  -U postgres \
  -d postgres \
  -t portfolios \
  portfolios_backup.dump
```

---

## iOS Application Deployment

### Build for TestFlight

**Prerequisites:**
- Xcode 15.0+
- Apple Developer account
- Provisioning profiles configured

**Build Steps:**

1. **Update Version Number**
```bash
cd ios
agvtool new-marketing-version 1.0.1
agvtool new-version -all 10
```

2. **Archive Build**
```bash
# Via Xcode GUI:
# Product > Archive

# Via Command Line:
xcodebuild -workspace IndigoInvestor.xcworkspace \
  -scheme IndigoInvestor \
  -configuration Release \
  -archivePath ./build/IndigoInvestor.xcarchive \
  archive
```

3. **Export for App Store**
```bash
xcodebuild -exportArchive \
  -archivePath ./build/IndigoInvestor.xcarchive \
  -exportPath ./build \
  -exportOptionsPlist ExportOptions.plist
```

4. **Upload to App Store Connect**
```bash
# Via Xcode Organizer:
# Window > Organizer > Distribute App

# Via Command Line:
xcrun altool --upload-app \
  -f ./build/IndigoInvestor.ipa \
  -u your@email.com \
  -p @keychain:AC_PASSWORD
```

5. **Submit for TestFlight Review**
- Log in to App Store Connect
- Select app version
- Add What to Test notes
- Submit for review

**TestFlight Review Time:** 24-48 hours

---

### Production App Store Release

**Checklist:**
- [ ] TestFlight testing completed (minimum 7 days)
- [ ] No critical bugs reported
- [ ] App Store screenshots updated
- [ ] App description and keywords updated
- [ ] Privacy policy link valid
- [ ] IDFA usage declared (if applicable)
- [ ] Age rating appropriate
- [ ] Pricing tier confirmed

**Submission Process:**
1. Log in to App Store Connect
2. Go to "App Store" tab
3. Click "+ Version or Platform"
4. Select build from TestFlight
5. Fill in "What's New" description
6. Submit for review

**App Store Review Time:** 1-3 days

---

## CI/CD Pipeline

### GitHub Actions Workflows

**File:** `.github/workflows/web-ci-cd.yml`

```yaml
name: Web CI/CD

on:
  push:
    branches: [main, staging]
    paths:
      - 'src/**'
      - 'public/**'
      - 'package.json'
      - 'next.config.js'
  pull_request:
    branches: [main, staging]

env:
  NODE_VERSION: '20.x'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run type check
        run: npm run type-check

      - name: Run unit tests
        run: npm run test:ci

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}

      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build
          path: .next/

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/staging'
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: ${{ github.ref == 'refs/heads/main' && '--prod' || '' }}

      - name: Run smoke tests
        run: npm run test:e2e:smoke
        env:
          BASE_URL: ${{ github.ref == 'refs/heads/main' && 'https://app.indigoyield.com' || 'https://staging.indigoyield.com' }}

      - name: Notify Slack
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Deployment ${{ job.status }}'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
        if: always()
```

---

### Supabase Functions CI/CD

**File:** `.github/workflows/supabase-deploy.yml`

```yaml
name: Supabase Deploy

on:
  push:
    branches: [main]
    paths:
      - 'supabase/functions/**'
      - 'supabase/migrations/**'

jobs:
  deploy-functions:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Deno
        uses: denoland/setup-deno@v1
        with:
          deno-version: v1.x

      - name: Deploy Edge Functions
        run: |
          supabase functions deploy --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}

  run-migrations:
    runs-on: ubuntu-latest
    needs: deploy-functions
    steps:
      - uses: actions/checkout@v4

      - name: Run Database Migrations
        run: |
          supabase db push --db-url ${{ secrets.DATABASE_URL }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

---

## Environment Variables

### Production Environment Variables

**Vercel Environment Variables:**
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://mdngruhkxlrsgwwlfqru.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# App Configuration
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_APP_VERSION=1.0.0

# Analytics
NEXT_PUBLIC_POSTHOG_KEY=phc_xxx
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Error Tracking
SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_AUTH_TOKEN=xxx
```

**Supabase Secrets:**
```bash
# Set secrets for Edge Functions
supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx
supabase secrets set MAILERLITE_API_KEY=xxx
supabase secrets set RECAPTCHA_SECRET_KEY=xxx
```

**Setting via Vercel CLI:**
```bash
# Production
vercel env add NEXT_PUBLIC_SUPABASE_URL production

# Staging
vercel env add NEXT_PUBLIC_SUPABASE_URL preview

# All environments
vercel env add SENTRY_DSN production preview development
```

---

## Monitoring & Alerts

### Vercel Monitoring

**Built-in Metrics:**
- Deployment status
- Build duration
- Function execution time
- Error rates
- Page load performance

**Access:** https://vercel.com/your-team/your-project/analytics

### Supabase Monitoring

**Database Metrics:**
- Connection pool usage
- Query performance
- Table sizes
- Index efficiency

**Edge Function Metrics:**
- Invocation count
- Execution duration
- Error rates
- Memory usage

**Access:** https://app.supabase.com/project/mdngruhkxlrsgwwlfqru

### PostHog Analytics

**User Metrics:**
- Active users (DAU/MAU)
- Session duration
- Feature usage
- Conversion funnels

**Setup:**
```typescript
// src/lib/posthog.ts
import posthog from 'posthog-js';

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  capture_pageview: false,
  capture_pageleave: true,
});
```

### Sentry Error Tracking

**Configuration:**
```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_APP_ENV,
  tracesSampleRate: 1.0,
  beforeSend(event) {
    // Filter sensitive data
    if (event.request?.cookies) {
      delete event.request.cookies;
    }
    return event;
  },
});
```

### Alert Configuration

**Vercel Notifications:**
- Deployment failures
- Build errors
- Function errors (> 1% error rate)

**Supabase Alerts:**
- Database CPU > 80%
- Disk usage > 80%
- Connection pool exhausted

**Slack Webhook:**
```bash
# Set in GitHub Secrets
SLACK_WEBHOOK=https://hooks.slack.com/services/xxx/yyy/zzz
```

---

## Rollback Procedures

### Web Application Rollback

**Instant Rollback via Vercel:**

1. **Via Vercel Dashboard:**
   - Go to Deployments
   - Find previous stable deployment
   - Click "Promote to Production"

2. **Via Vercel CLI:**
```bash
# List recent deployments
vercel ls

# Rollback to specific deployment
vercel rollback [deployment-url]
```

**Expected Duration:** 30-60 seconds

---

### Database Rollback

**Option 1: Restore from Backup**
```bash
# List available backups
supabase db backups list

# Restore from backup
supabase db restore backup-id
```

**Option 2: Reverse Migration**
```bash
# Create reverse migration
supabase migration new rollback_feature_name

# Write SQL to undo changes
# supabase/migrations/20251122_rollback_feature_name.sql

# Apply rollback migration
supabase db push
```

**Expected Duration:** 5-15 minutes

---

### Edge Functions Rollback

```bash
# Redeploy previous version
git checkout [previous-commit]
supabase functions deploy [function-name]

# Or use version control
git revert [commit-hash]
supabase functions deploy
```

---

## Troubleshooting

### Common Deployment Issues

#### Build Failures

**Symptom:** Build fails with TypeScript errors
```bash
Error: Type 'string | undefined' is not assignable to type 'string'
```

**Solution:**
```bash
# Run type check locally
npm run type-check

# Fix type errors
# Deploy again
git add .
git commit -m "fix: resolve type errors"
git push
```

---

#### Environment Variable Issues

**Symptom:** Application crashes with missing environment variables

**Solution:**
```bash
# Verify environment variables
vercel env ls

# Add missing variables
vercel env add VARIABLE_NAME production

# Redeploy
vercel --prod
```

---

#### Database Connection Issues

**Symptom:** "Connection pool exhausted" errors

**Solution:**
1. Check database connections in Supabase dashboard
2. Optimize queries to close connections
3. Increase connection pool size (Supabase settings)
4. Restart Supabase instance

---

#### Deployment Stuck

**Symptom:** Deployment pending for > 10 minutes

**Solution:**
```bash
# Cancel stuck deployment
vercel cancel

# Retry deployment
git commit --allow-empty -m "chore: trigger redeploy"
git push
```

---

## Security Considerations

### Deployment Security Checklist

- [ ] All environment variables use secrets (not exposed in code)
- [ ] Database credentials rotated quarterly
- [ ] HTTPS enforced for all endpoints
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] Security headers configured
- [ ] DDoS protection enabled (via Vercel)
- [ ] Database backups automated
- [ ] Monitoring and alerting active

### Post-Deployment Verification

```bash
# Check security headers
curl -I https://app.indigoyield.com

# Verify SSL certificate
openssl s_client -connect app.indigoyield.com:443

# Test API endpoints
curl https://mdngruhkxlrsgwwlfqru.supabase.co/functions/v1/status

# Run security audit
npm audit
```

---

## Related Documentation

- [API Documentation](./API_DOCUMENTATION.md)
- [Developer Onboarding](./DEVELOPER_ONBOARDING.md)
- [CI/CD Setup Guide](./CICD_SETUP.md)
- [Monitoring Guide](./MONITORING.md)

---

**Last Updated:** November 22, 2025
**Maintained By:** DevOps Team
**Version:** 1.0.0

For deployment support, contact devops@indigoyield.com or refer to [CONTRIBUTING.md](../CONTRIBUTING.md).
