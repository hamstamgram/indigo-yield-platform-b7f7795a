export type AssetKind = "crypto" | "token" | "stablecoin" | "synthetic" | "other";

export interface Asset {
  asset_id: string;
  symbol: string;
  name: string;
  kind: AssetKind;
  chain?: string;
  decimals: number;
  is_active: boolean;
  price_source: string;
  coingecko_id?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface AssetPrice {
  asset_id: string;
  price_usd: number;
  as_of: string;
  high_24h?: number;
  low_24h?: number;
  volume_24h?: number;
  market_cap?: number;
  source: string;
  created_at: string;
}

export interface AssetFormData {
  asset_id: string;
  symbol: string;
  name: string;
  kind: AssetKind;
  chain?: string;
  decimals: number;
  is_active: boolean;
  price_source: string;
  coingecko_id?: string;
  metadata?: Record<string, any>;
}

export interface AssetPriceFormData {
  asset_id: string;
  price_usd: number;
  high_24h?: number;
  low_24h?: number;
  volume_24h?: number;
  market_cap?: number;
  source: string;
}

// UI component types (consolidated from models/assetTypes.ts)
export interface AssetSummary {
  id: number;
  symbol: string;
  name: string;
  totalBalance: number;
  totalUsers: number;
  avgYield: number;
}

export interface YieldSource {
  id: string;
  name: string;
  btcYield: number;
  ethYield: number;
  solYield: number;
  usdtYield: number;
  eurcYield: number;
  xautYield: number;
  xrpYield: number;
}
