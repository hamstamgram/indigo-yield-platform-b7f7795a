# Execute Database Migrations - READY TO RUN

## ✅ Setup Complete

- ✅ pg package installed
- ✅ Migration SQL files ready
- ✅ Execution script created (`execute-migrations-direct.mjs`)

## 🚀 Execute Migrations Now

### Step 1: Get Your Database Password

1. Go to: https://supabase.com/dashboard/project/nkfimvovosdehmyyjubn/settings/database
2. Find the "Database password" section
3. Copy your database password

### Step 2: Run the Migration Script

```bash
cd /Users/mama/indigo-yield-platform-v01

# Set DATABASE_URL with your password (replace [YOUR_PASSWORD])
export DATABASE_URL="postgresql://postgres:[YOUR_PASSWORD]@db.nkfimvovosdehmyyjubn.supabase.co:5432/postgres"

# Execute migrations
node execute-migrations-direct.mjs
```

**OR run in one line:**

```bash
DATABASE_URL="postgresql://postgres:[YOUR_PASSWORD]@db.nkfimvovosdehmyyjubn.supabase.co:5432/postgres" node execute-migrations-direct.mjs
```

## 📋 What Will Happen

The script will:

### Phase 1: Database Cleanup
1. Create backup tables:
   - `yield_rates_backup_20251118` (6 rows preserved)
   - `assets_backup_20251118` (6 rows preserved)

2. Delete 10 tables:
   - ❌ deposits (0 rows)
   - ❌ yield_rates (6 rows - backed up)
   - ❌ portfolio_history (0 rows)
   - ❌ daily_nav (0 rows)
   - ❌ benchmarks (0 rows)
   - ❌ reconciliation (0 rows)
   - ❌ withdrawal_requests (0 rows)
   - ❌ secure_shares (0 rows)
   - ❌ bank_accounts (0 rows)
   - ❌ support_tickets (0 rows)

### Phase 2: Deploy New Tables
3. Create 3 new tables:
   - ✅ investor_emails (multi-email support)
   - ✅ email_logs (email delivery tracking)
   - ✅ onboarding_submissions (Airtable integration)

## ✅ Expected Output

```
==============================================
DATABASE MIGRATION EXECUTION (Direct)
==============================================

🔌 Connecting to Supabase database...
✅ Connected successfully!

==============================================
STEP 1: DATABASE CLEANUP
==============================================

📄 Reading Cleanup Migration...
✅ File loaded (5847 characters)
⚡ Executing Cleanup Migration...

📢 NOTICE: Created backup: yield_rates_backup_20251118 (6 rows)
📢 NOTICE: Created backup: assets_backup_20251118 (6 rows)
📢 NOTICE: Deleted table: deposits
📢 NOTICE: Deleted table: yield_rates
📢 NOTICE: Deleted table: portfolio_history
... (more NOTICE messages)
📢 NOTICE: Remaining tables: 11

✅ Cleanup Migration completed successfully!

==============================================
STEP 2: DEPLOY NEW TABLES
==============================================

📄 Reading New Tables Deployment...
✅ File loaded (7234 characters)
⚡ Executing New Tables Deployment...

📢 NOTICE: Created table: investor_emails
📢 NOTICE: Created table: email_logs
📢 NOTICE: Created table: onboarding_submissions

✅ New Tables Deployment completed successfully!

==============================================
✅ MIGRATION COMPLETE
==============================================

📊 Summary:
  ✅ 10 tables deleted
  ✅ 3 new tables created
  ✅ 2 backup tables created

🔌 Closing database connection...
✅ Connection closed.

✨ All done!
```

## ⚠️ If You Get an Error

### Error: "password authentication failed"
- Check that your password is correct
- Copy it fresh from Supabase Dashboard

### Error: "no pg_hba.conf entry"
- Your IP may not be allowed
- Go to Supabase Dashboard → Database → Connection pooling
- Add your IP to allowed list

### Error: "timeout"
- Large migration taking too long
- Script already has 60-second timeout
- This should not happen as migrations are fast

## 🔍 Verify After Execution

```bash
# Run this to check database state
node verify_migrations.js
```

Or manually check in Supabase SQL Editor:

```sql
-- List all tables
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check backups exist
SELECT COUNT(*) FROM yield_rates_backup_20251118;
SELECT COUNT(*) FROM assets_backup_20251118;

-- Check new tables exist
SELECT COUNT(*) FROM investor_emails;
SELECT COUNT(*) FROM email_logs;
SELECT COUNT(*) FROM onboarding_submissions;
```

## 📊 Analysis Complete

✅ **Platform Compliance Verified** (from PLATFORM_DATA_TRACKING_ANALYSIS.md):
- All yield values stored in denominated asset currency (BTC, ETH, SOL, USDT, USDC, EURC)
- Zero USD conversions in database or frontend
- `investor_monthly_reports.yield` field is NUMERIC(38,18) in native currency
- MonthlyDataEntry.tsx and InvestorReports.tsx correctly display asset-denominated yield

**Status**: 100% compliant with requirement "all the yield is always in the denominated asset currency there is no dollar value on this platform"

## 🎯 Next Steps After Migration

1. ✅ Verify database cleanup successful
2. ✅ Test MonthlyDataEntry.tsx with new database structure
3. ✅ Test InvestorReports.tsx multi-email functionality
4. ✅ Enter test data for September 2025
5. ✅ Verify investor can view statements

---

**Ready to execute!** Just replace `[YOUR_PASSWORD]` with your actual database password and run the command.
