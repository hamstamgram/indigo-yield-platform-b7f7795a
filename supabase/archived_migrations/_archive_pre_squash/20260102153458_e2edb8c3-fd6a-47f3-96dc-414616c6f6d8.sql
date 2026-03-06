-- Fix the assign_admin_role_from_invite trigger function
-- Issue: invite_code is TEXT but was being cast to UUID incorrectly

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
    -- FIX: Remove ::uuid cast - invite_code is TEXT
    SELECT intended_role INTO v_intended_role
    FROM admin_invites
    WHERE invite_code = v_invite_code
      AND LOWER(email) = LOWER(NEW.email)
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
      WHERE invite_code = v_invite_code;
      
      -- Update profile is_admin flag
      UPDATE profiles
      SET is_admin = true
      WHERE id = NEW.id;
      
      RAISE NOTICE 'Admin role % assigned to user %', v_intended_role, NEW.email;
    ELSE
      RAISE NOTICE 'No matching unused invite found for code % and email %', v_invite_code, NEW.email;
    END IF;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block user creation
    RAISE WARNING 'Error in assign_admin_role_from_invite: % %', SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;