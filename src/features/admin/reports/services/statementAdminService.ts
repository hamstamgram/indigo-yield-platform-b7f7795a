/**
 * Statement Admin Service
 * Handles admin-side statement operations
 */

import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/db";

export interface SendStatementParams {
  investorId: string;
  statementId: string;
  email: string;
  investorName: string;
  period: string;
}

/**
 * Send statement notification email
 */
export async function sendStatementEmail(params: SendStatementParams): Promise<void> {
  const { data, error } = await supabase.functions.invoke("send-notification-email", {
    body: {
      to: params.email,
      template: "statement_ready",
      subject: "Your Monthly Statement is Ready",
      data: {
        name: params.investorName,
        period: params.period,
        link: `${window.location.origin}/investor/statements`,
      },
    },
  });

  if (error) throw error;
  return data;
}

/**
 * Delete a generated statement
 * Moved from useStatementData.ts to maintain service-layer isolation
 */
export async function deleteGeneratedStatement(statementId: string): Promise<void> {
  const { error } = await db.delete("generated_statements", { column: "id", value: statementId });
  if (error) throw new Error(error.message);
}

/**
 * Bulk delete generated statements and their delivery logs, with audit logging
 */
export async function bulkDeleteGeneratedStatements(ids: string[]): Promise<void> {
  if (ids.length === 0) throw new Error("No report IDs provided");

  const { error: deliveryError } = await db.deleteIn(
    "statement_email_delivery",
    "statement_id",
    ids
  );
  if (deliveryError) throw new Error(deliveryError.message);

  const { error } = await db.deleteIn("generated_statements", "id", ids);
  if (error) throw new Error(error.message);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  await db.insert("audit_log", {
    actor_user: user?.id ?? null,
    action: "BULK_REPORTS_DELETED",
    entity: "generated_statements",
    entity_id: ids.join(","),
    old_values: { count: ids.length, ids },
  });
}

/**
 * Delete a single generated statement with delivery logs and audit logging
 */
export async function deleteSingleGeneratedStatement(id: string): Promise<void> {
  const { error: deliveryError } = await db.delete("statement_email_delivery", {
    column: "statement_id",
    value: id,
  });
  if (deliveryError) throw new Error(deliveryError.message);

  const { error } = await db.delete("generated_statements", { column: "id", value: id });
  if (error) throw new Error(error.message);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  await db.insert("audit_log", {
    actor_user: user?.id ?? null,
    action: "REPORT_DELETED",
    entity: "generated_statements",
    entity_id: id,
  });
}
