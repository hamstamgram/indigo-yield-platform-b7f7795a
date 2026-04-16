/**
 * Report Schedule Service
 * CRUD operations for report schedules
 */

import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/db";
import type { Json } from "@/integrations/supabase/types";
import { logError } from "@/lib/logger";
import type {
  ReportSchedule,
  ReportFrequency,
  ReportFormat,
  DeliveryMethod,
  ReportParameter,
  ReportFilter,
} from "@/types/domains";

function mapReportSchedule(data: Record<string, unknown>): ReportSchedule {
  return {
    id: data.id as string,
    reportDefinitionId: data.report_definition_id as string,
    name: data.name as string,
    description: data.description as string | null,
    frequency: data.frequency as ReportFrequency,
    dayOfWeek: data.day_of_week as number | null,
    dayOfMonth: data.day_of_month as number | null,
    timeOfDay: data.time_of_day as string,
    timezone: data.timezone as string,
    recipientUserIds: data.recipient_user_ids as string[],
    recipientEmails: data.recipient_emails as string[],
    deliveryMethod: (data.delivery_method || []) as DeliveryMethod[],
    parameters: (data.parameters || {}) as ReportParameter,
    filters: (data.filters || {}) as ReportFilter,
    formats: (data.formats || []) as ReportFormat[],
    isActive: data.is_active as boolean,
    lastRunAt: data.last_run_at as string | null,
    nextRunAt: data.next_run_at as string | null,
    lastRunStatus: data.last_run_status as string | null,
    runCount: data.run_count as number,
    failureCount: data.failure_count as number,
    createdBy: data.created_by as string | null,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

export async function getReportSchedules(): Promise<ReportSchedule[]> {
  const { data, error } = await supabase
    .from("report_schedules")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    logError("reportScheduleService.getReportSchedules", error);
    return [];
  }

  return (data || []).map((row) => mapReportSchedule(row as Record<string, unknown>));
}

export async function createReportSchedule(
  schedule: Omit<ReportSchedule, "id" | "createdAt" | "updatedAt" | "createdBy">
): Promise<{ success: boolean; schedule?: ReportSchedule; error?: string }> {
  const payload = {
    report_definition_id: schedule.reportDefinitionId,
    name: schedule.name,
    description: schedule.description,
    frequency: schedule.frequency,
    day_of_week: schedule.dayOfWeek,
    day_of_month: schedule.dayOfMonth,
    time_of_day: schedule.timeOfDay,
    timezone: schedule.timezone,
    recipient_user_ids: schedule.recipientUserIds,
    recipient_emails: schedule.recipientEmails,
    delivery_method: schedule.deliveryMethod,
    parameters: schedule.parameters as unknown as Json,
    filters: schedule.filters as unknown as Json,
    formats: schedule.formats,
    is_active: schedule.isActive,
    last_run_at: schedule.lastRunAt,
    next_run_at: schedule.nextRunAt,
    last_run_status: schedule.lastRunStatus,
    run_count: schedule.runCount,
    failure_count: schedule.failureCount,
  };

  const { data, error } = await db.insert("report_schedules", payload as any);

  if (error || !data) {
    logError("reportScheduleService.createReportSchedule", error);
    return { success: false, error: error?.message || "Failed to create report schedule" };
  }

  return { success: true, schedule: mapReportSchedule(data as Record<string, unknown>) };
}

export async function updateReportSchedule(
  scheduleId: string,
  updates: Partial<ReportSchedule>
): Promise<{ success: boolean; error?: string }> {
  const patch: Record<string, unknown> = {};
  if (updates.reportDefinitionId !== undefined)
    patch.report_definition_id = updates.reportDefinitionId;
  if (updates.name !== undefined) patch.name = updates.name;
  if (updates.description !== undefined) patch.description = updates.description;
  if (updates.frequency !== undefined) patch.frequency = updates.frequency;
  if (updates.dayOfWeek !== undefined) patch.day_of_week = updates.dayOfWeek;
  if (updates.dayOfMonth !== undefined) patch.day_of_month = updates.dayOfMonth;
  if (updates.timeOfDay !== undefined) patch.time_of_day = updates.timeOfDay;
  if (updates.timezone !== undefined) patch.timezone = updates.timezone;
  if (updates.recipientUserIds !== undefined) patch.recipient_user_ids = updates.recipientUserIds;
  if (updates.recipientEmails !== undefined) patch.recipient_emails = updates.recipientEmails;
  if (updates.deliveryMethod !== undefined) patch.delivery_method = updates.deliveryMethod;
  if (updates.parameters !== undefined) patch.parameters = updates.parameters;
  if (updates.filters !== undefined) patch.filters = updates.filters;
  if (updates.formats !== undefined) patch.formats = updates.formats;
  if (updates.isActive !== undefined) patch.is_active = updates.isActive;
  if (updates.lastRunAt !== undefined) patch.last_run_at = updates.lastRunAt;
  if (updates.nextRunAt !== undefined) patch.next_run_at = updates.nextRunAt;
  if (updates.lastRunStatus !== undefined) patch.last_run_status = updates.lastRunStatus;
  if (updates.runCount !== undefined) patch.run_count = updates.runCount;
  if (updates.failureCount !== undefined) patch.failure_count = updates.failureCount;

  const { error } = await db.update("report_schedules", patch as any, {
    column: "id",
    value: scheduleId,
  });

  if (error) {
    logError("reportScheduleService.updateReportSchedule", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function deleteReportSchedule(
  scheduleId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await db.delete("report_schedules", { column: "id", value: scheduleId });

  if (error) {
    logError("reportScheduleService.deleteReportSchedule", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
