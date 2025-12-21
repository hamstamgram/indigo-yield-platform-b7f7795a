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
    logoUrl: "https://storage.mlcdn.com/account_image/855106/8Pf2dtBl6QjlVu34Pcqvyr6rUU6MWwYdN9qTrClW.png",
    color: "#F7931A",
    decimals: 8,
  },
  ETH: {
    symbol: "ETH",
    name: "Ethereum",
    logoUrl: "https://storage.mlcdn.com/account_image/855106/iuulK6xRS80ItnV4gq2VY7voxoWe7AMvPA5roO16.png",
    color: "#627EEA",
    decimals: 18,
  },
  USDC: {
    symbol: "USDC",
    name: "USD Coin",
    logoUrl: "https://storage.mlcdn.com/account_image/855106/770YUbYlWXFXPpolUS1wssuUGIeH7zHpt1mQbDah.png",
    color: "#2775CA",
    decimals: 6,
  },
  USDT: {
    symbol: "USDT",
    name: "Tether",
    logoUrl: "https://storage.mlcdn.com/account_image/855106/2p3Y0l5lox8EefjCx7U7Qgfkrb9cxW3L8mGpaORi.png",
    color: "#26A17B",
    decimals: 6,
  },
  SOL: {
    symbol: "SOL",
    name: "Solana",
    logoUrl: "https://storage.mlcdn.com/account_image/855106/14fmAPi88WAnAwH4XhoObK1J1HwiTSvItLhIRFSQ.png",
    color: "#14F195",
    decimals: 9,
  },
  EURC: {
    symbol: "EURC",
    name: "Euro Coin",
    logoUrl: "https://storage.mlcdn.com/account_image/855106/kwV87oiC7c4dnG6zkl95MnV5yafAxWlFbQgjmaIm.png",
    color: "#0052FF",
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

/**
 * Format an amount with the asset symbol
 * e.g. formatAssetAmount(1500.5, 'USDT') => "1,500.50 USDT"
 */
export function formatAssetAmount(amount: number, symbol: string): string {
  const config = getAssetConfig(symbol);
  const decimals = config?.decimals || 4;
  // For display, cap decimals at 4 for readability (except BTC which uses 8)
  const displayDecimals = symbol.toUpperCase() === "BTC" ? 8 : Math.min(decimals, 4);

  const formattedValue = amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: displayDecimals,
  });

  return `${formattedValue} ${symbol.toUpperCase()}`;
}

/**
 * Format a signed amount with +/- prefix
 * e.g. formatSignedAssetAmount(-1500.5, 'USDT') => "-1,500.50 USDT"
 * e.g. formatSignedAssetAmount(1500.5, 'USDT') => "+1,500.50 USDT"
 */
export function formatSignedAssetAmount(amount: number, symbol: string): string {
  const formatted = formatAssetAmount(Math.abs(amount), symbol);
  if (amount < 0) return `-${formatted}`;
  if (amount > 0) return `+${formatted}`;
  return formatted;
}

/**
 * Get asset decimals for formatting
 */
export function getAssetDecimals(symbol: string): number {
  const config = getAssetConfig(symbol);
  return config?.decimals || 4;
}
