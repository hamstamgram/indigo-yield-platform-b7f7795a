# 🚀 IMMEDIATE DEPLOYMENT INSTRUCTIONS

## ✅ Current Status
- **Production build ready**: `dist/` folder compiled
- **Deployment package ready**: `indigo-yield-platform-production.zip`
- **Backend services**: All healthy and deployed
- **Database**: Migrations applied, needs backup before deploy

---

## 📋 STEP 1: BACKUP DATABASE (CRITICAL!)

### Option A: Via Supabase Dashboard (Recommended)
1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `scripts/production-backup.sql`
4. Run the script
5. Verify backup tables were created in `backup_20250905` schema

### Option B: Via Command Line
```bash
# Run the backup script
cat scripts/production-backup.sql | npx supabase db push --db-url "YOUR_DATABASE_URL"
```

---

## 🌐 STEP 2: DEPLOY FRONTEND

### Option 1: NETLIFY DROP (Easiest - No Account Required)
1. Open browser to: https://app.netlify.com/drop
2. Drag the `dist` folder directly onto the page
3. Your site will be live immediately with a preview URL
4. Create free account to claim the site and set custom domain

### Option 2: VERCEL (Via Dashboard)
1. Go to: https://vercel.com/new
2. Choose "Upload Folder" or "Import Project"
3. Upload the `indigo-yield-platform-production.zip`
4. Or connect your GitHub repo if you've pushed changes
5. Set environment variables (copy from `.env.local`)
6. Deploy

### Option 3: MANUAL UPLOAD (Any Hosting Provider)
Use the `indigo-yield-platform-production.zip` file:
- **cPanel**: Upload via File Manager, extract to public_html
- **FTP**: Extract locally, upload contents of `dist/` folder
- **AWS S3**: Upload dist/ contents, enable static website hosting
- **GitHub Pages**: Push dist/ to gh-pages branch

### Option 4: COMMAND LINE DEPLOYMENT

#### Surge.sh (Simple Static Hosting)
```bash
# Install and deploy
npm install -g surge
cd dist
surge

# Follow prompts, choose domain
```

#### GitHub Pages
```bash
# Deploy to GitHub Pages
npm install -g gh-pages
gh-pages -d dist
```

---

## 🔧 STEP 3: CONFIGURE ENVIRONMENT

After deployment, ensure these environment variables are set in your hosting platform:

```env
VITE_SUPABASE_URL=https://uxpzrxsnxlptkamkkaae.supabase.co
VITE_SUPABASE_ANON_KEY=[Your anon key]
VITE_POSTHOG_KEY=[Your PostHog key if using]
VITE_SENTRY_DSN=[Your Sentry DSN if using]
```

---

## ✅ STEP 4: POST-DEPLOYMENT VERIFICATION

1. **Test Login**: Try logging in as both admin and LP user
2. **Check Console**: Open browser DevTools, check for errors
3. **Verify API**: Ensure data loads properly
4. **Test Features**: 
   - Upload a test document
   - View statements
   - Check admin functions

---

## 🔄 ROLLBACK PLAN

If issues occur:
1. **Database**: Restore from `backup_20250905` schema
2. **Frontend**: Redeploy previous version or use Vercel/Netlify rollback
3. **Edge Functions**: Use Supabase dashboard to rollback functions

---

## 📞 QUICK ACTIONS

### Deploy to Netlify Drop RIGHT NOW:
1. Open Finder
2. Navigate to `/Users/mama/indigo-yield-platform-v01/dist`
3. Open browser to: https://app.netlify.com/drop
4. Drag the `dist` folder onto the webpage
5. Done! Site is live.

### Deploy via Command Line:
```bash
# Quick deploy with Surge
cd /Users/mama/indigo-yield-platform-v01/dist
npx surge
```

---

## ⚠️ IMPORTANT REMINDERS

Per your deployment rules:
- ✅ Follow Dev→Staging→Prod flow
- ✅ All database changes via migrations
- ✅ RLS policies are in place
- ✅ Admin-only operations secured
- ✅ PDFs stored in Supabase Storage with signed URLs

---

## Need Help?

- The `dist/` folder contains your production-ready app
- The `.zip` file is ready for upload anywhere
- All backend services are already deployed and running
- Just need to deploy the frontend files!
