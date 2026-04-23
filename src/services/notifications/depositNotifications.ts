import { db } from "@/lib/db/index";
import { logError } from "@/lib/logger";
import { formatAssetAmount } from "@/utils/assets";

type DepositNotificationEvent = "pending" | "confirmed" | "failed";

interface DepositNotificationData {
  depositId: string;
  transactionId?: string;
  amount: number;
  asset: string;
  fundName?: string;
  reason?: string;
  txHash?: string;
}

const eventConfig: Record<
  DepositNotificationEvent,
  { title: string; priority: "high" | "medium" | "low" }
> = {
  pending: {
    title: "Deposit Received",
    priority: "low",
  },
  confirmed: {
    title: "Deposit Confirmed",
    priority: "medium",
  },
  failed: {
    title: "Deposit Failed",
    priority: "high",
  },
};

const eventBodyTemplates: Record<
  DepositNotificationEvent,
  (data: DepositNotificationData) => string
> = {
  pending: (data) =>
    `Your deposit of ${formatAssetAmount(data.amount, data.asset)}${data.fundName ? ` to ${data.fundName}` : ""} has been received and is pending confirmation.`,
  confirmed: (data) =>
    `Your deposit of ${formatAssetAmount(data.amount, data.asset)}${data.fundName ? ` to ${data.fundName}` : ""} has been confirmed and credited to your account.`,
  failed: (data) =>
    `Your deposit of ${formatAssetAmount(data.amount, data.asset)} could not be processed.${data.reason ? ` Reason: ${data.reason}` : ""} Please contact support.`,
};

/**
 * Create an in-app notification for a deposit event
 */
export async function notifyDepositEvent(
  userId: string,
  event: DepositNotificationEvent,
  data: DepositNotificationData
): Promise<void> {
  const config = eventConfig[event];
  const body = eventBodyTemplates[event](data);

  try {
    const { error } = await db.insertMany("notifications", [
      {
        user_id: userId,
        type: "deposit" as const,
        title: config.title,
        body,
        priority: config.priority,
        data_jsonb: {
          deposit_id: data.depositId,
          transaction_id: data.transactionId,
          amount: data.amount,
          asset: data.asset,
          fund_name: data.fundName,
          event,
          reason: data.reason,
          tx_hash: data.txHash,
        },
      },
    ]);

    if (error) {
      logError("depositNotifications.notifyDepositEvent", error, {
        userId,
        event,
        depositId: data.depositId,
      });
    }
  } catch (err) {
    logError("depositNotifications.notifyDepositEvent", err, {
      userId,
      event,
      depositId: data.depositId,
    });
  }
}

/**
 * Deposit notification service
 * Call after deposit processing events
 */
export const depositNotifications = {
  async onPending(
    userId: string,
    depositId: string,
    amount: number,
    asset: string,
    fundName?: string
  ): Promise<void> {
    await notifyDepositEvent(userId, "pending", { depositId, amount, asset, fundName });
  },

  async onConfirmed(
    userId: string,
    depositId: string,
    amount: number,
    asset: string,
    fundName?: string,
    transactionId?: string
  ): Promise<void> {
    await notifyDepositEvent(userId, "confirmed", {
      depositId,
      amount,
      asset,
      fundName,
      transactionId,
    });
  },

  async onFailed(
    userId: string,
    depositId: string,
    amount: number,
    asset: string,
    reason?: string
  ): Promise<void> {
    await notifyDepositEvent(userId, "failed", { depositId, amount, asset, reason });
  },
};
