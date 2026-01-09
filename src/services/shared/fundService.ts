/**
 * Fund Service - Shared fund operations
 * Provides a unified API for fund operations, delegating to admin functions
 */

import { supabase } from "@/integrations/supabase/client";
import * as adminFundService from "@/services/admin/fundService";
import type { FundStatus } from "@/types/domains/fund";

// Re-export types from canonical source
export type { Fund, FundRef, FundStatus } from "@/types/domains/fund";
export type { DailyNav, FundKPI } from "@/services/admin/fundService";

class FundService {
  // Delegate to admin service functions
  getAllFunds = () => adminFundService.listFunds();
  getFundById = (fundId: string) => adminFundService.getFund(fundId);
  updateFund = (fundId: string, updates: Parameters<typeof adminFundService.updateFund>[1]) => 
    adminFundService.updateFund(fundId, updates);
  updateFundStatus = (fundId: string, status: FundStatus) => 
    adminFundService.updateFund(fundId, { status });
  getFundKPIs = () => adminFundService.getFundKPIs();
  getLatestNav = (fundId: string) => adminFundService.getLatestNav(fundId);
  getFundPerformance = (fundId: string) => adminFundService.getFundPerformance(fundId);

  /**
   * Get active funds (minimal fields for dropdowns)
   */
  async getActiveFunds(): Promise<Array<{ id: string; code: string; name: string; asset: string }>> {
    const { data, error } = await supabase
      .from("funds")
      .select("id, code, name, asset")
      .eq("status", "active")
      .order("name");

    if (error) throw error;
    return data || [];
  }

  /**
   * Get multiple funds by IDs
   */
  async getFundsByIds(fundIds: string[]) {
    if (!fundIds.length) return [];
    
    const { data, error } = await supabase
      .from("funds")
      .select("*")
      .in("id", fundIds);

    if (error) throw error;
    return data || [];
  }

  /**
   * Get fund by asset symbol
   */
  async getFundByAsset(asset: string) {
    const { data, error } = await supabase
      .from("funds")
      .select("*")
      .eq("asset", asset)
      .eq("status", "active")
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  /**
   * Check if fund code exists
   */
  async codeExists(code: string): Promise<boolean> {
    const { data } = await supabase
      .from("funds")
      .select("id")
      .eq("code", code)
      .maybeSingle();
    return !!data;
  }

  /**
   * Create a fund
   */
  async createFund(input: {
    code: string;
    name: string;
    asset: string;
    inception_date: string;
    logo_url?: string | null;
  }) {
    const { data, error } = await supabase
      .from("funds")
      .insert({
        code: input.code,
        name: input.name,
        asset: input.asset,
        fund_class: input.asset,
        inception_date: input.inception_date,
        status: "active",
        logo_url: input.logo_url || null,
        mgmt_fee_bps: 200,
        perf_fee_bps: 2000,
        min_investment: 0,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Deactivate fund
   */
  async deactivateFund(fundId: string) {
    const { error } = await supabase
      .from("funds")
      .update({ status: "inactive" })
      .eq("id", fundId);

    if (error) throw error;
  }
}

export const fundService = new FundService();
