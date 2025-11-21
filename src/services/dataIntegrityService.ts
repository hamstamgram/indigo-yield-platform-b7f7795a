/**
 * Data Integrity Validation Service
 * Checks for orphaned records, invalid foreign keys, and data inconsistencies
 */

import { supabase } from "@/integrations/supabase/client";

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
  async runFullIntegrityCheck() {
    // Check for orphaned records
    const orphanedPositionsIssues = await this.checkOrphanedPositions();
    const orphanedTransactions = await this.checkOrphanedTransactions();

    // Check for negative balances
    const negativeBalanceIssues = await this.checkNegativeBalances();

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

    // Check for negative balances
    const negativeBalances = await this.checkNegativeBalances();
    issues.push(...negativeBalances);

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
        .limit(1000);

      if (transactions && transactions.length > 0) {
        for (const tx of transactions) {
          const { data: investor } = await supabase
            .from("investors")
            .select("id")
            .eq("id", tx.investor_id)
            .maybeSingle();

          if (!investor) {
            orphaned.push(tx);
          }
        }
      }
    } catch (error) {
      console.error("Error checking orphaned transactions:", error);
    }

    return orphaned;
  },

  /**
   * Check for data validation issues
   */
  async checkDataValidation() {
    const invalidEmails: any[] = [];
    const futureTransactions: any[] = [];
    const zeroAmountTransactions: any[] = [];

    // Check for invalid email formats
    const { data: investors } = await supabase.from("investors").select("id, name, email");

    if (investors) {
      investors.forEach((inv) => {
        if (inv.email && !inv.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
          invalidEmails.push(inv);
        }
      });
    }

    // Check for future transactions
    const { data: transactions } = await supabase
      .from("transactions_v2")
      .select("id, investor_id, occurred_at, amount")
      .gt("occurred_at", new Date().toISOString());

    if (transactions) {
      futureTransactions.push(...transactions);
    }

    // Check for zero amount transactions
    const { data: zeroTx } = await supabase
      .from("transactions_v2")
      .select("id, investor_id, asset, amount")
      .eq("amount", 0);

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
        .select("investor_id, fund_id, current_value");

      if (positions && positions.length > 0) {
        // Check each position's investor exists
        for (const pos of positions) {
          const { data: investor } = await supabase
            .from("investors")
            .select("id")
            .eq("id", pos.investor_id)
            .single();

          if (!investor) {
            issues.push({
              type: "orphaned_record",
              severity: "error",
              table: "investor_positions",
              record_id: pos.investor_id,
              description: `Position references non-existent investor: ${pos.investor_id}`,
              details: pos,
            });
          }
        }
      }
    } catch (error) {
      console.error("Error checking orphaned positions:", error);
    }

    return issues;
  },

  /**
   * Check for negative balances in investor positions
   */
  async checkNegativeBalances(): Promise<IntegrityIssue[]> {
    const issues: IntegrityIssue[] = [];

    const { data: negativePositions } = await supabase
      .from("investor_positions")
      .select("*")
      .or("current_value.lt.0,cost_basis.lt.0,shares.lt.0");

    if (negativePositions && negativePositions.length > 0) {
      negativePositions.forEach((pos: any) => {
        issues.push({
          type: "negative_balance",
          severity: "error",
          table: "investor_positions",
          record_id: pos.investor_id,
          description: `Negative values detected for investor ${pos.investor_id}`,
          details: {
            current_value: pos.current_value,
            cost_basis: pos.cost_basis,
            shares: pos.shares,
          },
        });
      });
    }

    return issues;
  },

  /**
   * Check for missing required fields
   */
  async checkMissingRequiredFields(): Promise<IntegrityIssue[]> {
    const issues: IntegrityIssue[] = [];

    // Check investors without email
    const { data: investorsNoEmail } = await supabase
      .from("investors")
      .select("id, name")
      .or("email.is.null,email.eq.");

    if (investorsNoEmail && investorsNoEmail.length > 0) {
      investorsNoEmail.forEach((inv: any) => {
        issues.push({
          type: "missing_field",
          severity: "warning",
          table: "investors",
          record_id: inv.id,
          description: `Investor "${inv.name}" missing email address`,
        });
      });
    }

    // Check positions without fund_id
    const { data: positionsNoFund } = await supabase
      .from("investor_positions")
      .select("*")
      .is("fund_id", null);

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
        .select("*, investor:investor_id(name)");

      if (positions) {
        for (const position of positions) {
          // Get sum of investments for this investor
          const { data: investments } = await supabase
            .from("investments")
            .select("amount")
            .eq("investor_id", position.investor_id)
            .eq("fund_id", position.fund_id)
            .eq("status", "active");

          if (investments) {
            const totalInvested = investments.reduce(
              (sum, inv) => sum + Number(inv.amount || 0),
              0
            );
            const costBasis = Number(position.cost_basis || 0);

            // Allow for small rounding differences (< $1)
            if (Math.abs(totalInvested - costBasis) > 1) {
              issues.push({
                type: "inconsistent_total",
                severity: "warning",
                table: "investor_positions",
                record_id: position.investor_id,
                description: `Investment total (${totalInvested}) doesn't match cost basis (${costBasis}) for investor ${position.investor_id}`,
                details: {
                  investor_name: position.investor?.name,
                  total_invested: totalInvested,
                  cost_basis: costBasis,
                  difference: totalInvested - costBasis,
                },
              });
            }
          }
        }
      }
    } catch (error) {
      console.error("Error checking inconsistent totals:", error);
    }

    return issues;
  },

  /**
   * Get summary statistics of data integrity
   */
  async getIntegritySummary() {
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
