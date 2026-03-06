-- Security hardening: ensure SECURITY DEFINER function has explicit search_path.

CREATE OR REPLACE FUNCTION public.sync_profile_role_from_roles()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  target_id uuid;
begin
  target_id := coalesce(new.user_id, old.user_id);
  update public.profiles p
  set role = public.compute_profile_role(p.id, p.account_type, p.is_admin)
  where p.id = target_id;
  return null;
end;
$function$;
