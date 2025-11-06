import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  SupportTicket,
  TicketMessage,
  FAQArticle,
  KnowledgeBaseArticle,
  TicketFilter,
  SupportStats,
} from "@/types/support";
import { useToast } from "@/hooks/use-toast";

export function useSupport(userId?: string, filter?: TicketFilter) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [stats, setStats] = useState<SupportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTickets = useCallback(async () => {
    if (!userId) return;

    try {
      let query = supabase
        .from("support_tickets")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (filter?.status) query = query.eq("status", filter.status);
      if (filter?.priority) query = query.eq("priority", filter.priority);
      if (filter?.category) query = query.eq("category", filter.category);

      const { data, error } = await query;
      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error("Error fetching tickets:", error);
    } finally {
      setLoading(false);
    }
  }, [userId, filter]);

  const fetchStats = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("user_id", userId);

      if (error) throw error;

      const tix = data || [];
      setStats({
        total_tickets: tix.length,
        open_tickets: tix.filter((t) => t.status === "open" || t.status === "in_progress").length,
        resolved_tickets: tix.filter((t) => t.status === "resolved").length,
        average_response_time: 0,
        average_resolution_time: 0,
        satisfaction_rate: 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }, [userId]);

  const createTicket = useCallback(
    async (ticket: Omit<SupportTicket, "id" | "ticket_number" | "created_at" | "updated_at">) => {
      try {
        const ticketNumber = `TKT-${Date.now()}`;
        const { data, error } = await supabase
          .from("support_tickets")
          .insert({ ...ticket, ticket_number: ticketNumber })
          .select()
          .single();

        if (error) throw error;
        setTickets((prev) => [data, ...prev]);
        toast({ title: "Ticket created", description: `Ticket ${ticketNumber} has been created.` });
        return data;
      } catch (error) {
        console.error("Error creating ticket:", error);
        toast({
          title: "Error",
          description: "Failed to create support ticket.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [toast]
  );

  useEffect(() => {
    fetchTickets();
    fetchStats();
  }, [fetchTickets, fetchStats]);

  return {
    tickets,
    stats,
    loading,
    createTicket,
    refreshTickets: fetchTickets,
  };
}

export function useTicketMessages(ticketId?: string) {
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchMessages = useCallback(async () => {
    if (!ticketId) return;

    try {
      const { data, error } = await supabase
        .from("ticket_messages")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  const sendMessage = useCallback(
    async (message: Omit<TicketMessage, "id" | "created_at" | "updated_at">) => {
      try {
        const { data, error } = await supabase
          .from("ticket_messages")
          .insert(message)
          .select()
          .single();

        if (error) throw error;
        setMessages((prev) => [...prev, data]);
        return data;
      } catch (error) {
        console.error("Error sending message:", error);
        toast({ title: "Error", description: "Failed to send message.", variant: "destructive" });
        throw error;
      }
    },
    [toast]
  );

  useEffect(() => {
    fetchMessages();

    if (!ticketId) return;

    const channel = supabase
      .channel(`ticket_messages:${ticketId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ticket_messages",
          filter: `ticket_id=eq.${ticketId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as TicketMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMessages, ticketId]);

  return { messages, loading, sendMessage };
}

export function useFAQ() {
  const [articles, setArticles] = useState<FAQArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const { data, error } = await supabase
          .from("faq_articles")
          .select("*")
          .eq("is_published", true)
          .order("order", { ascending: true });

        if (error) throw error;
        setArticles(data || []);
      } catch (error) {
        console.error("Error fetching FAQ:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, []);

  return { articles, loading };
}
