# Deployment Plan with Rollback Strategy

## Overview
This document outlines the deployment strategy for the Indigo Yield Platform, ensuring safe, controlled releases from development through staging to production with proper rollback capabilities.

## Branch Strategy

### Current Branch Structure
```
main (production)
├── staging
└── develop
    └── feature/investors-data-and-audit (current work)
```

### Workflow
1. **Feature Development**
   - All new features developed in feature branches off `develop`
   - Branch naming: `feature/[ticket-number]-[description]`
   - Example: `feature/investors-data-and-audit`

2. **Pull Request Requirements**
   - Target: `develop` branch
   - Required reviews: Minimum 1 approval
   - CI checks must pass:
     - Build verification
     - Unit tests
     - RLS policy tests
     - Linting

3. **Staging Deployment**
   - Merge `develop` → `staging` after PR approval
   - Automatic deployment to staging environment
   - Apply database migrations
   - Run smoke tests

4. **Production Deployment**
   - Create release tag: `v[major].[minor].[patch]`
   - Merge `staging` → `main` after staging sign-off
   - Deploy to production via Vercel

## Environment Configuration

### Development
```bash
# .env.local
VITE_SUPABASE_URL=https://[dev-project].supabase.co
VITE_SUPABASE_ANON_KEY=[dev-anon-key]
VITE_ENVIRONMENT=development
```

### Staging
```bash
# Vercel Environment Variables (Preview)
VITE_SUPABASE_URL=https://[staging-project].supabase.co
VITE_SUPABASE_ANON_KEY=[staging-anon-key]
VITE_ENVIRONMENT=staging
```

### Production
```bash
# Vercel Environment Variables (Production)
VITE_SUPABASE_URL=https://[prod-project].supabase.co
VITE_SUPABASE_ANON_KEY=[prod-anon-key]
VITE_ENVIRONMENT=production
```

## Deployment Steps

### 1. Pre-Deployment Checklist
- [ ] All tests passing locally
- [ ] Documentation updated
- [ ] Migration scripts tested
- [ ] Rollback migrations prepared
- [ ] Feature flags configured (if applicable)

### 2. Deploy to Staging
```bash
# 1. Ensure on develop branch
git checkout develop

# 2. Create PR to staging
git checkout -b release/staging-$(date +%Y%m%d)
git push origin release/staging-$(date +%Y%m%d)

# 3. After PR approval, merge to staging
git checkout staging
git merge --no-ff release/staging-$(date +%Y%m%d)
git push origin staging

# 4. Apply migrations to staging database
supabase db push --db-url $STAGING_DATABASE_URL

# 5. Vercel auto-deploys staging branch
```

### 3. Staging Validation
- [ ] AdminInvestors page loads with real data
- [ ] Thomas Puech investor appears with accurate data
- [ ] Portfolio Management functions correctly
- [ ] Statements generation works
- [ ] RLS policies enforced
- [ ] No console errors or warnings

### 4. Deploy to Production
```bash
# 1. Create release tag
git checkout main
git merge --no-ff staging
git tag -a v1.0.0 -m "Release: AdminInvestors with real data"
git push origin main --tags

# 2. Apply migrations to production
supabase db push --db-url $PRODUCTION_DATABASE_URL

# 3. Vercel auto-deploys main branch
```

## Rollback Strategy

### Database Rollback

#### Prepare Down Migrations
For every up migration, create a corresponding down migration:

```sql
-- Up Migration: 20250109_admin_investor_functions.sql
CREATE OR REPLACE FUNCTION public.get_all_non_admin_profiles()...

-- Down Migration: 20250109_admin_investor_functions_down.sql
DROP FUNCTION IF EXISTS public.get_all_non_admin_profiles();
DROP FUNCTION IF EXISTS public.get_profile_by_id(uuid);
DROP FUNCTION IF EXISTS public.is_admin_for_jwt();
```

#### Execute Rollback
```bash
# 1. Apply down migration
supabase db push --file supabase/migrations/[timestamp]_down.sql

# 2. Revert git commit
git revert HEAD
git push origin main

# 3. Vercel auto-deploys previous version
```

### Application Rollback

#### Feature Flags (if needed)
```typescript
// src/config/features.ts
export const FEATURES = {
  ADMIN_INVESTORS: process.env.VITE_FEATURE_ADMIN_INVESTORS === 'true',
  STATEMENTS_GENERATION: process.env.VITE_FEATURE_STATEMENTS === 'true',
};

// Usage in App.tsx
{FEATURES.ADMIN_INVESTORS && (
  <Route path="/admin/investors" element={<AdminInvestors />} />
)}
```

#### Quick Disable
```typescript
// src/pages/AdminInvestors.tsx
const AdminInvestors = () => {
  // Emergency disable
  if (process.env.VITE_DISABLE_ADMIN_INVESTORS === 'true') {
    return <MaintenancePage message="This feature is temporarily unavailable" />;
  }
  // ... rest of component
};
```

### Vercel Instant Rollback
```bash
# Via Vercel CLI
vercel rollback

# Or via Dashboard
# 1. Go to Deployments tab
# 2. Find previous stable deployment
# 3. Click "..." menu → "Promote to Production"
```

## Monitoring & Alerts

### Health Checks
```typescript
// src/utils/healthCheck.ts
export const checkCriticalServices = async () => {
  const checks = {
    database: await checkDatabase(),
    auth: await checkAuth(),
    storage: await checkStorage(),
    adminFunctions: await checkAdminFunctions(),
  };
  
  if (!Object.values(checks).every(Boolean)) {
    // Alert team
    console.error('Health check failed:', checks);
  }
  
  return checks;
};
```

### Error Tracking
- Sentry alerts for production errors
- Supabase logs monitoring
- Vercel function logs

## Post-Deployment Verification

### Smoke Tests
```bash
# Run automated smoke tests
npm run test:smoke

# Manual verification checklist
- [ ] Login as admin user
- [ ] Access /admin/investors
- [ ] Verify investor list loads
- [ ] Check portfolio management
- [ ] Generate test statement
- [ ] Login as LP user
- [ ] Verify restricted access
```

### Rollback Decision Matrix

| Issue Severity | User Impact | Action |
|---------------|------------|--------|
| Critical | All users affected | Immediate rollback |
| High | Admin functions broken | Rollback within 1 hour |
| Medium | Some features degraded | Fix forward or rollback in 4 hours |
| Low | Minor UI issues | Fix in next release |

## Communication Plan

### Deployment Notification
```markdown
**Deployment Starting**
Environment: [Staging/Production]
Version: v1.0.0
Features: AdminInvestors with real data
Start Time: [timestamp]
```

### Rollback Notification
```markdown
**ROLLBACK INITIATED**
Environment: Production
Reason: [issue description]
Impact: [affected users/features]
ETA: [restoration time]
```

## CI/CD Pipeline Configuration

### GitHub Actions (if used)
```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm ci
      - run: npm test
      - run: npm run test:rls

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/staging'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm ci
      - run: npm run build
      - uses: amondnet/vercel-action@v20
```

## Recovery Time Objectives

- **RTO (Recovery Time Objective)**: < 15 minutes
- **RPO (Recovery Point Objective)**: < 1 hour
- **Database backup frequency**: Every 6 hours
- **Code repository backup**: Continuous (Git)

## Approval Chain

1. **Development → Staging**
   - Developer creates PR
   - Tech lead reviews and approves
   - Automated merge after CI passes

2. **Staging → Production**
   - QA sign-off required
   - Product owner approval
   - Admin notification before deployment

## Rollback Authorization

- **Who can initiate rollback:**
  - Tech Lead
  - DevOps Engineer
  - On-call Developer

- **Escalation path:**
  1. Detect issue
  2. Assess severity
  3. Notify tech lead
  4. Execute rollback if approved
  5. Post-mortem within 48 hours

---

**Last Updated**: January 9, 2025
**Document Version**: 1.0.0
**Owner**: Development Team
