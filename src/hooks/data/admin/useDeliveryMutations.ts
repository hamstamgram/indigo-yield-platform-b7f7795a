/**
 * Delivery Mutations Hook
 *
 * React Query mutations for delivery operations with proper cache invalidation.
 * Consolidates all delivery-related mutations in a single hook.
 */

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { deliveryService } from "@/services/admin";
import { invalidateAfterDeliveryOp } from "@/utils/cacheInvalidation";
import type { DeliveryMode, BatchSendResult, QueueResult } from "@/types/domains/delivery";
import { logDebug } from "@/lib/logger";

/**
 * Progress state for batch send operations
 */
export interface SendProgress {
  current: number;
  total: number;
  sent: number;
  failed: number;
}

/**
 * Parse Resend errors for user-friendly messages
 */
function handleResendError(error: Error, toastFn: typeof toast) {
  const errorMessage = error.message || "Unknown error";

  if (
    errorMessage.includes("quota") ||
    errorMessage.includes("limit") ||
    errorMessage.includes("402")
  ) {
    toastFn.error("Resend quota exceeded", {
      description:
        "Your Resend account has reached its sending limit. Upgrade your plan at resend.com to continue sending.",
      duration: 8000,
    });
  } else if (errorMessage.includes("401") || errorMessage.includes("unauthorized")) {
    toastFn.error("Resend authentication failed", {
      description: "Check your RESEND_API_KEY secret is valid.",
      duration: 6000,
    });
  } else if (errorMessage.includes("domain") || errorMessage.includes("sender")) {
    toastFn.error("Resend domain not verified", {
      description: "Verify your sending domain at resend.com/domains.",
      duration: 6000,
    });
  } else {
    toastFn.error(`Failed: ${errorMessage}`);
  }
}

/**
 * Hook providing all delivery mutations with cache invalidation
 */
export function useDeliveryMutations(selectedPeriodId: string) {
  const queryClient = useQueryClient();
  const [sendProgress, setSendProgress] = useState<SendProgress | null>(null);

  // Queue statement deliveries
  const queueMutation = useMutation({
    mutationFn: async ({ periodId, channel }: { periodId: string; channel: string }) => {
      return deliveryService.queueDeliveries(periodId, channel);
    },
    onSuccess: (data: QueueResult) => {
      toast.success(`Queued ${data.queued_count} deliveries`, {
        description: `${data.already_exists_count} already existed, ${data.skipped_missing_email} skipped (no email)`,
      });
      invalidateAfterDeliveryOp(queryClient, selectedPeriodId);
    },
    onError: (error: Error) => {
      toast.error(`Failed to queue: ${error.message}`);
    },
  });

  // Send single delivery via Resend
  const sendViaMutation = useMutation({
    mutationFn: async ({
      deliveryId,
      deliveryMode,
    }: {
      deliveryId: string;
      deliveryMode: DeliveryMode;
    }) => {
      return deliveryService.sendViaMailerSend(deliveryId, deliveryMode);
    },
    onSuccess: (data) => {
      toast.success("Report sent", {
        description: `Message ID: ${data.message_id?.slice(0, 12)}...`,
      });
      invalidateAfterDeliveryOp(queryClient, selectedPeriodId);
    },
    onError: (error: Error) => {
      handleResendError(error, toast);
    },
  });

  // Batch send via Resend - auto-queues if queue is empty
  const processMutation = useMutation({
    mutationFn: async ({
      periodId,
      deliveryMode,
    }: {
      periodId: string;
      deliveryMode: DeliveryMode;
    }): Promise<BatchSendResult> => {
      // Get queued deliveries for period
      let queuedIds = await deliveryService.fetchQueuedDeliveryIds(periodId, 25);

      // AUTO-QUEUE: If queue is empty, automatically queue remaining statements first
      if (queuedIds.length === 0) {
        logDebug("useDeliveryMutations.autoQueue", {
          periodId,
          message: "Queue empty, auto-queueing statements",
        });

        const queueResult = await deliveryService.queueDeliveries(periodId, "email");
        logDebug("useDeliveryMutations.autoQueueResult", { periodId, queueResult });

        if (queueResult.queued_count === 0) {
          return {
            sent: 0,
            failed: 0,
            total: 0,
            autoQueued: true,
            queueResult,
            reason:
              queueResult.already_exists_count > 0
                ? `All ${queueResult.already_exists_count} statements already processed`
                : queueResult.skipped_missing_email > 0
                  ? `${queueResult.skipped_missing_email} investors have no email address`
                  : "No statements generated for this period",
          };
        }

        // Re-fetch queued deliveries after auto-queue
        queuedIds = await deliveryService.fetchQueuedDeliveryIds(periodId, 25);
      }

      if (queuedIds.length === 0) {
        return { sent: 0, failed: 0, total: 0, reason: "No eligible deliveries after queueing" };
      }

      setSendProgress({ current: 0, total: queuedIds.length, sent: 0, failed: 0 });

      let sent = 0;
      let failed = 0;

      // Process sequentially to avoid rate limits
      for (let i = 0; i < queuedIds.length; i++) {
        try {
          await deliveryService.sendViaMailerSend(queuedIds[i], deliveryMode);
          sent++;
        } catch {
          failed++;
        }
        setSendProgress({ current: i + 1, total: queuedIds.length, sent, failed });
      }

      setSendProgress(null);
      return { sent, failed, total: queuedIds.length };
    },
    onSuccess: (data: BatchSendResult) => {
      if (data.total === 0) {
        toast.error("No emails to send", {
          description: data.reason || "No eligible statements found for delivery.",
        });
      } else if (data.sent === 0 && data.failed > 0) {
        toast.error(`All ${data.failed} emails failed to send`, {
          description: "Check delivery details for error messages.",
        });
      } else if (data.sent === 0 && data.failed === 0) {
        toast.warning("No emails were processed", {
          description: data.reason || "Queue may have been empty or already processed.",
        });
      } else if (data.failed > 0) {
        toast.warning(`Sent ${data.sent} emails, ${data.failed} failed`, {
          description: "Some emails failed - check details for errors.",
        });
      } else {
        toast.success(`Successfully sent ${data.sent} emails`, {
          description: data.autoQueued
            ? "Auto-queued and delivered all statements."
            : "All queued emails have been delivered.",
        });
      }
      invalidateAfterDeliveryOp(queryClient, selectedPeriodId);
    },
    onError: (error: Error) => {
      setSendProgress(null);
      handleResendError(error, toast);
    },
  });

  // Retry a failed delivery
  const retryMutation = useMutation({
    mutationFn: (deliveryId: string) => deliveryService.retryDelivery(deliveryId),
    onSuccess: () => {
      toast.success("Delivery re-queued for retry");
      invalidateAfterDeliveryOp(queryClient, selectedPeriodId);
    },
    onError: (error: Error) => {
      toast.error(`Failed to retry: ${error.message}`);
    },
  });

  // Cancel a delivery
  const cancelMutation = useMutation({
    mutationFn: (deliveryId: string) => deliveryService.cancelDelivery(deliveryId),
    onSuccess: () => {
      toast.success("Delivery cancelled");
      invalidateAfterDeliveryOp(queryClient, selectedPeriodId);
    },
    onError: (error: Error) => {
      toast.error(`Failed to cancel: ${error.message}`);
    },
  });

  // Mark delivery as sent manually
  const markSentMutation = useMutation({
    mutationFn: ({ deliveryId, note }: { deliveryId: string; note: string }) =>
      deliveryService.markSentManually(deliveryId, note),
    onSuccess: () => {
      toast.success("Marked as sent");
      invalidateAfterDeliveryOp(queryClient, selectedPeriodId);
    },
    onError: (error: Error) => {
      toast.error(`Failed to mark sent: ${error.message}`);
    },
  });

  // Refresh delivery status from provider
  const refreshStatusMutation = useMutation({
    mutationFn: (deliveryId: string) => deliveryService.refreshDeliveryStatus(deliveryId),
    onSuccess: (data) => {
      if (data.status_changed) {
        toast.success(`Status updated: ${data.old_status} → ${data.new_status}`);
        invalidateAfterDeliveryOp(queryClient, selectedPeriodId);
      } else {
        toast.info("Status unchanged", {
          description: `Current status: ${data.new_status}`,
        });
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to refresh: ${error.message}`);
    },
  });

  // Requeue stuck "sending" deliveries
  const requeueStaleMutation = useMutation({
    mutationFn: ({ periodId, minutes }: { periodId: string; minutes: number }) =>
      deliveryService.requeueStaleSending(periodId, minutes),
    onSuccess: (data) => {
      toast.success(`Requeued ${data.requeued_count} stuck deliveries`);
      invalidateAfterDeliveryOp(queryClient, selectedPeriodId);
    },
    onError: (error: Error) => {
      toast.error(`Failed: ${error.message}`);
    },
  });

  // Helper: Retry all failed deliveries
  const retryAllFailed = async (failedIds: string[]) => {
    let retried = 0;
    for (const id of failedIds) {
      try {
        await retryMutation.mutateAsync(id);
        retried++;
      } catch {
        // Continue with next
      }
    }
    toast.success(`Requeued ${retried} of ${failedIds.length} failed deliveries`);
  };

  return {
    // Mutations
    queueMutation,
    sendViaMutation,
    processMutation,
    retryMutation,
    cancelMutation,
    markSentMutation,
    refreshStatusMutation,
    requeueStaleMutation,

    // Helpers
    retryAllFailed,

    // State
    sendProgress,
    setSendProgress,
  };
}
