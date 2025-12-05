-- Create migration functions with proper admin check using ensure_admin
-- 1. Create function to migrate positions to new system
CREATE OR REPLACE FUNCTION public.migrate_legacy_positions()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_position RECORD;
  v_investor_id UUID;
  v_fund_id UUID;
  v_portfolio_id UUID;
  v_migrated_count INTEGER := 0;
  v_errors JSONB := '[]'::JSONB;
BEGIN
  -- Only allow admins to run migration
  PERFORM public.ensure_admin();
  
  -- Create default fund if not exists (for migration purposes)
  INSERT INTO public.funds (code, name, asset, fund_class, status)
  VALUES ('LEGACY', 'Legacy Migration Fund', 'MIXED', 'A', 'active')
  ON CONFLICT (code) DO NOTHING;
  
  SELECT id INTO v_fund_id FROM public.funds WHERE code = 'LEGACY';
  
  -- Loop through all positions with balance > 0
  FOR v_position IN 
    SELECT p.*, pr.email, pr.first_name, pr.last_name
    FROM positions p
    JOIN profiles pr ON pr.id = p.user_id
    WHERE p.current_balance > 0
  LOOP
    BEGIN
      -- Find or create investor record
      SELECT id INTO v_investor_id 
      FROM public.investors 
      WHERE profile_id = v_position.user_id;
      
      IF v_investor_id IS NULL THEN
        INSERT INTO public.investors (profile_id, name, email, status)
        VALUES (
          v_position.user_id,
          TRIM(CONCAT(COALESCE(v_position.first_name, ''), ' ', COALESCE(v_position.last_name, ''))),
          v_position.email,
          'active'
        )
        RETURNING id INTO v_investor_id;
      END IF;
      
      -- Create portfolio if doesn't exist
      SELECT id INTO v_portfolio_id
      FROM public.portfolios_v2
      WHERE owner_user_id = v_position.user_id;
      
      IF v_portfolio_id IS NULL THEN
        INSERT INTO public.portfolios_v2 (owner_user_id, name, status, base_currency)
        VALUES (
          v_position.user_id,
          CONCAT(COALESCE(v_position.first_name, 'Investor'), '''s Portfolio'),
          'active',
          'USD'
        )
        RETURNING id INTO v_portfolio_id;
      END IF;
      
      -- Create investor position
      INSERT INTO public.investor_positions (
        investor_id,
        fund_id,
        fund_class,
        shares,
        cost_basis,
        current_value,
        unrealized_pnl,
        realized_pnl
      ) VALUES (
        v_investor_id,
        v_fund_id,
        'A',
        v_position.current_balance,
        v_position.principal,
        v_position.current_balance,
        v_position.total_earned,
        0
      )
      ON CONFLICT (investor_id, fund_id) DO UPDATE SET
        shares = EXCLUDED.shares,
        cost_basis = EXCLUDED.cost_basis,
        current_value = EXCLUDED.current_value,
        unrealized_pnl = EXCLUDED.unrealized_pnl,
        updated_at = now();
      
      -- Create transaction record for the position
      INSERT INTO public.transactions_v2 (
        portfolio_id,
        txn_type,
        asset_id,
        quantity,
        price_usd,
        amount_usd,
        notes,
        external_id,
        created_at
      ) VALUES (
        v_portfolio_id,
        'deposit',
        v_position.asset_code::text,
        v_position.principal,
        1.0,
        v_position.principal,
        'Migrated from legacy position',
        concat('legacy_', v_position.id),
        v_position.updated_at
      );
      
      -- Create yield transaction if there are earnings
      IF v_position.total_earned > 0 THEN
        INSERT INTO public.transactions_v2 (
          portfolio_id,
          txn_type,
          asset_id,
          quantity,
          price_usd,
          amount_usd,
          notes,
          external_id,
          created_at
        ) VALUES (
          v_portfolio_id,
          'interest',
          v_position.asset_code::text,
          v_position.total_earned,
          1.0,
          v_position.total_earned,
          'Migrated yield earnings',
          concat('legacy_yield_', v_position.id),
          v_position.updated_at
        );
      END IF;
      
      v_migrated_count := v_migrated_count + 1;
      
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors || jsonb_build_object(
        'user_id', v_position.user_id,
        'asset_code', v_position.asset_code,
        'error', SQLERRM
      );
    END;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'migrated_positions', v_migrated_count,
    'errors', v_errors,
    'message', 'Legacy position migration completed'
  );
END;
$function$;

-- 2. Update statement generation function
CREATE OR REPLACE FUNCTION public.generate_historical_statements()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_investor RECORD;
  v_year INTEGER;
  v_month INTEGER;
  v_generated_count INTEGER := 0;
  v_errors JSONB := '[]'::JSONB;
BEGIN
  -- Only allow admins
  PERFORM public.ensure_admin();
  
  -- Generate statements for the last 6 months
  FOR v_year IN 2024..2025 LOOP
    FOR v_month IN 
      CASE WHEN v_year = 2024 THEN 7 ELSE 1 END..
      CASE WHEN v_year = 2025 THEN 9 ELSE 12 END
    LOOP
      -- Generate for each investor
      FOR v_investor IN 
        SELECT DISTINCT i.id, i.profile_id
        FROM investors i
        JOIN investor_positions ip ON ip.investor_id = i.id
        WHERE ip.current_value > 0
      LOOP
        BEGIN
          INSERT INTO public.statements (
            user_id,
            period_year,
            period_month,
            generated_at,
            data
          ) VALUES (
            v_investor.profile_id,
            v_year,
            v_month,
            now(),
            generate_statement_data(v_investor.id, v_year, v_month)
          )
          ON CONFLICT (user_id, period_year, period_month) DO NOTHING;
          
          v_generated_count := v_generated_count + 1;
          
        EXCEPTION WHEN OTHERS THEN
          v_errors := v_errors || jsonb_build_object(
            'investor_id', v_investor.id,
            'year', v_year,
            'month', v_month,
            'error', SQLERRM
          );
        END;
      END LOOP;
    END LOOP;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'generated_statements', v_generated_count,
    'errors', v_errors
  );
END;
$function$;

-- 3. Update populate yield sources function
CREATE OR REPLACE FUNCTION public.populate_yield_sources()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_asset_code TEXT;
  v_total_aum NUMERIC(28,10);
  v_position RECORD;
  v_populated_count INTEGER := 0;
BEGIN
  -- Only allow admins
  PERFORM public.ensure_admin();
  
  -- Clear existing yield sources
  DELETE FROM public.yield_sources;
  
  -- Get distinct asset codes from positions
  FOR v_asset_code IN 
    SELECT DISTINCT asset_code::text
    FROM positions 
    WHERE current_balance > 0
  LOOP
    -- Calculate total AUM for this asset
    SELECT COALESCE(SUM(current_balance), 0) 
    INTO v_total_aum
    FROM positions 
    WHERE asset_code = v_asset_code::asset_symbol
    AND current_balance > 0;
    
    -- Insert yield source records for each user position
    FOR v_position IN 
      SELECT user_id, current_balance
      FROM positions 
      WHERE asset_code = v_asset_code::asset_symbol
      AND current_balance > 0
    LOOP
      INSERT INTO public.yield_sources (
        asset_code, 
        user_id, 
        current_balance, 
        percentage_of_aum,
        last_updated
      ) VALUES (
        v_asset_code,
        v_position.user_id,
        v_position.current_balance,
        CASE 
          WHEN v_total_aum > 0 THEN (v_position.current_balance / v_total_aum) * 100
          ELSE 0 
        END,
        now()
      );
      
      v_populated_count := v_populated_count + 1;
    END LOOP;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'populated_records', v_populated_count,
    'assets_processed', (SELECT COUNT(DISTINCT asset_code) FROM positions WHERE current_balance > 0)
  );
END;
$function$;