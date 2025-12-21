-- Add super_admin role to testadmin@indigo.fund
INSERT INTO public.user_roles (user_id, role)
VALUES ('55586442-641c-4d9e-939a-85f09b816073', 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;