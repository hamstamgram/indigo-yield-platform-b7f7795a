/**
 * IB Allocation Service
 * Handles IB fee allocation calculations during yield distribution
 * 
 * This module is responsible for calculating the IB share of investor yields
 * and is primarily used by the yield distribution process.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AumPurpose = Database["public"]["Enums"]["aum_purpose"];

// ============ Types ============

export interface IBAllocationInput {
  sourceInvestorId: string;
  sourceNetIncome: number;
  fundId: string;
  periodStart: string;
  periodEnd: string;
  purpose: AumPurpose;
  distributionId?: string;
}

export interface IBAllocationResult {
  ibInvestorId: string;
  ibFeeAmount: number;
  ibPercentage: number;
  sourceNetIncome: number;
}

export interface InvestorIBConfig {
  ibParentId: string | null;
  ibPercentage: number | null;
}

// ============ Service ============

class IBAllocationService {
  /**
   * Get IB configuration for an investor
   */
  async getInvestorIBConfig(investorId: string): Promise<InvestorIBConfig> {
    const { data, error } = await supabase
      .from("profiles")
      .select("ib_parent_id, ib_percentage")
      .eq("id", investorId)
      .single();

    if (error) {
      console.error("Error fetching IB config:", error);
      return { ibParentId: null, ibPercentage: null };
    }

    return {
      ibParentId: data?.ib_parent_id ?? null,
      ibPercentage: data?.ib_percentage ?? null,
    };
  }

  /**
   * Calculate IB allocation for an investor's yield
   * Returns null if investor has no IB parent or no IB percentage configured
   */
  async calculateIBAllocation(input: IBAllocationInput): Promise<IBAllocationResult | null> {
    const config = await this.getInvestorIBConfig(input.sourceInvestorId);

    if (!config.ibParentId || !config.ibPercentage || config.ibPercentage <= 0) {
      return null;
    }

    // IB fee is calculated as percentage of the source investor's net income
    const ibFeeAmount = (input.sourceNetIncome * config.ibPercentage) / 100;

    return {
      ibInvestorId: config.ibParentId,
      ibFeeAmount,
      ibPercentage: config.ibPercentage,
      sourceNetIncome: input.sourceNetIncome,
    };
  }

  /**
   * Get all investors who have a specific IB as their parent
   */
  async getIBReferrals(ibId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("ib_parent_id", ibId);

    if (error) {
      console.error("Error fetching IB referrals:", error);
      return [];
    }

    return (data || []).map((p) => p.id);
  }

  /**
   * Get historical IB allocations for a specific distribution
   */
  async getAllocationsForDistribution(distributionId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from("ib_allocations")
      .select(`
        id,
        ib_investor_id,
        source_investor_id,
        ib_fee_amount,
        ib_percentage,
        source_net_income,
        effective_date,
        payout_status
      `)
      .eq("distribution_id", distributionId)
      .eq("is_voided", false);

    if (error) {
      console.error("Error fetching allocations:", error);
      return [];
    }

    return data || [];
  }
}

export const ibAllocationService = new IBAllocationService();
