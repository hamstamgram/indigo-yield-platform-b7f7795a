
import { useState, useEffect } from "react";
import { fetchCryptoPrices, defaultPrices } from "@/services/cryptoService";
import { AssetSummary, YieldSource } from "@/models/assetTypes";
import { fetchAdminProfile } from "@/services/adminService";
import { fetchAssetSummaries } from "@/services/assetService";
import { createYieldSources } from "@/utils/assetUtils";

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

// Export the types for backward compatibility
export type { AssetSummary, YieldSource };
