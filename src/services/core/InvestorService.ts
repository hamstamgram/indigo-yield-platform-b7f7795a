/**
 * Investor Service
 * Handles all investor-related operations
 */

import { ApiClient, ApiResponse } from './ApiClient';
import type { Investor, InvestorProfile, InvestorPosition } from '@/types/domains';

export interface InvestorFilters {
  status?: 'Active' | 'Pending' | 'Closed';
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
        query = query.or(`email.ilike.%${filters.search}%,first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%`);
      }

      return await query;
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
        .single();

      return { data, error };
    });
  }

  /**
   * Get investor profile
   */
  async getInvestorProfile(userId: string): Promise<ApiResponse<InvestorProfile>> {
    return this.execute(async () => {
      const { data, error } = await this.supabase
        .from('investors')
        .select('*')
        .eq('id', userId)
        .single();

      return { data, error };
    });
  }

  /**
   * Get investor positions
   */
  async getInvestorPositions(investorId: string): Promise<ApiResponse<InvestorPosition[]>> {
    return this.execute(async () => {
      return await this.supabase
        .from('investor_positions')
        .select('*')
        .eq('investor_id', investorId);
    });
  }

  /**
   * Update investor profile
   */
  async updateInvestorProfile(
    userId: string,
    updates: Partial<InvestorProfile>
  ): Promise<ApiResponse<InvestorProfile>> {
    return this.execute(async () => {
      const { data, error } = await this.supabase
        .from('investors')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      return { data, error };
    });
  }

  /**
   * Create new investor
   */
  async createInvestor(investor: Partial<Investor>): Promise<ApiResponse<Investor>> {
    return this.execute(async () => {
      const { data, error } = await this.supabase
        .from('investors')
        .insert([investor])
        .select()
        .single();

      return { data, error };
    });
  }

  /**
   * Update investor status
   */
  async updateInvestorStatus(
    investorId: string,
    status: 'Active' | 'Pending' | 'Closed'
  ): Promise<ApiResponse<Investor>> {
    return this.execute(async () => {
      const { data, error } = await this.supabase
        .from('investors')
        .update({ status })
        .eq('id', investorId)
        .select()
        .single();

      return { data, error };
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
