/**
 * Investor Service
 * Handles all investor-related operations
 */

import { ApiClient, ApiResponse } from './ApiClient';
import type { 
  Investor, 
  InvestorProfile, 
  InvestorPosition
} from '@/types/domains/investor';
import { 
  mapDbInvestorToInvestor,
  mapDbPositionToInvestorPosition
} from '@/types/domains/investor';

export interface InvestorFilters {
  status?: 'active' | 'pending' | 'closed';
  search?: string;
}

export class InvestorService extends ApiClient {
  /**
   * Get all investors with optional filters
   */
  async getInvestors(filters?: InvestorFilters): Promise<ApiResponse<Investor[]>> {
    return this.execute(async () => {
      let query = this.supabase
        .from('investors')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.search) {
        query = query.or(`email.ilike.%${filters.search}%,name.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) {
        return { data: null, error };
      }

      // Map database investors to application type
      const investors = (data || []).map(mapDbInvestorToInvestor);
      return { data: investors, error: null };
    });
  }

  /**
   * Get investor by ID
   */
  async getInvestorById(id: string): Promise<ApiResponse<Investor>> {
    return this.execute(async () => {
      const { data, error } = await this.supabase
        .from('investors')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        return { data: null, error };
      }

      if (!data) {
        return { data: null, error: { message: 'Investor not found', code: 'NOT_FOUND' } as any };
      }

      return { data: mapDbInvestorToInvestor(data), error: null };
    });
  }

  /**
   * Get investor profile
   * Joins with profiles table to get complete profile information
   */
  async getInvestorProfile(userId: string): Promise<ApiResponse<InvestorProfile>> {
    return this.execute(async () => {
      const { data: investor, error: investorError } = await this.supabase
        .from('investors')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (investorError) {
        return { data: null, error: investorError };
      }

      if (!investor) {
        return { data: null, error: { message: 'Investor not found', code: 'NOT_FOUND' } as any };
      }

      // Get profile data if profile_id exists
      let profileData = null;
      if (investor.profile_id) {
        const { data, error } = await this.supabase
          .from('profiles')
          .select('first_name, last_name, is_admin, avatar_url, totp_enabled, totp_verified')
          .eq('id', investor.profile_id)
          .maybeSingle();
        
        if (!error) {
          profileData = data;
        }
      }

      const profile: InvestorProfile = {
        id: investor.id,
        email: investor.email,
        first_name: profileData?.first_name || null,
        last_name: profileData?.last_name || null,
        phone: investor.phone,
        is_admin: profileData?.is_admin || false,
        avatar_url: profileData?.avatar_url || null,
        totp_enabled: profileData?.totp_enabled || false,
        totp_verified: profileData?.totp_verified || false,
        status: (investor.status || 'pending') as 'active' | 'pending' | 'closed',
        created_at: investor.created_at || new Date().toISOString(),
        updated_at: investor.updated_at || new Date().toISOString(),
      };

      return { data: profile, error: null };
    });
  }

  /**
   * Get investor positions
   */
  async getInvestorPositions(investorId: string): Promise<ApiResponse<InvestorPosition[]>> {
    return this.execute(async () => {
      const { data, error } = await this.supabase
        .from('investor_positions')
        .select('*')
        .eq('investor_id', investorId);

      if (error) {
        return { data: null, error };
      }

      const positions = (data || []).map(mapDbPositionToInvestorPosition);
      return { data: positions, error: null };
    });
  }

  /**
   * Update investor profile
   */
  async updateInvestorProfile(
    userId: string,
    updates: Partial<InvestorProfile>
  ): Promise<ApiResponse<InvestorProfile>> {
    // Separate investor updates from profile updates
    const { first_name, last_name, is_admin, avatar_url, totp_enabled, totp_verified, ...investorUpdates } = updates;
    
    const updateResult = await this.execute(async () => {
      // Update investor table
      const { data: investor, error: investorError } = await this.supabase
        .from('investors')
        .update(investorUpdates)
        .eq('id', userId)
        .select()
        .maybeSingle();

      if (investorError || !investor) {
        return { data: null, error: investorError || { message: 'Investor not found', code: 'NOT_FOUND' } as any };
      }

      // Update profile table if profile_id exists and there are profile updates
      if (investor.profile_id && (first_name !== undefined || last_name !== undefined || is_admin !== undefined || avatar_url !== undefined || totp_enabled !== undefined || totp_verified !== undefined)) {
        const profileUpdates: any = {};
        if (first_name !== undefined) profileUpdates.first_name = first_name;
        if (last_name !== undefined) profileUpdates.last_name = last_name;
        if (is_admin !== undefined) profileUpdates.is_admin = is_admin;
        if (avatar_url !== undefined) profileUpdates.avatar_url = avatar_url;
        if (totp_enabled !== undefined) profileUpdates.totp_enabled = totp_enabled;
        if (totp_verified !== undefined) profileUpdates.totp_verified = totp_verified;

        await this.supabase
          .from('profiles')
          .update(profileUpdates)
          .eq('id', investor.profile_id);
      }

      return { data: investor, error: null };
    });

    if (updateResult.error || !updateResult.data) {
      return { data: null, error: updateResult.error || { message: 'Update failed', code: 'UPDATE_FAILED' } as any, success: false };
    }

    // Fetch complete profile after update
    return this.getInvestorProfile(userId);
  }

  /**
   * Create new investor
   */
  async createInvestor(investorData: { name: string; email: string; status?: string }): Promise<ApiResponse<Investor>> {
    return this.execute(async () => {
      const { data, error } = await this.supabase
        .from('investors')
        .insert([{
          name: investorData.name,
          email: investorData.email,
          status: investorData.status || 'pending',
        }])
        .select()
        .maybeSingle();

      if (error) {
        return { data: null, error };
      }

      if (!data) {
        return { data: null, error: { message: 'Failed to create investor', code: 'CREATE_FAILED' } as any };
      }

      return { data: mapDbInvestorToInvestor(data), error: null };
    });
  }

  /**
   * Update investor status
   */
  async updateInvestorStatus(
    investorId: string,
    status: 'active' | 'pending' | 'closed'
  ): Promise<ApiResponse<Investor>> {
    return this.execute(async () => {
      const { data, error } = await this.supabase
        .from('investors')
        .update({ status })
        .eq('id', investorId)
        .select()
        .maybeSingle();

      if (error) {
        return { data: null, error };
      }

      if (!data) {
        return { data: null, error: { message: 'Investor not found', code: 'NOT_FOUND' } as any };
      }

      return { data: mapDbInvestorToInvestor(data), error: null };
    });
  }

  /**
   * Delete investor
   */
  async deleteInvestor(investorId: string): Promise<ApiResponse<void>> {
    return this.execute(async () => {
      const { error } = await this.supabase
        .from('investors')
        .delete()
        .eq('id', investorId);

      return { data: null, error };
    });
  }
}

// Export singleton instance
export const investorService = new InvestorService();
