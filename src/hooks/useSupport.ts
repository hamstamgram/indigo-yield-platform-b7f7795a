/**
 * Support Hooks - Stub
 * Note: Support ticket tables don't exist in database yet
 */

import { useState, useCallback } from "react";
import {
  SupportTicket,
  TicketMessage,
  FAQArticle,
  TicketFilter,
  SupportStats,
} from "@/types/support";
import { useToast } from "@/hooks/use-toast";

// Support feature not fully implemented - tables don't exist in database
export function useSupport(_userId?: string, _filter?: TicketFilter) {
  const [tickets] = useState<SupportTicket[]>([]);
  const [stats] = useState<SupportStats | null>(null);
  const [loading] = useState(false);
  const { toast } = useToast();

  const createTicket = useCallback(
    async (_ticket: Omit<SupportTicket, "id" | "ticket_number" | "created_at" | "updated_at">) => {
      toast({
        title: "Not available",
        description: "Support ticket feature is not yet implemented.",
        variant: "destructive",
      });
      return null;
    },
    [toast]
  );

  return {
    tickets,
    stats,
    loading,
    createTicket,
    refreshTickets: () => {},
  };
}

// Ticket messages feature not implemented - table doesn't exist
export function useTicketMessages(_ticketId?: string) {
  const [messages] = useState<TicketMessage[]>([]);
  const [loading] = useState(false);
  const { toast } = useToast();

  const sendMessage = useCallback(
    async (_message: Omit<TicketMessage, "id" | "created_at" | "updated_at">) => {
      toast({ title: "Not available", description: "Ticket messages feature not yet implemented.", variant: "destructive" });
      return null;
    },
    [toast]
  );

  return { messages, loading, sendMessage };
}

// FAQ feature not implemented - table doesn't exist
export function useFAQ() {
  const [articles] = useState<FAQArticle[]>([]);
  const [loading] = useState(false);

  return { articles, loading };
}
