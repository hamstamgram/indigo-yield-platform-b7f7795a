-- Migration: Migrate Legacy Positions to New Investor Structure
-- Date: 2025-11-27

-- NOTE: Re-runnable: seed inserts are idempotent, migration uses upsert.

BEGIN;

-- 1. Ensure Funds Exist for all Assets (Seed if missing)
-- This ensures we can link every legacy position to a fund
INSERT INTO funds (name, code, asset_symbol, asset, fund_class, status)
VALUES
    ('Bitcoin Fund', 'BTC-YIELD', 'BTC', 'BTC', 'BTC', 'active'),
    ('Ethereum Fund', 'ETH-YIELD', 'ETH', 'ETH', 'ETH', 'active'),
    ('Solana Fund', 'SOL-YIELD', 'SOL', 'SOL', 'SOL', 'active'),
    ('Tether Fund', 'USDT-YIELD', 'USDT', 'USDT', 'USDT', 'active'),
    ('USDC Fund', 'USDC-YIELD', 'USDC', 'USDC', 'USDC', 'active'),
    ('Euro Coin Fund', 'EURC-YIELD', 'EURC', 'EURC', 'EURC', 'active')
ON CONFLICT (code) DO NOTHING;

-- 2. Migrate Data from 'positions' (Legacy) to 'investor_positions' (New)
DO $$
DECLARE
    r record;
    v_investor_id uuid;
    v_fund_id uuid;
    v_fund_class text;
    v_migrated_count int := 0;
BEGIN
    RAISE NOTICE 'Starting migration of positions...';

    FOR r IN SELECT * FROM positions WHERE current_balance > 0 LOOP
        
        -- A. Resolve Investor
        -- positions.user_id is the auth.uid. 
        -- We need the investor_id from the 'investors' table where investors.profile_id = auth.uid
        SELECT id INTO v_investor_id 
        FROM investors 
        WHERE profile_id = r.user_id;

        -- B. Resolve Fund
        SELECT id, fund_class INTO v_fund_id, v_fund_class 
        FROM funds 
        WHERE asset_symbol = r.asset_code::text 
        LIMIT 1;

        -- C. Insert Record if valid
        IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
            
            INSERT INTO investor_positions (
                investor_id,
                fund_id,
                shares,
                cost_basis,
                current_value,
                realized_pnl,
                fund_class,
                updated_at
            ) VALUES (
                v_investor_id,
                v_fund_id,
                r.current_balance, -- Shares match the asset balance 1:1
                r.principal,
                r.current_balance, -- Initial value matches balance (assuming 1.0 NAV baseline)
                r.total_earned,
                v_fund_class,
                now()
            )
            ON CONFLICT (investor_id, fund_id) 
            DO UPDATE SET
                shares = EXCLUDED.shares,
                cost_basis = EXCLUDED.cost_basis,
                current_value = EXCLUDED.current_value,
                realized_pnl = EXCLUDED.realized_pnl,
                fund_class = EXCLUDED.fund_class,
                updated_at = now();
                
            v_migrated_count := v_migrated_count + 1;
        ELSE
            RAISE NOTICE 'Skipping position for user % asset % (Investor or Fund not found)', r.user_id, r.asset_code;
        END IF;
    END LOOP;

    RAISE NOTICE 'Migration complete. Migrated % positions.', v_migrated_count;
END $$;

COMMIT;
