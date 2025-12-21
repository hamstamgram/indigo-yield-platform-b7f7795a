import { supabase } from "@/integrations/supabase/client";

type WithdrawalNotificationEvent = 
  | "approved"
  | "rejected"
  | "processing"
  | "completed";

interface WithdrawalNotificationData {
  withdrawalId: string;
  amount: number;
  asset: string;
  reason?: string;
  txHash?: string;
}

const eventConfig: Record<WithdrawalNotificationEvent, { title: string; priority: "high" | "medium" | "low" }> = {
  approved: {
    title: "Withdrawal Approved",
    priority: "medium",
  },
  rejected: {
    title: "Withdrawal Rejected",
    priority: "high",
  },
  processing: {
    title: "Withdrawal Processing",
    priority: "medium",
  },
  completed: {
    title: "Withdrawal Completed",
    priority: "medium",
  },
};

const eventBodyTemplates: Record<WithdrawalNotificationEvent, (data: WithdrawalNotificationData) => string> = {
  approved: (data) => 
    `Your withdrawal request for ${data.amount.toLocaleString()} ${data.asset} has been approved and will be processed soon.`,
  rejected: (data) => 
    `Your withdrawal request for ${data.amount.toLocaleString()} ${data.asset} has been rejected.${data.reason ? ` Reason: ${data.reason}` : ""}`,
  processing: (data) => 
    `Your withdrawal of ${data.amount.toLocaleString()} ${data.asset} is now being processed.`,
  completed: (data) => 
    `Your withdrawal of ${data.amount.toLocaleString()} ${data.asset} has been completed.${data.txHash ? " Check your wallet for the transaction." : ""}`,
};

/**
 * Create an in-app notification for a withdrawal event
 */
export async function notifyWithdrawalEvent(
  userId: string,
  event: WithdrawalNotificationEvent,
  data: WithdrawalNotificationData
): Promise<void> {
  const config = eventConfig[event];
  const body = eventBodyTemplates[event](data);

  try {
    const { error } = await supabase.from("notifications").insert([{
      user_id: userId,
      type: "withdrawal" as const,
      title: config.title,
      body,
      priority: config.priority,
      data_jsonb: {
        withdrawal_id: data.withdrawalId,
        amount: data.amount,
        asset: data.asset,
        event,
        reason: data.reason,
        tx_hash: data.txHash,
      },
    }]);

    if (error) {
      console.error("Failed to create withdrawal notification:", error);
    }
  } catch (err) {
    console.error("Error creating withdrawal notification:", err);
  }
}

/**
 * Create withdrawal notifications after admin actions
 * This should be called from the service layer after successful RPC calls
 */
export const withdrawalNotifications = {
  async onApproved(userId: string, withdrawalId: string, amount: number, asset: string): Promise<void> {
    await notifyWithdrawalEvent(userId, "approved", { withdrawalId, amount, asset });
  },

  async onRejected(userId: string, withdrawalId: string, amount: number, asset: string, reason?: string): Promise<void> {
    await notifyWithdrawalEvent(userId, "rejected", { withdrawalId, amount, asset, reason });
  },

  async onProcessing(userId: string, withdrawalId: string, amount: number, asset: string): Promise<void> {
    await notifyWithdrawalEvent(userId, "processing", { withdrawalId, amount, asset });
  },

  async onCompleted(userId: string, withdrawalId: string, amount: number, asset: string, txHash?: string): Promise<void> {
    await notifyWithdrawalEvent(userId, "completed", { withdrawalId, amount, asset, txHash });
  },
};
