-- Add missing investor roles for all investors
-- This ensures RLS policies work correctly for all investors

INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'investor'::app_role
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'investor'
WHERE ur.id IS NULL
  AND p.is_system_account = false
  AND p.account_type IN ('investor', 'ib')
ON CONFLICT (user_id, role) DO NOTHING;

-- Also add investor role for IB users who might only have 'ib' role
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'investor'::app_role
FROM public.profiles p
INNER JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'ib'
LEFT JOIN public.user_roles ur2 ON ur2.user_id = p.id AND ur2.role = 'investor'
WHERE ur2.id IS NULL
ON CONFLICT (user_id, role) DO NOTHING;