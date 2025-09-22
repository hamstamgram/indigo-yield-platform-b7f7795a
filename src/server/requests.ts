/**
 * Simplified Request Management
 */

import { supabase } from '@/integrations/supabase/client';

export interface Request {
  id: string;
  type: string;
  status: string;
  amount: number;
  created_at: string;
  user_id: string;
}

/**
 * Get requests for a user
 */
export async function getUserRequests(userId: string): Promise<Request[]> {
  try {
    // Use withdrawal_requests table instead of non-existent requests table
    const { data, error } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('investor_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(req => ({
      id: req.id,
      type: 'withdrawal',
      status: req.status,
      amount: req.requested_amount || 0,
      created_at: req.request_date || new Date().toISOString(),
      user_id: req.investor_id
    }));
  } catch (error) {
    console.error('Error getting user requests:', error);
    return [];
  }
}

/**
 * Create a new request
 */
export async function createRequest(request: Omit<Request, 'id' | 'created_at'>): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('withdrawal_requests')
      .insert({
        investor_id: request.user_id,
        requested_amount: request.amount,
        status: 'pending',
        withdrawal_type: 'partial',
        fund_id: request.user_id // Use user_id as fund_id for now
      })
      .select('id')
      .single();

    if (error) throw error;
    return data?.id || null;
  } catch (error) {
    console.error('Error creating request:', error);
    return null;
  }
}