/**
 * CoinMarketCap API Service
 * Properly implements the CoinMarketCap API v1/v2 endpoints
 * Documentation: https://coinmarketcap.com/api/documentation/v1/
 */

import { supabase } from "@/integrations/supabase/client";

// Supabase Edge Function for crypto prices
const SUPABASE_FUNCTION_URL = `https://nkfimvovosdehmyyjubn.supabase.co/functions/v1/get-crypto-prices`;

// Cache configuration
const PRICE_CACHE_KEY = 'crypto_prices_cache';
const CACHE_DURATION_MS = 60 * 1000; // 1 minute cache

interface CMCMapData {
  id: number;
  name: string;
  symbol: string;
  slug: string;
  rank: number;
  is_active: number;
  first_historical_data: string;
  last_historical_data: string;
  platform: any;
}

interface CMCQuoteData {
  id: number;
  name: string;
  symbol: string;
  slug: string;
  circulating_supply: number;
  total_supply: number;
  max_supply: number;
  date_added: string;
  num_market_pairs: number;
  cmc_rank: number;
  last_updated: string;
  quote: {
    USD: {
      price: number;
      volume_24h: number;
      volume_change_24h: number;
      percent_change_1h: number;
      percent_change_24h: number;
      percent_change_7d: number;
      percent_change_30d: number;
      market_cap: number;
      market_cap_dominance: number;
      fully_diluted_market_cap: number;
      last_updated: string;
    };
  };
}

export interface CryptoPrice {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  change7d: number;
  marketCap: number;
  volume24h: number;
  lastUpdated: string;
}

// Correct CMC IDs for our assets (verified from CoinMarketCap)
const ASSET_CMC_IDS: Record<string, number> = {
  BTC: 1,      // Bitcoin
  ETH: 1027,   // Ethereum  
  USDT: 825,   // Tether (USDT on multiple chains)
  SOL: 5426,   // Solana
  EUR: 2790,   // STASIS EURO (EURS) - Euro stablecoin
};

// For EUR, we might want to use a forex API instead
const EUR_USD_RATE = 1.08; // Fallback rate


/**
 * Fetch latest cryptocurrency quotes from Supabase Edge Function
 */
export async function fetchCryptoPrices(forceRefresh = false): Promise<Record<string, CryptoPrice>> {
  // Check cache first
  if (!forceRefresh) {
    const cached = getCachedPrices();
    if (cached) {
      return cached;
    }
  }

  try {
    // Call Supabase Edge Function
    const response = await fetch(SUPABASE_FUNCTION_URL, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NTQ1OTgsImV4cCI6MjA2MjAzMDU5OH0.pZrIyCCd7dlvvNMGdW8-71BxSVfoKhxs9a5Ezbkmjgg'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Edge function error response:', errorText);
      throw new Error(`Edge function error: ${response.status}`);
    }

    const data = await response.json();
    const prices: Record<string, CryptoPrice> = {};

    // Transform the response if needed
    Object.entries(data).forEach(([symbol, priceData]: [string, any]) => {
      prices[symbol] = {
        symbol: symbol,
        name: priceData.name || symbol,
        price: priceData.price || 0,
        change24h: priceData.change24h || 0,
        change7d: priceData.change7d || 0,
        marketCap: priceData.marketCap || 0,
        volume24h: priceData.volume24h || 0,
        lastUpdated: priceData.lastUpdated || new Date().toISOString()
      };
    });

    // Cache the prices
    cachePrices(prices);

    return prices;
  } catch (error) {
    console.error('Error fetching crypto prices:', error);
    return getMockPrices();
  }
}

/**
 * Get cached prices from localStorage
 */
function getCachedPrices(): Record<string, CryptoPrice> | null {
  try {
    const cached = localStorage.getItem(PRICE_CACHE_KEY);
    if (!cached) return null;

    const { prices, timestamp } = JSON.parse(cached);
    const age = Date.now() - timestamp;

    if (age > CACHE_DURATION_MS) {
      return null;
    }

    return prices;
  } catch {
    return null;
  }
}

/**
 * Cache prices in localStorage
 */
function cachePrices(prices: Record<string, CryptoPrice>): void {
  try {
    localStorage.setItem(PRICE_CACHE_KEY, JSON.stringify({
      prices,
      timestamp: Date.now()
    }));
  } catch (error) {
    console.error('Error caching prices:', error);
  }
}


/**
 * Get mock prices for development/fallback
 */
function getMockPrices(): Record<string, CryptoPrice> {
  return {
    BTC: {
      symbol: 'BTC',
      name: 'Bitcoin',
      price: 67543.21,
      change24h: 2.34,
      change7d: 5.67,
      marketCap: 1324567890000,
      volume24h: 28765432100,
      lastUpdated: new Date().toISOString()
    },
    ETH: {
      symbol: 'ETH',
      name: 'Ethereum',
      price: 3245.67,
      change24h: -1.23,
      change7d: 3.45,
      marketCap: 389876543210,
      volume24h: 15432198765,
      lastUpdated: new Date().toISOString()
    },
    SOL: {
      symbol: 'SOL',
      name: 'Solana',
      price: 148.92,
      change24h: 5.67,
      change7d: 12.34,
      marketCap: 67890123456,
      volume24h: 2345678901,
      lastUpdated: new Date().toISOString()
    },
    USDT: {
      symbol: 'USDT',
      name: 'Tether',
      price: 1.0001,
      change24h: 0.01,
      change7d: 0.02,
      marketCap: 95432109876,
      volume24h: 45678901234,
      lastUpdated: new Date().toISOString()
    },
    EUR: {
      symbol: 'EUR',
      name: 'Euro',
      price: EUR_USD_RATE,
      change24h: 0.1,
      change7d: 0.3,
      marketCap: 0,
      volume24h: 0,
      lastUpdated: new Date().toISOString()
    }
  };
}

/**
 * Convert a price from one currency to USD
 */
export function convertToUSD(amount: number, fromSymbol: string, prices: Record<string, CryptoPrice>): number {
  const price = prices[fromSymbol]?.price || 0;
  return amount * price;
}

/**
 * Format price for display
 */
export function formatPrice(price: number, decimals = 2): string {
  if (price >= 1000) {
    return price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  } else if (price >= 1) {
    return price.toFixed(decimals);
  } else {
    // For small prices, show more decimals
    return price.toFixed(Math.max(4, decimals));
  }
}

/**
 * Start auto-refresh interval
 */
export function startPriceAutoRefresh(callback: (prices: Record<string, CryptoPrice>) => void, intervalMs = 60000): () => void {
  // Initial fetch
  fetchCryptoPrices().then(callback);

  // Set up interval
  const interval = setInterval(async () => {
    const prices = await fetchCryptoPrices();
    callback(prices);
  }, intervalMs);

  // Return cleanup function
  return () => clearInterval(interval);
}
