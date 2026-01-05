import { supabase } from "@/integrations/supabase/client";
import { type InvestmentFormData } from "@/types/domains";

export const investmentService = {
  /**
   * Create investment using crystallize-before-flow accounting.
   * NOTE: Requires an authoritative closing AUM snapshot (p_closing_aum).
   */
  async createInvestment(data: InvestmentFormData) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
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

    const txDate = data.investment_date || new Date().toISOString().split("T")[0];
    const eventTs = data.event_ts || `${txDate}T00:00:00.000Z`;
    
    // Trigger reference for idempotency (used by fund_aum_events + reference_id prefixing)
    const triggerReference =
      data.reference_number || `investment:${data.fund_id}:${data.investor_id}:${txDate}:${crypto.randomUUID()}`;

    const rpcCall = (supabase.rpc as any).bind(supabase);
    const { data: result, error } =
      type === "DEPOSIT"
        ? await rpcCall("apply_deposit_with_crystallization", {
            p_investor_id: data.investor_id,
            p_fund_id: data.fund_id,
            p_amount: amount,
            p_event_ts: eventTs,
            p_closing_aum: closingAum,
            p_trigger_reference: triggerReference,
            p_purpose: "transaction",
            p_admin_id: user?.id || null,
          })
        : await rpcCall("apply_withdrawal_with_crystallization", {
            p_investor_id: data.investor_id,
            p_fund_id: data.fund_id,
            p_amount: amount,
            p_event_ts: eventTs,
            p_closing_aum: closingAum,
            p_trigger_reference: triggerReference,
            p_purpose: "transaction",
            p_admin_id: user?.id || null,
          });

    if (error) {
      console.error(`${type} crystallize-before-flow error:`, error);
      throw new Error(error.message || "Failed to create investment");
    }

    const txId = type === "DEPOSIT" ? result?.deposit_tx_id : result?.withdrawal_tx_id;
    if (!result?.success || !txId) {
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
