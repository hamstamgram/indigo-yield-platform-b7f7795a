
-- Set admin flag on profile
UPDATE public.profiles
SET is_admin = true, status = 'active'
WHERE email = 'adriel@indigo.fund';

-- Grant admin role via user_roles table
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM public.profiles
WHERE email = 'adriel@indigo.fund'
ON CONFLICT (user_id, role) DO NOTHING;
