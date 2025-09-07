-- Essential Tables Backup for Indigo Yield Platform
-- Run this in Supabase SQL Editor before deployment

-- 1. Backup profiles (most critical)
CREATE TABLE IF NOT EXISTS profiles_backup_20250903 AS 
SELECT * FROM profiles;

-- 2. Backup deposits if exists
CREATE TABLE IF NOT EXISTS deposits_backup_20250903 AS 
SELECT * FROM deposits;

-- 3. Show what was backed up
SELECT 
    'Backup Complete!' as status,
    COUNT(*) as profiles_backed_up 
FROM profiles_backup_20250903;

-- That's it! Your critical data is safe.
