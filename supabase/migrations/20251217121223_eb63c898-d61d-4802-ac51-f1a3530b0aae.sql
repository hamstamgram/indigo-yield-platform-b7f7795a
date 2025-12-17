-- Set hammadou@indigo.fund as admin
UPDATE public.profiles 
SET is_admin = true, updated_at = now()
WHERE email = 'hammadou@indigo.fund';