/**
 * Investor Notifications Hook
 *
 * React Query hook for fetching and managing investor notifications.
 * Replaces manual useState/useEffect pattern in NotificationsPage.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationService } from "@/services/shared";
import { useToast } from "@/hooks";
import { QUERY_KEYS } from "@/constants/queryKeys";

/**
 * Notification type from the service
 */
export interface InvestorNotification {
  id: string;
  title: string;
  body: string;
  type: string;
  priority: string | null;
  read_at: string | null;
  created_at: string;
}

/**
 * Fetches the current user's notifications
 */
export function useInvestorNotifications() {
  return useQuery({
    queryKey: QUERY_KEYS.investorNotifications,
    queryFn: async () => {
      const result = await notificationService.getMyNotifications();
      return result.data as InvestorNotification[];
    },
    staleTime: 30 * 1000, // 30 seconds - notifications may update frequently
  });
}

/**
 * Mutation hook for marking a notification as read
 */
export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (notificationId: string) => notificationService.markAsRead(notificationId),
    onSuccess: (_, notificationId) => {
      // Optimistically update the cache
      queryClient.setQueryData<InvestorNotification[]>(QUERY_KEYS.investorNotifications, (old) =>
        old?.map((n) => (n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n))
      );
      toast({
        title: "Success",
        description: "Notification marked as read",
      });
    },
    onError: () => {
      // Refetch on error to ensure consistency
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.investorNotifications });
    },
  });
}

/**
 * Mutation hook for deleting a notification
 */
export function useDeleteNotification() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (notificationId: string) => notificationService.deleteNotification(notificationId),
    onSuccess: (_, notificationId) => {
      // Optimistically remove from cache
      queryClient.setQueryData<InvestorNotification[]>(QUERY_KEYS.investorNotifications, (old) =>
        old?.filter((n) => n.id !== notificationId)
      );
      toast({
        title: "Success",
        description: "Notification deleted",
      });
    },
    onError: () => {
      // Refetch on error to ensure consistency
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.investorNotifications });
    },
  });
}
