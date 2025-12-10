-- ==============================================================================
-- Migration: 20251208_one_id_unification_complete.sql
-- Description: Unifies investor identity.
--              FIXED: Drops dependent views before table mods, then recreates them pointing to 'profiles'.
-- ==============================================================================

DO $$
DECLARE
    t_name TEXT;
    fk_col_name TEXT;
    has_kyc BOOLEAN;
    has_entity BOOLEAN;
BEGIN

    RAISE NOTICE 'Starting "One ID" Unification Migration (Complete)...';

    -- Step 0: Drop Dependent Views (To allow table alterations)
    RAISE NOTICE '0. Dropping dependent views...';
    DROP VIEW IF EXISTS public.v_investor_kpis CASCADE;
    DROP VIEW IF EXISTS public.v_live_investor_balances CASCADE;

    -- Step 1: Pre-flight Cleanup & Extension
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_status_check;
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_entity_type_check;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='status') THEN
        ALTER TABLE public.profiles ADD COLUMN status TEXT DEFAULT 'active';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='onboarding_date') THEN
        ALTER TABLE public.profiles ADD COLUMN onboarding_date DATE DEFAULT CURRENT_DATE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='entity_type') THEN
        ALTER TABLE public.profiles ADD COLUMN entity_type TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='kyc_status') THEN
        ALTER TABLE public.profiles ADD COLUMN kyc_status TEXT DEFAULT 'pending';
    END IF;

    -- Step 1.5: Sanitize Data
    UPDATE public.profiles SET status = 'pending' WHERE status NOT IN ('active', 'pending', 'suspended', 'closed', 'archived') OR status IS NULL;
    UPDATE public.profiles SET entity_type = 'individual' WHERE entity_type NOT IN ('individual', 'corporate', 'trust', 'foundation') AND entity_type IS NOT NULL;
    UPDATE public.profiles SET kyc_status = 'pending' WHERE kyc_status NOT IN ('pending', 'approved', 'rejected', 'expired') OR kyc_status IS NULL;

    -- Apply Constraints
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_status_check CHECK (status IN ('active', 'pending', 'suspended', 'closed', 'archived'));
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_entity_type_check CHECK (entity_type IN ('individual', 'corporate', 'trust', 'foundation'));

    -- Step 2: Migrate Data from Investors -> Profiles
    RAISE NOTICE '2. Migrating data...';
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='investors' AND column_name='kyc_status') INTO has_kyc;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='investors' AND column_name='entity_type') INTO has_entity;

    IF has_kyc AND has_entity THEN
        UPDATE public.profiles p
        SET 
            status = CASE WHEN i.status IN ('active', 'pending', 'suspended', 'closed', 'archived') THEN i.status ELSE 'active' END,
            onboarding_date = i.onboarding_date,
            entity_type = CASE WHEN i.entity_type IN ('individual', 'corporate', 'trust', 'foundation') THEN i.entity_type ELSE 'individual' END,
            kyc_status = CASE WHEN i.kyc_status IN ('pending', 'approved', 'rejected', 'expired') THEN i.kyc_status ELSE 'pending' END,
            updated_at = NOW()
        FROM public.investors i
        WHERE (p.email = i.email OR p.id = i.profile_id);
    ELSE
        UPDATE public.profiles p
        SET 
            status = CASE WHEN i.status IN ('active', 'pending', 'suspended', 'closed', 'archived') THEN i.status ELSE 'active' END,
            onboarding_date = i.onboarding_date,
            updated_at = NOW()
        FROM public.investors i
        WHERE (p.email = i.email OR p.id = i.profile_id);
    END IF;

    -- Step 3: Relink Child Tables
    -- We explicitly handle known tables to avoid dynamic SQL failure on views
    
    -- 3.1 Transactions V2
    RAISE NOTICE '3.1 Relinking transactions_v2...';
    ALTER TABLE public.transactions_v2 ADD COLUMN IF NOT EXISTS temp_profile_id UUID;
    UPDATE public.transactions_v2 tx 
    SET temp_profile_id = i.profile_id 
    FROM public.investors i 
    WHERE tx.investor_id = i.id AND i.profile_id IS NOT NULL;
    
    -- Clean up orphans (transactions with no investor link) - or delete them? 
    -- For safety, we keep them but they might fail constraint if we enforce NOT NULL immediately.
    -- We will DELETE orphans to ensure integrity.
    DELETE FROM public.transactions_v2 WHERE temp_profile_id IS NULL;

    -- Drop Old, Rename New
    -- Drop FK first by name if possible, or just drop column CASCADE (safe now as views are gone)
    ALTER TABLE public.transactions_v2 DROP COLUMN investor_id CASCADE; 
    ALTER TABLE public.transactions_v2 RENAME COLUMN temp_profile_id TO investor_id;
    ALTER TABLE public.transactions_v2 ADD CONSTRAINT fk_transactions_v2_profile FOREIGN KEY (investor_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

    -- 3.2 Investor Positions
    RAISE NOTICE '3.2 Relinking investor_positions...';
    ALTER TABLE public.investor_positions ADD COLUMN IF NOT EXISTS temp_profile_id UUID;
    UPDATE public.investor_positions ip SET temp_profile_id = i.profile_id FROM public.investors i WHERE ip.investor_id = i.id AND i.profile_id IS NOT NULL;
    DELETE FROM public.investor_positions WHERE temp_profile_id IS NULL;
    ALTER TABLE public.investor_positions DROP COLUMN investor_id CASCADE;
    ALTER TABLE public.investor_positions RENAME COLUMN temp_profile_id TO investor_id;
    ALTER TABLE public.investor_positions ADD CONSTRAINT fk_investor_positions_profile FOREIGN KEY (investor_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

    -- 3.3 Withdrawal Requests
    RAISE NOTICE '3.3 Relinking withdrawal_requests...';
    ALTER TABLE public.withdrawal_requests ADD COLUMN IF NOT EXISTS temp_profile_id UUID;
    UPDATE public.withdrawal_requests wr SET temp_profile_id = i.profile_id FROM public.investors i WHERE wr.investor_id = i.id AND i.profile_id IS NOT NULL;
    DELETE FROM public.withdrawal_requests WHERE temp_profile_id IS NULL;
    ALTER TABLE public.withdrawal_requests DROP COLUMN investor_id CASCADE;
    ALTER TABLE public.withdrawal_requests RENAME COLUMN temp_profile_id TO investor_id;
    ALTER TABLE public.withdrawal_requests ADD CONSTRAINT fk_withdrawal_requests_profile FOREIGN KEY (investor_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

    -- 3.4 Investor Emails
    RAISE NOTICE '3.4 Relinking investor_emails...';
    ALTER TABLE public.investor_emails ADD COLUMN IF NOT EXISTS temp_profile_id UUID;
    UPDATE public.investor_emails ie SET temp_profile_id = i.profile_id FROM public.investors i WHERE ie.investor_id = i.id AND i.profile_id IS NOT NULL;
    DELETE FROM public.investor_emails WHERE temp_profile_id IS NULL;
    ALTER TABLE public.investor_emails DROP COLUMN investor_id CASCADE;
    ALTER TABLE public.investor_emails RENAME COLUMN temp_profile_id TO investor_id;
    ALTER TABLE public.investor_emails ADD CONSTRAINT fk_investor_emails_profile FOREIGN KEY (investor_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

    -- Step 4: Drop the public.investors table
    RAISE NOTICE '4. Dropping public.investors table...';
    DROP TABLE IF EXISTS public.investors CASCADE;

    RAISE NOTICE 'Migration "One ID" Unification Complete.';

END $$;

-- Step 5: Recreate Views (Outside DO block)

-- 5.1 Recreate v_investor_kpis (Pointing to profiles)
CREATE OR REPLACE VIEW public.v_investor_kpis AS
SELECT 
  p.id AS investor_id,
  concat(p.first_name, ' ', p.last_name) AS name,
  p.email,
  p.status,
  p.kyc_status,
  COUNT(DISTINCT ip.fund_id) AS funds_invested,
  SUM(ip.current_value) AS total_value,
  SUM(ip.cost_basis) AS total_invested,
  SUM(ip.unrealized_pnl) AS total_unrealized_pnl,
  SUM(ip.realized_pnl) AS total_realized_pnl,
  SUM(ip.mgmt_fees_paid) AS total_mgmt_fees,
  SUM(ip.perf_fees_paid) AS total_perf_fees,
  MIN(t.tx_date) AS first_investment_date,
  MAX(t.tx_date) AS last_activity_date
FROM public.profiles p
LEFT JOIN public.investor_positions ip ON p.id = ip.investor_id
LEFT JOIN public.transactions_v2 t ON p.id = t.investor_id
WHERE p.is_admin = false
GROUP BY p.id, p.first_name, p.last_name, p.email, p.status, p.kyc_status;

-- 5.2 Recreate v_live_investor_balances
CREATE OR REPLACE VIEW public.v_live_investor_balances AS
WITH latest_report AS (
    SELECT DISTINCT ON (user_id, fund_name)
        user_id,
        fund_name,
        mtd_ending_balance as last_reported_balance,
        period.period_end_date as report_date
    FROM public.investor_fund_performance perf
    JOIN public.statement_periods period ON perf.period_id = period.id
    ORDER BY user_id, fund_name, period.period_end_date DESC
),
recent_txs AS (
    SELECT 
        investor_id,
        asset::text as fund_name,
        SUM(CASE WHEN type = 'DEPOSIT' THEN amount ELSE 0 END) as deposits,
        SUM(CASE WHEN type = 'WITHDRAWAL' THEN amount ELSE 0 END) as withdrawals
    FROM public.transactions_v2
    GROUP BY investor_id, asset
)
SELECT 
    lr.user_id,
    lr.fund_name,
    lr.last_reported_balance,
    COALESCE(rt.deposits, 0) as recent_deposits,
    COALESCE(rt.withdrawals, 0) as recent_withdrawals,
    (lr.last_reported_balance + COALESCE(rt.deposits, 0) - COALESCE(rt.withdrawals, 0)) as live_balance
FROM latest_report lr
LEFT JOIN recent_txs rt ON lr.user_id = rt.investor_id AND lr.fund_name = rt.fund_name;
