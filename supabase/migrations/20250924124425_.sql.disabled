-- Create missing yield funds for SOL, USDC, and EURC with correct fund_class values

-- Insert SOL Yield Fund
INSERT INTO public.funds (
  code,
  name,
  asset,
  fund_class,
  status,
  inception_date,
  mgmt_fee_bps,
  perf_fee_bps,
  min_investment,
  strategy
) VALUES (
  'SOL-YIELD',
  'Solana Yield Fund',
  'SOL',
  'SOL',
  'active',
  CURRENT_DATE,
  200, -- 2% management fee
  2000, -- 20% performance fee
  100, -- $100 minimum
  'Solana ecosystem yield generation through staking and DeFi protocols'
);

-- Insert USDC Yield Fund  
INSERT INTO public.funds (
  code,
  name,
  asset,
  fund_class,
  status,
  inception_date,
  mgmt_fee_bps,
  perf_fee_bps,
  min_investment,
  strategy
) VALUES (
  'USDC-YIELD',
  'USD Coin Yield Fund',
  'USDC',
  'USDC',
  'active',
  CURRENT_DATE,
  150, -- 1.5% management fee for stable assets
  1500, -- 15% performance fee for stable assets
  50, -- $50 minimum for stablecoin
  'USD Coin yield generation through lending protocols and liquidity provision'
);

-- Insert EURC Yield Fund
INSERT INTO public.funds (
  code,
  name,
  asset,
  fund_class,
  status,
  inception_date,
  mgmt_fee_bps,
  perf_fee_bps,
  min_investment,
  strategy
) VALUES (
  'EURC-YIELD',
  'Euro Coin Yield Fund',
  'EURC',
  'EURC',
  'active',
  CURRENT_DATE,
  150, -- 1.5% management fee for stable assets
  1500, -- 15% performance fee for stable assets
  50, -- €50 equivalent minimum
  'Euro Coin yield generation through European DeFi protocols and lending'
);;
