/**
 * Statement Admin Service
 * Handles admin-side statement operations
 */

import { supabase } from "@/integrations/supabase/client";

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
  const { error } = await supabase.from("generated_statements").delete().eq("id", statementId);
  if (error) throw error;
}

/**
 * Bulk delete generated statements and their delivery logs, with audit logging
 */
export async function bulkDeleteGeneratedStatements(ids: string[]): Promise<void> {
  if (ids.length === 0) throw new Error("No report IDs provided");

  const { error: deliveryError } = await supabase
    .from("statement_email_delivery")
    .delete()
    .in("statement_id", ids);
  if (deliveryError) throw deliveryError;

  const { error } = await supabase.from("generated_statements").delete().in("id", ids);
  if (error) throw error;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  await supabase.from("audit_log").insert({
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
  const { error: deliveryError } = await supabase
    .from("statement_email_delivery")
    .delete()
    .eq("statement_id", id);
  if (deliveryError) throw deliveryError;

  const { error } = await supabase.from("generated_statements").delete().eq("id", id);
  if (error) throw error;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  await supabase.from("audit_log").insert({
    actor_user: user?.id ?? null,
    action: "REPORT_DELETED",
    entity: "generated_statements",
    entity_id: id,
  });
}
