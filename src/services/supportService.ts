import { supabase } from '@/integrations/supabase/client';

// Note: Using existing support_tickets schema from database
export interface SupportTicket {
  id: string;
  subject: string;
  user_id: string;
  category: string;
  priority: string;
  status: string;
  messages_jsonb: any;
  attachments?: string[];
  assigned_admin_id?: string;
  created_at: string;
  updated_at: string;
  user_email?: string;
  user_name?: string;
}

export interface CreateTicketPayload {
  subject: string;
  description: string;
  priority: string;
  category?: string;
}

export const supportService = {
  async createTicket(payload: CreateTicketPayload) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('support_tickets')
      .insert([{
        subject: payload.subject,
        messages_jsonb: [{ text: payload.description, timestamp: new Date().toISOString() }],
        priority: payload.priority,
        category: payload.category || 'general',
        user_id: user.id,
      }])
      .select()
      .single();

    if (error) throw error;
    return { success: true, ticketId: data.id };
  },

  async listTickets(): Promise<{ tickets: SupportTicket[]; total: number }> {
    const { data, error, count } = await supabase
      .from('support_tickets')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (error) throw error;

    const enrichedData = await Promise.all((data || []).map(async (ticket: any) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, first_name, last_name')
        .eq('id', ticket.user_id)
        .single();
      
      return {
        ...ticket,
        user_email: profile?.email,
        user_name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || profile?.email,
      };
    }));

    return { tickets: enrichedData, total: count || 0 };
  },
};
