/**
 * Integrity Domain Types
 * Canonical type definitions for data integrity checks
 */

export type IntegrityStatus = "ok" | "warning" | "error";

export interface IntegrityCheck {
  name: string;
  description: string;
  status: IntegrityStatus;
  count: number;
  iconName: "wallet" | "trending-up" | "users" | "scale" | "database" | "shield";
  details?: Record<string, unknown>[];
}

export interface AuditEvent {
  id: string;
  action: string;
  entity: string;
  entity_id: string | null;
  actor_user: string | null;
  created_at: string;
}

export interface IntegrityCheckResult {
  checks: IntegrityCheck[];
  overallStatus: IntegrityStatus;
}
