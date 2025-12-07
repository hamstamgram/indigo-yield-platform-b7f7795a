# Contributing Guide

> Guidelines for working with the Indigo Yield Platform monorepo

## 🏗️ Repository Structure

This is a monorepo containing:
- **Web Application** (React/TypeScript) - Root directory
- **iOS Application** (Swift/SwiftUI) - `ios/` directory
- **Shared Backend** (Supabase) - `supabase/` directory

## 🔄 Workflow Overview

### Web Development
```bash
# Work in root directory
npm install
npm run dev

# Commit with prefix
git commit -m "web: Add user dashboard feature"

# Push triggers web-ci-cd.yml
git push origin main
```

### iOS Development
```bash
# Work in ios/ directory
cd ios
open IndigoInvestor.xcworkspace

# Commit with prefix
git commit -m "ios: Add biometric authentication"

# Push triggers ios-ci-cd.yml
git push origin main
```

### Backend Changes
```bash
# Work in supabase/ directory
cd supabase

# Create migration
supabase migration new add_new_table

# Test locally
supabase db reset

# Commit with prefix
git commit -m "backend: Add portfolio analytics table"

# Push triggers database migrations
git push origin main
```

## 📝 Commit Message Convention

Use platform prefixes for clarity:

- `web:` - Web application changes
- `ios:` - iOS application changes
- `backend:` - Database/Edge Function changes
- `docs:` - Documentation updates
- `ci:` - CI/CD workflow changes
- `fix:` - Bug fixes (specify platform if needed)
- `feat:` - New features (specify platform if needed)

**Examples:**
```
web: Add portfolio performance charts
ios: Implement Face ID authentication
backend: Add audit logging to transactions
docs: Update iOS deployment guide
ci: Fix web deployment workflow
fix(web): Resolve login redirect issue
feat(ios): Add widget for portfolio value
```

## 🔀 Branch Strategy

### Main Branches
- `main` - Production (protected)
- `develop` - Staging/integration

### Feature Branches
- `web/feature-name` - Web features
- `ios/feature-name` - iOS features
- `backend/feature-name` - Backend features
- `fix/issue-description` - Bug fixes

### Workflow
```bash
# Create feature branch
git checkout -b web/portfolio-charts

# Make changes, commit often
git add .
git commit -m "web: Add chart component"

# Push and create PR
git push origin web/portfolio-charts

# GitHub Actions runs appropriate workflow based on changed files
```

## 🧪 Testing Requirements

### Web
- [ ] ESLint passes: `npm run lint`
- [ ] TypeScript compiles: `npx tsc --noEmit`
- [ ] Unit tests pass (when added)
- [ ] E2E tests pass (when added)
- [ ] No security vulnerabilities

### iOS
- [ ] SwiftLint passes
- [ ] Unit tests pass: `⌘+U` in Xcode
- [ ] UI tests pass (when added)
- [ ] No SwiftFormat issues
- [ ] Builds successfully for device

### Backend
- [ ] Migrations run successfully
- [ ] RLS policies tested
- [ ] Edge Functions deployed
- [ ] No breaking schema changes

## 📋 Pull Request Process

1. **Create PR** with appropriate template
2. **Assign reviewers** (platform-specific)
3. **Wait for CI** - All checks must pass
4. **Address feedback** - Make requested changes
5. **Merge** - Squash and merge to main

### PR Title Format
```
[Platform] Brief description of changes

Examples:
[Web] Add portfolio performance dashboard
[iOS] Implement biometric authentication
[Backend] Add audit logging system
```

## 🔍 Code Review Guidelines

### Web Reviews
- React best practices
- TypeScript type safety
- Tailwind CSS usage
- Performance considerations
- Accessibility (a11y)

### iOS Reviews
- Swift style guide compliance
- SwiftUI best practices
- Memory management
- Security (Keychain, biometrics)
- Apple HIG compliance

### Backend Reviews
- RLS policy correctness
- Migration safety
- Edge Function performance
- Security considerations
- Data integrity

## 🚨 CI/CD Triggers

### Web CI/CD (`web-ci-cd.yml`)
Triggers on changes to:
- `src/**`
- `public/**`
- `supabase/**` (for schema types)
- `package.json`, `vite.config.ts`, etc.

### iOS CI/CD (`ios-ci-cd.yml`)
Triggers on changes to:
- `ios/**`

### Shared CI (`ci.yml`, `test.yml`)
Triggers on:
- All PRs to main
- General repository changes

## 📦 Dependencies

### Web
```bash
# Add dependency
npm install package-name

# Update all
npm update

# Audit security
npm audit fix
```

### iOS
```bash
# SPM dependencies in Xcode
# File → Add Package Dependencies

# CocoaPods (if used)
cd ios
pod install
```

## 🔐 Secrets Management

### GitHub Secrets (for CI/CD)
Set in: Settings → Secrets and variables → Actions

**Required:**
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `VERCEL_TOKEN` (web)
- `APPLE_DEVELOPER_TEAM_ID` (iOS)

### Local Development

**Web** (`.env.local`):
```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

**iOS** (`ios/Config/Secrets.xcconfig`):
```bash
SUPABASE_URL = ...
SUPABASE_ANON_KEY = ...
```

**Never commit secrets!** Both files are gitignored.

## 📊 Monitoring & Debugging

### Web
- **Dev Tools**: React DevTools, Network tab
- **Logs**: Browser console
- **Production**: Sentry for errors

### iOS
- **Xcode**: Console logs (⌘+Shift+Y)
- **Instruments**: Performance profiling
- **TestFlight**: Crash reports

### Backend
- **Supabase Dashboard**: Logs, query performance
- **Edge Functions**: Real-time logs in dashboard

## 🆘 Getting Help

### Issues
- Tag with `platform:web`, `platform:ios`, or `platform:backend`
- Provide reproduction steps
- Include error logs

### Questions
- Check documentation first
- Open discussion in GitHub Discussions
- Reach out to platform leads

## 📚 Additional Resources

- [Project README](./README.md)
- [Web README](./web/README.md)
- [iOS README](./ios/README.md)
- [Backend Docs](./docs/backend/README.md)
- [Deployment Docs](./docs/deployment/README.md)
