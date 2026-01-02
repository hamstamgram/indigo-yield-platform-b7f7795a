/**
 * System Admin Hooks
 * React Query hooks for system administration operations
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/queryKeys";
import {
  getResetHistory,
  getPositionResetPreview,
  executePositionReset,
  getAdminUsers,
  getAdminUsersWithRoles,
  removeAdminRole,
  updateAdminRole,
  createAdminInvite,
  sendAdminInviteEmail,
  forceResetUserPassword,
  getDeliveryQueueMetrics,
  getDataIntegrityStatus,
  type ResetLogEntry,
  type PositionResetPreview,
  type PositionResetResult,
  type AdminProfile,
  type AdminUser,
  type DeliveryQueueMetrics,
  type IntegrityData,
  type IntegrityCheck,
} from "@/services/admin/systemAdminService";

// Re-export types
export type {
  ResetLogEntry,
  PositionResetPreview,
  PositionResetResult,
  AdminProfile,
  AdminUser,
  DeliveryQueueMetrics,
  IntegrityData,
  IntegrityCheck,
};

// ============ Maintenance Hooks ============

/**
 * Hook to fetch position reset history
 */
export function useResetHistory() {
  return useQuery({
    queryKey: QUERY_KEYS.resetHistory,
    queryFn: getResetHistory,
  });
}

/**
 * Hook to fetch position reset preview
 */
export function usePositionResetPreview(enabled: boolean = false) {
  return useQuery({
    queryKey: QUERY_KEYS.positionResetPreview,
    queryFn: getPositionResetPreview,
    enabled,
  });
}

/**
 * Hook to execute position reset
 */
export function useExecutePositionReset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (confirmationCode: string) => executePositionReset(confirmationCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.resetHistory });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.positionResetPreview });
    },
  });
}

// ============ Admin User Hooks ============

/**
 * Hook to fetch admin users (basic)
 */
export function useAdminUsers() {
  return useQuery({
    queryKey: QUERY_KEYS.adminUsers,
    queryFn: getAdminUsers,
  });
}

/**
 * Hook to fetch admin users with roles
 */
export function useAdminUsersWithRoles() {
  return useQuery({
    queryKey: QUERY_KEYS.adminUsersWithRoles,
    queryFn: getAdminUsersWithRoles,
  });
}

/**
 * Hook to remove admin role
 */
export function useRemoveAdminRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => removeAdminRole(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminUsers });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminUsersWithRoles });
    },
  });
}

/**
 * Hook to update admin role
 */
export function useUpdateAdminRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, newRole }: { userId: string; newRole: "admin" | "super_admin" }) => 
      updateAdminRole(userId, newRole),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminUsers });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminUsersWithRoles });
    },
  });
}

/**
 * Hook to create admin invite
 */
export function useCreateAdminInvite() {
  return useMutation({
    mutationFn: ({ email, intendedRole }: { email: string; intendedRole?: "admin" | "super_admin" }) =>
      createAdminInvite(email, intendedRole),
  });
}

/**
 * Hook to send admin invite email
 */
export function useSendAdminInviteEmail() {
  return useMutation({
    mutationFn: (invite: { email: string; invite_code: string; expires_at: string }) =>
      sendAdminInviteEmail(invite),
  });
}

/**
 * Hook to force reset user password
 */
export function useForceResetPassword() {
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      forceResetUserPassword(email, password),
  });
}

// ============ Delivery Queue Hooks ============

/**
 * Hook to fetch delivery queue metrics
 */
export function useDeliveryQueueMetrics() {
  return useQuery({
    queryKey: QUERY_KEYS.deliveryQueueMetrics,
    queryFn: getDeliveryQueueMetrics,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });
}

// ============ Data Integrity Hooks ============

/**
 * Hook to fetch data integrity status
 */
export function useDataIntegrityStatus() {
  return useQuery({
    queryKey: QUERY_KEYS.dataIntegrity,
    queryFn: getDataIntegrityStatus,
    refetchInterval: 60000, // Refresh every minute
  });
}
