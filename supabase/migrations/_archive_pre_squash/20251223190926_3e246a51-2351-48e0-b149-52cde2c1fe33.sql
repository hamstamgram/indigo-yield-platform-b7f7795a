
-- PART 3: Consolidate duplicate RLS policies
DROP POLICY IF EXISTS "Admins can manage invites" ON investor_invites;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own_consolidated" ON profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own_consolidated" ON profiles;
DROP POLICY IF EXISTS "Admins can read all roles" ON user_roles;
DROP POLICY IF EXISTS "Users can read own roles" ON user_roles;
DROP POLICY IF EXISTS "user_roles_select_own_consolidated" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage transactions" ON transactions_v2;
DROP POLICY IF EXISTS "transactions_v2_admin_delete" ON transactions_v2;
DROP POLICY IF EXISTS "transactions_v2_admin_insert" ON transactions_v2;
DROP POLICY IF EXISTS "transactions_v2_admin_update" ON transactions_v2;
DROP POLICY IF EXISTS "transactions_v2_select" ON transactions_v2;
DROP POLICY IF EXISTS "Admins can manage withdrawal requests" ON withdrawal_requests;
DROP POLICY IF EXISTS "withdrawal_requests_insert_own" ON withdrawal_requests;
DROP POLICY IF EXISTS "withdrawal_requests_select_own_consolidated" ON withdrawal_requests
