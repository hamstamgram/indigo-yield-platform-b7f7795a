-- Migration: Add xAUT and XRP to asset_code enum
-- Date: 2025-12-04
-- Note: This must be in its own migration to avoid "unsafe use of new value" errors in transactions.

-- We use a DO block to safely add values if they don't exist, though standard SQL doesn't support IF NOT EXISTS for enum values easily in all versions.
-- Supabase/Postgres generic way:
ALTER TYPE public.asset_code ADD VALUE IF NOT EXISTS 'xAUT';
ALTER TYPE public.asset_code ADD VALUE IF NOT EXISTS 'XRP';
