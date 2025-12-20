import { supabase } from "@/integrations/supabase/client";

// Adapted to existing support_tickets table schema
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
  // Computed fields for compatibility
  description?: string;
  resolution_notes?: string;
}

export interface CreateTicketPayload {
  subject: string;
  description: string;
  priority: string;
  category?: string;
}

export interface TicketAction {
  action: "assign" | "resolve" | "close" | "reopen";
  assigned_to?: string;
  note?: string;
}

export const supportService = {
  async createTicket(payload: CreateTicketPayload) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("support_tickets")
      .insert([
        {
          subject: payload.subject,
          messages_jsonb: [
            { text: payload.description, timestamp: new Date().toISOString(), sender: "user" },
          ],
          priority: payload.priority as any,
          category: (payload.category || "general") as any,
          user_id: user.id,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return { success: true, ticketId: data.id };
  },

  async listTickets(): Promise<{ tickets: SupportTicket[]; total: number }> {
    const { data, error, count } = await supabase
      .from("support_tickets")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (error) throw error;

    const enrichedData = await Promise.all(
      (data || []).map(async (ticket: any) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, first_name, last_name")
          .eq("id", ticket.user_id)
          .single();

        // Extract description from messages_jsonb
        const messages = Array.isArray(ticket.messages_jsonb) ? ticket.messages_jsonb : [];
        const firstMessage = messages[0];
        const lastMessage = messages[messages.length - 1];

        return {
          ...ticket,
          description: firstMessage?.text || "",
          resolution_notes: lastMessage?.sender === "admin" ? lastMessage.text : undefined,
          user_email: profile?.email,
          user_name:
            `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() || profile?.email,
        };
      })
    );

    return { tickets: enrichedData, total: count || 0 };
  },

  async actOnTicket(ticketId: string, action: TicketAction) {
    const updates: any = { updated_at: new Date().toISOString() };

    switch (action.action) {
      case "assign":
        updates.assigned_admin_id = action.assigned_to;
        updates.status = "in_progress";
        break;
      case "resolve":
        updates.status = "closed";
        // Add resolution note to messages
        if (action.note) {
          const { data: ticket } = await supabase
            .from("support_tickets")
            .select("messages_jsonb")
            .eq("id", ticketId)
            .single();

          const messages = Array.isArray(ticket?.messages_jsonb) ? ticket.messages_jsonb : [];
          updates.messages_jsonb = [
            ...messages,
            { text: action.note, timestamp: new Date().toISOString(), sender: "admin" },
          ];
        }
        break;
      case "close":
        updates.status = "closed";
        break;
      case "reopen":
        updates.status = "open";
        break;
    }

    const { data, error } = await supabase
      .from("support_tickets")
      .update(updates)
      .eq("id", ticketId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, ticket: data };
  },
};
