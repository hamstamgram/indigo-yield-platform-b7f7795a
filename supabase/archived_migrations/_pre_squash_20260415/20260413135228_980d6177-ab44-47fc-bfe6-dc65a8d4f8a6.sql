INSERT INTO public.user_roles (user_id, role)
VALUES ('e438bfff-44bc-48ab-a472-6abe89ee8f82', 'admin'::public.app_role)
ON CONFLICT (user_id, role) DO NOTHING;