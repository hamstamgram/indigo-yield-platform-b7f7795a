/**
 * Asset Management Utilities
 * Centralized source of truth for asset metadata (logos, names, symbols)
 */

export interface AssetConfig {
  symbol: string;
  name: string;
  logoUrl: string;
  color?: string;
  decimals: number;
}

export const ASSETS: Record<string, AssetConfig> = {
  BTC: {
    symbol: "BTC",
    name: "Bitcoin",
    logoUrl: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png",
    color: "#F7931A",
    decimals: 8,
  },
  ETH: {
    symbol: "ETH",
    name: "Ethereum",
    logoUrl: "https://assets.coingecko.com/coins/images/279/large/ethereum.png",
    color: "#627EEA",
    decimals: 18,
  },
  SOL: {
    symbol: "SOL",
    name: "Solana",
    logoUrl: "https://assets.coingecko.com/coins/images/4128/large/solana.png",
    color: "#14F195",
    decimals: 9,
  },
  USDT: {
    symbol: "USDT",
    name: "Stablecoin Fund",
    logoUrl: "https://assets.coingecko.com/coins/images/325/large/Tether.png",
    color: "#26A17B",
    decimals: 6,
  },
  XRP: {
    symbol: "XRP",
    name: "XRP",
    logoUrl: "https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png",
    color: "#00AAE4",
    decimals: 6,
  },
  XAUT: {
    symbol: "XAUT",
    name: "Tether Gold",
    logoUrl: "https://assets.coingecko.com/coins/images/10481/large/Tether_Gold.png",
    color: "#FFD700",
    decimals: 6,
  },
};

// Fallback logo
export const DEFAULT_ASSET_LOGO = "https://ui-avatars.com/api/?name=Asset&background=random";

/**
 * Get asset configuration by symbol
 * Case-insensitive lookup
 */
export function getAssetConfig(symbol: string): AssetConfig | null {
  const key = symbol.toUpperCase();
  return ASSETS[key] || null;
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
 * Get asset name
 */
export function getAssetName(symbol: string): string {
  const config = getAssetConfig(symbol);
  return config?.name || symbol;
}
