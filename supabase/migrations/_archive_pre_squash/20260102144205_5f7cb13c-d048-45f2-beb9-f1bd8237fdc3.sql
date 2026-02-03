-- ============================================================
-- Admin Invite Role Assignment Trigger
-- Automatically assigns admin role when user signs up via invite
-- ============================================================

-- Function to assign admin role from invite metadata
CREATE OR REPLACE FUNCTION public.assign_admin_role_from_invite()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite_code TEXT;
  v_intended_role TEXT;
BEGIN
  -- Check if user was created via admin invite (has invite_code in metadata)
  v_invite_code := NEW.raw_user_meta_data->>'invite_code';
  
  IF v_invite_code IS NOT NULL THEN
    RAISE NOTICE 'Processing admin invite for user % with invite_code %', NEW.email, v_invite_code;
    
    -- Get the intended role from admin_invites
    SELECT intended_role INTO v_intended_role
    FROM admin_invites
    WHERE invite_code = v_invite_code::uuid
      AND email = NEW.email
      AND (used = false OR used IS NULL);
    
    IF v_intended_role IS NOT NULL THEN
      RAISE NOTICE 'Found matching invite with role: %', v_intended_role;
      
      -- Insert role (admin or super_admin)
      INSERT INTO user_roles (user_id, role)
      VALUES (NEW.id, v_intended_role::app_role)
      ON CONFLICT (user_id, role) DO NOTHING;
      
      -- Mark invite as used
      UPDATE admin_invites
      SET used = true
      WHERE invite_code = v_invite_code::uuid;
      
      -- Update profile is_admin flag (profile should exist from handle_new_user trigger)
      -- Use a slight delay approach by doing this in a separate statement
      UPDATE profiles
      SET is_admin = true
      WHERE id = NEW.id;
      
      RAISE NOTICE 'Admin role % assigned to user %', v_intended_role, NEW.email;
    ELSE
      RAISE NOTICE 'No matching unused invite found for code % and email %', v_invite_code, NEW.email;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created_assign_admin_role ON auth.users;

-- Create trigger that runs AFTER the profile creation trigger
-- Using a higher name alphabetically to ensure it runs after handle_new_user
CREATE TRIGGER on_auth_user_created_assign_admin_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_admin_role_from_invite();