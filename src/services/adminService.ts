
import { supabase } from "@/integrations/supabase/client";
import * as adminStubs from "@/server/admin";
import type {
  AdminKPIs,
  InvestorSummary,
  InvestorDetail,
  YieldSource
} from "@/server/admin";

/**
 * Checks if we should use stub data (for preview builds or when Supabase calls fail)
 */
const shouldUseStubs = () => {
  // Use stubs in preview environment or if explicitly enabled
  return import.meta.env.MODE === 'preview' || 
         import.meta.env.VITE_USE_ADMIN_STUBS === 'true';
};

/**
 * Fetches admin profile data and verifies admin status
 * @returns Admin user data including name and admin status
 */
export const fetchAdminProfile = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return { userName: "", isAdmin: false };
    
    console.log("Checking admin status for user:", user.id);
    
    // Use the get_profile_by_id function to avoid RLS recursion issues
    const { data: functionData, error: functionError } = await supabase
      .rpc('get_profile_by_id', { profile_id: user.id });
      
    if (functionError) {
      console.error("Error fetching profile via function:", functionError);
      
      // Fallback to direct query if function fails
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, is_admin')
        .eq('id', user.id)
        .single();
        
      if (error) {
        console.error("Error fetching profile via direct query:", error);
        return { userName: "", isAdmin: false };
      }
      
      console.log("Profile data retrieved via direct query:", profile);
      
      if (profile) {
        const userName = `${profile.first_name || ''} ${profile.last_name || ''}`;
        return { userName, isAdmin: profile.is_admin === true };
      }
      
      return { userName: "", isAdmin: false };
    }
    
    console.log("Profile data retrieved via function:", functionData);
    
    if (functionData && functionData.length > 0) {
      const profile = functionData[0];
      const userName = `${profile.first_name || ''} ${profile.last_name || ''}`;
      return { userName, isAdmin: profile.is_admin === true };
    }
    
    return { userName: "", isAdmin: false };
  } catch (error) {
    console.error("Error in fetchAdminProfile:", error);
    return { userName: "", isAdmin: false };
  }
};

/**
 * Fetches admin KPI data
 * @returns Admin KPI data
 */
export const getAdminKPIs = async (): Promise<AdminKPIs> => {
  try {
    console.log("Fetching admin KPIs from database...");
    
    // Fetch all KPIs in parallel for better performance
    const [aumResult, investorResult, interestResult, withdrawalResult] = await Promise.all([
      supabase.rpc('get_total_aum'),
      supabase.rpc('get_investor_count'),
      supabase.rpc('get_24h_interest'),
      supabase.rpc('get_pending_withdrawals')
    ]);
    
    // Check for errors
    if (aumResult.error) {
      console.error("Error fetching AUM:", aumResult.error);
    }
    if (investorResult.error) {
      console.error("Error fetching investor count:", investorResult.error);
    }
    if (interestResult.error) {
      console.error("Error fetching interest:", interestResult.error);
    }
    if (withdrawalResult.error) {
      console.error("Error fetching withdrawals:", withdrawalResult.error);
    }
    
    // Process the data
    const totalAUM = aumResult.data?.[0]?.total_aum || 0;
    const totalInvestors = investorResult.data?.[0]?.count || 0;
    const interest24h = interestResult.data?.[0]?.interest || 0;
    const pendingWithdrawals = withdrawalResult.data?.[0]?.count || 0;
    
    return {
      totalAUM: `$${totalAUM.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      totalInvestors: totalInvestors,
      last24hInterest: `$${interest24h.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      pendingWithdrawals: pendingWithdrawals
    };
  } catch (error) {
    console.error("Error fetching admin KPIs:", error);
    // Fall back to stubs only if there's an error
    if (shouldUseStubs()) {
      return adminStubs.getAdminKPIs();
    }
    // Return zeros if no stub fallback
    return {
      totalAUM: '$0.00',
      totalInvestors: 0,
      last24hInterest: '$0.00',
      pendingWithdrawals: 0
    };
  }
};

/**
 * Lists investors with optional search and pagination
 * @param options Search and pagination options
 * @returns Array of investor summaries
 */
export const listInvestors = async (options?: {
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<InvestorSummary[]> => {
  try {
    console.log("Fetching investors from database...", options);
    
    // Use the new RPC function to get all investors with summaries
    const { data, error } = await supabase
      .rpc('get_all_investors_with_summary');
    
    if (error) {
      console.error("Error fetching investors from database:", error);
      // Fall back to stubs if there's an error
      if (shouldUseStubs()) {
        return adminStubs.listInvestors(options);
      }
      throw error;
    }
    
    if (!data || data.length === 0) {
      console.log("No investors found in database");
      return [];
    }
    
    // Transform the data to match InvestorSummary interface
    let investors: InvestorSummary[] = data.map(investor => ({
      id: investor.id,
      email: investor.email,
      name: `${investor.first_name || ''} ${investor.last_name || ''}`.trim() || 'Unnamed',
      totalPrincipal: `$${investor.total_aum?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}`,
      totalEarned: '$0.00', // This would need to be calculated from transactions
      lastActive: investor.last_statement_date || undefined,
      status: 'active' as const // Default to active, could be enhanced with actual status
    }));
    
    // Apply client-side search filter if provided
    if (options?.search) {
      const searchTerm = options.search.toLowerCase();
      investors = investors.filter(
        investor =>
          investor.email.toLowerCase().includes(searchTerm) ||
          investor.name?.toLowerCase().includes(searchTerm)
      );
    }
    
    // Apply pagination
    const limit = options?.limit || 100;
    const offset = options?.offset || 0;
    
    return investors.slice(offset, offset + limit);
  } catch (error) {
    console.error("Error fetching investors:", error);
    // Fall back to stubs as last resort
    if (shouldUseStubs()) {
      return adminStubs.listInvestors(options);
    }
    return [];
  }
};

/**
 * Gets detailed investor information by ID
 * @param id Investor ID
 * @returns Investor detail or null if not found
 */
export const getInvestorById = async (id: string): Promise<InvestorDetail | null> => {
  try {
    console.log("Fetching investor detail from database...", id);
    
    // Get profile data
    const { data: profileData, error: profileError } = await supabase
      .rpc('get_profile_by_id', { profile_id: id });
    
    if (profileError) {
      console.error("Error fetching investor profile:", profileError);
      if (shouldUseStubs()) {
        return adminStubs.getInvestorById(id);
      }
      throw profileError;
    }
    
    if (!profileData || profileData.length === 0) {
      return null;
    }
    
    const profile = profileData[0];
    
    // Get portfolio summary
    const { data: summaryData, error: summaryError } = await supabase
      .rpc('get_investor_portfolio_summary', { investor_id: id });
    
    if (summaryError) {
      console.error("Error fetching portfolio summary:", summaryError);
    }
    
    const summary = summaryData?.[0] || { total_aum: 0, portfolio_count: 0 };
    
    // Get portfolios for positions
    const { data: portfolios, error: portfoliosError } = await supabase
      .from('portfolios')
      .select(`
        balance,
        assets:asset_id (
          symbol,
          name
        )
      `)
      .eq('user_id', id);
    
    if (portfoliosError) {
      console.error("Error fetching portfolios:", portfoliosError);
    }
    
    // Get recent transactions
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('id, type, asset_symbol, amount, created_at, status')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (transactionsError) {
      console.error("Error fetching transactions:", transactionsError);
    }
    
    // Transform to InvestorDetail interface
    const detail: InvestorDetail = {
      id: profile.id,
      email: profile.email,
      name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unnamed',
      totalPrincipal: `$${summary.total_aum?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}`,
      totalEarned: '$0.00', // Would need calculation from transactions
      lastActive: summary.last_statement_date || undefined,
      status: 'active' as const,
      kycStatus: 'approved' as const, // Default, would need actual KYC status
      positions: (portfolios || []).map(p => ({
        asset: p.assets?.symbol || 'Unknown',
        principal: `$${p.balance?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}`,
        earned: '$0.00', // Would need calculation
        apy: '0.0%' // Would need calculation
      })),
      transactions: (transactions || []).map(t => ({
        id: t.id,
        type: t.type as 'deposit' | 'withdrawal' | 'interest',
        asset: t.asset_symbol || 'Unknown',
        amount: `$${Math.abs(t.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        date: new Date(t.created_at).toLocaleDateString(),
        status: (t.status || 'completed') as 'completed' | 'pending' | 'failed'
      }))
    };
    
    return detail;
  } catch (error) {
    console.error("Error fetching investor detail:", error);
    if (shouldUseStubs()) {
      return adminStubs.getInvestorById(id);
    }
    return null;
  }
};

/**
 * Lists all yield sources
 * @returns Array of yield sources
 */
export const listYieldSources = async (): Promise<YieldSource[]> => {
  if (shouldUseStubs()) {
    return adminStubs.listYieldSources();
  }

  try {
    // TODO: Implement real Supabase queries for yield sources
    console.log("Fetching yield sources from database...");
    
    // Example of what real implementation might look like:
    // const { data, error } = await supabase
    //   .from('yield_rates')
    //   .select(`
    //     id,
    //     assets(symbol, name),
    //     daily_yield_percentage,
    //     protocol_name,
    //     status,
    //     target_yield
    //   `)
    //   .order('assets(symbol)');
    
    // For preview, fall back to stubs
    return adminStubs.listYieldSources();
  } catch (error) {
    console.error("Error fetching yield sources:", error);
    return adminStubs.listYieldSources();
  }
};

/**
 * Updates a yield source
 * @param id Yield source ID
 * @param updates Partial yield source updates
 * @returns Success status
 */
export const updateYieldSource = async (
  id: string,
  updates: Partial<YieldSource>
): Promise<{ success: boolean }> => {
  if (shouldUseStubs()) {
    return adminStubs.updateYieldSource(id, updates);
  }

  try {
    // TODO: Implement real Supabase update for yield sources
    console.log("Updating yield source in database...", id, updates);
    
    // Example of what real implementation might look like:
    // const { error } = await supabase
    //   .from('yield_rates')
    //   .update({
    //     daily_yield_percentage: updates.currentAPY,
    //     target_yield: updates.targetYield,
    //     status: updates.status,
    //     updated_at: new Date().toISOString()
    //   })
    //   .eq('id', id);
    
    // if (error) throw error;
    
    // For preview, fall back to stubs
    return adminStubs.updateYieldSource(id, updates);
  } catch (error) {
    console.error("Error updating yield source:", error);
    return { success: false };
  }
};
