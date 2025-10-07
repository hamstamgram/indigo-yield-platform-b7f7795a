# Deployment Instructions - Investor Audit System

**Date**: October 7, 2025
**Status**: Ready for deployment

---

## Prerequisites

- Access to Supabase Dashboard (https://supabase.com/dashboard/project/nkfimvovosdehmyyjubn)
- Admin credentials for the database
- Supabase CLI installed (for Edge Function deployment)

---

## Step 1: Deploy Database Migration

**Option A: Via Supabase Dashboard (Recommended)**

1. Go to: https://supabase.com/dashboard/project/nkfimvovosdehmyyjubn/sql/new

2. Copy the entire contents of:
   ```
   supabase/migrations/20251007_investor_audit_system.sql
   ```

3. Paste into the SQL Editor

4. Click "Run" to execute the migration

5. Verify success - you should see:
   - 6 new views created
   - 2 new functions created
   - 2 new tables created (audit_log, idempotency_keys)

**Option B: Via Supabase CLI (if access token is configured)**

```bash
# Set your access token
export SUPABASE_ACCESS_TOKEN="your-access-token-here"

# Link to remote project
supabase link --project-ref nkfimvovosdehmyyjubn

# Push migration
supabase db push
```

To get your access token:
1. Go to: https://supabase.com/dashboard/account/tokens
2. Generate new token
3. Copy and export it

---

## Step 2: Deploy Edge Function

**Deploy the investor-audit Edge Function:**

```bash
# Make sure you're in the project root
cd /Users/mama/Desktop/indigo-yield-platform-v01

# Deploy the function
supabase functions deploy investor-audit --project-ref nkfimvovosdehmyyjubn
```

**If deployment requires authentication:**

```bash
# Login first
supabase login

# Then deploy
supabase functions deploy investor-audit --project-ref nkfimvovosdehmyyjubn
```

---

## Step 3: Verify Deployment

### Test Database Views

Run in Supabase SQL Editor:

```sql
-- Check investor overview
SELECT COUNT(*) FROM investor_audit_overview;

-- Check for any data anomalies
SELECT * FROM data_integrity_anomalies LIMIT 10;

-- Check financial reconciliation
SELECT * FROM financial_reconciliation
WHERE reconciliation_status = 'MISMATCH'
LIMIT 10;

-- Check compliance status
SELECT
    COUNT(*) as total,
    SUM(CASE WHEN kyc_compliance_status = 'COMPLIANT' THEN 1 ELSE 0 END) as kyc_compliant,
    SUM(CASE WHEN activity_status = 'ACTIVE' THEN 1 ELSE 0 END) as active
FROM compliance_status;
```

### Test Edge Function

```bash
# Get an admin auth token first
# Login to your app and get the JWT token from browser dev tools

# Test overview endpoint
curl "https://nkfimvovosdehmyyjubn.supabase.co/functions/v1/investor-audit?report_type=overview" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json"

# Test reconciliation endpoint
curl "https://nkfimvovosdehmyyjubn.supabase.co/functions/v1/investor-audit?report_type=reconciliation" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json"

# Test single investor report
curl "https://nkfimvovosdehmyyjubn.supabase.co/functions/v1/investor-audit?report_type=full_report&investor_id=YOUR_INVESTOR_UUID" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

---

## Step 4: Create Admin Users

The audit system requires users to be in the `admin_users` table. Add admin users:

```sql
-- Add admin users (run in Supabase SQL Editor)
INSERT INTO admin_users (user_id, email, role, permissions)
VALUES
    ('YOUR_USER_UUID', 'admin@indigo-yield.com', 'super_admin',
     '{"view_all_investors": true, "manage_audit": true}'::jsonb)
ON CONFLICT (user_id) DO NOTHING;
```

Replace `YOUR_USER_UUID` with the actual user ID from the `auth.users` table.

---

## Step 5: Dashboard Integration

### Frontend API Calls

```typescript
// src/lib/auditApi.ts
import { supabase } from '@/integrations/supabase/client';

export async function getInvestorAuditOverview() {
  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch(
    'https://nkfimvovosdehmyyjubn.supabase.co/functions/v1/investor-audit?report_type=overview',
    {
      headers: {
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return response.json();
}

export async function getFinancialReconciliation() {
  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch(
    'https://nkfimvovosdehmyyjubn.supabase.co/functions/v1/investor-audit?report_type=reconciliation',
    {
      headers: {
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return response.json();
}

export async function getInvestorFullReport(investorId: string) {
  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch(
    `https://nkfimvovosdehmyyjubn.supabase.co/functions/v1/investor-audit?report_type=full_report&investor_id=${investorId}`,
    {
      headers: {
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return response.json();
}
```

### React Query Hooks

```typescript
// src/hooks/useAuditData.ts
import { useQuery } from '@tanstack/react-query';
import { getInvestorAuditOverview, getFinancialReconciliation } from '@/lib/auditApi';

export function useInvestorAuditOverview() {
  return useQuery({
    queryKey: ['investor-audit-overview'],
    queryFn: getInvestorAuditOverview,
    refetchInterval: 60000, // Refresh every minute
  });
}

export function useFinancialReconciliation() {
  return useQuery({
    queryKey: ['financial-reconciliation'],
    queryFn: getFinancialReconciliation,
    refetchInterval: 60000,
  });
}
```

### Dashboard Component Example

```typescript
// src/pages/AdminAudit.tsx
import { useInvestorAuditOverview } from '@/hooks/useAuditData';

export default function AdminAudit() {
  const { data, isLoading, error } = useInvestorAuditOverview();

  if (isLoading) return <div>Loading audit data...</div>;
  if (error) return <div>Error loading audit data</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Investor Audit Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader>Total Investors</CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data?.data?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>Data Issues</CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {data?.data?.filter(i => i.has_portfolio_issue || i.has_reconciliation_issue).length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>Pending KYC</CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              {data?.data?.filter(i => i.kyc_status === 'pending').length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add table with investor details */}
    </div>
  );
}
```

---

## Troubleshooting

### Migration fails to run

**Error**: "relation already exists"

**Solution**: Views/functions already exist. Drop and recreate:

```sql
-- Drop existing objects
DROP VIEW IF EXISTS investor_audit_overview CASCADE;
DROP VIEW IF EXISTS financial_reconciliation CASCADE;
DROP VIEW IF EXISTS compliance_status CASCADE;
DROP VIEW IF EXISTS data_integrity_anomalies CASCADE;
DROP VIEW IF EXISTS data_integrity_orphans CASCADE;
DROP VIEW IF EXISTS investor_activity_summary CASCADE;
DROP FUNCTION IF EXISTS generate_investor_audit_report CASCADE;
DROP FUNCTION IF EXISTS validate_investor_data CASCADE;

-- Then run the migration again
```

### Edge Function returns 403 Forbidden

**Solution**: Ensure user is in `admin_users` table:

```sql
SELECT * FROM admin_users WHERE user_id = 'YOUR_USER_UUID';
```

If not present, add them as shown in Step 4.

### Edge Function returns 401 Unauthorized

**Solution**: Check that you're passing a valid JWT token:

```javascript
// Get token from session
const { data: { session } } = await supabase.auth.getSession();
console.log('Token:', session?.access_token);
```

### Views return no data

**Solution**: Check that you have data in the underlying tables:

```sql
SELECT COUNT(*) FROM investors;
SELECT COUNT(*) FROM portfolios;
SELECT COUNT(*) FROM transactions;
```

If tables are empty, the views will also be empty.

---

## Monitoring

### Daily Health Check

Run this query daily to check for issues:

```sql
SELECT
    'Anomalies' as check_type,
    COUNT(*) as count
FROM data_integrity_anomalies
UNION ALL
SELECT
    'Reconciliation Mismatches' as check_type,
    COUNT(*) as count
FROM financial_reconciliation
WHERE reconciliation_status = 'MISMATCH'
UNION ALL
SELECT
    'Non-Compliant Investors' as check_type,
    COUNT(*) as count
FROM compliance_status
WHERE kyc_compliance_status != 'COMPLIANT';
```

### Weekly Compliance Report

```sql
SELECT
    activity_status,
    kyc_compliance_status,
    document_compliance_status,
    COUNT(*) as investor_count
FROM compliance_status
GROUP BY activity_status, kyc_compliance_status, document_compliance_status
ORDER BY investor_count DESC;
```

---

## Success Criteria

✅ Migration runs without errors
✅ All 6 views are queryable
✅ Edge Function deploys successfully
✅ API returns data for admin users
✅ API returns 403 for non-admin users
✅ Audit log captures all access
✅ Dashboard displays audit data

---

## Next Steps After Deployment

1. **Set up monitoring alerts** for data anomalies
2. **Schedule weekly compliance reports**
3. **Create admin dashboard** with audit views
4. **Document processes** for resolving reconciliation mismatches
5. **Train team** on using audit system

---

**Deployment Date**: [To be filled]
**Deployed By**: [To be filled]
**Verified By**: [To be filled]

For questions, refer to `INVESTOR_AUDIT_GUIDE.md` for detailed documentation.
