// @ts-nocheck
import { supabase } from '@/integrations/supabase/client';
import { generateMonthlyStatementHTML, generateStatementPreview } from '@/lib/statements/monthlyEmailGenerator';
import type { Database } from '@/integrations/supabase/types';
import Decimal from 'decimal.js';

// Database types
type StatementPeriod = Database['public']['Tables']['statement_periods']['Row'];
type InvestorFundPerformance = Database['public']['Tables']['investor_fund_performance']['Row'];
type GeneratedStatement = Database['public']['Tables']['generated_statements']['Row'];
type StatementEmailDelivery = Database['public']['Tables']['statement_email_delivery']['Row'];

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
}

export interface PeriodSummary {
  total_investors: number;
  total_funds: number;
  statements_generated: number;
  statements_sent: number;
  statements_pending: number;
}

/**
 * Fetch all statement periods
 */
export async function fetchStatementPeriods(): Promise<StatementPeriodWithStats[]> {
  try {
    const { data, error } = await supabase
      .from('statement_periods')
      .select('*')
      .order('period_end_date', { ascending: false });

    if (error) throw error;

    // Fetch stats for each period
    const periodsWithStats = await Promise.all(
      (data || []).map(async (period) => {
        const summary = await fetchPeriodSummary(period.id);
        return {
          ...period,
          investor_count: summary.total_investors,
          statements_generated: summary.statements_generated,
          statements_sent: summary.statements_sent,
        };
      })
    );

    return periodsWithStats;
  } catch (error) {
    console.error('Error fetching statement periods:', error);
    throw new Error('Failed to fetch statement periods');
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: period, error } = await supabase
      .from('statement_periods')
      .insert({
        ...data,
        created_by: user.id,
        status: 'DRAFT',
      })
      .select()
      .single();

    if (error) throw error;
    return period;
  } catch (error) {
    console.error('Error creating statement period:', error);
    throw new Error('Failed to create statement period');
  }
}

/**
 * Fetch investors for a specific period
 */
export async function fetchPeriodInvestors(periodId: string): Promise<InvestorStatementSummary[]> {
  try {
    // Get all investors with fund performance data for this period
    const { data: performances, error: perfError } = await supabase
      .from('investor_fund_performance')
      .select(`
        user_id,
        fund_name,
        profiles!investor_fund_performance_user_id_fkey (
          id,
          email,
          full_name
        )
      `)
      .eq('period_id', periodId);

    if (perfError) throw perfError;

    // Group by investor
    const investorMap = new Map<string, InvestorStatementSummary>();

    for (const perf of performances || []) {
      const profile = perf.profiles as any;
      if (!profile) continue;

      const existing = investorMap.get(perf.user_id);
      if (existing) {
        existing.fund_count++;
        existing.fund_names.push(perf.fund_name);
      } else {
        investorMap.set(perf.user_id, {
          id: perf.user_id,
          name: profile.full_name || 'Unknown',
          email: profile.email || '',
          fund_count: 1,
          fund_names: [perf.fund_name],
          statement_generated: false,
          statement_sent: false,
        });
      }
    }

    // Get generated statements
    const { data: statements, error: stmtError } = await supabase
      .from('generated_statements')
      .select('user_id, id')
      .eq('period_id', periodId);

    if (stmtError) throw stmtError;

    // Get delivery status
    const { data: deliveries, error: delError } = await supabase
      .from('statement_email_delivery')
      .select('user_id, status, sent_at, statement_id')
      .eq('period_id', periodId);

    if (delError) throw delError;

    // Update investor summaries with statement info
    const investors = Array.from(investorMap.values());

    for (const investor of investors) {
      const statement = statements?.find(s => s.user_id === investor.id);
      if (statement) {
        investor.statement_generated = true;
        investor.statement_id = statement.id;

        const delivery = deliveries?.find(d => d.user_id === investor.id);
        if (delivery) {
          investor.statement_sent = delivery.status === 'SENT';
          investor.delivery_status = delivery.status;
          investor.sent_at = delivery.sent_at || undefined;
        }
      }
    }

    return investors.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error fetching period investors:', error);
    throw new Error('Failed to fetch period investors');
  }
}

/**
 * Fetch period summary statistics
 */
export async function fetchPeriodSummary(periodId: string): Promise<PeriodSummary> {
  try {
    const { data, error } = await supabase
      .rpc('get_statement_period_summary', { p_period_id: periodId });

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
    console.error('Error fetching period summary:', error);
    throw new Error('Failed to fetch period summary');
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Fetch period details
    const { data: period, error: periodError } = await supabase
      .from('statement_periods')
      .select('*')
      .eq('id', periodId)
      .maybeSingle();

    if (!period) throw new Error('Statement period not found');

    if (periodError) throw periodError;

    // Fetch investor profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', userId)
      .maybeSingle();

    if (!profile) throw new Error('Profile not found');

    if (profileError) throw profileError;

    // Fetch fund performance data
    const { data: performances, error: perfError } = await supabase
      .from('investor_fund_performance')
      .select('*')
      .eq('period_id', periodId)
      .eq('user_id', userId);

    if (perfError) throw perfError;

    if (!performances || performances.length === 0) {
      throw new Error('No fund performance data found for this investor');
    }

    // Convert to format expected by HTML generator
    const funds = performances.map(p => ({
      fund_name: p.fund_name,
      mtd_beginning_balance: p.mtd_beginning_balance?.toString() || '0',
      mtd_additions: p.mtd_additions?.toString() || '0',
      mtd_redemptions: p.mtd_redemptions?.toString() || '0',
      mtd_net_income: p.mtd_net_income?.toString() || '0',
      mtd_ending_balance: p.mtd_ending_balance?.toString() || '0',
      mtd_rate_of_return: p.mtd_rate_of_return?.toString() || '0',
      qtd_beginning_balance: p.qtd_beginning_balance?.toString() || '0',
      qtd_additions: p.qtd_additions?.toString() || '0',
      qtd_redemptions: p.qtd_redemptions?.toString() || '0',
      qtd_net_income: p.qtd_net_income?.toString() || '0',
      qtd_ending_balance: p.qtd_ending_balance?.toString() || '0',
      qtd_rate_of_return: p.qtd_rate_of_return?.toString() || '0',
      ytd_beginning_balance: p.ytd_beginning_balance?.toString() || '0',
      ytd_additions: p.ytd_additions?.toString() || '0',
      ytd_redemptions: p.ytd_redemptions?.toString() || '0',
      ytd_net_income: p.ytd_net_income?.toString() || '0',
      ytd_ending_balance: p.ytd_ending_balance?.toString() || '0',
      ytd_rate_of_return: p.ytd_rate_of_return?.toString() || '0',
      itd_beginning_balance: p.itd_beginning_balance?.toString() || '0',
      itd_additions: p.itd_additions?.toString() || '0',
      itd_redemptions: p.itd_redemptions?.toString() || '0',
      itd_net_income: p.itd_net_income?.toString() || '0',
      itd_ending_balance: p.itd_ending_balance?.toString() || '0',
      itd_rate_of_return: p.itd_rate_of_return?.toString() || '0',
    }));

    // Generate HTML
    const html = generateMonthlyStatementHTML({
      investor_name: profile.full_name || 'Investor',
      investor_email: profile.email || '',
      period_ended: period.period_name,
      funds,
    });

    // Save to database
    const { data: statement, error: stmtError } = await supabase
      .from('generated_statements')
      .upsert({
        period_id: periodId,
        user_id: userId,
        html_content: html,
        generated_by: user.id,
        fund_names: performances.map(p => p.fund_name),
      })
      .select()
      .single();

    if (stmtError) throw stmtError;

    return {
      html,
      statement_id: statement.id,
    };
  } catch (error) {
    console.error('Error generating investor statement:', error);
    throw new Error('Failed to generate investor statement');
  }
}

/**
 * Generate statements for all investors in a period
 */
export async function generateAllStatements(periodId: string): Promise<{ success: number; failed: number; errors: string[] }> {
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
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`${investor.name}: ${errorMsg}`);
      }
    }

    return results;
  } catch (error) {
    console.error('Error generating all statements:', error);
    throw new Error('Failed to generate all statements');
  }
}

/**
 * Preview statement for an investor
 */
export async function previewInvestorStatement(
  periodId: string,
  userId: string
): Promise<string> {
  try {
    // Check if statement exists
    const { data: existing, error: existingError } = await supabase
      .from('generated_statements')
      .select('html_content')
      .eq('period_id', periodId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingError) throw existingError;

    if (existing && existing.html_content) {
      // Return existing statement with preview banner
      return generateStatementPreview(existing.html_content);
    }

    // Generate new statement for preview
    const { html } = await generateInvestorStatement(periodId, userId);
    return generateStatementPreview(html);
  } catch (error) {
    console.error('Error previewing investor statement:', error);
    throw new Error('Failed to preview investor statement');
  }
}

/**
 * Send statement via email to an investor
 */
export async function sendInvestorStatement(
  periodId: string,
  userId: string
): Promise<void> {
  try {
    // Get statement
    const { data: statement, error: stmtError } = await supabase
      .from('generated_statements')
      .select('*')
      .eq('period_id', periodId)
      .eq('user_id', userId)
      .maybeSingle();

    if (stmtError) throw stmtError;
    if (!statement) throw new Error('Statement not found. Please generate first.');

    // Get investor profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .maybeSingle();

    if (!profile) throw new Error('Profile not found');

    if (profileError) throw profileError;

    // Get period details
    const { data: period, error: periodError } = await supabase
      .from('statement_periods')
      .select('period_name')
      .eq('id', periodId)
      .maybeSingle();

    if (!period) throw new Error('Period not found');

    if (periodError) throw periodError;

    const subject = `Your ${period.period_name} Investment Statement - Indigo Fund`;

    // Queue email for delivery
    const { error: deliveryError } = await supabase
      .from('statement_email_delivery')
      .insert({
        statement_id: statement.id,
        user_id: userId,
        period_id: periodId,
        recipient_email: profile.email || '',
        subject,
        status: 'QUEUED',
      });

    if (deliveryError) throw deliveryError;

    // TODO: Trigger Edge Function to actually send the email
    // This would typically call a Supabase Edge Function that uses
    // an email service like Resend, SendGrid, etc.
    // For now, we just queue it in the database

  } catch (error) {
    console.error('Error sending investor statement:', error);
    throw new Error('Failed to send investor statement');
  }
}

/**
 * Send all pending statements for a period
 */
export async function sendAllStatements(periodId: string): Promise<{ success: number; failed: number; errors: string[] }> {
  try {
    const investors = await fetchPeriodInvestors(periodId);
    const pendingInvestors = investors.filter(i => i.statement_generated && !i.statement_sent);

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
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`${investor.name}: ${errorMsg}`);
      }
    }

    return results;
  } catch (error) {
    console.error('Error sending all statements:', error);
    throw new Error('Failed to send all statements');
  }
}

/**
 * Finalize a statement period (lock from further edits)
 */
export async function finalizePeriod(periodId: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .rpc('finalize_statement_period', {
        p_period_id: periodId,
        p_admin_id: user.id,
      });

    if (error) throw error;
  } catch (error) {
    console.error('Error finalizing period:', error);
    throw new Error('Failed to finalize period');
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
    const { data: performance, error } = await supabase
      .from('investor_fund_performance')
      .upsert({
        period_id: periodId,
        user_id: userId,
        fund_name: fundName,
        ...data,
      })
      .select()
      .single();

    if (error) throw error;
    return performance;
  } catch (error) {
    console.error('Error saving investor fund performance:', error);
    throw new Error('Failed to save investor fund performance');
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
    const { data, error } = await supabase
      .from('investor_fund_performance')
      .select('*')
      .eq('period_id', periodId)
      .eq('user_id', userId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching investor fund performance:', error);
    throw new Error('Failed to fetch investor fund performance');
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
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

const createPeriod = async (data: Parameters<typeof createStatementPeriod>[0]) => {
  try {
    const result = await createStatementPeriod(data);
    return { data: result, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

const getPeriodInvestors = async (periodId: string) => {
  try {
    const data = await fetchPeriodInvestors(periodId);
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

const getPeriodSummary = async (periodId: string) => {
  try {
    const data = await fetchPeriodSummary(periodId);
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

const generateStatement = async (periodId: string, userId: string) => {
  try {
    const data = await generateInvestorStatement(periodId, userId);
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

const generateAll = async (periodId: string) => {
  try {
    const data = await generateAllStatements(periodId);
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

const previewStatement = async (periodId: string, userId: string) => {
  try {
    const data = await previewInvestorStatement(periodId, userId);
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

const sendStatement = async (periodId: string, userId: string) => {
  try {
    await sendInvestorStatement(periodId, userId);
    return { data: true, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

const sendAll = async (periodId: string) => {
  try {
    const data = await sendAllStatements(periodId);
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

const finalize = async (periodId: string) => {
  try {
    await finalizePeriod(periodId);
    return { data: true, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
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
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

const getPerformanceData = async (periodId: string, userId: string) => {
  try {
    const data = await fetchInvestorFundPerformance(periodId, userId);
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
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
