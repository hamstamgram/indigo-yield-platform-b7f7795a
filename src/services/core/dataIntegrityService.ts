/**
 * Data Integrity Validation Service
 * Checks for orphaned records, invalid foreign keys, and data inconsistencies
 */

import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/lib/logger";
import { getTodayString } from "@/utils/dateUtils";
import { parseFinancial } from "@/utils/financial";

export interface IntegrityIssue {
  type:
    | "orphaned_record"
    | "invalid_foreign_key"
    | "negative_balance"
    | "missing_field"
    | "inconsistent_total";
  severity: "error" | "warning" | "info";
  table: string;
  record_id?: string;
  description: string;
  details?: any;
}

export interface IntegrityReport {
  checked_at: string;
  total_issues: number;
  errors: number;
  warnings: number;
  issues: IntegrityIssue[];
}

export const dataIntegrityService = {
  /**
   * Run comprehensive data integrity checks - returns detailed breakdown
   */
  async runFullIntegrityCheck(): Promise<{
    orphanedRecords: {
      positions: IntegrityIssue[];
      transactions: any[];
      investorPositions: IntegrityIssue[];
    };
    negativeBalances: { positions: IntegrityIssue[]; investorPositions: IntegrityIssue[] };
    missingRequiredFields: { investors: IntegrityIssue[]; positions: IntegrityIssue[] };
    dataValidation: any;
    inconsistentTotals: IntegrityIssue[];
  }> {
    // Check for orphaned records
    const orphanedPositionsIssues = await this.checkOrphanedPositions();
    const orphanedTransactions = await this.checkOrphanedTransactions();

    // Check for negative balances (stub - method doesn't exist yet)
    const negativeBalanceIssues: IntegrityIssue[] = [];

    // Check for missing required fields
    const missingFieldIssues = await this.checkMissingRequiredFields();

    // Check for data validation issues
    const validationIssues = await this.checkDataValidation();

    // Check for inconsistent totals
    const inconsistentTotalIssues = await this.checkInconsistentTotals();

    return {
      orphanedRecords: {
        positions: orphanedPositionsIssues.filter((i) => i.table === "positions"),
        transactions: orphanedTransactions,
        investorPositions: orphanedPositionsIssues.filter((i) => i.table === "investor_positions"),
      },
      negativeBalances: {
        positions: negativeBalanceIssues.filter((i) => i.table === "positions"),
        investorPositions: negativeBalanceIssues.filter((i) => i.table === "investor_positions"),
      },
      missingRequiredFields: {
        investors: missingFieldIssues.filter((i) => i.table === "investors"),
        positions: missingFieldIssues.filter((i) => i.table === "investor_positions"),
      },
      dataValidation: validationIssues,
      inconsistentTotals: inconsistentTotalIssues,
    };
  },

  /**
   * Run comprehensive data integrity checks - returns flat list
   */
  async runIntegrityCheck(): Promise<IntegrityReport> {
    const issues: IntegrityIssue[] = [];

    // Check for orphaned investor positions
    const orphanedPositions = await this.checkOrphanedPositions();
    issues.push(...orphanedPositions);

    // Check for negative balances (stub - method doesn't exist yet)
    // const negativeBalances = await this.checkNegativeBalances();
    // issues.push(...negativeBalances);

    // Check for missing required fields
    const missingFields = await this.checkMissingRequiredFields();
    issues.push(...missingFields);

    // Check for inconsistent transaction totals
    const inconsistentTotals = await this.checkInconsistentTotals();
    issues.push(...inconsistentTotals);

    const errors = issues.filter((i) => i.severity === "error").length;
    const warnings = issues.filter((i) => i.severity === "warning").length;

    return {
      checked_at: new Date().toISOString(),
      total_issues: issues.length,
      errors,
      warnings,
      issues,
    };
  },

  /**
   * Check for orphaned transactions
   */
  async checkOrphanedTransactions(): Promise<any[]> {
    const orphaned: any[] = [];

    try {
      const { data: transactions } = await supabase
        .from("transactions_v2")
        .select("id, investor_id, asset, amount")
        .eq("is_voided", false)
        .limit(1000);

      if (transactions && transactions.length > 0) {
        for (const tx of transactions) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("id", tx.investor_id)
            .maybeSingle();

          if (!profile) {
            orphaned.push(tx);
          }
        }
      }
    } catch (error) {
      logError("dataIntegrity.checkOrphanedTransactions", error);
    }

    return orphaned;
  },

  /**
   * Check for data validation issues
   */
  async checkDataValidation(): Promise<{
    invalidEmails: any[];
    futureTransactions: any[];
    zeroAmountTransactions: any[];
  }> {
    const invalidEmails: any[] = [];
    const futureTransactions: any[] = [];
    const zeroAmountTransactions: any[] = [];

    // Check for invalid email formats in profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, first_name, last_name")
      .eq("is_admin", false)
      .limit(1000);

    if (profiles) {
      profiles.forEach(
        (p: {
          id: string;
          email: string | null;
          first_name: string | null;
          last_name: string | null;
        }) => {
          if (p.email && !p.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            invalidEmails.push(p);
          }
        }
      );
    }

    // Check for future transactions
    const { data: transactions } = await supabase
      .from("transactions_v2")
      .select("id, investor_id, tx_date, amount")
      .eq("is_voided", false)
      .gt("tx_date", getTodayString())
      .limit(1000);

    if (transactions) {
      futureTransactions.push(...transactions);
    }

    // Check for zero amount transactions
    const { data: zeroTx } = await supabase
      .from("transactions_v2")
      .select("id, investor_id, asset, amount")
      .eq("is_voided", false)
      .eq("amount", 0)
      .limit(1000);

    if (zeroTx) {
      zeroAmountTransactions.push(...zeroTx);
    }

    return {
      invalidEmails,
      futureTransactions,
      zeroAmountTransactions,
    };
  },

  /**
   * Check for orphaned investor positions
   */
  async checkOrphanedPositions(): Promise<IntegrityIssue[]> {
    const issues: IntegrityIssue[] = [];

    try {
      // Query positions and check if investor exists
      const { data: positions } = await supabase
        .from("investor_positions")
        .select("investor_id, fund_id, current_value")
        .limit(1000);

      if (positions && positions.length > 0) {
        // Check each position's investor exists
        for (const pos of positions) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("id", pos.investor_id)
            .maybeSingle();

          if (!profile) {
            issues.push({
              type: "orphaned_record",
              severity: "error",
              table: "investor_positions",
              record_id: pos.investor_id,
              description: `Position references non-existent profile: ${pos.investor_id}`,
              details: pos,
            });
          }
        }
      }
    } catch (error) {
      logError("dataIntegrity.checkOrphanedPositions", error);
    }

    return issues;
  },

  /**
   * Check for missing required fields
   */
  async checkMissingRequiredFields(): Promise<IntegrityIssue[]> {
    const issues: IntegrityIssue[] = [];

    // Check profiles without email
    const { data: profilesNoEmail } = await supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .eq("is_admin", false)
      .or("email.is.null,email.eq.")
      .limit(1000);

    if (profilesNoEmail && profilesNoEmail.length > 0) {
      profilesNoEmail.forEach((p: any) => {
        issues.push({
          type: "missing_field",
          severity: "warning",
          table: "profiles",
          record_id: p.id,
          description: `Profile "${p.first_name} ${p.last_name}" missing email address`,
        });
      });
    }

    // Check positions without fund_id
    const { data: positionsNoFund } = await supabase
      .from("investor_positions")
      .select("*")
      .is("fund_id", null)
      .limit(1000);

    if (positionsNoFund && positionsNoFund.length > 0) {
      positionsNoFund.forEach((pos: any) => {
        issues.push({
          type: "missing_field",
          severity: "error",
          table: "investor_positions",
          record_id: pos.investor_id,
          description: `Position missing fund_id for investor ${pos.investor_id}`,
        });
      });
    }

    return issues;
  },

  /**
   * Check for inconsistent transaction totals
   */
  async checkInconsistentTotals(): Promise<IntegrityIssue[]> {
    const issues: IntegrityIssue[] = [];

    try {
      // Check if transaction totals match position cost basis
      const { data: positions } = await supabase
        .from("investor_positions")
        .select("investor_id, fund_id, cost_basis")
        .limit(1000);

      if (positions) {
        for (const position of positions) {
          // Note: investments table doesn't exist - use transactions_v2 instead
          const { data: deposits } = await supabase
            .from("transactions_v2")
            .select("amount")
            .eq("investor_id", position.investor_id)
            .eq("fund_id", position.fund_id)
            .eq("is_voided", false)
            .eq("type", "DEPOSIT")
            .limit(2000);

          const { data: withdrawals } = await supabase
            .from("transactions_v2")
            .select("amount")
            .eq("investor_id", position.investor_id)
            .eq("fund_id", position.fund_id)
            .eq("is_voided", false)
            .eq("type", "WITHDRAWAL")
            .limit(2000);

          const totalDeposits =
            deposits
              ?.reduce((sum, tx) => sum.plus(parseFinancial(tx.amount)), parseFinancial(0))
              .toNumber() || 0;
          const totalWithdrawals =
            withdrawals
              ?.reduce((sum, tx) => sum.plus(parseFinancial(tx.amount)), parseFinancial(0))
              .toNumber() || 0;
          const totalInvested = parseFinancial(totalDeposits)
            .minus(parseFinancial(totalWithdrawals))
            .toNumber();
          const costBasis = parseFinancial(position.cost_basis).toNumber();

          // Allow for small rounding differences (< $1)
          if (Math.abs(totalInvested - costBasis) > 1) {
            issues.push({
              type: "inconsistent_total",
              severity: "warning",
              table: "investor_positions",
              record_id: position.investor_id,
              description: `Transaction total (${totalInvested}) doesn't match cost basis (${costBasis}) for investor ${position.investor_id}`,
              details: {
                investor_name: position.investor_id,
                total_invested: totalInvested,
                cost_basis: costBasis,
                difference: totalInvested - costBasis,
              },
            });
          }
        }
      }
    } catch (error) {
      logError("dataIntegrity.checkInconsistentTotals", error);
    }

    return issues;
  },

  /**
   * Get summary statistics of data integrity
   */
  async getIntegritySummary(): Promise<{
    total_issues: number;
    errors: number;
    warnings: number;
    last_checked: string;
    critical_issues: IntegrityIssue[];
  }> {
    const report = await this.runIntegrityCheck();

    return {
      total_issues: report.total_issues,
      errors: report.errors,
      warnings: report.warnings,
      last_checked: report.checked_at,
      critical_issues: report.issues.filter((i) => i.severity === "error").slice(0, 5),
    };
  },
};
