-- Migration: Add Thomas Puech as test investor
-- Created: 2025-01-09
-- Purpose: Add test investor data for development and testing
-- Note: This is for development only - should not be applied to production

-- First, check if Thomas Puech already exists
DO $$
DECLARE
  thomas_id uuid;
BEGIN
  -- Check if Thomas Puech already exists
  SELECT id INTO thomas_id
  FROM profiles
  WHERE email = 'thomas.puech@example.com';
  
  -- If not found, create the profile
  IF thomas_id IS NULL THEN
    -- Generate a new UUID for Thomas
    thomas_id := gen_random_uuid();
    
    -- Insert Thomas Puech as a non-admin investor
    INSERT INTO profiles (
      id,
      email,
      first_name,
      last_name,
      is_admin,
      fee_percentage,
      created_at,
      updated_at
    ) VALUES (
      thomas_id,
      'thomas.puech@example.com',
      'Thomas',
      'Puech',
      false,
      2.0,
      NOW() - INTERVAL '30 days',
      NOW()
    );
    
    -- Add portfolios for Thomas Puech
    INSERT INTO portfolios (
      id,
      profile_id,
      asset_symbol,
      current_value,
      created_at,
      updated_at
    ) VALUES 
    (
      gen_random_uuid(),
      thomas_id,
      'BTC',
      50000.00,
      NOW() - INTERVAL '30 days',
      NOW()
    ),
    (
      gen_random_uuid(),
      thomas_id,
      'ETH',
      25000.00,
      NOW() - INTERVAL '25 days',
      NOW()
    ),
    (
      gen_random_uuid(),
      thomas_id,
      'USDC',
      100000.00,
      NOW() - INTERVAL '20 days',
      NOW()
    );
    
    -- Add some sample transactions for Thomas
    INSERT INTO transactions (
      id,
      user_id,
      type,
      asset_symbol,
      amount,
      status,
      created_at
    ) VALUES
    (
      gen_random_uuid(),
      thomas_id,
      'deposit',
      'BTC',
      50000.00,
      'completed',
      NOW() - INTERVAL '30 days'
    ),
    (
      gen_random_uuid(),
      thomas_id,
      'deposit',
      'ETH',
      25000.00,
      'completed',
      NOW() - INTERVAL '25 days'
    ),
    (
      gen_random_uuid(),
      thomas_id,
      'deposit',
      'USDC',
      100000.00,
      'completed',
      NOW() - INTERVAL '20 days'
    ),
    (
      gen_random_uuid(),
      thomas_id,
      'interest',
      'BTC',
      354.17,
      'completed',
      NOW() - INTERVAL '1 day'
    ),
    (
      gen_random_uuid(),
      thomas_id,
      'interest',
      'ETH',
      108.33,
      'completed',
      NOW() - INTERVAL '1 day'
    ),
    (
      gen_random_uuid(),
      thomas_id,
      'interest',
      'USDC',
      600.00,
      'completed',
      NOW() - INTERVAL '1 day'
    );
    
    RAISE NOTICE 'Thomas Puech added successfully with ID: %', thomas_id;
  ELSE
    RAISE NOTICE 'Thomas Puech already exists with ID: %', thomas_id;
  END IF;
END $$;

-- Add a few more test investors if needed
INSERT INTO profiles (
  id,
  email,
  first_name,
  last_name,
  is_admin,
  fee_percentage,
  created_at,
  updated_at
) VALUES 
(
  gen_random_uuid(),
  'marie.dubois@example.com',
  'Marie',
  'Dubois',
  false,
  1.5,
  NOW() - INTERVAL '45 days',
  NOW()
),
(
  gen_random_uuid(),
  'jean.martin@example.com',
  'Jean',
  'Martin',
  false,
  2.0,
  NOW() - INTERVAL '60 days',
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- Add portfolios for other test investors
DO $$
DECLARE
  marie_id uuid;
  jean_id uuid;
BEGIN
  SELECT id INTO marie_id FROM profiles WHERE email = 'marie.dubois@example.com';
  SELECT id INTO jean_id FROM profiles WHERE email = 'jean.martin@example.com';
  
  IF marie_id IS NOT NULL THEN
    INSERT INTO portfolios (id, profile_id, asset_symbol, current_value, created_at, updated_at)
    VALUES 
    (gen_random_uuid(), marie_id, 'ETH', 75000.00, NOW() - INTERVAL '45 days', NOW()),
    (gen_random_uuid(), marie_id, 'USDC', 50000.00, NOW() - INTERVAL '40 days', NOW())
    ON CONFLICT DO NOTHING;
  END IF;
  
  IF jean_id IS NOT NULL THEN
    INSERT INTO portfolios (id, profile_id, asset_symbol, current_value, created_at, updated_at)
    VALUES 
    (gen_random_uuid(), jean_id, 'BTC', 100000.00, NOW() - INTERVAL '60 days', NOW()),
    (gen_random_uuid(), jean_id, 'SOL', 30000.00, NOW() - INTERVAL '55 days', NOW())
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
