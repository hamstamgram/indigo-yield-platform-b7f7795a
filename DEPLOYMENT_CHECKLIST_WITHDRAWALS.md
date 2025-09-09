# Admin Withdrawal Management - Deployment Checklist

## 📋 Pre-Deployment Checklist

### 1. Code Review
- [x] Navigation link added to admin menu
- [x] AdminWithdrawalsPage enhanced with full workflow
- [x] Database migration script created
- [x] RLS test suite created
- [x] All TypeScript files compile without errors

### 2. Database Migration Files
- [x] `supabase/migrations/20250109150000_admin_withdrawal_workflow.sql` - Main migration
- [x] `tests/withdrawal-rls-tests.js` - RLS test suite

## 🚀 Deployment Steps

### Step 1: Deploy Database Changes to Dev/Staging

Since Supabase CLI is having issues, use the Supabase Dashboard:

1. **Login to Supabase Dashboard**
   - Go to https://app.supabase.com
   - Select your project: INDIGO YIELD FUND

2. **Apply Migration via SQL Editor**
   - Navigate to SQL Editor
   - Create new query
   - Copy contents from `supabase/migrations/20250109150000_admin_withdrawal_workflow.sql`
   - Run the migration
   - Verify no errors

3. **Verify Database Changes**
   - Check that these tables exist:
     - `withdrawal_audit_logs`
   - Check that these functions exist:
     - `ensure_admin()`
     - `approve_withdrawal()`
     - `reject_withdrawal()`
     - `start_processing_withdrawal()`
     - `complete_withdrawal()`
     - `cancel_withdrawal_by_admin()`
     - `log_withdrawal_action()`

### Step 2: Deploy Frontend to Vercel

1. **Commit and Push Changes**
   ```bash
   git add .
   git commit -m "feat: Add comprehensive admin withdrawal management system"
   git push origin main
   ```

2. **Vercel Deployment**
   - Vercel will auto-deploy from main branch
   - Monitor deployment at https://vercel.com/dashboard

3. **Environment Variables**
   - Ensure NEXT_PUBLIC_SUPABASE_URL is set
   - Ensure NEXT_PUBLIC_SUPABASE_ANON_KEY is set

### Step 3: Post-Deployment Testing

#### A. Admin Access Test
1. Login as admin user
2. Navigate to Admin Dashboard
3. Verify "Withdrawals" appears in navigation
4. Click on Withdrawals link
5. Verify page loads without errors

#### B. Workflow Tests
1. **Create Test Data**
   - Create test investor if needed
   - Create test withdrawal request

2. **Test Approve Flow**
   - Find pending request
   - Click Approve
   - Modify amount if desired
   - Add admin notes
   - Submit
   - Verify status changes to "approved"

3. **Test Process Flow**
   - Find approved request
   - Click Process
   - Enter processing details
   - Add transaction hash
   - Set settlement date
   - Submit
   - Verify status changes to "processing"

4. **Test Complete Flow**
   - Find processing request
   - Click Complete
   - Update transaction hash if needed
   - Submit
   - Verify status changes to "completed"

5. **Test Reject Flow**
   - Find pending request
   - Click Reject
   - Enter rejection reason
   - Submit
   - Verify status changes to "rejected"

6. **Test Cancel Flow**
   - Find pending or approved request
   - Click Cancel button
   - Enter cancellation reason
   - Submit
   - Verify status changes to "cancelled"

#### C. Details Panel Test
1. Click on any withdrawal request row
2. Verify details panel opens
3. Check "Details" tab shows all information
4. Check "Audit Trail" tab shows history
5. Verify audit entries match actions taken

#### D. Filter and Search Test
1. Test status filter dropdown
2. Test search by investor name
3. Test search by investor email
4. Verify results update correctly

#### E. RLS Tests (Manual)
1. Login as non-admin investor
2. Navigate to /admin/withdrawals (should redirect or show error)
3. Try to access withdrawal_queue via Supabase client (should fail)

### Step 4: Production Deployment

After successful testing on Dev/Staging:

1. **Production Database**
   - Apply same migration to production database
   - Run via Supabase Dashboard SQL Editor

2. **Production Frontend**
   - Merge to production branch
   - Or promote Vercel preview to production

3. **Monitor**
   - Check Vercel Functions logs
   - Check Supabase logs
   - Monitor for any errors

## 🔄 Rollback Plan

If issues occur:

### Database Rollback
```sql
-- Emergency rollback script
DROP FUNCTION IF EXISTS public.ensure_admin() CASCADE;
DROP FUNCTION IF EXISTS public.reject_withdrawal(UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.start_processing_withdrawal(UUID, NUMERIC, TEXT, DATE, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.complete_withdrawal(UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.cancel_withdrawal_by_admin(UUID, TEXT, TEXT) CASCADE;
DROP TABLE IF EXISTS public.withdrawal_audit_logs CASCADE;
DROP TYPE IF EXISTS withdrawal_action CASCADE;

-- Restore original approve_withdrawal function if needed
```

### Frontend Rollback
1. Revert commit in Git
2. Push to trigger new deployment
3. Or use Vercel instant rollback feature

## ✅ Sign-off Checklist

- [ ] Dev environment tested
- [ ] Staging environment tested
- [ ] Admin workflows verified
- [ ] RLS policies verified
- [ ] Audit trail verified
- [ ] Performance acceptable
- [ ] No console errors
- [ ] Mobile responsive
- [ ] Approved for production

## 📊 Success Metrics

- All withdrawal requests visible to admin
- All status transitions working
- Audit trail capturing all actions
- No unauthorized access by non-admins
- Page load time < 2 seconds

## 🐛 Known Issues / Notes

- Supabase CLI migration push having issues - use Dashboard SQL Editor instead
- Ensure all admins are trained on new workflow before go-live
- Consider adding email notifications for status changes (future enhancement)

## 📝 Documentation

- Admin guide created: See README
- RLS test documentation: See tests/withdrawal-rls-tests.js
- API documentation: See migration file comments

---

**Deployment Date:** ___________
**Deployed By:** ___________
**Version:** 1.0.0
