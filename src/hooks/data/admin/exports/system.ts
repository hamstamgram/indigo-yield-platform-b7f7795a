/**
 * System administration hooks - Re-exports from features/admin
 */

// useSystemAdmin - with aliases
export {
  useResetHistory,
  usePositionResetPreview,
  useExecutePositionReset,
  useAdminUsers,
  useAdminUsersWithRoles,
  useRemoveAdminRole,
  useUpdateAdminRole,
  useCreateAdminInvite,
  useCreateAdminInvite as useCreateSystemAdminInvite,
  useCreateAdminInvite as useCreateAdminInvitePage,
  useSendAdminInviteEmail,
  useForceResetPassword,
  useDeliveryQueueMetrics,
  useDataIntegrityStatus,
} from "@/features/admin/settings/hooks/useSystemAdmin";
export type { AdminUser } from "@/features/admin/settings/hooks/useSystemAdmin";

export * from "@/features/admin/system/hooks/useSystemHealth";
export * from "@/features/admin/settings/hooks/usePlatformSettings";
export * from "@/features/admin/settings/hooks/useAdminUsers";
export { useAdminUsersAll as useAdminUsersList } from "@/features/admin/settings/hooks/useAdminUsers";
export * from "@/features/admin/settings/hooks/useAdminInvites";
export type { AdminInvite as AdminInviteItem } from "@/features/admin/settings/hooks/useAdminInvites";
export * from "@/features/admin/system/hooks/useIntegrityOperations";
export * from "@/features/admin/operations/hooks/useOperationsMetrics";
export * from "@/features/admin/system/hooks/useRiskAlerts";
