/**
 * Consolidated Asset Types
 * Single source of truth for all asset-related types across the application.
 *
 * CRITICAL RULE: All assets MUST be displayed in their native currency.
 * NEVER convert to USD or aggregate across different asset types.
 */

// ============================================================================
// Core Asset Types
// ============================================================================

export type AssetKind = "crypto" | "token" | "stablecoin" | "synthetic" | "other";

/**
 * Database Asset entity - represents a row in the assets table
 */
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

/**
 * Simple Asset reference - for dropdowns and selectors
 */
export interface AssetRef {
  id: number;
  symbol: string;
  name: string;
}

/**
 * Asset price data from external sources
 */
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

// ============================================================================
// Asset Configuration (for display purposes)
// ============================================================================

/**
 * Asset display configuration - includes visual elements
 */
export interface AssetConfig {
  symbol: string;
  name: string;
  decimals: number;
  logoUrl?: string;
  color?: string;
}

/**
 * Static asset configuration registry
 * Single source of truth for asset metadata
 */
export const ASSET_CONFIGS: Record<string, AssetConfig> = {
  BTC: {
    symbol: "BTC",
    name: "BTC Yield Fund",
    decimals: 8,
    logoUrl: "https://storage.mlcdn.com/account_image/855106/8Pf2dtBl6QjlVu34Pcqvyr6rUU6MWwYdN9qTrClW.png",
    color: "#F7931A",
  },
  ETH: {
    symbol: "ETH",
    name: "ETH Yield Fund",
    decimals: 8,
    logoUrl: "https://storage.mlcdn.com/account_image/855106/iuulK6xRS80ItnV4gq2VY7voxoWe7AMvPA5roO16.png",
    color: "#627EEA",
  },
  SOL: {
    symbol: "SOL",
    name: "SOL Yield Fund",
    decimals: 6,
    logoUrl: "https://storage.mlcdn.com/account_image/855106/14fmAPi88WAnAwH4XhoObK1J1HwiTSvItLhIRFSQ.png",
    color: "#14F195",
  },
  USDT: {
    symbol: "USDT",
    name: "Stablecoin Fund",
    decimals: 2,
    logoUrl: "https://storage.mlcdn.com/account_image/855106/2p3Y0l5lox8EefjCx7U7Qgfkrb9cxW3L8mGpaORi.png",
    color: "#26A17B",
  },
  USDC: {
    symbol: "USDC",
    name: "USD Coin",
    decimals: 2,
    logoUrl: "https://storage.mlcdn.com/account_image/855106/770YUbYlWXFXPpolUS1wssuUGIeH7zHpt1mQbDah.png",
    color: "#2775CA",
  },
  EURC: {
    symbol: "EURC",
    name: "EURC Yield Fund",
    decimals: 2,
    logoUrl: "https://storage.mlcdn.com/account_image/855106/kwV87oiC7c4dnG6zkl95MnV5yafAxWlFbQgjmaIm.png",
    color: "#0052FF",
  },
  XAUT: {
    symbol: "xAUT",
    name: "Tokenized Gold",
    decimals: 4,
    logoUrl: "https://assets.coingecko.com/coins/images/10481/large/Tether_Gold.png",
    color: "#FFD700",
  },
  xAUT: {
    symbol: "xAUT",
    name: "Tokenized Gold",
    decimals: 4,
    logoUrl: "https://assets.coingecko.com/coins/images/10481/large/Tether_Gold.png",
    color: "#FFD700",
  },
  XRP: {
    symbol: "XRP",
    name: "XRP Yield Fund",
    decimals: 6,
    logoUrl: "https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png",
    color: "#00AAE4",
  },
};

/**
 * Default logo for unknown assets
 */
export const DEFAULT_ASSET_LOGO = "https://ui-avatars.com/api/?name=Asset&background=random";

// ============================================================================
// Asset Helpers
// ============================================================================

/**
 * Get asset configuration by symbol (case-insensitive)
 */
export function getAssetConfig(symbol: string): AssetConfig {
  const normalized = symbol.toUpperCase();
  return (
    ASSET_CONFIGS[normalized] || {
      symbol: symbol.toUpperCase(),
      name: symbol,
      decimals: 4,
    }
  );
}

/**
 * Get asset logo URL
 */
export function getAssetLogo(symbol: string): string {
  const config = getAssetConfig(symbol);
  return (
    config?.logoUrl || `https://ui-avatars.com/api/?name=${symbol}&background=eff6ff&color=1e40af`
  );
}

/**
 * Get asset display name
 */
export function getAssetName(symbol: string): string {
  return getAssetConfig(symbol).name;
}

/**
 * Get decimals for an asset
 */
export function getAssetDecimals(symbol: string): number {
  return getAssetConfig(symbol).decimals;
}

/**
 * Get all supported asset configurations
 */
export function getSupportedAssets(): AssetConfig[] {
  // Return unique assets (exclude xAUT duplicate)
  const seen = new Set<string>();
  return Object.values(ASSET_CONFIGS).filter((asset) => {
    const upper = asset.symbol.toUpperCase();
    if (seen.has(upper)) return false;
    seen.add(upper);
    return true;
  });
}

// ============================================================================
// UI Component Types
// ============================================================================

/**
 * Asset summary for dashboard displays
 */
export interface AssetSummary {
  id: number;
  symbol: string;
  name: string;
  totalBalance: number;
  totalUsers: number;
  avgYield: number;
}

/**
 * Detailed asset summary with yield info (for investor dashboard)
 */
export interface AssetSummaryDetailed {
  symbol: string;
  name: string;
  balance: number;
  principal: number;
  totalEarned: number;
  currentRate: number;
  dailyYield: number;
  totalYield: number;
  yieldPercentage: number;
}

/**
 * Yield source data
 */
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

// ============================================================================
// Form Types
// ============================================================================

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

// ============================================================================
// Validation Types
// ============================================================================

export interface AssetInput {
  symbol: string;
  amount: number | string | null | undefined;
}

export interface AssetValidationResult {
  ok: boolean;
  errors: Record<string, string>;
  parsedAmounts: Record<string, number>;
}
