/**
 * IB Service
 * Handles all IB-related data operations for the IB portal
 */

import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { logError } from "@/lib/logger";
import type {
  IBFundRef,
  IBAllocationCommissionRow,
  PositionWithFundAsset,
  PositionWithFundFull,
  WithdrawalWithFund,
} from "@/types/domains/ibAllocation";

export interface CommissionSummary {
  asset: string;
  totalAmount: number;
  pendingAmount: number;
  paidAmount: number;
}

export interface TopReferral {
  investorId: string;
  investorName: string;
  totalCommissions: Record<string, number>;
}

export interface Referral {
  id: string;
  firstName: string | null;
  lastName: string | null;
  emailMasked: string | null;
  status: string;
  joinedAt: string;
  activeFunds: number;
  holdings: Record<string, number>;
}

export interface PaginatedReferrals {
  referrals: Referral[];
  total: number;
}

export interface ReferralDetail {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email_masked: string | null;
  status: string;
  created_at: string;
  ib_percentage: number;
  ib_parent_id?: string | null;
}

export interface Position {
  fund_id: string;
  shares: number;
  cost_basis: number;
  current_value: number;
  funds: {
    name: string;
    asset: string;
    code: string;
  };
}

export interface Commission {
  id: string;
  effectiveDate: string;
  periodStart: string | null;
  periodEnd: string | null;
  fundName: string;
  asset: string;
  investorName: string;
  investorId: string;
  sourceNetIncome: number;
  ibPercentage: number;
  ibFeeAmount: number;
  payoutStatus: "pending" | "paid";
  paidAt: string | null;
}

export interface PaginatedCommissions {
  commissions: Commission[];
  total: number;
  assets: string[];
}

export interface Allocation {
  id: string;
  fundId: string;
  fundAsset: string;
  sourceInvestorId: string;
  periodStart: string;
  periodEnd: string;
  sourceNetIncome: number;
  ibPercentage: number;
  ibFeeAmount: number;
  source: string;
  createdAt: string;
}

export interface FundPosition {
  fundId: string;
  fundName: string;
  asset: string;
  currentValue: number;
}

export interface Payout {
  id: string;
  amount: number;
  asset: string;
  fundName: string;
  status: string;
  requestedAt: string;
  processedAt: string | null;
}

export interface PaginatedPayouts {
  payouts: Payout[];
  total: number;
}

export interface IBProfile {
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
}

export interface ProfileUpdateData {
  first_name: string;
  last_name: string;
  phone: string;
}

export interface ReferralForDashboard {
  id: string;
  email_masked: string | null;
  first_name: string | null;
  last_name: string | null;
  ib_percentage: number | null;
  created_at: string;
}

// ============ Service Implementation ============

class IBService {
  private async getReferralDirectory(ibId: string) {
    const { data, error } = await supabase.rpc("get_ib_referrals", {
      p_ib_id: ibId,
      p_limit: 1000,
      p_offset: 0,
    });

    if (error) {
      logError("ibService.getReferralDirectory", error, { ibId });
      return new Map<string, { name: string }>();
    }

    const directory = new Map<string, { name: string }>();
    (data || []).forEach((profile: ReferralDetail) => {
      const name =
        `${profile.first_name || ""} ${profile.last_name || ""}`.trim() ||
        profile.email_masked ||
        "Unknown";
      directory.set(profile.id, { name });
    });

    return directory;
  }
  /**
   * Get commission summary grouped by asset for a period
   */
  async getCommissionSummary(ibId: string, startDate?: Date): Promise<CommissionSummary[]> {
    let query = supabase
      .from("ib_allocations")
      .select(
        `
        id,
        ib_fee_amount,
        fund_id,
        effective_date,
        payout_status,
        funds!inner(asset)
      `
      )
      .eq("ib_investor_id", ibId)
      .eq("is_voided", false);

    if (startDate) {
      query = query.gte("effective_date", format(startDate, "yyyy-MM-dd"));
    }

    const { data, error } = await query.limit(1000);

    if (error) {
      logError("ibService.getCommissionSummary", error, { ibId });
      return [];
    }

    // Group by asset with proper pending/paid tracking
    const byAsset: Record<string, { total: number; pending: number; paid: number }> = {};

    interface AllocationRow {
      id: string;
      ib_fee_amount: number;
      fund_id: string;
      effective_date: string;
      payout_status: string | null;
      funds: { asset: string } | null;
    }

    for (const allocation of (data || []) as AllocationRow[]) {
      const asset = allocation.funds?.asset;
      if (!asset) continue;
      if (!byAsset[asset]) {
        byAsset[asset] = { total: 0, pending: 0, paid: 0 };
      }
      const amount = Number(allocation.ib_fee_amount);
      byAsset[asset].total += amount;
      if (allocation.payout_status === "paid") {
        byAsset[asset].paid += amount;
      } else {
        byAsset[asset].pending += amount;
      }
    }

    return Object.entries(byAsset).map(([asset, data]) => ({
      asset,
      totalAmount: data.total,
      pendingAmount: data.pending,
      paidAmount: data.paid,
    }));
  }

  /**
   * Get top referrals by commission for a period
   */
  async getTopReferrals(ibId: string, startDate?: Date, limit = 10): Promise<TopReferral[]> {
    const referralDirectory = await this.getReferralDirectory(ibId);
    let query = supabase
      .from("ib_allocations")
      .select(
        `
        source_investor_id,
        ib_fee_amount,
        funds!inner(asset)
      `
      )
      .eq("ib_investor_id", ibId)
      .eq("is_voided", false);

    if (startDate) {
      query = query.gte("effective_date", format(startDate, "yyyy-MM-dd"));
    }

    const { data, error } = await query;

    if (error) {
      logError("ibService.getTopReferrals", error, { ibId });
      return [];
    }

    // Group by investor
    const byInvestor: Record<string, { name: string; commissions: Record<string, number> }> = {};

    interface TopReferralRow {
      source_investor_id: string;
      ib_fee_amount: number;
      funds: { asset: string } | null;
    }

    for (const allocation of (data || []) as TopReferralRow[]) {
      const investorId = allocation.source_investor_id;
      const asset = allocation.funds?.asset;
      if (!asset) continue;

      if (!byInvestor[investorId]) {
        const name = referralDirectory.get(investorId)?.name || "Unknown";
        byInvestor[investorId] = { name, commissions: {} };
      }

      if (!byInvestor[investorId].commissions[asset]) {
        byInvestor[investorId].commissions[asset] = 0;
      }
      byInvestor[investorId].commissions[asset] += Number(allocation.ib_fee_amount);
    }

    // Sort by total commissions and take top N
    return Object.entries(byInvestor)
      .map(([id, data]) => ({
        investorId: id,
        investorName: data.name,
        totalCommissions: data.commissions,
      }))
      .sort((a, b) => {
        const totalA = Object.values(a.totalCommissions).reduce((sum, v) => sum + v, 0);
        const totalB = Object.values(b.totalCommissions).reduce((sum, v) => sum + v, 0);
        return totalB - totalA;
      })
      .slice(0, limit);
  }

  /**
   * Get referral count for an IB
   */
  async getReferralCount(ibId: string): Promise<number> {
    const { data, error } = await supabase.rpc("get_ib_referral_count", {
      p_ib_id: ibId,
    });

    if (error) {
      logError("ibService.getReferralCount", error, { ibId });
      return 0;
    }

    return Number(data || 0);
  }

  /**
   * Get paginated referrals with positions
   */
  async getReferrals(ibId: string, page: number, pageSize: number): Promise<PaginatedReferrals> {
    const { data: profiles, error } = await supabase.rpc("get_ib_referrals", {
      p_ib_id: ibId,
      p_limit: pageSize,
      p_offset: page * pageSize,
    });

    if (error) {
      logError("ibService.getReferrals", error, { ibId });
      return { referrals: [], total: 0 };
    }

    const referralIds = (profiles || []).map((p: { id: string }) => p.id);

    const total = await this.getReferralCount(ibId);

    // Typed positions with fund join
    let positionsData: PositionWithFundAsset[] = [];
    if (referralIds.length > 0) {
      const { data: positions } = await supabase
        .from("investor_positions")
        .select("investor_id, fund_id, current_value, funds!inner(asset)")
        .in("investor_id", referralIds);
      positionsData = (positions || []) as unknown as PositionWithFundAsset[];
    }

    const referrals: Referral[] = (profiles || []).map((profile) => {
      const investorPositions = positionsData.filter((p) => p.investor_id === profile.id);

      const holdings: Record<string, number> = {};
      const activeFundIds = new Set<string>();

      for (const pos of investorPositions) {
        const asset = pos.funds?.asset;
        const currentValue = Number(pos.current_value);
        if (!asset) continue;
        if (currentValue > 0) {
          activeFundIds.add(pos.fund_id);
          if (!holdings[asset]) holdings[asset] = 0;
          holdings[asset] += currentValue;
        }
      }

      return {
        id: profile.id,
        firstName: profile.first_name,
        lastName: profile.last_name,
        emailMasked: profile.email_masked,
        status: profile.status || "active",
        joinedAt: profile.created_at,
        activeFunds: activeFundIds.size,
        holdings,
      };
    });

    return { referrals, total };
  }

  /**
   * Get referrals for dashboard (simpler version)
   */
  async getReferralsForDashboard(ibId: string): Promise<ReferralForDashboard[]> {
    const { data, error } = await supabase.rpc("get_ib_referrals", {
      p_ib_id: ibId,
      p_limit: 50,
      p_offset: 0,
    });

    if (error) {
      logError("ibService.getReferralsForDashboard", error, { ibId });
      return [];
    }

    return data || [];
  }

  /**
   * Get referral detail with ownership verification
   */
  async getReferralDetail(referralId: string, ibId: string): Promise<ReferralDetail | null> {
    const { data, error } = await supabase.rpc("get_ib_referral_detail", {
      p_ib_id: ibId,
      p_referral_id: referralId,
    });

    const record = (data || [])[0] as ReferralDetail | undefined;

    if (error || !record) {
      logError("ibService.getReferralDetail", error, { referralId, ibId });
      return null;
    }

    return record;
  }

  /**
   * Get positions for a referral
   */
  async getReferralPositions(investorId: string): Promise<Position[]> {
    const { data, error } = await supabase
      .from("investor_positions")
      .select(
        `
        fund_id,
        shares,
        cost_basis,
        current_value,
        funds!fk_investor_positions_fund(name, asset, code)
      `
      )
      .eq("investor_id", investorId);

    if (error) {
      logError("ibService.getReferralPositions", error, { investorId });
      return [];
    }

    return (data || []) as Position[];
  }

  /**
   * Get commission history for a referral
   */
  async getReferralCommissions(referralId: string, ibId: string, limit = 50): Promise<any[]> {
    const { data, error } = await supabase
      .from("ib_allocations")
      .select(
        `
        id,
        ib_fee_amount,
        ib_percentage,
        source_net_income,
        effective_date,
        period_start,
        period_end,
        funds!inner(name, asset)
      `
      )
      .eq("ib_investor_id", ibId)
      .eq("source_investor_id", referralId)
      .eq("is_voided", false)
      .order("effective_date", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching commissions:", error);
      return [];
    }

    return data || [];
  }

  /**
   * Get paginated commissions with filters
   */
  async getCommissions(
    ibId: string,
    page: number,
    pageSize: number,
    dateRange?: { start: Date | null; end: Date | null }
  ): Promise<PaginatedCommissions> {
    const referralDirectory = await this.getReferralDirectory(ibId);
    let query = supabase
      .from("ib_allocations")
      .select(
        `
        id,
        ib_fee_amount,
        ib_percentage,
        source_net_income,
        effective_date,
        period_start,
        period_end,
        payout_status,
        paid_at,
        source_investor_id,
        funds!inner(name, asset)
      `,
        { count: "exact" }
      )
      .eq("ib_investor_id", ibId)
      .eq("is_voided", false)
      .order("effective_date", { ascending: false });

    if (dateRange?.start) {
      query = query.gte("effective_date", format(dateRange.start, "yyyy-MM-dd"));
    }
    if (dateRange?.end) {
      query = query.lte("effective_date", format(dateRange.end, "yyyy-MM-dd"));
    }

    query = query.range(page * pageSize, (page + 1) * pageSize - 1);

    const { data: allocations, error, count } = await query;

    if (error) {
      console.error("Error fetching commissions:", error);
      return { commissions: [], total: 0, assets: [] };
    }

    const commissions: Commission[] = (
      (allocations || []) as unknown as IBAllocationCommissionRow[]
    ).map((alloc) => {
      const fund: IBFundRef | null = alloc.funds;
      const investorName = referralDirectory.get(alloc.source_investor_id)?.name || "Unknown";

      return {
        id: alloc.id,
        effectiveDate: alloc.effective_date,
        periodStart: alloc.period_start,
        periodEnd: alloc.period_end,
        fundName: fund?.name || "Unknown Fund",
        asset: fund?.asset || "Unknown",
        investorName,
        investorId: alloc.source_investor_id,
        sourceNetIncome: Number(alloc.source_net_income),
        ibPercentage: Number(alloc.ib_percentage),
        ibFeeAmount: Number(alloc.ib_fee_amount),
        payoutStatus: (alloc.payout_status || "pending") as "pending" | "paid",
        paidAt: alloc.paid_at || null,
      };
    });

    const uniqueAssets = [...new Set(commissions.map((c) => c.asset))];

    return {
      commissions,
      total: count || 0,
      assets: uniqueAssets,
    };
  }

  /**
   * Get allocations for dashboard
   */
  async getAllocations(ibId: string): Promise<Allocation[]> {
    const { data, error } = await supabase
      .from("ib_allocations")
      .select(
        `
        id,
        fund_id,
        source_investor_id,
        period_start,
        period_end,
        source_net_income,
        ib_percentage,
        ib_fee_amount,
        source,
        created_at,
        funds:fund_id (asset)
      `
      )
      .eq("ib_investor_id", ibId)
      .eq("is_voided", false)
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      console.error("Error fetching allocations:", error);
      return [];
    }

    // Type the allocation results
    interface AllocationJoinRow {
      id: string;
      fund_id: string | null;
      source_investor_id: string;
      period_start: string | null;
      period_end: string | null;
      source_net_income: number;
      ib_percentage: number;
      ib_fee_amount: number;
      source: string | null;
      created_at: string | null;
      funds: { asset: string } | null;
    }

    return ((data || []) as unknown as AllocationJoinRow[]).map((a) => ({
      id: a.id,
      fundId: a.fund_id || "",
      fundAsset: a.funds?.asset || "USDT",
      sourceInvestorId: a.source_investor_id,
      periodStart: a.period_start || "",
      periodEnd: a.period_end || "",
      sourceNetIncome: Number(a.source_net_income || 0),
      ibPercentage: Number(a.ib_percentage || 0),
      ibFeeAmount: Number(a.ib_fee_amount || 0),
      source: a.source || "unknown",
      createdAt: a.created_at || "",
    }));
  }

  /**
   * Get IB's own fund positions
   */
  async getIBPositions(ibId: string): Promise<FundPosition[]> {
    const { data, error } = await supabase
      .from("investor_positions")
      .select(
        `
        fund_id,
        current_value,
        cost_basis,
        funds:fund_id (name, asset)
      `
      )
      .eq("investor_id", ibId)
      .gt("current_value", 0);

    if (error) {
      console.error("Error fetching IB positions:", error);
      return [];
    }

    // Type the position results
    const typedPositions = (data || []) as unknown as PositionWithFundFull[];

    return typedPositions.map((p) => ({
      fundId: p.fund_id,
      fundName: p.funds?.name || p.fund_id,
      asset: p.funds?.asset || "USDT",
      currentValue: Number(p.current_value || 0),
    }));
  }

  /**
   * Get payout history (withdrawal requests)
   */
  async getPayoutHistory(ibId: string, page: number, pageSize: number): Promise<PaginatedPayouts> {
    const {
      data: withdrawals,
      error,
      count,
    } = await supabase
      .from("withdrawal_requests")
      .select(
        `
        id,
        requested_amount,
        processed_amount,
        status,
        request_date,
        processed_at,
        funds!inner(name, asset)
      `,
        { count: "exact" }
      )
      .eq("investor_id", ibId)
      .order("request_date", { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error("Error fetching payout history:", error);
      return { payouts: [], total: 0 };
    }

    // Type the withdrawal results
    const typedWithdrawals = (withdrawals || []) as unknown as WithdrawalWithFund[];

    const payouts: Payout[] = typedWithdrawals.map((w) => {
      const fund: IBFundRef | null = w.funds;
      return {
        id: w.id,
        amount: Number(w.processed_amount || w.requested_amount),
        asset: fund?.asset || "USDT",
        fundName: fund?.name || "Unknown",
        status: w.status,
        requestedAt: w.request_date,
        processedAt: w.processed_at,
      };
    });

    return { payouts, total: count || 0 };
  }

  /**
   * Get IB profile
   */
  async getIBProfile(ibId: string): Promise<IBProfile | null> {
    const { data, error } = await supabase
      .from("profiles")
      .select("first_name, last_name, email, phone")
      .eq("id", ibId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching profile:", error);
      return null;
    }

    return data;
  }

  /**
   * Update IB profile
   */
  async updateIBProfile(ibId: string, data: ProfileUpdateData): Promise<void> {
    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
      })
      .eq("id", ibId);

    if (error) throw error;
  }
}

export const ibService = new IBService();
