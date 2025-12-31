/**
 * IB Service
 * Handles all IB-related data operations for the IB portal
 */

import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

// ============ Types ============

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
  email: string;
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
  email: string;
  status: string;
  created_at: string;
  ib_parent_id: string;
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
  payoutStatus: 'pending' | 'paid';
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
  email: string;
  first_name: string | null;
  last_name: string | null;
  ib_percentage: number | null;
  created_at: string;
}

// ============ Service Implementation ============

class IBService {
  /**
   * Get commission summary grouped by asset for a period
   */
  async getCommissionSummary(ibId: string, startDate?: Date): Promise<CommissionSummary[]> {
    let query = supabase
      .from("ib_allocations")
      .select(`
        id,
        ib_fee_amount,
        fund_id,
        effective_date,
        payout_status,
        funds!inner(asset)
      `)
      .eq("ib_investor_id", ibId);

    if (startDate) {
      query = query.gte("effective_date", format(startDate, "yyyy-MM-dd"));
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching commission summary:", error);
      return [];
    }

    // Group by asset with proper pending/paid tracking
    const byAsset: Record<string, { total: number; pending: number; paid: number }> = {};
    
    for (const allocation of data || []) {
      const asset = (allocation.funds as any)?.asset;
      if (!asset) continue;
      if (!byAsset[asset]) {
        byAsset[asset] = { total: 0, pending: 0, paid: 0 };
      }
      const amount = Number(allocation.ib_fee_amount);
      byAsset[asset].total += amount;
      if ((allocation as any).payout_status === 'paid') {
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
    let query = supabase
      .from("ib_allocations")
      .select(`
        source_investor_id,
        ib_fee_amount,
        funds!inner(asset),
        profiles!ib_allocations_source_investor_id_fkey(
          first_name,
          last_name,
          email
        )
      `)
      .eq("ib_investor_id", ibId);

    if (startDate) {
      query = query.gte("effective_date", format(startDate, "yyyy-MM-dd"));
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching top referrals:", error);
      return [];
    }

    // Group by investor
    const byInvestor: Record<string, { name: string; commissions: Record<string, number> }> = {};

    for (const allocation of data || []) {
      const investorId = allocation.source_investor_id;
      const profile = allocation.profiles as any;
      const asset = (allocation.funds as any)?.asset;
      if (!asset) continue;

      if (!byInvestor[investorId]) {
        const name = profile
          ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || profile.email
          : "Unknown";
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
    const { count, error } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("ib_parent_id", ibId);

    if (error) {
      console.error("Error fetching referral count:", error);
      return 0;
    }

    return count || 0;
  }

  /**
   * Get paginated referrals with positions
   */
  async getReferrals(ibId: string, page: number, pageSize: number): Promise<PaginatedReferrals> {
    const { data: profiles, error, count } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email, status, created_at", { count: "exact" })
      .eq("ib_parent_id", ibId)
      .order("created_at", { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error("Error fetching referrals:", error);
      return { referrals: [], total: 0 };
    }

    const referralIds = profiles?.map((p) => p.id) || [];
    
    let positionsData: any[] = [];
    if (referralIds.length > 0) {
      const { data: positions } = await supabase
        .from("investor_positions")
        .select("investor_id, fund_id, current_value, funds!inner(asset)")
        .in("investor_id", referralIds);
      positionsData = positions || [];
    }

    const referrals: Referral[] = (profiles || []).map((profile) => {
      const investorPositions = positionsData.filter((p) => p.investor_id === profile.id);
      
      const holdings: Record<string, number> = {};
      const activeFundIds = new Set<string>();
      
      for (const pos of investorPositions) {
        const asset = (pos.funds as any)?.asset;
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
        email: profile.email,
        status: profile.status || "active",
        joinedAt: profile.created_at,
        activeFunds: activeFundIds.size,
        holdings,
      };
    });

    return { referrals, total: count || 0 };
  }

  /**
   * Get referrals for dashboard (simpler version)
   */
  async getReferralsForDashboard(ibId: string): Promise<ReferralForDashboard[]> {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, first_name, last_name, ib_percentage, created_at")
      .eq("ib_parent_id", ibId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching referrals:", error);
      return [];
    }
    
    return data || [];
  }

  /**
   * Get referral detail with ownership verification
   */
  async getReferralDetail(referralId: string, ibId: string): Promise<ReferralDetail | null> {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email, status, created_at, ib_parent_id")
      .eq("id", referralId)
      .eq("ib_parent_id", ibId)
      .maybeSingle();

    if (error || !data) {
      console.error("Error fetching referral:", error);
      return null;
    }

    return data;
  }

  /**
   * Get positions for a referral
   */
  async getReferralPositions(investorId: string): Promise<Position[]> {
    const { data, error } = await supabase
      .from("investor_positions")
      .select(`
        fund_id,
        shares,
        cost_basis,
        current_value,
        funds!investor_positions_fund_id_fkey(name, asset, code)
      `)
      .eq("investor_id", investorId);

    if (error) {
      console.error("Error fetching positions:", error);
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
      .select(`
        id,
        ib_fee_amount,
        ib_percentage,
        source_net_income,
        effective_date,
        period_start,
        period_end,
        funds!inner(name, asset)
      `)
      .eq("ib_investor_id", ibId)
      .eq("source_investor_id", referralId)
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
    let query = supabase
      .from("ib_allocations")
      .select(`
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
        funds!inner(name, asset),
        profiles!ib_allocations_source_investor_id_fkey(
          first_name,
          last_name,
          email
        )
      `, { count: "exact" })
      .eq("ib_investor_id", ibId)
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

    const commissions: Commission[] = (allocations || []).map((alloc) => {
      const fund = alloc.funds as any;
      const profile = alloc.profiles as any;
      const investorName = profile
        ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || profile.email
        : "Unknown";

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
        payoutStatus: ((alloc as any).payout_status || 'pending') as 'pending' | 'paid',
        paidAt: (alloc as any).paid_at || null,
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
      .select(`
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
      `)
      .eq("ib_investor_id", ibId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching allocations:", error);
      return [];
    }

    return (data || []).map((a) => ({
      id: a.id,
      fundId: a.fund_id || "",
      fundAsset: (a.funds as any)?.asset || "USDT",
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
      .select(`
        fund_id,
        current_value,
        cost_basis,
        funds:fund_id (name, asset)
      `)
      .eq("investor_id", ibId)
      .gt("current_value", 0);

    if (error) {
      console.error("Error fetching IB positions:", error);
      return [];
    }

    return (data || []).map((p) => ({
      fundId: p.fund_id,
      fundName: (p.funds as any)?.name || p.fund_id,
      asset: (p.funds as any)?.asset || "USDT",
      currentValue: Number(p.current_value || 0),
    }));
  }

  /**
   * Get payout history (withdrawal requests)
   */
  async getPayoutHistory(ibId: string, page: number, pageSize: number): Promise<PaginatedPayouts> {
    const { data: withdrawals, error, count } = await supabase
      .from("withdrawal_requests")
      .select(`
        id,
        requested_amount,
        processed_amount,
        status,
        request_date,
        processed_at,
        funds!inner(name, asset)
      `, { count: "exact" })
      .eq("investor_id", ibId)
      .order("request_date", { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error("Error fetching payout history:", error);
      return { payouts: [], total: 0 };
    }

    const payouts: Payout[] = (withdrawals || []).map((w) => {
      const fund = w.funds as any;
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
