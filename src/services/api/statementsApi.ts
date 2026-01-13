import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  generateMonthlyStatementHTML,
  generateStatementPreview,
} from "@/lib/statements/monthlyEmailGenerator";

// Database table types
type StatementPeriod = Database["public"]["Tables"]["statement_periods"]["Row"];
type StatementPeriodInsert = Database["public"]["Tables"]["statement_periods"]["Insert"];
type StatementPeriodUpdate = Database["public"]["Tables"]["statement_periods"]["Update"];
type GeneratedStatement = Database["public"]["Tables"]["generated_statements"]["Row"];
type GeneratedStatementInsert = Database["public"]["Tables"]["generated_statements"]["Insert"];
type InvestorFundPerformanceRow = Database["public"]["Tables"]["investor_fund_performance"]["Row"];
type InvestorFundPerformanceInsert = Database["public"]["Tables"]["investor_fund_performance"]["Insert"];
type StatementEmailDelivery = Database["public"]["Tables"]["statement_email_delivery"]["Row"];
type StatementEmailDeliveryInsert = Database["public"]["Tables"]["statement_email_delivery"]["Insert"];
type AuditLogInsert = Database["public"]["Tables"]["audit_log"]["Insert"];
type PeriodSummaryRpcReturn = Database["public"]["Functions"]["get_statement_period_summary"]["Returns"][0];

// Extended types for API responses
export interface InvestorFundPerformance extends InvestorFundPerformanceRow {
  fund_name: string;
}

// API Response types
export interface StatementPeriodWithStats extends StatementPeriod {
  investor_count?: number;
  statements_generated?: number;
  statements_sent?: number;
}

export interface InvestorStatementSummary {
  id: string;
  name: string;
  email: string;
  fund_count: number;
  fund_names: string[];
  statement_generated: boolean;
  statement_sent: boolean;
  statement_id?: string;
  delivery_status?: string;
  sent_at?: string;
  generated_at?: string;
  recipient_emails?: string[];
  recipient_count?: number;
}

export interface PeriodSummary {
  total_investors: number;
  total_funds: number;
  statements_generated: number;
  statements_sent: number;
  statements_pending: number;
}

export interface ReportFreshness {
  isOutdated: boolean;
  generatedAt: string | null;
  dataUpdatedAt: string | null;
}

/**
 * Fetch all statement periods
 * Optimized: batch fetch summaries instead of N+1
 */
export async function fetchStatementPeriods(): Promise<StatementPeriodWithStats[]> {
  try {
    const { data, error } = await supabase
      .from("statement_periods")
      .select("*")
      .order("period_end_date", { ascending: false });

    if (error) throw error;
    if (!data || data.length === 0) return [];

    // Batch fetch all summaries using a single RPC call with multiple period IDs
    // For now, we'll optimize by parallel fetching (still better than sequential)
    // and using Promise.allSettled to handle errors gracefully
    const summaryPromises = data.map((period: StatementPeriod) =>
      fetchPeriodSummary(period.id)
        .then((summary) => ({ periodId: period.id, summary, error: null }))
        .catch(() => ({
          periodId: period.id,
          summary: { total_investors: 0, statements_generated: 0, statements_sent: 0, total_funds: 0, statements_pending: 0 },
          error: true,
        }))
    );

    const summaryResults = await Promise.all(summaryPromises);
    const summaryMap = new Map(
      summaryResults.map((r) => [r.periodId, r.summary])
    );

    return data.map((period: StatementPeriod) => {
      const summary = summaryMap.get(period.id) || {
        total_investors: 0,
        statements_generated: 0,
        statements_sent: 0,
      };
      return {
        ...period,
        investor_count: summary.total_investors,
        statements_generated: summary.statements_generated,
        statements_sent: summary.statements_sent,
      };
    });
  } catch (error) {
    console.error("Error fetching statement periods:", error);
    throw new Error("Failed to fetch statement periods");
  }
}

/**
 * Create a new statement period
 */
export async function createStatementPeriod(data: {
  year: number;
  month: number;
  period_name: string;
  period_end_date: string;
  notes?: string;
}): Promise<StatementPeriod> {
  try {
    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const insertData: StatementPeriodInsert = {
      ...data,
      created_by: user.id,
      status: "DRAFT",
    };

    const { data: period, error } = await supabase
      .from("statement_periods")
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return period;
  } catch (error) {
    console.error("Error creating statement period:", error);
    throw new Error("Failed to create statement period");
  }
}

/**
 * Fetch investors for a specific period
 */
export async function fetchPeriodInvestors(periodId: string): Promise<InvestorStatementSummary[]> {
  try {
    // V2: Get all investors with fund performance data for this period
    // investor_id = profiles.id (One ID architecture)
    type PerformanceWithProfile = InvestorFundPerformanceRow & {
      profiles: {
        id: string;
        email: string | null;
        first_name: string | null;
        last_name: string | null;
      } | null;
    };

    const { data: performances, error: perfError } = await supabase
      .from("investor_fund_performance")
      .select(
        `
        investor_id,
        fund_name,
        profiles!investor_fund_performance_investor_id_fkey (
          id,
          email,
          first_name,
          last_name
        )
      `
      )
      .eq("period_id", periodId)
      .returns<PerformanceWithProfile[]>();

    if (perfError) throw perfError;

    // Group by investor
    const investorMap = new Map<string, InvestorStatementSummary>();

    for (const perf of performances || []) {
      const profile = perf.profiles;
      if (!profile) continue;

      const existing = investorMap.get(perf.investor_id);
      const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Unknown";
      if (existing) {
        existing.fund_count++;
        existing.fund_names.push(perf.fund_name);
      } else {
        investorMap.set(perf.investor_id, {
          id: perf.investor_id,
          name: fullName,
          email: profile.email || "",
          fund_count: 1,
          fund_names: [perf.fund_name],
          statement_generated: false,
          statement_sent: false,
        });
      }
    }

    // Get generated statements with created_at for freshness
    type StatementSummary = Pick<GeneratedStatement, "user_id" | "id" | "created_at">;
    const { data: statements, error: stmtError } = await supabase
      .from("generated_statements")
      .select("user_id, id, created_at")
      .eq("period_id", periodId)
      .returns<StatementSummary[]>();

    if (stmtError) throw stmtError;

    // Get investor emails for each investor
    const investorIds = Array.from(investorMap.keys());
    const { data: investorEmails, error: emailsError } = await supabase
      .from("investor_emails")
      .select("investor_id, email, is_primary, verified")
      .in("investor_id", investorIds);

    if (emailsError) {
      console.warn("Error fetching investor_emails:", emailsError);
    }

    // Group emails by investor
    const emailsByInvestor = new Map<string, string[]>();
    for (const emailRecord of investorEmails || []) {
      const emails = emailsByInvestor.get(emailRecord.investor_id) || [];
      if (emailRecord.verified || emailRecord.is_primary) {
        emails.push(emailRecord.email);
      }
      emailsByInvestor.set(emailRecord.investor_id, emails);
    }

    // Get delivery status
    type DeliverySummary = Pick<StatementEmailDelivery, "user_id" | "status" | "sent_at" | "statement_id">;
    const { data: deliveries, error: delError } = await supabase
      .from("statement_email_delivery")
      .select("user_id, status, sent_at, statement_id")
      .eq("period_id", periodId)
      .returns<DeliverySummary[]>();

    if (delError) throw delError;

    // Update investor summaries with statement info and recipient emails
    const investors = Array.from(investorMap.values());

    for (const investor of investors) {
      // Add recipient emails info
      const emails = emailsByInvestor.get(investor.id) || [];
      if (emails.length > 0) {
        investor.recipient_emails = emails;
        investor.recipient_count = emails.length;
      } else if (investor.email) {
        // Fallback to profile email
        investor.recipient_emails = [investor.email];
        investor.recipient_count = 1;
      } else {
        investor.recipient_emails = [];
        investor.recipient_count = 0;
      }

      const statement = statements?.find((s) => s.user_id === investor.id);
      if (statement) {
        investor.statement_generated = true;
        investor.statement_id = statement.id;
        investor.generated_at = statement.created_at;

        const delivery = deliveries?.find((d) => d.user_id === investor.id);
        if (delivery) {
          investor.statement_sent = delivery.status === "SENT";
          investor.delivery_status = delivery.status;
          investor.sent_at = delivery.sent_at || undefined;
        }
      }
    }

    return investors.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error("Error fetching period investors:", error);
    throw new Error("Failed to fetch period investors");
  }
}

/**
 * Fetch period summary statistics
 */
export async function fetchPeriodSummary(periodId: string): Promise<PeriodSummary> {
  try {
    const { data, error } = await supabase.rpc("get_statement_period_summary", {
      p_period_id: periodId,
    });

    if (error) throw error;

    if (data && data.length > 0) {
      return data[0];
    }

    return {
      total_investors: 0,
      total_funds: 0,
      statements_generated: 0,
      statements_sent: 0,
      statements_pending: 0,
    };
  } catch (error) {
    console.error("Error fetching period summary:", error);
    throw new Error("Failed to fetch period summary");
  }
}

/**
 * Generate HTML statement for a single investor
 */
export async function generateInvestorStatement(
  periodId: string,
  userId: string
): Promise<{ html: string; statement_id: string }> {
  try {
    // Get current user (admin)
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Fetch period details
    const { data: period, error: periodError } = await supabase
      .from("statement_periods")
      .select("*")
      .eq("id", periodId)
      .maybeSingle();

    if (!period) throw new Error("Statement period not found");

    if (periodError) throw periodError;

    // Fetch investor profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("first_name, last_name, email")
      .eq("id", userId)
      .maybeSingle();

    if (!profile) throw new Error("Profile not found");

    if (profileError) throw profileError;

    const investorFullName = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Investor";

    // V2: Fetch fund performance data using investor_id
    const { data: performances, error: perfError } = await supabase
      .from("investor_fund_performance")
      .select("*")
      .eq("period_id", periodId)
      .eq("investor_id", userId);

    if (perfError) throw perfError;

    if (!performances || performances.length === 0) {
      throw new Error("No fund performance data found for this investor");
    }

    // Convert to format expected by HTML generator
    const funds = performances.map((p) => ({
      fund_name: p.fund_name,
      mtd_beginning_balance: p.mtd_beginning_balance?.toString() || "0",
      mtd_additions: p.mtd_additions?.toString() || "0",
      mtd_redemptions: p.mtd_redemptions?.toString() || "0",
      mtd_net_income: p.mtd_net_income?.toString() || "0",
      mtd_ending_balance: p.mtd_ending_balance?.toString() || "0",
      mtd_rate_of_return: p.mtd_rate_of_return?.toString() || "0",
      qtd_beginning_balance: p.qtd_beginning_balance?.toString() || "0",
      qtd_additions: p.qtd_additions?.toString() || "0",
      qtd_redemptions: p.qtd_redemptions?.toString() || "0",
      qtd_net_income: p.qtd_net_income?.toString() || "0",
      qtd_ending_balance: p.qtd_ending_balance?.toString() || "0",
      qtd_rate_of_return: p.qtd_rate_of_return?.toString() || "0",
      ytd_beginning_balance: p.ytd_beginning_balance?.toString() || "0",
      ytd_additions: p.ytd_additions?.toString() || "0",
      ytd_redemptions: p.ytd_redemptions?.toString() || "0",
      ytd_net_income: p.ytd_net_income?.toString() || "0",
      ytd_ending_balance: p.ytd_ending_balance?.toString() || "0",
      ytd_rate_of_return: p.ytd_rate_of_return?.toString() || "0",
      itd_beginning_balance: p.itd_beginning_balance?.toString() || "0",
      itd_additions: p.itd_additions?.toString() || "0",
      itd_redemptions: p.itd_redemptions?.toString() || "0",
      itd_net_income: p.itd_net_income?.toString() || "0",
      itd_ending_balance: p.itd_ending_balance?.toString() || "0",
      itd_rate_of_return: p.itd_rate_of_return?.toString() || "0",
    }));

    // Generate HTML
    const html = generateMonthlyStatementHTML({
      investor_name: investorFullName,
      investor_email: profile.email || "",
      period_ended: period.period_name,
      funds,
    });

    // Save to database
    const insertData: GeneratedStatementInsert = {
      period_id: periodId,
      user_id: userId,
      investor_id: userId,
      html_content: html,
      generated_by: user.id,
      fund_names: performances.map((p) => p.fund_name),
    };

    const { data: statement, error: stmtError } = await supabase
      .from("generated_statements")
      .upsert(insertData)
      .select()
      .single();

    if (stmtError) throw stmtError;

    return {
      html,
      statement_id: statement.id,
    };
  } catch (error) {
    console.error("Error generating investor statement:", error);
    throw new Error("Failed to generate investor statement");
  }
}

/**
 * Generate statements for all investors in a period
 */
export async function generateAllStatements(
  periodId: string
): Promise<{ success: number; failed: number; errors: string[] }> {
  try {
    const investors = await fetchPeriodInvestors(periodId);
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const investor of investors) {
      try {
        await generateInvestorStatement(periodId, investor.id);
        results.success++;
      } catch (error) {
        results.failed++;
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        results.errors.push(`${investor.name}: ${errorMsg}`);
      }
    }

    return results;
  } catch (error) {
    console.error("Error generating all statements:", error);
    throw new Error("Failed to generate all statements");
  }
}

/**
 * Preview statement for an investor
 */
export async function previewInvestorStatement(periodId: string, userId: string): Promise<string> {
  try {
    // Check if statement exists
    type StatementPreview = Pick<GeneratedStatement, "html_content">;
    const { data: existing, error: existingError } = await supabase
      .from("generated_statements")
      .select("html_content")
      .eq("period_id", periodId)
      .eq("user_id", userId)
      .maybeSingle()
      .returns<StatementPreview | null>();

    if (existingError) throw existingError;

    if (existing && existing.html_content) {
      // Return existing statement with preview banner
      return generateStatementPreview(existing.html_content);
    }

    // Generate new statement for preview
    const { html } = await generateInvestorStatement(periodId, userId);
    return generateStatementPreview(html);
  } catch (error) {
    console.error("Error previewing investor statement:", error);
    throw new Error("Failed to preview investor statement");
  }
}

/**
 * Send statement via email to an investor
 */
export async function sendInvestorStatement(periodId: string, userId: string): Promise<{ recipients: string[] }> {
  try {
    // Get statement
    const { data: statement, error: stmtError } = await supabase
      .from("generated_statements")
      .select("*")
      .eq("period_id", periodId)
      .eq("user_id", userId)
      .maybeSingle();

    if (stmtError) throw stmtError;
    if (!statement) throw new Error("Statement not found. Please generate first.");

    // Get investor profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, first_name, last_name")
      .eq("id", userId)
      .maybeSingle();

    if (!profile) throw new Error("Profile not found");
    if (profileError) throw profileError;

    // Fetch report recipients from investor_emails table
    const { data: reportRecipients, error: recipientsError } = await supabase
      .from("investor_emails")
      .select("email, is_primary, verified")
      .eq("investor_id", userId);

    if (recipientsError) {
      console.error("Error fetching investor_emails:", recipientsError);
    }

    // Build recipient list: use investor_emails if available, fallback to profile.email
    let recipientEmails: string[] = [];

    if (reportRecipients && reportRecipients.length > 0) {
      // Use all verified or primary emails from investor_emails
      recipientEmails = reportRecipients
        .filter((r) => r.verified || r.is_primary)
        .map((r) => r.email)
        .filter((email): email is string => !!email);
    }

    // Fallback to profile email if no recipients found
    if (recipientEmails.length === 0 && profile.email) {
      recipientEmails = [profile.email];
    }

    if (recipientEmails.length === 0) {
      throw new Error("No email addresses configured for this investor");
    }

    // Get period details
    type PeriodName = Pick<StatementPeriod, "period_name">;
    const { data: period, error: periodError } = await supabase
      .from("statement_periods")
      .select("period_name")
      .eq("id", periodId)
      .maybeSingle()
      .returns<PeriodName | null>();

    if (!period) throw new Error("Period not found");
    if (periodError) throw periodError;

    const subject = `Your ${period.period_name} Investment Statement - Indigo Fund`;

    // Queue email for delivery (store primary recipient and full list in metadata)
    const deliveryInsert: StatementEmailDeliveryInsert = {
      statement_id: statement.id,
      user_id: userId,
      investor_id: userId,
      period_id: periodId,
      recipient_email: recipientEmails[0], // Primary recipient
      subject,
      status: "SENDING",
    };

    const { data: deliveryRecord, error: deliveryError } = await supabase
      .from("statement_email_delivery")
      .insert(deliveryInsert)
      .select()
      .single();

    if (deliveryError) throw deliveryError;

    // Trigger Edge Function to send email to ALL recipients
    const { error: sendError } = await supabase.functions.invoke("send-email", {
      body: {
        to: recipientEmails, // Array of all recipients
        subject: subject,
        html: statement.html_content,
        email_type: "monthly_statement",
      },
    });

    if (sendError) {
      // Update status to FAILED
      const failedUpdate: Partial<StatementEmailDelivery> = {
        status: "FAILED",
        error_message: sendError.message || "Failed to invoke edge function",
        failed_at: new Date().toISOString(),
      };

      await supabase
        .from("statement_email_delivery")
        .update(failedUpdate)
        .eq("id", deliveryRecord.id);

      throw sendError;
    }

    // Update status to SENT
    const sentUpdate: Partial<StatementEmailDelivery> = {
      status: "SENT",
      sent_at: new Date().toISOString(),
    };

    await supabase
      .from("statement_email_delivery")
      .update(sentUpdate)
      .eq("id", deliveryRecord.id);

    return { recipients: recipientEmails };
  } catch (error) {
    console.error("Error sending investor statement:", error);
    throw error instanceof Error ? error : new Error("Failed to send investor statement");
  }
}

/**
 * Get report freshness status (whether report needs regeneration)
 */
export async function getReportFreshness(periodId: string, userId: string): Promise<ReportFreshness> {
  try {
    // Get generated_statements.created_at
    type StatementTimestamp = Pick<GeneratedStatement, "created_at">;
    const { data: statement } = await supabase
      .from("generated_statements")
      .select("created_at")
      .eq("period_id", periodId)
      .eq("user_id", userId)
      .maybeSingle()
      .returns<StatementTimestamp | null>();

    // Get MAX(updated_at) from investor_fund_performance
    type PerformanceTimestamp = Pick<InvestorFundPerformanceRow, "updated_at">;
    const { data: performances } = await supabase
      .from("investor_fund_performance")
      .select("updated_at")
      .eq("period_id", periodId)
      .eq("investor_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .returns<PerformanceTimestamp[]>();

    const generatedAt = statement?.created_at || null;
    const dataUpdatedAt = performances?.[0]?.updated_at || null;

    // Report is outdated if data was updated after generation
    const isOutdated = generatedAt && dataUpdatedAt
      ? new Date(dataUpdatedAt) > new Date(generatedAt)
      : false;

    return { isOutdated, generatedAt, dataUpdatedAt };
  } catch (error) {
    console.error("Error getting report freshness:", error);
    return { isOutdated: false, generatedAt: null, dataUpdatedAt: null };
  }
}

/**
 * Send all pending statements for a period
 */
export async function sendAllStatements(
  periodId: string
): Promise<{ success: number; failed: number; errors: string[] }> {
  try {
    const investors = await fetchPeriodInvestors(periodId);
    const pendingInvestors = investors.filter((i) => i.statement_generated && !i.statement_sent);

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const investor of pendingInvestors) {
      try {
        await sendInvestorStatement(periodId, investor.id);
        results.success++;
      } catch (error) {
        results.failed++;
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        results.errors.push(`${investor.name}: ${errorMsg}`);
      }
    }

    return results;
  } catch (error) {
    console.error("Error sending all statements:", error);
    throw new Error("Failed to send all statements");
  }
}

/**
 * Finalize a statement period (lock from further edits)
 */
export async function finalizePeriod(periodId: string): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Direct update instead of RPC
    const updateData: StatementPeriodUpdate = {
      status: "finalized",
      finalized_at: new Date().toISOString(),
      finalized_by: user.id,
    };

    const { error: updateError } = await supabase
      .from("statement_periods")
      .update(updateData)
      .eq("id", periodId);

    if (updateError) throw updateError;

    // Log audit event
    const auditData: AuditLogInsert = {
      action: "FINALIZE_PERIOD",
      entity: "statement_periods",
      entity_id: periodId,
      actor_user: user.id,
      new_values: { status: "finalized" },
    };

    await supabase.from("audit_log").insert(auditData);

  } catch (error) {
    console.error("Error finalizing period:", error);
    throw new Error("Failed to finalize period");
  }
}

/**
 * Save or update investor fund performance data
 */
export async function saveInvestorFundPerformance(
  periodId: string,
  userId: string,
  fundName: string,
  data: Partial<InvestorFundPerformance>
): Promise<InvestorFundPerformance> {
  try {
    // V2 Architecture: investor_id = profiles.id (One ID)
    const upsertData: InvestorFundPerformanceInsert = {
      period_id: periodId,
      investor_id: userId,
      fund_name: fundName,
      ...data,
    };

    const { data: performance, error } = await supabase
      .from("investor_fund_performance")
      .upsert(upsertData)
      .select()
      .single();

    if (error) throw error;
    return performance as InvestorFundPerformance;
  } catch (error) {
    console.error("Error saving investor fund performance:", error);
    throw new Error("Failed to save investor fund performance");
  }
}

/**
 * Fetch investor fund performance data for a period
 */
export async function fetchInvestorFundPerformance(
  periodId: string,
  userId: string
): Promise<InvestorFundPerformance[]> {
  try {
    // V2 Architecture: investor_id = profiles.id (One ID)
    const { data, error } = await supabase
      .from("investor_fund_performance")
      .select("*")
      .eq("period_id", periodId)
      .eq("investor_id", userId);

    if (error) throw error;
    return (data || []) as InvestorFundPerformance[];
  } catch (error) {
    console.error("Error fetching investor fund performance:", error);
    throw new Error("Failed to fetch investor fund performance");
  }
}

// ==============================================
// API OBJECT FOR EASY CONSUMPTION
// ==============================================

const getPeriods = async () => {
  try {
    const data = await fetchStatementPeriods();
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Unknown error" };
  }
};

const createPeriod = async (data: Parameters<typeof createStatementPeriod>[0]) => {
  try {
    const result = await createStatementPeriod(data);
    return { data: result, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Unknown error" };
  }
};

const getPeriodInvestors = async (periodId: string) => {
  try {
    const data = await fetchPeriodInvestors(periodId);
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Unknown error" };
  }
};

const getPeriodSummary = async (periodId: string) => {
  try {
    const data = await fetchPeriodSummary(periodId);
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Unknown error" };
  }
};

const generateStatement = async (periodId: string, userId: string) => {
  try {
    const data = await generateInvestorStatement(periodId, userId);
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Unknown error" };
  }
};

const generateAll = async (periodId: string) => {
  try {
    const data = await generateAllStatements(periodId);
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Unknown error" };
  }
};

const previewStatement = async (periodId: string, userId: string) => {
  try {
    const data = await previewInvestorStatement(periodId, userId);
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Unknown error" };
  }
};

const sendStatement = async (periodId: string, userId: string) => {
  try {
    await sendInvestorStatement(periodId, userId);
    return { data: true, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Unknown error" };
  }
};

const sendAll = async (periodId: string) => {
  try {
    const data = await sendAllStatements(periodId);
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Unknown error" };
  }
};

const finalize = async (periodId: string) => {
  try {
    await finalizePeriod(periodId);
    return { data: true, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Unknown error" };
  }
};

const savePerformanceData = async (
  periodId: string,
  userId: string,
  fundName: string,
  data: Partial<InvestorFundPerformance>
) => {
  try {
    const result = await saveInvestorFundPerformance(periodId, userId, fundName, data);
    return { data: result, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Unknown error" };
  }
};

const getPerformanceData = async (periodId: string, userId: string) => {
  try {
    const data = await fetchInvestorFundPerformance(periodId, userId);
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Unknown error" };
  }
};

export const statementsApi = {
  getPeriods,
  createPeriod,
  getPeriodInvestors,
  getPeriodSummary,
  generateStatement,
  generateAll,
  previewStatement,
  sendStatement,
  sendAll,
  finalize,
  savePerformanceData,
  getPerformanceData,
};

export default statementsApi;
