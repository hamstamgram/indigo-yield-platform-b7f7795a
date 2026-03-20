-- Manually sync profiles from auth.users
BEGIN;

INSERT INTO public.profiles (id, email, first_name, last_name)
SELECT 
    id, 
    email, 
    raw_user_meta_data->>'first_name', 
    raw_user_meta_data->>'last_name'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Also sync emails if they changed in auth but not in profiles
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email != u.email;

COMMIT;
