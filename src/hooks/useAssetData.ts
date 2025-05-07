
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { fetchAssetSummaries } from '@/services/assetService';

export const useAssetData = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assetSummaries, setAssetSummaries] = useState<any[]>([]);
  const [yieldSources, setYieldSources] = useState<any[]>([]);
  const [userName, setUserName] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [totalPortfolioValue, setTotalPortfolioValue] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) throw userError;
        if (!user) {
          setError('No authenticated user found');
          setLoading(false);
          return;
        }
        
        // Check if user is admin
        const { data: profileData, error: profileError } = await supabase
          .rpc('get_profile_by_id', { profile_id: user.id });
          
        if (profileError) {
          console.error("Profile fetch error:", profileError);
          // Fall back to direct query
          const { data: directProfile, error: directError } = await supabase
            .from('profiles')
            .select('is_admin, first_name, last_name')
            .eq('id', user.id)
            .single();
            
          if (directError) throw directError;
          
          setIsAdmin(directProfile?.is_admin || false);
          setUserName(`${directProfile?.first_name || ''} ${directProfile?.last_name || ''}`);
        } else if (profileData && profileData.length > 0) {
          setIsAdmin(profileData[0]?.is_admin || false);
          setUserName(`${profileData[0]?.first_name || ''} ${profileData[0]?.last_name || ''}`);
        }
        
        // Fetch crypto prices
        const cryptoPrices = await fetchCryptoPrices();
        
        // If admin, also fetch all investor portfolios to show total assets
        if (isAdmin) {
          try {
            const { data: portfoliosData, error: portfoliosError } = await supabase
              .from('portfolios')
              .select(`
                asset_id,
                balance,
                assets (
                  symbol
                )
              `);
              
            if (portfoliosError) throw portfoliosError;
            
            // Aggregate portfolio balances by asset
            const assetTotals: Record<string, number> = {};
            
            portfoliosData?.forEach(item => {
              if (!item.assets) return;
              
              const symbol = item.assets.symbol.toUpperCase();
              const balance = Number(item.balance || 0);
              
              assetTotals[symbol] = (assetTotals[symbol] || 0) + balance;
            });
            
            // Add these totals to the crypto prices for asset summaries
            Object.keys(assetTotals).forEach(symbol => {
              cryptoPrices[symbol] = {
                ...(cryptoPrices[symbol] || { price: 0, change_24h: 0 }),
                totalBalance: assetTotals[symbol]
              };
            });
          } catch (portfolioError) {
            console.error("Error fetching portfolios:", portfolioError);
          }
        }
        
        // Fetch asset summaries (with the enriched crypto prices)
        const summaries = await fetchAssetSummaries(cryptoPrices);
        setAssetSummaries(summaries);
        
        // Calculate total portfolio value
        const total = summaries.reduce((sum, asset) => {
          return sum + (asset.usdValue || 0);
        }, 0);
        setTotalPortfolioValue(total);
        
        // Fetch yield sources (protocols)
        try {
          // Look for latest yield rates
          const today = new Date().toISOString().split('T')[0];
          const { data: yieldRates, error: yieldError } = await supabase
            .from('yield_rates')
            .select(`
              asset_id,
              daily_yield_percentage,
              assets (
                symbol,
                name
              )
            `)
            .eq('date', today);
            
          if (yieldError) throw yieldError;
          
          // Transform to yield sources format
          const sources = yieldRates?.map(rate => ({
            id: `yield-${rate.asset_id}`,
            name: rate.assets?.name || 'Unknown Asset',
            symbol: rate.assets?.symbol || '???',
            rate: rate.daily_yield_percentage,
            balance: cryptoPrices[rate.assets?.symbol?.toUpperCase()]?.totalBalance || 0,
            price: cryptoPrices[rate.assets?.symbol?.toUpperCase()]?.price || 0
          })) || [];
          
          setYieldSources(sources);
        } catch (yieldError) {
          console.error("Error fetching yield sources:", yieldError);
          setYieldSources([]);
        }
        
      } catch (err: any) {
        console.error("Error in fetchData:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [isAdmin]);

  return { 
    loading, 
    error, 
    assetSummaries, 
    yieldSources, 
    userName, 
    isAdmin,
    totalPortfolioValue
  };
};

// Function to fetch crypto prices
const fetchCryptoPrices = async () => {
  try {
    const { data, error } = await supabase.functions.invoke('get-crypto-prices');
    
    if (error) {
      console.error("Error fetching crypto prices:", error);
      return getDefaultPrices();
    }
    
    return data || getDefaultPrices();
  } catch (error) {
    console.error("Error in fetchCryptoPrices:", error);
    return getDefaultPrices();
  }
};

// Fallback default prices
const getDefaultPrices = () => {
  return {
    'BTC': { price: 67500, change_24h: 2.3 },
    'ETH': { price: 3200, change_24h: 1.8 },
    'SOL': { price: 148, change_24h: 4.2 },
    'USDC': { price: 1, change_24h: 0 },
  };
};
