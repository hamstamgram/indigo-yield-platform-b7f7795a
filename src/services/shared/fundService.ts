/**
 * Fund Service - Shared fund operations
 * Wraps admin fund service with additional convenience methods
 */

import { supabase } from "@/integrations/supabase/client";
import * as adminFundService from "@/services/admin/fundService";

// Re-export types
export type { Fund, DailyNav, FundKPI } from "@/services/admin/fundService";

class FundService {
  /**
   * Get all funds
   */
  async getAllFunds() {
    return adminFundService.listFunds();
  }

  /**
   * Get active funds
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
   * Get fund by ID
   */
  async getFundById(fundId: string) {
    return adminFundService.getFund(fundId);
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
        lock_period_days: 0,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update fund status
   */
  async updateFundStatus(fundId: string, status: string) {
    return adminFundService.updateFund(fundId, { status } as any);
  }

  /**
   * Update fund
   */
  async updateFund(fundId: string, updates: Partial<adminFundService.Fund>) {
    return adminFundService.updateFund(fundId, updates);
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

  /**
   * Get fund KPIs
   */
  async getFundKPIs() {
    return adminFundService.getFundKPIs();
  }

  /**
   * Get latest NAV for a fund
   */
  async getLatestNav(fundId: string) {
    return adminFundService.getLatestNav(fundId);
  }

  /**
   * Get fund performance
   */
  async getFundPerformance(fundId: string) {
    return adminFundService.getFundPerformance(fundId);
  }
}

export const fundService = new FundService();
