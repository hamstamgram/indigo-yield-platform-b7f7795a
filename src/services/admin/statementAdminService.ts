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
