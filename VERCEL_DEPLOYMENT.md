# 🚀 Vercel Deployment Guide

## Prerequisites
- [x] Vercel CLI installed (`npm install -g vercel`)
- [x] Project built successfully (`npm run build`)
- [x] Environment variables configured
- [x] Tests passing

## 🔑 Environment Variables

The following environment variables must be set in Vercel Dashboard:

```bash
# Required
VITE_SUPABASE_URL=https://nkfimvovosdehmyyjubn.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Optional
VITE_APP_VERSION=1.0.0
VITE_APP_ENV=production
VITE_SENTRY_DSN=https://...
```

## 📦 Deployment Steps

### 1. First-Time Setup

```bash
# Login to Vercel
vercel login

# Link project to Vercel
vercel link

# Follow prompts:
# - Select your scope/team
# - Link to existing project or create new
# - Project name: indigo-yield-platform
```

### 2. Deploy to Staging

```bash
# Deploy to preview/staging
vercel

# This creates a unique preview URL like:
# https://indigo-yield-platform-abc123.vercel.app
```

### 3. Deploy to Production

```bash
# Deploy to production
vercel --prod

# Production URL:
# https://indigo-yield-platform.vercel.app
# or your custom domain
```

## 🔧 Configuration

### Build Settings (in vercel.json)
- **Framework**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### Security Headers
The following security headers are configured:
- Strict-Transport-Security
- X-Content-Type-Options
- X-Frame-Options
- Content-Security-Policy
- Referrer-Policy

## 🌐 Domain Configuration

### Default Domain
- Staging: `https://indigo-yield-platform-[hash].vercel.app`
- Production: `https://indigo-yield-platform.vercel.app`

### Custom Domain Setup
1. Go to Vercel Dashboard > Settings > Domains
2. Add your domain (e.g., `app.indigo.fund`)
3. Configure DNS:
   ```
   Type: CNAME
   Name: app
   Value: cname.vercel-dns.com
   ```
4. Wait for SSL certificate (automatic)

## 🔍 Post-Deployment Checks

### Staging Checklist
- [ ] Application loads without errors
- [ ] Login functionality works
- [ ] Supabase connection established
- [ ] Console free of critical errors
- [ ] Navigation works correctly

### Production Checklist
- [ ] All staging checks pass
- [ ] SSL certificate active
- [ ] Security headers verified
- [ ] Performance acceptable (<3s load)
- [ ] Error tracking connected (Sentry)

## 🚨 Rollback Procedure

If issues occur after deployment:

```bash
# List recent deployments
vercel ls

# Rollback to previous deployment
vercel rollback [deployment-url]

# Or use dashboard:
# Vercel Dashboard > Deployments > ... > Promote to Production
```

## 📊 Monitoring

### Vercel Analytics
- Real User Monitoring (RUM)
- Web Vitals tracking
- Error rate monitoring

### External Monitoring
- **Sentry**: Error tracking and performance
- **PostHog**: User analytics
- **Supabase Dashboard**: Database metrics

## 🔧 Troubleshooting

### Build Failures
```bash
# Check build logs
vercel logs [deployment-url]

# Clear cache and rebuild
vercel --force
```

### Environment Variable Issues
1. Check Vercel Dashboard > Settings > Environment Variables
2. Ensure all VITE_ prefixed variables are set
3. Redeploy after changing variables

### 404 Errors on Routes
- Ensure `vercel.json` has SPA rewrite rules
- Check `rewrites` configuration

## 📝 CI/CD Integration

### GitHub Integration
1. Connect GitHub repo in Vercel Dashboard
2. Enable automatic deployments:
   - Production: Deploy on push to `main`
   - Preview: Deploy on pull requests

### Manual Deployment via GitHub Actions
```yaml
name: Deploy to Vercel
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

## 🎯 Performance Optimization

### Build Optimization
- Code splitting implemented
- Lazy loading for routes
- Image optimization
- Minification enabled

### Runtime Optimization
- CDN caching
- Compression enabled
- HTTP/2 push
- Edge network distribution

## 📞 Support

### Resources
- [Vercel Documentation](https://vercel.com/docs)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html#vercel)
- [Supabase + Vercel Guide](https://supabase.com/docs/guides/getting-started/quickstarts/vercel)

### Common Issues
- **CORS errors**: Check Supabase URL configuration
- **Build timeout**: Increase maxDuration in vercel.json
- **Large bundle size**: Implement code splitting
- **Environment variables not working**: Ensure VITE_ prefix

---

## Quick Deploy Commands

```bash
# Staging deployment
vercel

# Production deployment
vercel --prod

# Check deployment status
vercel ls

# View logs
vercel logs

# Remove deployment
vercel rm [deployment-url]
```

Last Updated: 2025-09-08
Status: Ready for Deployment
