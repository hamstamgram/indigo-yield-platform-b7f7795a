import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/db";

/**
 * Sensitive fields that should be masked in audit logs to protect PII and secrets
 */
const SENSITIVE_FIELDS = [
  "password",
  "password_hash",
  "api_key",
  "secret",
  "token",
  "totp_secret",
  "refresh_token",
  "access_token",
  "private_key",
  "secret_key",
  "ssn",
  "social_security",
  "tax_id",
  "bank_account",
  "routing_number",
  "credit_card",
  "card_number",
  "cvv",
  "pin",
];

/**
 * Mask sensitive data in an object for safe logging
 */
function maskSensitiveData<T extends Record<string, any>>(obj: T | null | undefined): T | null {
  if (!obj || typeof obj !== "object") return obj as T | null;

  const masked = { ...obj } as T;

  for (const key of Object.keys(masked)) {
    const lowerKey = key.toLowerCase();

    // Check if field name contains any sensitive field pattern
    const isSensitive = SENSITIVE_FIELDS.some(
      (field) => lowerKey.includes(field) || lowerKey === field
    );

    if (isSensitive) {
      (masked as Record<string, any>)[key] = "[REDACTED]";
    } else if (
      typeof (masked as Record<string, any>)[key] === "object" &&
      (masked as Record<string, any>)[key] !== null
    ) {
      // Recursively mask nested objects
      (masked as Record<string, any>)[key] = maskSensitiveData(
        (masked as Record<string, any>)[key]
      );
    }
  }

  return masked;
}

export interface AuditLogEntry {
  id: string;
  actor_user: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  meta: Record<string, any> | null;
  created_at: string;
  actor_name?: string;
  actor_email?: string;
}

export interface AuditLogFilters {
  entity?: string;
  action?: string;
  actorUserId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface AuditLogSummary {
  totalEntries: number;
  actionCounts: Record<string, number>;
  entityCounts: Record<string, number>;
  topActors: Array<{ user_id: string; name: string; count: number }>;
}

class AuditLogService {
  /**
   * Fetch audit log entries with filters
   */
  async fetchAuditLogs(filters: AuditLogFilters = {}): Promise<{
    data: AuditLogEntry[];
    count: number;
  }> {
    try {
      let query = supabase
        .from("audit_log")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      // Apply filters
      if (filters.entity) {
        query = query.eq("entity", filters.entity);
      }

      if (filters.action) {
        query = query.eq("action", filters.action);
      }

      if (filters.actorUserId) {
        query = query.eq("actor_user", filters.actorUserId);
      }

      if (filters.startDate) {
        query = query.gte("created_at", filters.startDate);
      }

      if (filters.endDate) {
        query = query.lte("created_at", filters.endDate);
      }

      // Apply pagination
      const limit = filters.limit || 50;
      const offset = filters.offset || 0;
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      // Enrich with actor information
      const enrichedData = await this.enrichWithActorInfo(data || []);

      return {
        data: enrichedData,
        count: count || 0,
      };
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      throw error;
    }
  }

  /**
   * Get unique entities for filtering
   */
  async getUniqueEntities(): Promise<string[]> {
    try {
      const { data, error } = await supabase.from("audit_log").select("entity").order("entity");

      if (error) throw error;

      const uniqueEntities = Array.from(new Set((data || []).map((row) => row.entity)));
      return uniqueEntities.sort();
    } catch (error) {
      console.error("Error fetching unique entities:", error);
      return [];
    }
  }

  /**
   * Get unique actions for filtering
   */
  async getUniqueActions(): Promise<string[]> {
    try {
      const { data, error } = await supabase.from("audit_log").select("action").order("action");

      if (error) throw error;

      const uniqueActions = Array.from(new Set((data || []).map((row) => row.action)));
      return uniqueActions.sort();
    } catch (error) {
      console.error("Error fetching unique actions:", error);
      return [];
    }
  }

  /**
   * Get audit log summary statistics
   */
  async getAuditLogSummary(filters: AuditLogFilters = {}): Promise<AuditLogSummary> {
    try {
      // Use a proper count query to get the true total (not limited by default 1000 row cap)
      let countQuery = supabase.from("audit_log").select("*", { count: "exact", head: true });
      if (filters.startDate) {
        countQuery = countQuery.gte("created_at", filters.startDate);
      }
      if (filters.endDate) {
        countQuery = countQuery.lte("created_at", filters.endDate);
      }
      const { count: totalCount } = await countQuery;

      // Fetch breakdown data (action/entity/actor counts) - use a reasonable limit
      let query = supabase.from("audit_log").select("action, entity, actor_user").limit(10000);

      if (filters.startDate) {
        query = query.gte("created_at", filters.startDate);
      }

      if (filters.endDate) {
        query = query.lte("created_at", filters.endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      const actionCounts: Record<string, number> = {};
      const entityCounts: Record<string, number> = {};
      const actorCounts: Record<string, number> = {};

      (data || []).forEach((entry) => {
        actionCounts[entry.action] = (actionCounts[entry.action] || 0) + 1;
        entityCounts[entry.entity] = (entityCounts[entry.entity] || 0) + 1;
        if (entry.actor_user) {
          actorCounts[entry.actor_user] = (actorCounts[entry.actor_user] || 0) + 1;
        }
      });

      // Get top actors with profile info (batch fetch to avoid N+1)
      const topActorIds = Object.entries(actorCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([userId]) => userId);

      // Batch fetch all profiles in one query
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .in("id", topActorIds);

      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

      const topActors = topActorIds.map((userId) => {
        const profile = profileMap.get(userId);
        return {
          user_id: userId,
          name: profile
            ? `${profile.first_name} ${profile.last_name}`.trim() || profile.email
            : "Unknown",
          count: actorCounts[userId],
        };
      });

      return {
        totalEntries: totalCount ?? data?.length ?? 0,
        actionCounts,
        entityCounts,
        topActors,
      };
    } catch (error) {
      console.error("Error getting audit log summary:", error);
      return {
        totalEntries: 0,
        actionCounts: {},
        entityCounts: {},
        topActors: [],
      };
    }
  }

  /**
   * Enrich audit log entries with actor information
   */
  private async enrichWithActorInfo(entries: any[]): Promise<AuditLogEntry[]> {
    const uniqueActorIds = Array.from(new Set(entries.map((e) => e.actor_user).filter(Boolean)));

    // Fetch all actor profiles in one query
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email")
      .in("id", uniqueActorIds);

    const profileMap = new Map(
      (profiles || []).map((p) => [
        p.id,
        {
          name: `${p.first_name} ${p.last_name}`.trim() || p.email,
          email: p.email,
        },
      ])
    );

    return entries.map((entry) => ({
      ...entry,
      actor_name: entry.actor_user ? profileMap.get(entry.actor_user)?.name : "System",
      actor_email: entry.actor_user ? profileMap.get(entry.actor_user)?.email : undefined,
    }));
  }

  /**
   * Format changes for display
   */
  formatChanges(
    oldValues: Record<string, any> | null,
    newValues: Record<string, any> | null
  ): string {
    if (!oldValues && !newValues) return "No changes recorded";

    const changes: string[] = [];

    if (newValues && !oldValues) {
      // New record created
      Object.entries(newValues).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          changes.push(`${key}: ${this.formatValue(value)}`);
        }
      });
    } else if (oldValues && newValues) {
      // Record updated
      Object.entries(newValues).forEach(([key, newValue]) => {
        const oldValue = oldValues[key];
        if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
          changes.push(`${key}: ${this.formatValue(oldValue)} → ${this.formatValue(newValue)}`);
        }
      });
    } else if (oldValues && !newValues) {
      // Record deleted
      changes.push("Record deleted");
    }

    return changes.join(", ") || "No changes";
  }

  private formatValue(value: any): string {
    if (value === null || value === undefined) return "null";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  }

  /**
   * Log an audit event
   */
  async logEvent(params: {
    actorUserId: string;
    action: string;
    entity: string;
    entityId?: string;
    meta?: Record<string, any>;
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      // Mask sensitive fields before storing to protect PII and secrets
      const maskedOldValues = maskSensitiveData(params.oldValues);
      const maskedNewValues = maskSensitiveData(params.newValues);
      const maskedMeta = maskSensitiveData(params.meta);

      const { success, error } = await db.insert("audit_log", {
        actor_user: params.actorUserId,
        action: params.action,
        entity: params.entity,
        entity_id: params.entityId || null,
        meta: maskedMeta || null,
        old_values: maskedOldValues || null,
        new_values: maskedNewValues || null,
      });

      if (!success) {
        return {
          success: false,
          error: error?.userMessage || "Failed to log audit event",
        };
      }
      return { success: true };
    } catch (error) {
      console.error("Error logging audit event:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to log audit event",
      };
    }
  }
}

export const auditLogService = new AuditLogService();
