import { supabase } from "@/integrations/supabase/client";
import { type InvestmentFormData } from "@/types/domains";
import { logError } from "@/lib/logger";
import { rpc } from "@/lib/rpc/index";
import { getTodayString } from "@/utils/dateUtils";
import { generateUUID } from "@/lib/utils";
import { parseFinancial } from "@/utils/financial";

export const investmentService = {
  /**
   * Create investment using standard transaction logic.
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
    const amountDec = parseFinancial(data.amount).abs();

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

    const triggerReference =
      data.reference_number ||
      `investment:${data.fund_id}:${data.investor_id}:${txDate}:${generateUUID()}`;

    const rpcResult = await rpc.call("apply_investor_transaction", {
      p_fund_id: data.fund_id,
      p_investor_id: data.investor_id,
      p_tx_type: type,
      p_amount: amountDec.toString() as unknown as number,
      p_tx_date: txDate,
      p_reference_id: triggerReference,
      p_admin_id: user.id,
      p_notes: `${type === "DEPOSIT" ? "Investment" : "Redemption"} - ${triggerReference}`,
      p_purpose: "transaction",
    });

    if (rpcResult.error) {
      logError(`investmentService.${type}`, rpcResult.error, { fundId: data.fund_id });
      throw new Error(rpcResult.error.message || "Failed to create investment");
    }

    const res = rpcResult.data as {
      success?: boolean;
      deposit_tx_id?: string;
      withdrawal_tx_id?: string;
    } | null;
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
      "Investment approval is not supported on the immutable ledger. Create deposits/withdrawals directly effectively."
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
