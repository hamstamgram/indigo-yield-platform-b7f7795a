// Common type definitions to fix build errors

export type FundStatus = 'active' | 'inactive';

export interface FundConfiguration {
  id: string;
  code: string;
  name: string;
  currency: string;
  benchmark: 'BTC' | 'ETH' | 'STABLE' | 'CUSTOM';
  status: FundStatus;
  mgmt_fee_bps: number;
  perf_fee_bps: number;
  inception_date: string;
  effective_from: string;
  fee_version: number;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  priority: string;
  read_at: string | null;
  created_at: string;
  user_id: string;
  data_jsonb: Record<string, any>;
}

export interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entity_id: string;
  actor_user: string;
  created_at: string;
  meta: Record<string, any> | null;
  new_values: Record<string, any> | null;
  old_values: Record<string, any> | null;
  actor: {
    email: string;
    first_name: string;
    last_name: string;
  };
}

export interface Transaction {
  id: string;
  amount: number;
  asset_code: string;
  type: string;
  status: string;
  created_at: string;
  confirmed_at: string;
  created_by: string;
  investor_id: string;
  note: string;
  tx_hash: string;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export interface SessionWithLogs {
  id: string;
  user_id: string;
  device_label: string;
  user_agent: string;
  ip: string;
  created_at: string;
  last_seen_at: string;
  refresh_token_id: string;
  revoked_at: string;
  revoked_by: string;
}

export interface AccessLog {
  id: string;
  user_id: string;
  event: string;
  ip: string;
  device_label: string;
  user_agent: string;
  success: boolean;
  created_at: string;
}

export interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  assigned_admin_id: string;
  created_at: string;
  updated_at: string;
  attachments: string[];
  messages_jsonb: TicketMessage[];
}

export interface TicketMessage {
  id: string;
  message: string;
  sender: string;
  timestamp: string;
}

// Utility functions
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
  return `${Math.round(ms / 3600000)}h`;
}

export function getStatusIcon(status: string): string {
  switch (status) {
    case 'success': return '✅';
    case 'error': return '❌';
    case 'pending': return '⏳';
    default: return '❓';
  }
}

export function getStatusBadgeVariant(status: string): 'default' | 'destructive' | 'outline' | 'secondary' {
  switch (status) {
    case 'success': return 'default';
    case 'error': return 'destructive';
    case 'pending': return 'outline';
    default: return 'secondary';
  }
}