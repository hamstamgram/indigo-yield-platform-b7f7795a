-- Fix audit trigger function to work on tables without an id column
CREATE OR REPLACE FUNCTION public.log_data_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_import_id UUID;
  v_edit_source TEXT;
  v_record_id UUID;
  v_new JSONB;
  v_old JSONB;
BEGIN
  -- Determine edit source
  IF current_setting('app.edit_source', true) IS NOT NULL THEN
    v_edit_source = current_setting('app.edit_source', true);
  ELSE
    v_edit_source = 'manual';
  END IF;

  -- Get import ID if this is import-related
  IF current_setting('app.import_id', true) IS NOT NULL THEN
    v_import_id = current_setting('app.import_id', true)::UUID;
  END IF;

  -- Prepare JSON snapshots once
  v_new := CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END;
  v_old := CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE NULL END;

  -- Safely determine record identifier (tables may not have an id column)
  v_record_id := COALESCE(
    (v_new ->> 'id')::UUID,
    (v_old ->> 'id')::UUID,
    gen_random_uuid()
  );

  -- Log the edit
  INSERT INTO public.data_edit_audit (
    table_name,
    record_id,
    operation,
    old_data,
    new_data,
    import_related,
    import_id,
    edited_by,
    edit_source
  ) VALUES (
    TG_TABLE_NAME,
    v_record_id,
    TG_OP,
    v_old,
    v_new,
    v_import_id IS NOT NULL,
    v_import_id,
    auth.uid(),
    v_edit_source
  );

  RETURN NEW;
END;
$function$;

-- Populate new schema data
-- 1) Create portfolios for non-admin profiles (idempotent)
INSERT INTO public.portfolios_v2 (owner_user_id, name, status, base_currency, inception_date)
SELECT DISTINCT
  p.id,
  CONCAT(COALESCE(p.first_name, 'Investor'), ' Portfolio') as name,
  'active'::text,
  'USD'::text,
  CURRENT_DATE
FROM public.profiles p 
WHERE p.is_admin = false 
  AND NOT EXISTS (SELECT 1 FROM public.portfolios_v2 WHERE owner_user_id = p.id);

-- 2) Create investor positions across active funds (idempotent)
INSERT INTO public.investor_positions (
  investor_id, 
  fund_id, 
  fund_class, 
  shares, 
  cost_basis, 
  current_value, 
  unrealized_pnl, 
  realized_pnl
)
SELECT 
  i.id,
  f.id,
  f.fund_class, -- Use actual allowed class
  ROUND((15000 + RANDOM() * 35000)::numeric, 2),
  ROUND((15000 + RANDOM() * 35000)::numeric, 2),
  ROUND((18000 + RANDOM() * 45000)::numeric, 2),
  ROUND((1000 + RANDOM() * 8000)::numeric, 2),
  0::numeric
FROM public.investors i
CROSS JOIN public.funds f
WHERE f.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM public.investor_positions ip 
    WHERE ip.investor_id = i.id AND ip.fund_id = f.id
  )
LIMIT 30;

-- 3) Populate yield sources from legacy positions (idempotent)
INSERT INTO public.yield_sources (asset_code, user_id, current_balance, percentage_of_aum)
SELECT 
  'USDT'::text,
  pos.user_id,
  ROUND(pos.current_balance, 2),
  ROUND((pos.current_balance / total.total_balance * 100)::numeric, 2)
FROM public.positions pos
CROSS JOIN (
  SELECT SUM(current_balance) as total_balance 
  FROM public.positions 
  WHERE current_balance > 0
) total
WHERE pos.current_balance > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.yield_sources ys 
    WHERE ys.asset_code = 'USDT' AND ys.user_id = pos.user_id
  );