-- Migration: Add admin functions for investor management
-- Created: 2025-01-09
-- Purpose: Add secure RPC functions for admin to fetch investor data

-- Helper function to detect admin from JWT
create or replace function public.is_admin_for_jwt()
returns boolean
language sql
stable
security definer
as $$
  select exists(
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and coalesce(p.is_admin, false) = true
  );
$$;

-- Grant execute permission to authenticated users
grant execute on function public.is_admin_for_jwt() to authenticated;

-- Function to get all non-admin profiles (for admin investors list)
create or replace function public.get_all_non_admin_profiles()
returns table (
  id uuid,
  email text,
  first_name text,
  last_name text,
  created_at timestamptz,
  updated_at timestamptz,
  is_admin boolean,
  phone text,
  fee_percentage numeric
)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Check if the calling user is an admin
  if not public.is_admin_for_jwt() then
    raise exception 'Access denied: Admin privileges required';
  end if;
  
  -- Return all non-admin profiles
  return query
    select 
      p.id,
      p.email,
      p.first_name,
      p.last_name,
      p.created_at,
      p.updated_at,
      p.is_admin,
      p.phone,
      p.fee_percentage
    from public.profiles p
    where coalesce(p.is_admin, false) = false
    order by p.created_at desc;
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function public.get_all_non_admin_profiles() to authenticated;

-- Function to get a single profile by ID (respects RLS)
create or replace function public.get_profile_by_id(profile_id uuid)
returns table (
  id uuid,
  email text,
  first_name text,
  last_name text,
  created_at timestamptz,
  updated_at timestamptz,
  is_admin boolean,
  phone text,
  fee_percentage numeric
)
language sql
stable
security invoker
as $$
  select 
    p.id,
    p.email,
    p.first_name,
    p.last_name,
    p.created_at,
    p.updated_at,
    p.is_admin,
    p.phone,
    p.fee_percentage
  from public.profiles p
  where p.id = profile_id;
$$;

-- Grant execute permission to authenticated users
grant execute on function public.get_profile_by_id(uuid) to authenticated;

-- Function to get investor portfolio summary
create or replace function public.get_investor_portfolio_summary(investor_id uuid)
returns table (
  total_aum numeric,
  portfolio_count bigint,
  last_statement_date date
)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Check if the calling user is an admin or the investor themselves
  if not public.is_admin_for_jwt() and auth.uid() != investor_id then
    raise exception 'Access denied: Unauthorized access to investor data';
  end if;
  
  return query
    select 
      coalesce(sum(po.current_value), 0) as total_aum,
      count(distinct po.id) as portfolio_count,
      max(s.period_end)::date as last_statement_date
    from public.profiles p
    left join public.portfolios po on po.profile_id = p.id
    left join public.statements s on s.user_id = p.id
    where p.id = investor_id
    group by p.id;
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function public.get_investor_portfolio_summary(uuid) to authenticated;

-- Function to get all investors with portfolio summaries (admin only)
create or replace function public.get_all_investors_with_summary()
returns table (
  id uuid,
  email text,
  first_name text,
  last_name text,
  created_at timestamptz,
  is_admin boolean,
  fee_percentage numeric,
  total_aum numeric,
  portfolio_count bigint,
  last_statement_date date
)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Check if the calling user is an admin
  if not public.is_admin_for_jwt() then
    raise exception 'Access denied: Admin privileges required';
  end if;
  
  return query
    select 
      p.id,
      p.email,
      p.first_name,
      p.last_name,
      p.created_at,
      p.is_admin,
      p.fee_percentage,
      coalesce(sum(po.current_value), 0) as total_aum,
      count(distinct po.id) as portfolio_count,
      max(s.period_end)::date as last_statement_date
    from public.profiles p
    left join public.portfolios po on po.profile_id = p.id
    left join public.statements s on s.user_id = p.id
    where coalesce(p.is_admin, false) = false
    group by p.id, p.email, p.first_name, p.last_name, p.created_at, p.is_admin, p.fee_percentage
    order by p.created_at desc;
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function public.get_all_investors_with_summary() to authenticated;

-- Add comment for documentation
comment on function public.is_admin_for_jwt() is 'Helper function to check if current user is an admin';
comment on function public.get_all_non_admin_profiles() is 'Returns all non-admin profiles (admin only)';
comment on function public.get_profile_by_id(uuid) is 'Returns a single profile by ID (respects RLS)';
comment on function public.get_investor_portfolio_summary(uuid) is 'Returns portfolio summary for a specific investor';
comment on function public.get_all_investors_with_summary() is 'Returns all investors with portfolio summaries (admin only)';
