import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Investor = Database['public']['Tables']['investors']['Row'];
type WithdrawalRequest = Database['public']['Tables']['withdrawal_requests']['Row'];

export interface AdminDashboardStats {
  totalAUM: number;
  investorCount: number;
  pendingWithdrawals: number;
  dailyInterest: number;
  recentActivity: any[];
}

export interface InvestorSummary extends Investor {
  profile: Profile;
  totalAUM: number;
  positionCount: number;
}

/**
 * Fetch admin dashboard statistics
 */
export async function fetchAdminDashboardStats(): Promise<AdminDashboardStats> {
  try {
    // Fetch total AUM from positions
    const { data: positions } = await supabase
      .from('positions')
      .select('current_balance')
      .gt('current_balance', 0);

    const totalAUM = positions?.reduce((sum, pos) => sum + Number(pos.current_balance), 0) || 0;

    // Fetch investor count
    const { count: investorCount } = await supabase
      .from('investors')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    // Fetch pending withdrawals
    const { count: pendingWithdrawals } = await supabase
      .from('withdrawal_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // Calculate estimated daily interest (7.2% APY)
    const dailyInterest = totalAUM * 0.072 / 365;

    // Fetch recent activity (transactions, withdrawals, etc.)
    const { data: recentActivity } = await supabase
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    return {
      totalAUM,
      investorCount: investorCount || 0,
      pendingWithdrawals: pendingWithdrawals || 0,
      dailyInterest,
      recentActivity: recentActivity || []
    };
  } catch (error) {
    console.error('Error fetching admin dashboard stats:', error);
    throw new Error('Failed to fetch admin dashboard statistics');
  }
}

/**
 * Fetch all investors with summary data
 */
export async function fetchInvestorsWithSummary(): Promise<InvestorSummary[]> {
  try {
    const { data: investors, error } = await supabase
      .from('investors')
      .select(`
        *,
        profiles!investors_profile_id_fkey (*)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Fetch position summaries for each investor
    const investorSummaries = await Promise.all(
      (investors || []).map(async (investor) => {
        const { data: positions } = await supabase
          .from('investor_positions')
          .select('current_value')
          .eq('investor_id', investor.id)
          .gt('current_value', 0);

        const totalAUM = positions?.reduce((sum, pos) => sum + Number(pos.current_value), 0) || 0;
        const positionCount = positions?.length || 0;

        return {
          ...investor,
          profile: (investor as any).profiles,
          totalAUM,
          positionCount
        };
      })
    );

    return investorSummaries;
  } catch (error) {
    console.error('Error fetching investors with summary:', error);
    throw new Error('Failed to fetch investors');
  }
}

/**
 * Fetch pending withdrawal requests
 */
export async function fetchPendingWithdrawals(): Promise<WithdrawalRequest[]> {
  try {
    const { data, error } = await supabase
      .from('withdrawal_requests')
      .select(`
        *,
        investor:investors!withdrawal_requests_investor_id_fkey (*),
        fund:funds!withdrawal_requests_fund_id_fkey (*)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching pending withdrawals:', error);
    throw new Error('Failed to fetch pending withdrawals');
  }
}

/**
 * Approve a withdrawal request
 */
export async function approveWithdrawal(
  requestId: string, 
  approvedAmount?: number, 
  adminNotes?: string
): Promise<void> {
  try {
    const { error } = await supabase.rpc('approve_withdrawal', {
      p_request_id: requestId,
      p_approved_amount: approvedAmount,
      p_admin_notes: adminNotes
    });

    if (error) throw error;
  } catch (error) {
    console.error('Error approving withdrawal:', error);
    throw new Error('Failed to approve withdrawal');
  }
}

/**
 * Reject a withdrawal request
 */
export async function rejectWithdrawal(
  requestId: string, 
  reason: string, 
  adminNotes?: string
): Promise<void> {
  try {
    const { error } = await supabase.rpc('reject_withdrawal', {
      p_request_id: requestId,
      p_reason: reason,
      p_admin_notes: adminNotes
    });

    if (error) throw error;
  } catch (error) {
    console.error('Error rejecting withdrawal:', error);
    throw new Error('Failed to reject withdrawal');
  }
}

/**
 * Update investor status
 */
export async function updateInvestorStatus(
  investorId: string, 
  status: string,
  notes?: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('investors')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', investorId);

    if (error) throw error;

    // Log the status change
    if (notes) {
      await supabase.from('audit_log').insert({
        action: 'UPDATE_INVESTOR_STATUS',
        entity: 'investors',
        entity_id: investorId,
        new_values: { status, notes }
      });
    }
  } catch (error) {
    console.error('Error updating investor status:', error);
    throw new Error('Failed to update investor status');
  }
}

/**
 * Create balance adjustment
 */
export async function createBalanceAdjustment(adjustment: {
  userId: string;
  fundId?: string;
  amount: number;
  reason: string;
  notes?: string;
  currency?: string;
}): Promise<void> {
  try {
    const { error } = await supabase
      .from('balance_adjustments')
      .insert({
        user_id: adjustment.userId,
        fund_id: adjustment.fundId,
        amount: adjustment.amount,
        reason: adjustment.reason,
        notes: adjustment.notes,
        currency: adjustment.currency || 'USD',
        created_by: (await supabase.auth.getUser()).data.user?.id || ''
      });

    if (error) throw error;
  } catch (error) {
    console.error('Error creating balance adjustment:', error);
    throw new Error('Failed to create balance adjustment');
  }
}

/**
 * Error handling wrapper for admin API calls
 */
export function withAdminErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      console.error('Admin API Error:', error);
      throw error;
    }
  };
}

// Export wrapped functions for additional error handling
export const safeFetchAdminDashboardStats = withAdminErrorHandling(fetchAdminDashboardStats);
export const safeFetchInvestorsWithSummary = withAdminErrorHandling(fetchInvestorsWithSummary);
export const safeFetchPendingWithdrawals = withAdminErrorHandling(fetchPendingWithdrawals);