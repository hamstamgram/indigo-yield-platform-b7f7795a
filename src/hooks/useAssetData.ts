
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchCryptoPrices, defaultPrices } from "@/services/cryptoService";

export interface AssetSummary {
  id: number;
  symbol: string;
  name: string;
  totalBalance: number;
  usdValue: number;
  totalUsers: number;
  avgYield: number;
}

export interface YieldSource {
  id: string;
  name: string;
  btcYield: number;
  ethYield: number;
  solYield: number;
  usdcYield: number;
}

/**
 * Fetches admin profile data and verifies admin status
 * @returns Admin user data including name and admin status
 */
const fetchAdminProfile = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return { userName: "", isAdmin: false };
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, is_admin')
    .eq('id', user.id)
    .single();
    
  if (profile) {
    const userName = `${profile.first_name || ''} ${profile.last_name || ''}`;
    
    // Ensure this is an admin
    if (!profile.is_admin) {
      console.error("Non-admin user accessing admin dashboard");
      return { userName, isAdmin: false };
    }
    
    return { userName, isAdmin: true };
  }
  
  return { userName: "", isAdmin: false };
};

/**
 * Fetches asset data from the database or creates defaults if none exist
 * @param cryptoPrices Current cryptocurrency prices
 * @returns Array of asset summaries with balances and prices
 */
const fetchAssetSummaries = async (cryptoPrices: Record<string, any>) => {
  const { data: assets } = await supabase
    .from('assets')
    .select('*')
    .order('id');
    
  if (!assets || assets.length === 0) {
    console.log("No assets found, using default assets");
    return createDefaultAssetSummaries(cryptoPrices);
  }
  
  return createAssetSummariesFromDb(assets, cryptoPrices);
};

/**
 * Creates default asset summaries when no assets exist in the database
 * @param prices Current cryptocurrency prices
 * @returns Array of default asset summaries
 */
const createDefaultAssetSummaries = (prices: Record<string, any>) => {
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
  
  // Create asset summaries for default assets
  return defaultAssets.map(asset => {
    const symbol = asset.symbol.toUpperCase();
    const defaults = defaultValues[symbol] || { balance: 0, users: 0, yield: 0 };
    const priceData = prices[asset.symbol.toLowerCase()] || defaultPrices[asset.symbol.toLowerCase()] || { price: 0 };
    
    return {
      id: asset.id,
      symbol: asset.symbol,
      name: asset.name,
      totalBalance: defaults.balance,
      usdValue: defaults.balance * priceData.price,
      totalUsers: defaults.users,
      avgYield: defaults.yield
    };
  });
};

/**
 * Creates asset summaries from database assets
 * @param assets Assets from the database
 * @param prices Current cryptocurrency prices 
 * @returns Array of asset summaries with data from the database
 */
const createAssetSummariesFromDb = (assets: any[], prices: Record<string, any>) => {
  // Define default values for each supported asset type
  const defaultValues = {
    'BTC': { balance: 12.5, users: 18, yield: 4.8 },
    'ETH': { balance: 180, users: 15, yield: 5.2 },
    'SOL': { balance: 2200, users: 11, yield: 6.5 },
    'USDC': { balance: 425000, users: 22, yield: 8.1 }
  };
  
  // Create asset summaries for all assets
  return assets.map(asset => {
    const symbol = asset.symbol.toUpperCase();
    
    // Get default values for this asset type or use zeros
    const defaults = defaultValues[symbol] || { balance: 0, users: 0, yield: 0 };
    
    const priceData = prices[asset.symbol.toLowerCase()] || defaultPrices[asset.symbol.toLowerCase()] || { price: 0 };
    
    return {
      id: asset.id,
      symbol: asset.symbol,
      name: asset.name,
      totalBalance: defaults.balance,
      usdValue: defaults.balance * priceData.price,
      totalUsers: defaults.users,
      avgYield: defaults.yield
    };
  });
};

/**
 * Creates mock yield sources for demonstration
 * @returns Array of yield sources with rates
 */
const createYieldSources = () => {
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

/**
 * Custom hook for fetching and processing asset data for the admin dashboard
 */
export const useAssetData = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assetSummaries, setAssetSummaries] = useState<AssetSummary[]>([]);
  const [yieldSources, setYieldSources] = useState<YieldSource[]>([]);
  const [userName, setUserName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  // Fetch data effect
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get admin profile data
        const profileData = await fetchAdminProfile();
        setUserName(profileData.userName);
        setIsAdmin(profileData.isAdmin);
        
        if (!profileData.isAdmin) {
          setError("Unauthorized: Admin access required");
          setLoading(false);
          return;
        }
        
        // Get real-time prices
        let prices = {};
        try {
          const symbols = ['BTC', 'ETH', 'SOL', 'USDC'];
          prices = await fetchCryptoPrices(symbols);
        } catch (e) {
          console.error('Error fetching prices, using defaults:', e);
          prices = defaultPrices;
        }
        
        // Fetch asset summaries
        const summaries = await fetchAssetSummaries(prices);
        setAssetSummaries(summaries);
        
        // Create mock yield sources
        setYieldSources(createYieldSources());
      } catch (error) {
        console.error('Error fetching admin dashboard data:', error);
        setError('Failed to load dashboard data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  return { loading, error, assetSummaries, yieldSources, userName, isAdmin };
};
