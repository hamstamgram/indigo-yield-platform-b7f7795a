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
        
        // Fetch asset summaries
        const summaries = await fetchAssetSummaries(cryptoPrices);
        
        // Make sure each asset appears only once
        const uniqueAssetMap = new Map();
        summaries.forEach(asset => {
          if (!uniqueAssetMap.has(asset.symbol)) {
            uniqueAssetMap.set(asset.symbol, asset);
          }
        });
        
        const uniqueAssets = Array.from(uniqueAssetMap.values());
        setAssetSummaries(uniqueAssets);
        
        // Calculate total portfolio value
        const total = uniqueAssets.reduce((sum, asset) => {
          return sum + (asset.usdValue || 0);
        }, 0);
        setTotalPortfolioValue(total);
        
        // Set empty yield sources for now
        setYieldSources([]);
        
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