import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/db/index";
import { logError } from "@/lib/logger";

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
function maskSensitiveData<T extends Record<string, unknown>>(obj: T | null | undefined): T | null {
  if (!obj || typeof obj !== "object") return obj as T | null;

  const masked = { ...obj } as T;

  for (const key of Object.keys(masked)) {
    const lowerKey = key.toLowerCase();

    const isSensitive = SENSITIVE_FIELDS.some(
      (field) => lowerKey.includes(field) || lowerKey === field
    );

    if (isSensitive) {
      (masked as Record<string, unknown>)[key] = "[REDACTED]";
    } else if (
      typeof (masked as Record<string, unknown>)[key] === "object" &&
      (masked as Record<string, unknown>)[key] !== null
    ) {
      (masked as Record<string, unknown>)[key] = maskSensitiveData(
        (masked as Record<string, unknown>)[key] as Record<string, unknown>
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
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  meta: Record<string, unknown> | null;
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

async function enrichWithActorInfo(entries: any[]): Promise<AuditLogEntry[]> {
  const uniqueActorIds = Array.from(new Set(entries.map((e) => e.actor_user).filter(Boolean)));

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email")
    .in("id", uniqueActorIds)
    .limit(500);

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

function formatValue(value: any): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

async function fetchAuditLogs(filters: AuditLogFilters = {}): Promise<{
  data: AuditLogEntry[];
  count: number;
}> {
  try {
    let query = supabase
      .from("audit_log")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (filters.entity) query = query.eq("entity", filters.entity);
    if (filters.action) query = query.eq("action", filters.action);
    if (filters.actorUserId) query = query.eq("actor_user", filters.actorUserId);
    if (filters.startDate) query = query.gte("created_at", filters.startDate);
    if (filters.endDate) query = query.lte("created_at", filters.endDate);

    const limit = filters.limit || 50;
    const offset = filters.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    const enrichedData = await enrichWithActorInfo(data || []);

    return {
      data: enrichedData,
      count: count || 0,
    };
  } catch (error) {
    logError("auditLogService.fetchAuditLogs", error);
    throw error;
  }
}

async function getUniqueEntities(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from("audit_log")
      .select("entity")
      .order("entity")
      .limit(1000);

    if (error) throw error;

    const uniqueEntities = Array.from(new Set((data || []).map((row) => row.entity)));
    return uniqueEntities.sort();
  } catch (error) {
    logError("auditLogService.getUniqueEntities", error);
    return [];
  }
}

async function getUniqueActions(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from("audit_log")
      .select("action")
      .order("action")
      .limit(1000);

    if (error) throw error;

    const uniqueActions = Array.from(new Set((data || []).map((row) => row.action)));
    return uniqueActions.sort();
  } catch (error) {
    logError("auditLogService.getUniqueActions", error);
    return [];
  }
}

async function getAuditLogSummary(filters: AuditLogFilters = {}): Promise<AuditLogSummary> {
  try {
    let countQuery = supabase.from("audit_log").select("*", { count: "exact", head: true });
    if (filters.startDate) countQuery = countQuery.gte("created_at", filters.startDate);
    if (filters.endDate) countQuery = countQuery.lte("created_at", filters.endDate);
    const { count: totalCount } = await countQuery;

    let query = supabase.from("audit_log").select("action, entity, actor_user").limit(10000);
    if (filters.startDate) query = query.gte("created_at", filters.startDate);
    if (filters.endDate) query = query.lte("created_at", filters.endDate);

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

    const topActorIds = Object.entries(actorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([userId]) => userId);

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email")
      .in("id", topActorIds)
      .limit(100);

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
    logError("auditLogService.getAuditLogSummary", error);
    return {
      totalEntries: 0,
      actionCounts: {},
      entityCounts: {},
      topActors: [],
    };
  }
}

function formatChanges(
  oldValues: Record<string, any> | null,
  newValues: Record<string, any> | null
): string {
  if (!oldValues && !newValues) return "No changes recorded";

  const changes: string[] = [];

  if (newValues && !oldValues) {
    Object.entries(newValues).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        changes.push(`${key}: ${formatValue(value)}`);
      }
    });
  } else if (oldValues && newValues) {
    Object.entries(newValues).forEach(([key, newValue]) => {
      const oldValue = oldValues[key];
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push(`${key}: ${formatValue(oldValue)} → ${formatValue(newValue)}`);
      }
    });
  } else if (oldValues && !newValues) {
    changes.push("Record deleted");
  }

  return changes.join(", ") || "No changes";
}

async function logEvent(params: {
  actorUserId: string;
  action: string;
  entity: string;
  entityId?: string;
  meta?: Record<string, any>;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
}): Promise<{ success: boolean; error?: string }> {
  try {
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
      return { success: false };
    }
    return { success: true };
  } catch {
    return { success: false };
  }
}

export const auditLogService = {
  fetchAuditLogs,
  getUniqueEntities,
  getUniqueActions,
  getAuditLogSummary,
  formatChanges,
  logEvent,
};
