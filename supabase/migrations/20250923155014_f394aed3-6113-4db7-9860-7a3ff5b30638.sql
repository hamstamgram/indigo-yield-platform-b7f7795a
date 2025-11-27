-- Fix the temporary migration function with correct column names
CREATE OR REPLACE FUNCTION public.migrate_legacy_positions_temp()
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
      
      -- Create transaction record for the position (deposit)
      INSERT INTO public.transactions_v2 (
        portfolio_id,
        investor_id,
        fund_id,
        tx_date,
        value_date,
        asset,
        amount,
        type,
        balance_before,
        balance_after,
        notes,
        reference_id,
        created_at
      ) VALUES (
        v_portfolio_id,
        v_investor_id,
        v_fund_id,
        CURRENT_DATE,
        CURRENT_DATE,
        v_position.asset_code::text,
        v_position.principal,
        'deposit',
        0,
        v_position.principal,
        'Migrated from legacy position',
        concat('legacy_', v_position.id),
        v_position.updated_at
      );
      
      -- Create yield transaction if there are earnings
      IF v_position.total_earned > 0 THEN
        INSERT INTO public.transactions_v2 (
          portfolio_id,
          investor_id,
          fund_id,
          tx_date,
          value_date,
          asset,
          amount,
          type,
          balance_before,
          balance_after,
          notes,
          reference_id,
          created_at
        ) VALUES (
          v_portfolio_id,
          v_investor_id,
          v_fund_id,
          CURRENT_DATE,
          CURRENT_DATE,
          v_position.asset_code::text,
          v_position.total_earned,
          'interest',
          v_position.principal,
          v_position.current_balance,
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