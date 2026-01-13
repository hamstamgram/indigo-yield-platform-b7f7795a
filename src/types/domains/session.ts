/**
 * Session Domain Types
 * Types for user sessions, access logs, and secure sharing
 */

export interface UserSession {
  id: string;
  user_id: string;
  device_label?: string;
  user_agent?: string;
  ip?: string;
  refresh_token_id?: string;
  created_at: string;
  last_seen_at: string;
  revoked_at?: string;
  revoked_by?: string;
}

export type AccessEvent =
  | "login"
  | "logout"
  | "2fa_setup"
  | "2fa_verify"
  | "session_revoked"
  | "password_change";

export interface AccessLog {
  id: string;
  user_id: string;
  event: AccessEvent;
  ip?: string;
  user_agent?: string;
  device_label?: string;
  success: boolean;
  created_at: string;
}

export type ShareScope = "portfolio" | "documents" | "statement";

export interface SecureShare {
  id: string;
  owner_user_id: string;
  fund_id?: string;
  scope: ShareScope;
  token: string;
  expires_at: string;
  max_views?: number;
  views_count: number;
  revoked_at?: string;
  created_at: string;
  created_by?: string;
}

export interface ShareLinkData {
  token: string;
  url: string;
  expires_at: string;
  scope: ShareScope;
  max_views?: number;
}

/**
 * Portfolio analytics data for share viewer
 */
export interface SharePortfolioData {
  totalValue: string;
  totalYield: string;
  positions: Array<{
    fundId: string;
    fundName: string;
    currentValue: string;
    yieldEarned: string;
  }>;
}

/**
 * Document reference for share viewer
 */
export interface ShareDocumentData {
  id: string;
  title: string;
  type: string;
  createdAt: string;
  storagePath: string;
}

export interface ShareViewerData {
  portfolio?: SharePortfolioData;
  documents?: ShareDocumentData[];
  statement?: ShareDocumentData;
  redacted: boolean;
}

export interface WebPushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
  revoked_at?: string;
}
