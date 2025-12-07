# 190 IQ System Unification Plan: "One ID to Rule Them All"

## 🚨 The Core Problem
The platform currently suffers from a **Split Brain Architecture**:
1.  **Auth System (`profiles`)**: Uses `auth.users.id`.
2.  **Business System (`investors`)**: Uses a separate `uuid`.
3.  **Disconnect:** Admin tools edit the *Business ID*, but the Yield Engine and Dashboard look for the *Auth ID*. This causes silent failures in fee updates and yield distribution.

## 🎯 The Solution: Unify on `auth.users.id`
We will deprecate the `investors` table entirely. The `profiles` table (which is natively linked to Supabase Auth) will become the **Single Source of Truth**.

---

## 📅 Phase 1: Database Schema Migration (The Backend Fix)

We will execute a comprehensive SQL migration to transfer all data and relationships to the `profiles` table.

### 1.1 Extend `profiles` Table
We need to move the business fields from `investors` to `profiles`.
```sql
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active','pending','suspended','closed')),
ADD COLUMN IF NOT EXISTS onboarding_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS entity_type TEXT CHECK (entity_type IN ('individual', 'corporate', 'trust', 'foundation')),
ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT 'pending';
```

### 1.2 Data Migration (Sync)
Copy data from `investors` to `profiles` using the email link.
```sql
UPDATE public.profiles p
SET 
    status = i.status,
    onboarding_date = i.onboarding_date,
    entity_type = i.entity_type,
    kyc_status = i.kyc_status
FROM public.investors i
WHERE p.email = i.email;
```

### 1.3 Re-Link Child Tables (The "Brain Transplant")
All tables referencing `investors(id)` must now reference `profiles(id)`.

**Tables to Update:**
*   `investor_positions`
*   `transactions_v2`
*   `investor_monthly_reports`
*   `fee_calculations`
*   `investor_emails`
*   `onboarding_submissions`

**Logic for each table:**
1.  Add `new_investor_id` column (FK to `profiles`).
2.  Populate `new_investor_id` by joining with `investors` table.
3.  Drop old `investor_id`.
4.  Rename `new_investor_id` to `investor_id`.

### 1.4 Drop the Ghost
Once all foreign keys are moved:
```sql
DROP TABLE public.investors CASCADE;
```

---

## 💻 Phase 2: Frontend Refactor (The Code Fix)

We must update the application code to stop looking for the "Ghost Table".

### 2.1 Global Search & Replace
**Target:** `from("investors")`
**Replacement:** `from("profiles")`

### 2.2 Update Types & Interfaces
*   **`Investor` Interface:** Update to match `Profile` structure.
*   **`InvestorSummary`:** Map fields from `profiles` instead of `investors`.

### 2.3 Logic Updates
*   **AdminInvestorsPage.tsx:** Display `profiles` directly.
*   **Fee Management:** Updates `fee_percentage` on `profiles` directly (already correct, just needs UI to fetch from right source).

---

## 🛡️ Operational Safety Check

1.  **Pre-Migration Snapshot:** We have `investor_fund_performance` populated (which ALREADY uses `auth.users.id`). This is our safety net.
2.  **Atomic Execution:** The SQL migration runs in a transaction. If it fails, it rolls back.
3.  **Zero Downtime:** We can keep `investors` table as a "Zombie" (View) for a few days if needed, but a clean cut is cleaner.

## 🚀 Execution Order

1.  **Run SQL Migration** (I will provide the file).
2.  **Apply Code Changes** (I will refactor the key Admin Services).
3.  **Verify**: Check "Admin > Investors" and "Dashboard" to ensure data continuity.
