# Deployment Documentation

> Infrastructure, CI/CD pipelines, and deployment guides

[← Back to Main Documentation](../../README.md)

## 📚 Available Documentation

- [Deployment Guide](./DEPLOYMENT_GUIDE.md) - Complete deployment instructions
- [Deployment Instructions](./DEPLOYMENT_INSTRUCTIONS.md) - Step-by-step deployment process
- [Deployment Status](./DEPLOYMENT_STATUS.md) - Current deployment state

## 🏗️ Infrastructure

### Web Application
- **Platform**: Vercel / Netlify
- **Environment**: Production + Staging
- **Domain**: invest.indigocyber.com
- **SSL**: Automatic via platform

### iOS Application
- **Distribution**: TestFlight → App Store
- **Build System**: Xcode Cloud / GitHub Actions
- **Provisioning**: Apple Developer Portal

### Backend
- **Platform**: Supabase (managed PostgreSQL + Edge Functions)
- **Region**: Choose based on user geography
- **Backups**: Automated daily backups

## 🔄 CI/CD Workflows

### Web Pipeline (`web-ci-cd.yml`)
Triggers on changes to:
- `src/**`
- `public/**`
- `package.json`
- Config files

**Steps:**
1. Lint & Type Check
2. Run Tests
3. Security Scan
4. Build Application
5. Deploy to Vercel
6. Database Migrations
7. Notifications

### iOS Pipeline (`ios-ci-cd.yml`)
Triggers on changes to:
- `ios/**`

**Steps:**
1. SwiftLint
2. Run Tests
3. Build App
4. TestFlight Upload
5. Notifications

## 🚀 Deployment Process

### Initial Setup

1. **Supabase Project**
   ```bash
   # Create project at supabase.com
   # Note project URL and keys
   ```

2. **GitHub Secrets**
   Set in Settings → Secrets and variables → Actions:
   ```
   # Supabase
   SUPABASE_URL
   SUPABASE_ANON_KEY
   SUPABASE_SERVICE_ROLE_KEY
   SUPABASE_PROJECT_REF
   SUPABASE_ACCESS_TOKEN

   # Web Deployment
   VERCEL_TOKEN
   VERCEL_ORG_ID
   VERCEL_PROJECT_ID

   # iOS (if using)
   APPLE_DEVELOPER_TEAM_ID
   FASTLANE_PASSWORD
   MATCH_PASSWORD

   # Optional
   SLACK_WEBHOOK_URL
   SENTRY_AUTH_TOKEN
   SENTRY_DSN_WEB
   SENTRY_DSN_IOS
   ```

3. **Database Migration**
   ```bash
   # Install Supabase CLI
   npm install -g supabase

   # Login and link project
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF

   # Run migrations
   supabase db push
   ```

### Web Deployment

**Automatic (via GitHub Actions):**
```bash
git push origin main  # Production
git push origin develop  # Staging
```

**Manual:**
```bash
npm run build
vercel deploy --prod
```

### iOS Deployment

**TestFlight (Automatic):**
- Push to `main` branch
- GitHub Actions builds and uploads to TestFlight
- Beta testers receive notification

**Manual:**
1. Archive in Xcode (Product → Archive)
2. Distribute to App Store Connect
3. Submit for TestFlight review
4. Invite beta testers

### Database Updates

**Migration Workflow:**
```bash
# Create migration
supabase migration new your_migration_name

# Edit migration file in supabase/migrations/

# Test locally
supabase db reset

# Push to production (triggered by GitHub Actions on main branch)
# Or manually:
supabase db push
```

## 🔍 Monitoring

### Health Checks
- **Web**: https://invest.indigocyber.com/health
- **API**: Monitor Supabase dashboard
- **iOS**: TestFlight crash reports

### Error Tracking
- **Sentry**: Real-time error monitoring
- **Supabase Logs**: Database and Edge Function logs
- **GitHub Actions**: Build and deployment logs

### Performance
- **Lighthouse CI**: Automated performance audits
- **Supabase Dashboard**: Query performance
- **Apple Analytics**: iOS app performance

## 🆘 Rollback Procedures

### Web Application
```bash
# Revert to previous deployment via Vercel dashboard
# Or redeploy previous commit
git revert HEAD
git push origin main
```

### iOS Application
- Cannot rollback App Store builds
- Can remove from TestFlight
- Expedite fix and release patch version

### Database
```bash
# Rollback last migration
supabase migration rollback

# Or restore from backup in Supabase dashboard
```

## 📋 Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Security scan clean
- [ ] Environment variables configured
- [ ] Database migrations tested
- [ ] Staging environment verified
- [ ] Monitoring configured
- [ ] Rollback plan documented

## 🔗 Related Documentation

- [Backend Setup](../backend/README.md)
- [Web Configuration](../../web/README.md)
- [iOS Build Guide](../../ios/README.md)
- [Architecture Overview](../../ARCHITECTURAL_ANALYSIS_AND_BUILD_PLAN.md)
