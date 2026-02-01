/**
 * IB Allocation Service
 * Handles IB fee allocation calculations during yield distribution
 *
 * This module is responsible for calculating the IB share of investor yields
 * and is primarily used by the yield distribution process.
 *
 * IMPORTANT: Uses Decimal.js for financial precision
 */

import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/lib/logger";
import type { Database } from "@/integrations/supabase/types";
import { formatDateForDB } from "@/utils/dateUtils";
import { toDecimal } from "@/utils/financial";

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

export interface IBAllocation {
  id: string;
  periodId: string | null;
  ibInvestorId: string;
  sourceInvestorId: string;
  fundId: string | null;
  sourceNetIncome: number;
  ibPercentage: number;
  ibFeeAmount: number;
  effectiveDate: string;
  createdAt: string;
}

// ============ Pure Functions ============

/**
 * Calculate IB allocation for a given net income (pure function, no DB access)
 * Uses Decimal.js for financial precision to avoid floating-point errors
 */
export function calculateIBAllocation(
  netIncome: number | string,
  ibPercentage: number | string
): { ibFee: number; adjustedNetIncome: number } {
  const netIncomeDec = toDecimal(netIncome);
  const ibPercentageDec = toDecimal(ibPercentage);

  if (ibPercentageDec.lte(0) || netIncomeDec.lte(0)) {
    return { ibFee: 0, adjustedNetIncome: netIncomeDec.toNumber() };
  }

  // Calculate IB fee: netIncome * (ibPercentage / 100)
  const ibFeeDec = netIncomeDec.times(ibPercentageDec).dividedBy(100);
  const adjustedNetIncomeDec = netIncomeDec.minus(ibFeeDec);

  return {
    ibFee: ibFeeDec.toNumber(),
    adjustedNetIncome: adjustedNetIncomeDec.toNumber(),
  };
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
      .maybeSingle();

    if (error) {
      logError("ibAllocations.getInvestorIBConfig", error, { investorId });
      return { ibParentId: null, ibPercentage: null };
    }

    if (!data) {
      return { ibParentId: null, ibPercentage: null };
    }

    return {
      ibParentId: data.ib_parent_id ?? null,
      ibPercentage: data.ib_percentage ?? null,
    };
  }

  /**
   * Calculate IB allocation for an investor's yield (async version with DB lookup)
   * Returns null if investor has no IB parent or no IB percentage configured
   * Uses Decimal.js for financial precision
   */
  async calculateIBAllocationAsync(input: IBAllocationInput): Promise<IBAllocationResult | null> {
    const config = await this.getInvestorIBConfig(input.sourceInvestorId);

    if (!config.ibParentId || !config.ibPercentage || config.ibPercentage <= 0) {
      return null;
    }

    // IB fee is calculated as percentage of the source investor's net income
    // Using Decimal.js for precision
    const sourceNetIncomeDec = toDecimal(input.sourceNetIncome);
    const ibPercentageDec = toDecimal(config.ibPercentage);
    const ibFeeAmountDec = sourceNetIncomeDec.times(ibPercentageDec).dividedBy(100);

    return {
      ibInvestorId: config.ibParentId,
      ibFeeAmount: ibFeeAmountDec.toNumber(),
      ibPercentage: config.ibPercentage,
      sourceNetIncome: input.sourceNetIncome,
    };
  }

  /**
   * Get all investors who have a specific IB as their parent
   */
  async getIBReferralIds(ibId: string): Promise<string[]> {
    const { data, error } = await supabase.rpc("get_ib_referrals", {
      p_ib_id: ibId,
      p_limit: 1000,
      p_offset: 0,
    });

    if (error) {
      logError("ibAllocations.getIBReferralIds", error);
      return [];
    }

    return (data || []).map((p: { id: string }) => p.id);
  }

  /**
   * Get historical IB allocations for a specific distribution
   */
  async getAllocationsForDistribution(distributionId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from("ib_allocations")
      .select(
        `
        id,
        ib_investor_id,
        source_investor_id,
        ib_fee_amount,
        ib_percentage,
        source_net_income,
        effective_date,
        payout_status
      `
      )
      .eq("distribution_id", distributionId)
      .eq("is_voided", false);

    if (error) {
      logError("ibAllocations.getAllocationsForDistribution", error, { distributionId });
      return [];
    }

    return data || [];
  }

  /**
   * Record an IB allocation in the database
   */
  async recordIBAllocation(
    ibInvestorId: string,
    sourceInvestorId: string,
    sourceNetIncome: number,
    ibPercentage: number,
    ibFeeAmount: number,
    effectiveDate: Date,
    fundId?: string,
    periodId?: string,
    createdBy?: string
  ): Promise<{ success: boolean; allocationId?: string; error?: string }> {
    const { data, error } = await supabase
      .from("ib_allocations")
      .insert({
        ib_investor_id: ibInvestorId,
        source_investor_id: sourceInvestorId,
        source_net_income: sourceNetIncome,
        ib_percentage: ibPercentage,
        ib_fee_amount: ibFeeAmount,
        effective_date: formatDateForDB(effectiveDate),
        fund_id: fundId || null,
        period_id: periodId || null,
        created_by: createdBy || null,
      })
      .select("id")
      .single();

    if (error) {
      logError("ib.recordIBAllocation", error, { ibInvestorId, sourceInvestorId });
      return { success: false, error: error.message };
    }

    return { success: true, allocationId: data.id };
  }

  /**
   * Get all IB allocations for an IB (where they receive fees)
   */
  async getIBAllocationsForIB(
    ibInvestorId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<IBAllocation[]> {
    let query = supabase
      .from("ib_allocations")
      .select("*")
      .eq("ib_investor_id", ibInvestorId)
      .eq("is_voided", false)
      .order("effective_date", { ascending: false })
      .order("id", { ascending: false })
      .limit(500);

    if (startDate) {
      query = query.gte("effective_date", formatDateForDB(startDate));
    }
    if (endDate) {
      query = query.lte("effective_date", formatDateForDB(endDate));
    }

    const { data, error } = await query;

    if (error) {
      logError("ib.getIBAllocationsForIB", error, { ibInvestorId });
      return [];
    }

    return (data || []).map((row) => ({
      id: row.id,
      periodId: row.period_id,
      ibInvestorId: row.ib_investor_id,
      sourceInvestorId: row.source_investor_id,
      fundId: row.fund_id,
      sourceNetIncome: Number(row.source_net_income),
      ibPercentage: Number(row.ib_percentage),
      ibFeeAmount: Number(row.ib_fee_amount),
      effectiveDate: row.effective_date,
      createdAt: row.created_at,
    }));
  }
}

export const ibAllocationService = new IBAllocationService();
