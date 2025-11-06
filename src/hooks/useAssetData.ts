import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { fetchInvestorPositions } from '@/services/assetService';

export const useAssetData = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assetSummaries, setAssetSummaries] = useState<any[]>([]);
  const [yieldSources, setYieldSources] = useState<any[]>([]);
  const [userName, setUserName] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

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
            .maybeSingle();
            
          if (directError) throw directError;
          
          setIsAdmin(directProfile?.is_admin || false);
          setUserName(`${directProfile?.first_name || ''} ${directProfile?.last_name || ''}`);
        } else if (profileData && profileData.length > 0) {
          setIsAdmin(profileData[0]?.is_admin || false);
          setUserName(`${profileData[0]?.first_name || ''} ${profileData[0]?.last_name || ''}`);
        }
        
        // Fetch real investor positions (native token amounts only)
        const positions = await fetchInvestorPositions();
        setAssetSummaries(positions);
        
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
    isAdmin
  };
};

// Native token system - no price fetching needed