-- Delete orphaned user_roles record (user no longer exists in profiles)
DELETE FROM user_roles WHERE user_id = 'a16a7e50-fefd-4bfe-897c-d16279b457c2';

-- Create view to detect future orphaned user_roles
CREATE OR REPLACE VIEW v_orphaned_user_roles AS
SELECT ur.* FROM user_roles ur
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = ur.user_id);