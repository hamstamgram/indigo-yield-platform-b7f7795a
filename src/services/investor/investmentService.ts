import { supabase } from "@/integrations/supabase/client";
import { type InvestmentFormData } from "@/types/domains";
import { logError } from "@/lib/logger";
import { callRPC } from "@/lib/supabase/typedRPC";
import { getTodayString } from "@/utils/dateUtils";

export const investmentService = {
  /**
   * Create investment using crystallize-before-flow accounting.
   * NOTE: Requires an authoritative new total AUM snapshot (p_new_total_aum).
   */
  async createInvestment(data: InvestmentFormData) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      throw new Error("Not authenticated");
    }

    // Map transaction type
    const type = data.transaction_type === "redemption" ? "WITHDRAWAL" : "DEPOSIT";
    const amount = Math.abs(data.amount);

    const closingAum = data.closing_aum;
    if (!closingAum) {
      throw new Error(
        "closing_aum is required to apply an investment (crystallize-before-flow). Provide the authoritative AUM snapshot for this event."
      );
    }

    // Get fund asset for transaction record
    const { data: fund } = await supabase
      .from("funds")
      .select("asset, fund_class")
      .eq("id", data.fund_id)
      .maybeSingle();

    if (!fund) {
      throw new Error(`Fund not found: ${data.fund_id}`);
    }

    const txDate = data.investment_date || getTodayString();

    // Trigger reference for idempotency (used by fund_aum_events + reference_id prefixing)
    const triggerReference =
      data.reference_number ||
      `investment:${data.fund_id}:${data.investor_id}:${txDate}:${crypto.randomUUID()}`;

    const { data: result, error } =
      type === "DEPOSIT"
        ? await callRPC("apply_deposit_with_crystallization", {
            p_fund_id: data.fund_id,
            p_investor_id: data.investor_id,
            p_amount: amount,
            p_closing_aum: Number(closingAum),
            p_effective_date: txDate,
            p_admin_id: user.id,
            p_notes: `Investment - ${triggerReference}`,
            p_purpose: "transaction",
          })
        : await callRPC("apply_withdrawal_with_crystallization", {
            p_fund_id: data.fund_id,
            p_investor_id: data.investor_id,
            p_amount: amount,
            p_new_total_aum: Number(closingAum),
            p_tx_date: txDate,
            p_admin_id: user.id,
            p_notes: `Redemption - ${triggerReference}`,
            p_purpose: "transaction",
          });

    if (error) {
      logError(`investmentService.${type}`, error, { fundId: data.fund_id });
      throw new Error(error.message || "Failed to create investment");
    }

    const res = result as any;
    const txId = type === "DEPOSIT" ? res?.deposit_tx_id : res?.withdrawal_tx_id;
    if (!res?.success || !txId) {
      throw new Error("Failed to create investment");
    }

    return { success: true, transactionId: txId };
  },

  /**
   * Approve a pending investment
   * Updates the transaction status and ensures position is in sync
   */
  async approveInvestment(id: string, shares: number) {
    void id;
    void shares;
    throw new Error(
      "Investment approval is not supported on the immutable ledger. Create deposits/withdrawals through the crystallize-before-flow RPCs at the time they become effective."
    );
  },

  async rejectInvestment(id: string, reason: string) {
    void id;
    void reason;
    throw new Error(
      "Investment rejection is not supported on the immutable ledger. Void and re-issue if a ledger entry must be reversed."
    );
  },
};
