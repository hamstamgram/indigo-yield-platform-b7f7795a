/**
 * Report Recipients Service
 * Handles fetching and updating report recipients for investors
 */

import { supabase } from "@/integrations/supabase/client";
import { invokeFunction } from "@/lib/supabase/functions";

/**
 * Fetch report recipients for an investor
 */
export async function fetchReportRecipients(investorId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("investor_emails")
    .select("email")
    .eq("investor_id", investorId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data?.map((row) => row.email) || [];
}

/**
 * Update report recipients for an investor
 */
export async function updateReportRecipients(
  investorId: string,
  emails: string[]
): Promise<void> {
  const { data, error } = await invokeFunction("admin-user-management", {
    action: "updateReportRecipients",
    investorId,
    emails,
  });

  if (error || !data?.success) {
    throw new Error(data?.error || error?.message || "Failed to update recipients");
  }
}

export const reportRecipientsService = {
  fetchReportRecipients,
  updateReportRecipients,
};
