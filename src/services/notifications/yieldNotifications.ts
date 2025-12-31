import { supabase } from "@/integrations/supabase/client";

interface YieldNotificationData {
  distributionId: string;
  fundId: string;
  fundName: string;
  amount: number;
  asset: string;
  yieldDate: string;
  yieldPercentage?: number;
}

/**
 * Create an in-app notification for yield distribution
 */
export async function notifyYieldDistributed(
  userId: string,
  data: YieldNotificationData
): Promise<void> {
  const percentageText = data.yieldPercentage 
    ? ` (${(data.yieldPercentage * 100).toFixed(4)}%)`
    : "";
    
  try {
    const { error } = await supabase.from("notifications").insert([{
      user_id: userId,
      type: "yield" as const,
      title: "Yield Distributed",
      body: `You earned ${data.amount.toLocaleString()} ${data.asset}${percentageText} from ${data.fundName} for ${data.yieldDate}.`,
      priority: "medium",
      data_jsonb: {
        distribution_id: data.distributionId,
        fund_id: data.fundId,
        fund_name: data.fundName,
        amount: data.amount,
        asset: data.asset,
        yield_date: data.yieldDate,
        yield_percentage: data.yieldPercentage,
      },
    }]);

    if (error) {
      console.error("Failed to create yield notification:", error);
    }
  } catch (err) {
    console.error("Error creating yield notification:", err);
  }
}

/**
 * Yield notification service
 * Call after successful yield distribution
 */
export const yieldNotifications = {
  async onYieldDistributed(
    userId: string,
    distributionId: string,
    fundId: string,
    fundName: string,
    amount: number,
    asset: string,
    yieldDate: string,
    yieldPercentage?: number
  ): Promise<void> {
    await notifyYieldDistributed(userId, {
      distributionId,
      fundId,
      fundName,
      amount,
      asset,
      yieldDate,
      yieldPercentage,
    });
  },

  /**
   * Batch notify all investors after a fund yield distribution
   */
  async onFundYieldDistributed(
    distributions: Array<{
      userId: string;
      distributionId: string;
      fundId: string;
      fundName: string;
      amount: number;
      asset: string;
      yieldDate: string;
      yieldPercentage?: number;
    }>
  ): Promise<void> {
    // Insert all notifications in a single batch for efficiency
    const notifications = distributions.map(d => ({
      user_id: d.userId,
      type: "yield" as const,
      title: "Yield Distributed",
      body: `You earned ${d.amount.toLocaleString()} ${d.asset}${d.yieldPercentage ? ` (${(d.yieldPercentage * 100).toFixed(4)}%)` : ""} from ${d.fundName} for ${d.yieldDate}.`,
      priority: "medium" as const,
      data_jsonb: {
        distribution_id: d.distributionId,
        fund_id: d.fundId,
        fund_name: d.fundName,
        amount: d.amount,
        asset: d.asset,
        yield_date: d.yieldDate,
        yield_percentage: d.yieldPercentage,
      },
    }));

    try {
      const { error } = await supabase.from("notifications").insert(notifications);
      if (error) {
        console.error("Failed to create batch yield notifications:", error);
      }
    } catch (err) {
      console.error("Error creating batch yield notifications:", err);
    }
  },
};
