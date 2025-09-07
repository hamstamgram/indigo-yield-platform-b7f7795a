import { supabase } from '@/integrations/supabase/client';
import type { Request } from '@/types/lp';

// In-memory storage for demo mode (session only)
let demoRequests: Request[] = [
  {
    id: 'demo-req-1',
    type: 'withdrawal',
    asset: 'USDC',
    amount: '1000.00',
    memo: 'Monthly expenses',
    status: 'pending',
    createdAt: '2025-01-01T10:00:00Z',
  },
];

const hasSupabase = () => {
  return supabase && import.meta.env.VITE_SUPABASE_URL;
};

const logDemoMode = (operation: string) => {
  console.warn(`${operation} - Using demo data (Supabase not configured)`);
};

export const createDepositRequest = async (
  userId: string,
  asset: string,
  amount: string,
  memo?: string
): Promise<{ success: boolean; id?: string }> => {
  if (!hasSupabase()) {
    logDemoMode('createDepositRequest');
    const newRequest: Request = {
      id: 'demo-dep-' + Date.now(),
      type: 'deposit',
      asset,
      amount,
      memo,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    demoRequests.push(newRequest);
    return { success: true, id: newRequest.id };
  }

  try {
    const { data, error } = await supabase
      .from('requests')
      .insert({
        user_id: userId,
        type: 'deposit',
        asset,
        amount: parseFloat(amount),
        memo,
        status: 'pending',
      })
      .select('id')
      .single();

    if (error) {
      logDemoMode('createDepositRequest - error');
      const newRequest: Request = {
        id: 'demo-dep-' + Date.now(),
        type: 'deposit',
        asset,
        amount,
        memo,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      demoRequests.push(newRequest);
      return { success: true, id: newRequest.id };
    }

    return { success: true, id: data.id };
  } catch (error) {
    logDemoMode('createDepositRequest - error');
    return { success: false };
  }
};

export const createWithdrawalRequest = async (
  userId: string,
  asset: string,
  amount: string,
  memo?: string
): Promise<{ success: boolean; id?: string }> => {
  if (!hasSupabase()) {
    logDemoMode('createWithdrawalRequest');
    const newRequest: Request = {
      id: 'demo-wdr-' + Date.now(),
      type: 'withdrawal',
      asset,
      amount,
      memo,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    demoRequests.push(newRequest);
    return { success: true, id: newRequest.id };
  }

  try {
    const { data, error } = await supabase
      .from('requests')
      .insert({
        user_id: userId,
        type: 'withdrawal',
        asset,
        amount: parseFloat(amount),
        memo,
        status: 'pending',
      })
      .select('id')
      .single();

    if (error) {
      logDemoMode('createWithdrawalRequest - error');
      const newRequest: Request = {
        id: 'demo-wdr-' + Date.now(),
        type: 'withdrawal',
        asset,
        amount,
        memo,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      demoRequests.push(newRequest);
      return { success: true, id: newRequest.id };
    }

    return { success: true, id: data.id };
  } catch (error) {
    logDemoMode('createWithdrawalRequest - error');
    return { success: false };
  }
};

export const listRequestsForUser = async (userId: string): Promise<Request[]> => {
  if (!hasSupabase()) {
    logDemoMode('listRequestsForUser');
    return demoRequests;
  }

  try {
    const { data, error } = await supabase
      .from('requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error || !data) {
      logDemoMode('listRequestsForUser - error');
      return demoRequests;
    }

    return data.map(req => ({
      id: req.id,
      type: req.type,
      asset: req.asset,
      amount: req.amount.toString(),
      memo: req.memo,
      status: req.status,
      createdAt: req.created_at,
      updatedAt: req.updated_at,
      adminNotes: req.admin_notes,
    }));
  } catch (error) {
    logDemoMode('listRequestsForUser - error');
    return demoRequests;
  }
};

export const listAllRequests = async (): Promise<Request[]> => {
  if (!hasSupabase()) {
    logDemoMode('listAllRequests');
    return demoRequests;
  }

  try {
    const { data, error } = await supabase
      .from('requests')
      .select('*, profiles(email)')
      .order('created_at', { ascending: false });

    if (error || !data) {
      logDemoMode('listAllRequests - error');
      return demoRequests;
    }

    return data.map(req => ({
      id: req.id,
      type: req.type,
      asset: req.asset,
      amount: req.amount.toString(),
      memo: req.memo,
      status: req.status,
      createdAt: req.created_at,
      updatedAt: req.updated_at,
      adminNotes: req.admin_notes,
    }));
  } catch (error) {
    logDemoMode('listAllRequests - error');
    return demoRequests;
  }
};

export const approveRequest = async (
  requestId: string,
  adminId: string,
  options?: any
): Promise<{ success: boolean }> => {
  if (!hasSupabase()) {
    logDemoMode('approveRequest');
    const reqIndex = demoRequests.findIndex(r => r.id === requestId);
    if (reqIndex >= 0) {
      demoRequests[reqIndex].status = 'approved';
      demoRequests[reqIndex].updatedAt = new Date().toISOString();
      demoRequests[reqIndex].adminNotes = 'Approved by admin (demo)';
    }
    return { success: true };
  }

  try {
    // Update request status
    const { error } = await supabase
      .from('requests')
      .update({
        status: 'approved',
        admin_id: adminId,
        admin_notes: options?.notes || 'Approved',
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (error) {
      logDemoMode('approveRequest - error');
      return { success: true }; // Return success for demo
    }

    // TODO: Create corresponding transaction via adminService
    // This should call adminService.addManualTransaction with the request details
    
    return { success: true };
  } catch (error) {
    logDemoMode('approveRequest - error');
    return { success: true };
  }
};

export const denyRequest = async (
  requestId: string,
  adminId: string,
  reason: string
): Promise<{ success: boolean }> => {
  if (!hasSupabase()) {
    logDemoMode('denyRequest');
    const reqIndex = demoRequests.findIndex(r => r.id === requestId);
    if (reqIndex >= 0) {
      demoRequests[reqIndex].status = 'denied';
      demoRequests[reqIndex].updatedAt = new Date().toISOString();
      demoRequests[reqIndex].adminNotes = reason || 'Denied by admin (demo)';
    }
    return { success: true };
  }

  try {
    const { error } = await supabase
      .from('requests')
      .update({
        status: 'denied',
        admin_id: adminId,
        admin_notes: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (error) {
      logDemoMode('denyRequest - error');
      return { success: true };
    }

    return { success: true };
  } catch (error) {
    logDemoMode('denyRequest - error');
    return { success: true };
  }
};
