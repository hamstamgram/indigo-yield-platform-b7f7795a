-- Migration: Add missing profile fields and related tables
-- This migration adds fields referenced by PersonalInfo, Preferences, KYCVerification, 
-- Referrals, and LinkedAccounts pages

-- ========================================
-- 1. ADD MISSING FIELDS TO PROFILES TABLE
-- ========================================

-- Add personal information fields
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS postal_code TEXT,
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'US';

-- Add referral program field
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- Add KYC verification fields
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT 'not_started',
ADD COLUMN IF NOT EXISTS kyc_verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS kyc_rejection_reason TEXT;

-- Create index for referral code lookups
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);

-- ========================================
-- 2. CREATE USER_PREFERENCES TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Email notification preferences
  email_notifications BOOLEAN DEFAULT true,
  email_transactions BOOLEAN DEFAULT true,
  email_statements BOOLEAN DEFAULT true,
  email_marketing BOOLEAN DEFAULT false,
  
  -- Push notification preferences
  push_notifications BOOLEAN DEFAULT true,
  push_transactions BOOLEAN DEFAULT true,
  push_price_alerts BOOLEAN DEFAULT false,
  
  -- Localization preferences
  language TEXT DEFAULT 'en',
  timezone TEXT DEFAULT 'America/New_York',
  date_format TEXT DEFAULT 'MM/DD/YYYY',
  currency_display TEXT DEFAULT 'USD',
  
  -- Display preferences
  theme TEXT DEFAULT 'system',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  PRIMARY KEY (user_id)
);

-- Enable RLS on user_preferences
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Users can view their own preferences
CREATE POLICY "Users can view own preferences"
  ON public.user_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own preferences
CREATE POLICY "Users can insert own preferences"
  ON public.user_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update own preferences"
  ON public.user_preferences
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all preferences
CREATE POLICY "Admins can view all preferences"
  ON public.user_preferences
  FOR SELECT
  USING (is_admin_v2());

-- ========================================
-- 3. CREATE BANK_ACCOUNTS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Account details
  account_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_type TEXT NOT NULL, -- 'checking', 'savings', etc.
  routing_number TEXT,
  
  -- Verification status
  is_verified BOOLEAN DEFAULT false,
  is_primary BOOLEAN DEFAULT false,
  verification_date TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on bank_accounts
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

-- Users can view their own bank accounts
CREATE POLICY "Users can view own bank accounts"
  ON public.bank_accounts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own bank accounts
CREATE POLICY "Users can insert own bank accounts"
  ON public.bank_accounts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own bank accounts
CREATE POLICY "Users can update own bank accounts"
  ON public.bank_accounts
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own bank accounts
CREATE POLICY "Users can delete own bank accounts"
  ON public.bank_accounts
  FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can manage all bank accounts
CREATE POLICY "Admins can manage all bank accounts"
  ON public.bank_accounts
  FOR ALL
  USING (is_admin_v2())
  WITH CHECK (is_admin_v2());

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_id ON public.bank_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_is_primary ON public.bank_accounts(user_id, is_primary);

-- ========================================
-- 4. CREATE CRYPTO_WALLETS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS public.crypto_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Wallet details
  wallet_address TEXT NOT NULL,
  network TEXT NOT NULL, -- 'ethereum', 'bitcoin', 'polygon', etc.
  label TEXT NOT NULL,
  
  -- Verification status
  is_verified BOOLEAN DEFAULT false,
  verification_date TIMESTAMP WITH TIME ZONE,
  verification_signature TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Ensure unique wallet addresses per user
  UNIQUE(user_id, wallet_address, network)
);

-- Enable RLS on crypto_wallets
ALTER TABLE public.crypto_wallets ENABLE ROW LEVEL SECURITY;

-- Users can view their own wallets
CREATE POLICY "Users can view own wallets"
  ON public.crypto_wallets
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own wallets
CREATE POLICY "Users can insert own wallets"
  ON public.crypto_wallets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own wallets
CREATE POLICY "Users can update own wallets"
  ON public.crypto_wallets
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own wallets
CREATE POLICY "Users can delete own wallets"
  ON public.crypto_wallets
  FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can manage all wallets
CREATE POLICY "Admins can manage all wallets"
  ON public.crypto_wallets
  FOR ALL
  USING (is_admin_v2())
  WITH CHECK (is_admin_v2());

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_crypto_wallets_user_id ON public.crypto_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_crypto_wallets_address ON public.crypto_wallets(wallet_address);

-- ========================================
-- 5. CREATE TRIGGER FOR UPDATED_AT FIELDS
-- ========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for user_preferences
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Triggers for bank_accounts
CREATE TRIGGER update_bank_accounts_updated_at
  BEFORE UPDATE ON public.bank_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Triggers for crypto_wallets
CREATE TRIGGER update_crypto_wallets_updated_at
  BEFORE UPDATE ON public.crypto_wallets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();