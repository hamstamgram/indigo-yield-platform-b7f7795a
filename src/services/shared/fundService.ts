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
