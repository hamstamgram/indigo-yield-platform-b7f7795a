# Vercel Deployment Configuration

## Account Information

### Primary Vercel Account
- **Email**: h.monoja@protonmail.com
- **Purpose**: Main deployment account
- **Access Level**: Owner

### Secondary Account (if applicable)
- **Email**: hammadou@indigo.fund
- **Purpose**: Business/domain account
- **Access Level**: Admin

## Current Deployment

### Production URL
https://indigo-yield-platform-v01-qf65jky23-hamstamgrams-projects.vercel.app

### Deployment Dashboard
https://vercel.com/hamstamgrams-projects/indigo-yield-platform-v01

## Domain Configuration

To set up a custom domain (e.g., app.indigo.fund):

1. **Log in to Vercel**
   - Use account: h.monoja@protonmail.com
   - Navigate to project dashboard

2. **Add Custom Domain**
   ```
   Settings → Domains → Add Domain
   Enter: app.indigo.fund (or your preferred subdomain)
   ```

3. **Configure DNS Records**
   Add these records to your domain provider (for indigo.fund):
   ```
   Type: CNAME
   Name: app
   Value: cname.vercel-dns.com
   ```
   
   OR for apex domain:
   ```
   Type: A
   Name: @
   Value: 76.76.21.21
   ```

4. **SSL Certificate**
   - Automatically provisioned by Vercel
   - No additional configuration needed

## Environment Variables

Set these in Vercel Dashboard (Settings → Environment Variables):

```bash
# Supabase Configuration
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Authentication
VITE_AUTH_REDIRECT_URL=https://app.indigo.fund

# Analytics (Optional)
VITE_POSTHOG_KEY=your-posthog-key
VITE_POSTHOG_HOST=https://app.posthog.com

# Error Monitoring (Optional)
VITE_SENTRY_DSN=your-sentry-dsn

# Environment
VITE_APP_ENV=production
```

## Team Access Management

### To Add Team Members:
1. Go to Settings → Team Members
2. Click "Invite Team Member"
3. Enter email address
4. Select role:
   - **Owner**: Full access (h.monoja@protonmail.com)
   - **Member**: Deploy and manage
   - **Viewer**: Read-only access

### Recommended Team Structure:
- **Owner**: h.monoja@protonmail.com
- **Admin**: hammadou@indigo.fund
- **Developers**: Add as Members
- **QA/Support**: Add as Viewers

## Deployment Settings

### Build Configuration
```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "devCommand": "npm run dev -- --port $PORT"
}
```

### Production Branch
- **Branch**: main
- **Auto-deploy**: Enabled
- **Preview deploys**: Enabled for all branches

### Performance Features
- **Edge Functions**: Available
- **Image Optimization**: Enabled
- **Analytics**: Enable in dashboard
- **Web Analytics**: Enable for Core Web Vitals

## Security Configuration

### Headers (Add to vercel.json)
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "SAMEORIGIN"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=()"
        }
      ]
    }
  ]
}
```

## Monitoring & Analytics

### Vercel Analytics
1. Navigate to Analytics tab
2. Enable Web Analytics
3. Monitor:
   - Page views
   - Core Web Vitals
   - User geography
   - Device types

### Speed Insights
1. Navigate to Speed Insights
2. Monitor:
   - FCP (First Contentful Paint)
   - LCP (Largest Contentful Paint)
   - CLS (Cumulative Layout Shift)
   - FID (First Input Delay)

## Deployment Commands

### Deploy from CLI
```bash
# Login to Vercel
vercel login h.monoja@protonmail.com

# Deploy to preview
vercel

# Deploy to production
vercel --prod

# Link existing project
vercel link
```

### GitHub Integration
1. Connect GitHub account
2. Import repository: hamstamgram/indigo-yield-platform-v01
3. Enable automatic deployments

## Support & Resources

### Vercel Support
- **Documentation**: https://vercel.com/docs
- **Support Email**: support@vercel.com
- **Status Page**: https://vercel-status.com

### Project Contacts
- **Technical Lead**: h.monoja@protonmail.com
- **Business Contact**: hammadou@indigo.fund

## Cost Management

### Current Plan
- Check at: https://vercel.com/dashboard/usage

### Optimization Tips
- Use ISR (Incremental Static Regeneration) where possible
- Optimize images using next/image or Vercel Image Optimization
- Monitor bandwidth usage
- Set spending limits in billing settings

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check build logs in dashboard
   - Verify environment variables
   - Ensure dependencies are in package.json

2. **Domain Not Working**
   - Verify DNS propagation (24-48 hours)
   - Check domain configuration in Vercel
   - Ensure SSL certificate is active

3. **Environment Variables Not Working**
   - Restart deployment after adding variables
   - Use VITE_ prefix for client-side variables
   - Check variable names match exactly

---

*Last Updated: January 9, 2025*
*Account Owner: h.monoja@protonmail.com*
