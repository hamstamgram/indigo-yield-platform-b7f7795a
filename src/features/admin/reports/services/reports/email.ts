import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/lib/logger";

/**
 * Send a report email for an investor via the send-report-email Edge Function (Resend)
 */
export async function sendReportEmail(
  investorId: string,
  periodId: string
): Promise<{ success: boolean; delivery_id?: string; error?: string }> {
  const { data, error } = await supabase.functions.invoke("send-report-email", {
    body: {
      investor_id: investorId,
      period_id: periodId,
      delivery_mode: "email_html",
    },
  });

  if (error) {
    logError("sendReportEmail", error, { investorId, periodId });
    return { success: false, error: error.message };
  }

  return { success: true, delivery_id: data?.delivery_id };
}
