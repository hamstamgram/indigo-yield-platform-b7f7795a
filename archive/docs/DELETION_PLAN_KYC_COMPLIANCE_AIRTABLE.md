# Deletion Plan: KYC, Compliance, and Airtable Removal

> Generated: 2025-12-07
> Status: PENDING APPROVAL
> Impact Level: HIGH - Core system changes

---

## Executive Summary

This plan removes ALL KYC (Know Your Customer), Compliance/AML, and Airtable integrations from the Indigo Yield Platform. The platform will operate as a **simplified investment platform** without regulatory compliance workflows.

**Total Files to Delete:** 15+
**Total Files to Modify:** 20+
**Database Tables to Drop:** 3
**Database Columns to Remove:** 6
**Edge Functions to Archive:** 2

---

## Phase 1: Frontend Deletion

### 1.1 Routes to DELETE (Complete Files)

| File | Purpose | Action |
|------|---------|--------|
| `src/routes/investor/account/KYCVerification.tsx` | KYC document upload UI | DELETE |
| `src/routes/admin/AdminOnboardingPage.tsx` | Airtable sync & onboarding | DELETE |

### 1.2 Components to DELETE

| File | Purpose | Action |
|------|---------|--------|
| Any KYC-specific components in `src/components/` | KYC UI elements | DELETE |

### 1.3 Routes to MODIFY (Remove KYC/Compliance References)

| File | Modifications Needed |
|------|---------------------|
| `src/routes/admin/AdminInvestorsPage.tsx` | Remove kyc_status display, filters, badges |
| `src/routes/admin/AdminSettings.tsx` | Remove compliance settings |
| `src/routes/admin/AdminDashboard.tsx` | Remove KYC/compliance metrics |
| `src/routes/investor/account/SettingsPage.tsx` | Remove KYC status section |

### 1.4 Navigation Updates

| File | Modifications Needed |
|------|---------------------|
| `src/components/layout/DashboardLayout.tsx` | Remove KYC navigation link |
| `src/components/layout/MobileNav.tsx` | Remove KYC navigation item |
| `src/routing/routes/investor/*.tsx` | Remove KYC route definition |
| `src/routing/routes/admin/*.tsx` | Remove Onboarding route definition |

---

## Phase 2: Services & Hooks Deletion

### 2.1 Services to DELETE (Complete Files)

| File | Purpose | Dependencies |
|------|---------|--------------|
| `src/services/airtableService.ts` | Airtable API client | None after deletion |
| `src/services/onboardingService.ts` | Onboarding processing | airtableService |
| `src/services/onboardingSyncService.ts` | Airtable sync orchestration | airtableService |

### 2.2 Services to MODIFY

| File | Modifications Needed |
|------|---------------------|
| `src/services/documentService.ts` | Remove KYC document types/methods |
| `src/services/expertInvestorService.ts` | Remove kycStatus, amlStatus fields |
| `src/services/investorService.ts` | Remove KYC/compliance queries |
| `src/services/investorServiceV2.ts` | Remove KYC/compliance fields |
| `src/services/adminServiceV2.ts` | Remove compliance admin functions |

### 2.3 Hooks to CHECK/MODIFY

| File | Check For |
|------|-----------|
| `src/hooks/useInvestors.ts` | KYC status queries |
| `src/hooks/useInvestorData.ts` | Compliance fields |
| Any `useKYC*.ts` hooks | DELETE entirely |
| Any `useCompliance*.ts` hooks | DELETE entirely |

---

## Phase 3: Type Definitions Update

### 3.1 Types to MODIFY

| File | Fields to Remove |
|------|-----------------|
| `src/types/domains/investor.ts` | `kyc_status`, `aml_status`, `accredited`, `entity_type`, `tax_id` |
| `src/types/domains/document.ts` | KYC-specific document types |

### 3.2 Types to DELETE

| File | Purpose |
|------|---------|
| Any `*Compliance*.ts` types | Compliance-specific types |
| Any `*Onboarding*.ts` types | Airtable onboarding types |

---

## Phase 4: Edge Functions (Supabase)

### 4.1 Edge Functions to ARCHIVE (Move to /archive)

| Function | Purpose | Status |
|----------|---------|--------|
| `supabase/functions/run-compliance-checks/` | KYC/AML/Sanctions checks | ARCHIVE |
| `supabase/functions/sync-airtable/` | Airtable sync | ARCHIVE |

**Note:** Archive instead of delete to preserve code for potential future use.

---

## Phase 5: Database Schema Changes

### 5.1 Tables to DROP

| Table | Purpose | Migration Needed |
|-------|---------|-----------------|
| `onboarding_submissions` | Airtable staging | Yes |
| `compliance_checks` | Compliance results (if exists) | Yes |
| `access_logs` | Security/compliance logging | KEEP for security |

### 5.2 Columns to REMOVE from `investors` Table

```sql
-- Columns to remove:
kyc_status TEXT
kyc_date DATE
aml_status TEXT
accredited BOOLEAN
entity_type TEXT
tax_id TEXT
```

### 5.3 Tables to EVALUATE

| Table | Decision | Reason |
|-------|----------|--------|
| `investor_emails` | KEEP | Useful for multiple contact emails |
| `documents` | KEEP | Still needed for statements, tax docs |
| `audit_log` | KEEP | General audit trail, not just compliance |

### 5.4 Storage Buckets

| Bucket | Action | Reason |
|--------|--------|--------|
| `kyc-documents` | DELETE | No longer needed |
| `documents` | KEEP | For statements, reports |

---

## Phase 6: Package.json Cleanup

### 6.1 Dependencies to REMOVE

```json
{
  "dependencies": {
    "@felores/airtable-mcp-server": "remove",
    "p-limit": "evaluate - may be used elsewhere"
  }
}
```

### 6.2 Environment Variables to REMOVE

```bash
# Remove from .env files and Vercel:
VITE_AIRTABLE_API_KEY
VITE_AIRTABLE_BASE_ID
VITE_AIRTABLE_TABLE_NAME
VITE_AIRTABLE_WEBHOOK_SECRET
```

---

## Phase 7: Database Migration

### 7.1 Migration Script

```sql
-- Migration: Remove KYC/Compliance/Airtable Schema
-- Date: 2025-12-07
-- WARNING: This is a destructive migration

-- ============================================================================
-- STEP 1: Drop onboarding_submissions table
-- ============================================================================
DROP TABLE IF EXISTS public.onboarding_submissions CASCADE;

-- ============================================================================
-- STEP 2: Drop compliance_checks table (if exists)
-- ============================================================================
DROP TABLE IF EXISTS public.compliance_checks CASCADE;

-- ============================================================================
-- STEP 3: Remove KYC/Compliance columns from investors
-- ============================================================================
ALTER TABLE public.investors
  DROP COLUMN IF EXISTS kyc_status,
  DROP COLUMN IF EXISTS kyc_date,
  DROP COLUMN IF EXISTS aml_status,
  DROP COLUMN IF EXISTS accredited,
  DROP COLUMN IF EXISTS entity_type,
  DROP COLUMN IF EXISTS tax_id;

-- ============================================================================
-- STEP 4: Drop KYC storage bucket
-- ============================================================================
-- Run via Supabase Dashboard or API:
-- DELETE FROM storage.buckets WHERE id = 'kyc-documents';
-- DELETE FROM storage.objects WHERE bucket_id = 'kyc-documents';

-- ============================================================================
-- STEP 5: Update RLS policies
-- ============================================================================
-- Remove any policies referencing kyc_status or aml_status

-- ============================================================================
-- STEP 6: Add comment
-- ============================================================================
COMMENT ON TABLE public.investors IS 'Investor accounts - KYC/Compliance removed 2025-12-07';
```

---

## Impact Analysis

### What Changes for Users

| User Type | Before | After |
|-----------|--------|-------|
| **Investors** | Must complete KYC verification | Direct access after registration |
| **Admins** | Review KYC docs, run compliance checks | Simplified investor management |
| **System** | Airtable sync for onboarding | Manual investor creation only |

### Features Removed

1. **KYC Document Upload** - Investors can no longer upload ID documents
2. **KYC Status Tracking** - No pending/approved/rejected workflow
3. **Compliance Checks** - No AML/Sanctions/PEP screening
4. **Airtable Sync** - No external form integration
5. **Onboarding Queue** - No submission review workflow
6. **Risk Scoring** - No investor risk assessment

### Features KEPT

1. **Document Storage** - Statements, tax forms, etc.
2. **Investor Profiles** - Basic investor information
3. **Audit Logging** - General activity tracking
4. **Multi-Email Support** - investor_emails table retained

---

## Execution Order

```
1. BACKUP DATABASE (Critical!)
2. Create git branch: feature/remove-kyc-compliance-airtable
3. Phase 1: Delete frontend files
4. Phase 2: Delete/modify services
5. Phase 3: Update type definitions
6. Phase 4: Archive Edge Functions
7. Phase 5: Update remaining components
8. Phase 6: Run TypeScript type-check, fix errors
9. Phase 7: Apply database migration
10. Phase 8: Regenerate Supabase types
11. Phase 9: Clean up package.json
12. Phase 10: Remove environment variables
13. Phase 11: Full build test
14. Phase 12: Deploy to staging
15. Phase 13: Verify functionality
16. Phase 14: Merge to main
```

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Data loss | HIGH | Full database backup before migration |
| Breaking changes | HIGH | Comprehensive type-check after each phase |
| Orphaned references | MEDIUM | Grep for all kyc/compliance/airtable strings |
| RLS policy issues | MEDIUM | Review all policies before/after |
| User confusion | LOW | Update any user-facing documentation |

---

## Rollback Plan

1. Restore database from backup
2. Revert git branch
3. Redeploy previous version
4. Restore environment variables

---

## Files Reference (Complete List)

### DELETE Entirely
```
src/routes/investor/account/KYCVerification.tsx
src/routes/admin/AdminOnboardingPage.tsx
src/services/airtableService.ts
src/services/onboardingService.ts
src/services/onboardingSyncService.ts
supabase/functions/run-compliance-checks/ (archive)
supabase/functions/sync-airtable/ (archive)
```

### MODIFY (Remove References)
```
src/routes/admin/AdminInvestorsPage.tsx
src/routes/admin/AdminSettings.tsx
src/routes/admin/AdminDashboard.tsx
src/routes/investor/account/SettingsPage.tsx
src/services/documentService.ts
src/services/expertInvestorService.ts
src/services/investorService.ts
src/services/investorServiceV2.ts
src/services/adminServiceV2.ts
src/types/domains/investor.ts
src/types/domains/document.ts
src/components/layout/DashboardLayout.tsx
src/components/layout/MobileNav.tsx
src/routing/routes/*
src/hooks/useInvestors.ts
src/integrations/supabase/types.ts (regenerate)
package.json
```

---

## Approval Required

- [ ] Product Owner approval
- [ ] Database backup confirmed
- [ ] Staging environment ready
- [ ] Rollback plan reviewed

---

*Plan generated with ultrathink analysis*
