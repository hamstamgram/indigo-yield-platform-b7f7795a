export type TicketStatus = "open" | "in_progress" | "waiting" | "resolved" | "closed";

export type TicketPriority = "low" | "medium" | "high" | "urgent";

export type TicketCategory =
  | "account"
  | "transaction"
  | "technical"
  | "documents"
  | "security"
  | "billing"
  | "general"
  | "other";

export interface SupportTicket {
  id: string;
  user_id: string;
  ticket_number: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  description: string;
  assigned_to?: string;
  attachments?: string[];
  tags?: string[];
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  closed_at?: string;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  user_id: string;
  is_staff: boolean;
  message: string;
  attachments?: string[];
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface FAQCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon?: string;
  order: number;
  article_count: number;
}

export interface FAQArticle {
  id: string;
  category_id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  tags?: string[];
  views: number;
  helpful_count: number;
  not_helpful_count: number;
  is_published: boolean;
  order: number;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeBaseArticle {
  id: string;
  category: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  author?: string;
  tags?: string[];
  related_articles?: string[];
  views: number;
  helpful_count: number;
  not_helpful_count: number;
  is_featured: boolean;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface LiveChatSession {
  id: string;
  user_id: string;
  agent_id?: string;
  status: "waiting" | "active" | "ended";
  started_at: string;
  ended_at?: string;
  metadata?: Record<string, any>;
}

export interface LiveChatMessage {
  id: string;
  session_id: string;
  sender_id: string;
  sender_type: "user" | "agent" | "system";
  message: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface TicketFilter {
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: TicketCategory;
  searchQuery?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface SupportStats {
  total_tickets: number;
  open_tickets: number;
  resolved_tickets: number;
  average_response_time: number;
  average_resolution_time: number;
  satisfaction_rate: number;
}
