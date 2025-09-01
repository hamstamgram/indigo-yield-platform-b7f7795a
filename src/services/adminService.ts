
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
  if (shouldUseStubs()) {
    return adminStubs.getAdminKPIs();
  }

  try {
    // TODO: Implement real Supabase queries for KPIs
    // For now, fall back to stubs when real data is not available
    console.log("Fetching admin KPIs from database...");
    
    // Example of what real implementation might look like:
    // const { data: aumData } = await supabase.rpc('get_total_aum');
    // const { data: investorCount } = await supabase.rpc('get_investor_count');
    // const { data: interestData } = await supabase.rpc('get_24h_interest');
    // const { data: withdrawalData } = await supabase.rpc('get_pending_withdrawals');
    
    // For preview, fall back to stubs
    return adminStubs.getAdminKPIs();
  } catch (error) {
    console.error("Error fetching admin KPIs:", error);
    return adminStubs.getAdminKPIs();
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
  if (shouldUseStubs()) {
    return adminStubs.listInvestors(options);
  }

  try {
    // TODO: Implement real Supabase queries for investor list
    console.log("Fetching investors from database...", options);
    
    // Example of what real implementation might look like:
    // let query = supabase
    //   .from('profiles')
    //   .select(`
    //     id,
    //     first_name,
    //     last_name,
    //     email,
    //     portfolios (
    //       total_principal,
    //       total_earned
    //     )
    //   `)
    //   .eq('is_admin', false);
    
    // if (options?.search) {
    //   query = query.or(`email.ilike.%${options.search}%,first_name.ilike.%${options.search}%,last_name.ilike.%${options.search}%`);
    // }
    
    // if (options?.limit) {
    //   query = query.limit(options.limit);
    // }
    
    // if (options?.offset) {
    //   query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    // }
    
    // const { data, error } = await query;
    
    // For preview, fall back to stubs
    return adminStubs.listInvestors(options);
  } catch (error) {
    console.error("Error fetching investors:", error);
    return adminStubs.listInvestors(options);
  }
};

/**
 * Gets detailed investor information by ID
 * @param id Investor ID
 * @returns Investor detail or null if not found
 */
export const getInvestorById = async (id: string): Promise<InvestorDetail | null> => {
  if (shouldUseStubs()) {
    return adminStubs.getInvestorById(id);
  }

  try {
    // TODO: Implement real Supabase queries for investor detail
    console.log("Fetching investor detail from database...", id);
    
    // Example of what real implementation might look like:
    // const { data: profile, error } = await supabase
    //   .from('profiles')
    //   .select(`
    //     id,
    //     first_name,
    //     last_name,
    //     email,
    //     kyc_status,
    //     portfolios (
    //       asset_symbol,
    //       principal,
    //       earned,
    //       current_apy
    //     ),
    //     transactions (
    //       id,
    //       type,
    //       asset_symbol,
    //       amount,
    //       created_at,
    //       status
    //     )
    //   `)
    //   .eq('id', id)
    //   .single();
    
    // For preview, fall back to stubs
    return adminStubs.getInvestorById(id);
  } catch (error) {
    console.error("Error fetching investor detail:", error);
    return adminStubs.getInvestorById(id);
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
