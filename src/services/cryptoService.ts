
import { supabase } from "@/integrations/supabase/client";

// Define types for cryptocurrency price data
export interface CryptoPrice {
  price: number;
  change24h: number;
  market_cap: number;
  volume_24h: number;
}

export interface CryptoPricesMap {
  [symbol: string]: CryptoPrice;
}

/**
 * Fetches real-time crypto prices from CoinMarketCap via Supabase Edge Function
 * @param symbols Array of cryptocurrency symbols to fetch (e.g., ["BTC", "ETH", "SOL"])
 * @returns Object with cryptocurrency price data, keyed by lowercase symbol
 */
export const fetchCryptoPrices = async (symbols: string[]): Promise<CryptoPricesMap> => {
  try {
    console.log(`Attempting to fetch prices for: ${symbols.join(', ')}`);
    
    const { data, error } = await supabase.functions.invoke('get-crypto-prices', {
      body: { symbols }
    });

    if (error) {
      console.error('Error fetching crypto prices:', error);
      console.log('Falling back to default prices');
      
      // Return default prices for the requested symbols
      const fallbackPrices: CryptoPricesMap = {};
      
      symbols.forEach(symbol => {
        const lowercaseSymbol = symbol.toLowerCase();
        if (defaultPrices[lowercaseSymbol]) {
          fallbackPrices[lowercaseSymbol] = defaultPrices[lowercaseSymbol];
        }
      });
      
      return fallbackPrices;
    }

    console.log('Successfully fetched price data:', data);
    return data as CryptoPricesMap;
  } catch (error) {
    console.error('Error in fetchCryptoPrices:', error);
    
    // Return default prices for the requested symbols
    const fallbackPrices: CryptoPricesMap = {};
    
    symbols.forEach(symbol => {
      const lowercaseSymbol = symbol.toLowerCase();
      if (defaultPrices[lowercaseSymbol]) {
        fallbackPrices[lowercaseSymbol] = defaultPrices[lowercaseSymbol];
      }
    });
    
    return fallbackPrices;
  }
};

/**
 * Default mock prices to use as fallback
 */
export const defaultPrices: CryptoPricesMap = {
  btc: { price: 62451.23, change24h: 2.4, market_cap: 1228000000000, volume_24h: 28600000000 },
  eth: { price: 3012.75, change24h: -1.2, market_cap: 362000000000, volume_24h: 18400000000 },
  sol: { price: 142.89, change24h: 5.7, market_cap: 61700000000, volume_24h: 2680000000 },
  usdc: { price: 1.00, change24h: 0.01, market_cap: 31900000000, volume_24h: 3270000000 }
};
