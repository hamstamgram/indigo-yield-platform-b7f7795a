// Token formatting utilities for native display

interface TokenConfig {
  symbol: string;
  decimals: number;
  displayName: string;
}

const TOKEN_CONFIGS: Record<string, TokenConfig> = {
  BTC: { symbol: 'BTC', decimals: 8, displayName: 'Bitcoin' },
  ETH: { symbol: 'ETH', decimals: 18, displayName: 'Ethereum' },
  SOL: { symbol: 'SOL', decimals: 9, displayName: 'Solana' },
  USDC: { symbol: 'USDC', decimals: 6, displayName: 'USD Coin' },
  USDT: { symbol: 'USDT', decimals: 6, displayName: 'Tether' },
  EURC: { symbol: 'EURC', decimals: 6, displayName: 'Euro Coin' }
};

export function formatTokenAmount(amount: number, tokenSymbol: string): string {
  const config = TOKEN_CONFIGS[tokenSymbol.toUpperCase()];
  if (!config) {
    return `${amount.toFixed(4)} ${tokenSymbol}`;
  }
  
  // Format with appropriate decimals
  const decimals = Math.min(config.decimals, 6); // Cap display decimals at 6
  return `${amount.toLocaleString('en-US', { 
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals 
  })} ${config.symbol}`;
}

export function getTokenConfig(symbol: string): TokenConfig | null {
  return TOKEN_CONFIGS[symbol.toUpperCase()] || null;
}

export function getSupportedTokens(): TokenConfig[] {
  return Object.values(TOKEN_CONFIGS);
}

export function formatTokenBalance(balance: number, symbol: string, options?: {
  showSymbol?: boolean;
  maxDecimals?: number;
}): string {
  const { showSymbol = true, maxDecimals } = options || {};
  const config = getTokenConfig(symbol);
  const decimals = maxDecimals || (config ? Math.min(config.decimals, 6) : 4);
  
  const formatted = balance.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals
  });
  
  return showSymbol ? `${formatted} ${symbol.toUpperCase()}` : formatted;
}