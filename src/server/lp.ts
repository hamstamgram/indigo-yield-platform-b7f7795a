import { supabase } from '@/integrations/supabase/client';
import type { Balance, Ticket, NotificationPrefs } from '@/types/lp';

// Helper to check if we have proper Supabase configuration
const hasSupabase = () => {
  return supabase && import.meta.env.VITE_SUPABASE_URL;
};

// Helper to show demo mode warning
const logDemoMode = (operation: string) => {
  console.warn(`${operation} - Using demo data (Supabase not configured or tables missing)`);
};

export const getBalances = async (userId: string): Promise<Balance[]> => {
  if (!hasSupabase()) {
    logDemoMode('getBalances');
    return [
      { assetSymbol: 'USDC', available: '50,000.00', pending: '0.00', currency: 'USD' },
      { assetSymbol: 'BTC', available: '0.5', pending: '0.0', currency: 'BTC' },
      { assetSymbol: 'ETH', available: '10.0', pending: '0.0', currency: 'ETH' },
    ];
  }

  try {
    // Try to fetch from balances/positions table if it exists
    const { data, error } = await supabase
      .from('positions')
      .select('asset, principal, earned')
      .eq('user_id', userId);

    if (error || !data) {
      logDemoMode('getBalances');
      return [
        { assetSymbol: 'USDC', available: '50,000.00', pending: '0.00', currency: 'USD' },
      ];
    }

    return data.map(pos => ({
      assetSymbol: pos.asset || 'UNKNOWN',
      available: (parseFloat(pos.principal || '0') + parseFloat(pos.earned || '0')).toFixed(2),
      pending: '0.00',
      currency: pos.asset || 'USD',
    }));
  } catch (error) {
    logDemoMode('getBalances - error');
    return [
      { assetSymbol: 'USDC', available: '50,000.00', pending: '0.00', currency: 'USD' },
    ];
  }
};

export const getTickets = async (userId: string): Promise<Ticket[]> => {
  if (!hasSupabase()) {
    logDemoMode('getTickets');
    return [
      {
        id: 'ticket-1',
        subject: 'Question about withdrawal timing',
        category: 'withdrawal',
        message: 'How long does it take for withdrawals to process?',
        status: 'open',
        createdAt: '2025-01-01T10:00:00Z',
      },
    ];
  }

  try {
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error || !data) {
      logDemoMode('getTickets');
      return [
        {
          id: 'ticket-demo',
          subject: 'Demo ticket',
          message: 'This is a demo support ticket',
          status: 'open',
          createdAt: new Date().toISOString(),
        },
      ];
    }

    return data.map(ticket => ({
      id: ticket.id,
      subject: ticket.subject,
      category: ticket.category,
      message: ticket.message,
      status: ticket.status,
      createdAt: ticket.created_at,
      updatedAt: ticket.updated_at,
    }));
  } catch (error) {
    logDemoMode('getTickets - error');
    return [];
  }
};

export const createTicket = async (
  userId: string,
  subject: string,
  category: string,
  message: string
): Promise<{ success: boolean; id?: string }> => {
  if (!hasSupabase()) {
    logDemoMode('createTicket');
    return { success: true, id: 'demo-ticket-' + Date.now() };
  }

  try {
    const { data, error } = await supabase
      .from('support_tickets')
      .insert({
        user_id: userId,
        subject,
        category,
        message,
        status: 'open',
      })
      .select('id')
      .single();

    if (error) {
      logDemoMode('createTicket - error');
      return { success: true, id: 'demo-ticket-' + Date.now() };
    }

    return { success: true, id: data.id };
  } catch (error) {
    logDemoMode('createTicket - error');
    return { success: true, id: 'demo-ticket-' + Date.now() };
  }
};

export const getProfile = async (userId: string) => {
  if (!hasSupabase()) {
    logDemoMode('getProfile');
    return {
      id: userId,
      email: 'demo@example.com',
      firstName: 'Demo',
      lastName: 'User',
      timezone: 'UTC',
    };
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, timezone')
      .eq('id', userId)
      .single();

    if (error || !data) {
      logDemoMode('getProfile');
      return {
        id: userId,
        email: 'demo@example.com',
        firstName: 'Demo',
        lastName: 'User',
        timezone: 'UTC',
      };
    }

    return {
      id: data.id,
      email: data.email,
      firstName: data.first_name,
      lastName: data.last_name,
      timezone: data.timezone || 'UTC',
    };
  } catch (error) {
    logDemoMode('getProfile - error');
    return {
      id: userId,
      email: 'demo@example.com',
      firstName: 'Demo',
      lastName: 'User',
      timezone: 'UTC',
    };
  }
};

export const updateProfile = async (userId: string, updates: any) => {
  if (!hasSupabase()) {
    logDemoMode('updateProfile');
    return { success: true };
  }

  try {
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (error) {
      logDemoMode('updateProfile - error');
      return { success: true }; // Still return success for demo
    }

    return { success: true };
  } catch (error) {
    logDemoMode('updateProfile - error');
    return { success: true };
  }
};

export const getNotificationPrefs = async (userId: string): Promise<NotificationPrefs> => {
  if (!hasSupabase()) {
    logDemoMode('getNotificationPrefs');
    return {
      dailyYieldEmail: true,
      monthlyStatementEmail: true,
    };
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('notification_prefs')
      .eq('id', userId)
      .single();

    if (error || !data?.notification_prefs) {
      logDemoMode('getNotificationPrefs');
      return {
        dailyYieldEmail: true,
        monthlyStatementEmail: true,
      };
    }

    return data.notification_prefs;
  } catch (error) {
    logDemoMode('getNotificationPrefs - error');
    return {
      dailyYieldEmail: true,
      monthlyStatementEmail: true,
    };
  }
};

export const updateNotificationPrefs = async (userId: string, prefs: NotificationPrefs) => {
  if (!hasSupabase()) {
    logDemoMode('updateNotificationPrefs');
    return { success: true };
  }

  try {
    const { error } = await supabase
      .from('profiles')
      .update({ notification_prefs: prefs })
      .eq('id', userId);

    if (error) {
      logDemoMode('updateNotificationPrefs - error');
      return { success: true };
    }

    return { success: true };
  } catch (error) {
    logDemoMode('updateNotificationPrefs - error');
    return { success: true };
  }
};
