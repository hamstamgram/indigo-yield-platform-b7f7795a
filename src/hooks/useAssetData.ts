
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

export const useAssetData = () => {
  const [loading, setLoading] = useState(true);
  const [assetSummaries, setAssetSummaries] = useState<AssetSummary[]>([]);
  const [yieldSources, setYieldSources] = useState<YieldSource[]>([]);
  const [userName, setUserName] = useState("");

  // Fetch data effect
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Get current admin user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return;
        
        // Get admin profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name, is_admin')
          .eq('id', user.id)
          .single();
          
        if (profile) {
          setUserName(`${profile.first_name || ''} ${profile.last_name || ''}`);
          
          // Ensure this is an admin
          if (!profile.is_admin) {
            console.error("Non-admin user accessing admin dashboard");
            return;
          }
        }
        
        // Fetch all assets
        const { data: assets } = await supabase
          .from('assets')
          .select('*')
          .order('id');
          
        if (!assets || assets.length === 0) {
          console.log("No assets found, using default assets");
          // Create default assets if none exist
          const defaultAssets = [
            { id: 1, symbol: 'BTC', name: 'Bitcoin' },
            { id: 2, symbol: 'ETH', name: 'Ethereum' },
            { id: 3, symbol: 'SOL', name: 'Solana' },
            { id: 4, symbol: 'USDC', name: 'USD Coin' }
          ];
          
          // Get real-time prices
          const symbols = defaultAssets.map(asset => asset.symbol.toUpperCase());
          let prices = {};
          try {
            prices = await fetchCryptoPrices(symbols);
          } catch (e) {
            console.error('Error fetching prices, using defaults:', e);
            prices = defaultPrices;
          }

          // Define default values for each supported asset type
          const defaultValues = {
            'BTC': { balance: 12.5, users: 18, yield: 4.8 },
            'ETH': { balance: 180, users: 15, yield: 5.2 },
            'SOL': { balance: 2200, users: 11, yield: 6.5 },
            'USDC': { balance: 425000, users: 22, yield: 8.1 }
          };
          
          // Create asset summaries for default assets
          const mockSummaries: AssetSummary[] = defaultAssets.map(asset => {
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
          
          setAssetSummaries(mockSummaries);
        } else {
          // Get real-time prices
          const symbols = assets.map(asset => asset.symbol.toUpperCase());
          let prices = {};
          try {
            prices = await fetchCryptoPrices(symbols);
          } catch (e) {
            console.error('Error fetching prices, using defaults:', e);
            prices = defaultPrices;
          }

          // Define default values for each supported asset type
          const defaultValues = {
            'BTC': { balance: 12.5, users: 18, yield: 4.8 },
            'ETH': { balance: 180, users: 15, yield: 5.2 },
            'SOL': { balance: 2200, users: 11, yield: 6.5 },
            'USDC': { balance: 425000, users: 22, yield: 8.1 }
          };
          
          // Create asset summaries for all assets
          const mockSummaries: AssetSummary[] = assets.map(asset => {
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
          
          setAssetSummaries(mockSummaries);
        }
        
        // Mock yield sources for the demonstration
        const mockYieldSources: YieldSource[] = [
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
        
        setYieldSources(mockYieldSources);
      } catch (error) {
        console.error('Error fetching admin dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  return { loading, assetSummaries, yieldSources, userName };
};
