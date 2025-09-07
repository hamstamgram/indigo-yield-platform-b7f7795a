# Vercel Deployment Guide - Indigo Yield Platform

## 🚀 Your Deployment Options

Since you have connected the Git project to Vercel and Supabase to Vercel, you have several ways to deploy:

## Option 1: Merge the Pull Request (Recommended)
The easiest way since your Git is connected to Vercel:

1. **Go to the Pull Request:**
   https://github.com/hamstamgram/indigo-yield-platform-v01/pull/4

2. **Review and Merge:**
   - Click "Merge pull request"
   - This will trigger automatic deployment via Vercel

3. **Monitor Deployment:**
   - Go to https://vercel.com/dashboard
   - You'll see the deployment in progress
   - Preview URL will be generated automatically

## Option 2: Direct Push to Main
If you want to deploy immediately:

```bash
# Merge directly to main
git checkout main
git merge feature/full-update-rollup
git push origin main
```

This will trigger Vercel's automatic deployment.

## Option 3: Manual Vercel Dashboard Deployment

1. **Go to Vercel Dashboard:**
   https://vercel.com/hamstamgrams-projects/indigo-yield-platform-v01

2. **Click "Deployments" tab**

3. **Click "Redeploy" on the latest deployment**

## Option 4: Fix Git Author Permissions

To resolve the CLI deployment issue permanently:

1. **In Vercel Dashboard:**
   - Go to Project Settings
   - Navigate to "Git" section
   - Ensure the repository is connected

2. **In GitHub:**
   - Go to repository settings
   - Add `hamstamgram@gmail.com` as a collaborator with write access

3. **In Vercel Team Settings:**
   - Go to https://vercel.com/teams/hamstamgrams-projects/settings/members
   - Ensure your account has "Developer" or "Owner" role
   - Check that Git deployments are enabled

## 🔧 Environment Variables Check

Your environment variables are already synced. To verify:

1. Go to: https://vercel.com/hamstamgrams-projects/indigo-yield-platform-v01/settings/environment-variables
2. Ensure these are set:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_MAILERLITE_API_TOKEN`

## 📊 Post-Deployment Verification

After deployment:

1. **Check the live URL:**
   - Production: `https://indigo-yield-platform-v01.vercel.app`
   - Or your custom domain if configured

2. **Test critical features:**
   - Login as LP user
   - Login as Admin user
   - Check document access
   - Verify API connections

## 🎯 Quick Deploy Command

If you manage to fix the permissions, you can deploy with:

```bash
vercel --prod --yes
```

## 🆘 Troubleshooting

If deployment fails:

1. **Check Build Logs:**
   - In Vercel dashboard, click on the deployment
   - View "Build Logs" for errors

2. **Common Issues:**
   - Missing environment variables
   - Build command issues (should be `npm run build`)
   - Output directory (should be `dist`)

3. **Vercel Configuration:**
   Your `vercel.json` is already configured with:
   - Security headers
   - Rewrites for SPA
   - Build settings

## 📱 After Web Deployment - iOS App

Once the web app is live, submit the iOS app:

1. **Open Xcode:**
   ```bash
   cd ios
   open IndigoInvestor.xcodeproj
   ```

2. **Archive and Upload:**
   - Product → Archive
   - Distribute App → App Store Connect
   - Upload to TestFlight

## ✅ Success Indicators

You'll know deployment is successful when:
- ✅ Vercel shows "Ready" status
- ✅ Preview/Production URL is accessible
- ✅ Supabase connection works
- ✅ Users can log in
- ✅ Data loads correctly

---

**Next Step:** Go merge the PR at https://github.com/hamstamgram/indigo-yield-platform-v01/pull/4

This will automatically trigger the deployment! 🚀
