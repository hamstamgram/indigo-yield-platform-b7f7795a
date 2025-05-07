
import { supabase } from "@/integrations/supabase/client";
import { AssetSummary } from "@/models/assetTypes";
import { defaultPrices } from "@/services/cryptoService";

/**
 * Creates default asset summaries when no assets exist in the database
 * @param prices Current cryptocurrency prices
 * @returns Array of default asset summaries
 */
export const createDefaultAssetSummaries = (prices: Record<string, any>) => {
  const defaultAssets = [
    { id: 1, symbol: 'BTC', name: 'Bitcoin' },
    { id: 2, symbol: 'ETH', name: 'Ethereum' },
    { id: 3, symbol: 'SOL', name: 'Solana' },
    { id: 4, symbol: 'USDC', name: 'USD Coin' }
  ];
  
  // Define default values for each supported asset type
  const defaultValues = {
    'BTC': { balance: 12.5, users: 18, yield: 4.8 },
    'ETH': { balance: 180, users: 15, yield: 5.2 },
    'SOL': { balance: 2200, users: 11, yield: 6.5 },
    'USDC': { balance: 425000, users: 22, yield: 8.1 }
  };
  
  // Create asset summaries for default assets - ensure uniqueness by symbol
  const uniqueAssets = new Map();
  
  defaultAssets.forEach(asset => {
    const symbol = asset.symbol.toUpperCase();
    if (!uniqueAssets.has(symbol)) {
      const defaults = defaultValues[symbol] || { balance: 0, users: 0, yield: 0 };
      const priceData = prices[asset.symbol.toLowerCase()] || defaultPrices[asset.symbol.toLowerCase()] || { price: 0 };
      
      uniqueAssets.set(symbol, {
        id: asset.id,
        symbol: asset.symbol,
        name: asset.name,
        totalBalance: defaults.balance,
        usdValue: defaults.balance * priceData.price,
        totalUsers: defaults.users,
        avgYield: defaults.yield
      });
    }
  });
  
  return Array.from(uniqueAssets.values());
};

/**
 * Creates asset summaries from database assets
 * @param assets Assets from the database
 * @param prices Current cryptocurrency prices 
 * @returns Array of asset summaries with data from the database
 */
export const createAssetSummariesFromDb = (assets: any[], prices: Record<string, any>) => {
  // Define default values for each supported asset type
  const defaultValues = {
    'BTC': { balance: 12.5, users: 18, yield: 4.8 },
    'ETH': { balance: 180, users: 15, yield: 5.2 },
    'SOL': { balance: 2200, users: 11, yield: 6.5 },
    'USDC': { balance: 425000, users: 22, yield: 8.1 }
  };
  
  // Create asset summaries for all assets
  const uniqueAssets = new Map();
  
  assets.forEach(asset => {
    const symbol = asset.symbol.toUpperCase();
    
    if (!uniqueAssets.has(symbol)) {
      // Get default values for this asset type or use zeros
      const defaults = defaultValues[symbol] || { balance: 0, users: 0, yield: 0 };
      
      const priceData = prices[asset.symbol.toLowerCase()] || defaultPrices[asset.symbol.toLowerCase()] || { price: 0 };
      
      uniqueAssets.set(symbol, {
        id: asset.id,
        symbol: asset.symbol,
        name: asset.name,
        totalBalance: defaults.balance,
        usdValue: defaults.balance * priceData.price,
        totalUsers: defaults.users,
        avgYield: defaults.yield
      });
    }
  });
  
  return Array.from(uniqueAssets.values());
};

/**
 * Creates mock yield sources for demonstration
 * @returns Array of yield sources with rates
 */
export const createYieldSources = () => {
  return [
    {
      id: '1',
      name: 'Aave',
      btcYield: 3.2,
      ethYield: 4.8,
      solYield: 0,
      usdcYield: 6.2
    },
    {
      id: '2',
      name: 'Compound',
      btcYield: 3.5,
      ethYield: 4.5,
      solYield: 0,
      usdcYield: 5.8
    },
    {
      id: '3',
      name: 'Solend',
      btcYield: 0,
      ethYield: 0,
      solYield: 6.5,
      usdcYield: 7.2
    },
    {
      id: '4',
      name: 'Lido',
      btcYield: 4.7,
      ethYield: 5.6,
      solYield: 6.8,
      usdcYield: 0
    },
    {
      id: '5',
      name: 'Marinade',
      btcYield: 0,
      ethYield: 0,
      solYield: 7.1,
      usdcYield: 0
    },
  ];
};
