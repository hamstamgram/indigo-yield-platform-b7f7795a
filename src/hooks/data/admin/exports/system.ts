/**
 * System administration hooks
 */

// useSystemAdmin
export {
  useResetHistory,
  usePositionResetPreview,
  useExecutePositionReset,
  useAdminUsers,
  useAdminUsersWithRoles,
  useRemoveAdminRole,
  useUpdateAdminRole,
  useCreateAdminInvite as useCreateSystemAdminInvite,
  useSendAdminInviteEmail,
  useForceResetPassword,
  useDeliveryQueueMetrics,
  useDataIntegrityStatus,
  type ResetLogEntry,
  type PositionResetPreview,
  type PositionResetResult,
  type AdminProfile,
  type AdminUser,
  type DeliveryQueueMetrics,
  type IntegrityData,
  type IntegrityCheck,
} from "../useSystemAdmin";

// useSystemHealth
export {
  useSystemHealth,
  useOverallSystemStatus,
  type SystemHealth,
  type ServiceStatus,
} from "../useSystemHealth";

// usePlatformSettings
export {
  usePlatformSettings,
  usePlatformSettingsForm,
  defaultPlatformSettings,
  type PlatformSettings,
} from "../usePlatformSettings";

// useAdminUsers (for AdminUsersList component)
export {
  useAdminUsersAll as useAdminUsersList,
  useToggleAdminStatusMutation,
  useSendAdminInviteMutation,
  useSuperAdminCheck,
  type AdminUserProfile,
  type AdminInviteParams,
} from "../useAdminUsers";

// useAdminInvites
export {
  useIsSuperAdmin,
  useAdminInvites,
  useCreateAdminInvite,
  useSendAdminInvite,
  useDeleteAdminInvite,
  useCopyInviteLink,
  type AdminInvite,
} from "../useAdminInvites";

// useAdminInvitesPage
export {
  useAdminInvitesList,
  useCreateAdminInvite as useCreateAdminInvitePage,
  useRevokeAdminInvite,
  type AdminInvite as AdminInviteItem,
} from "../useAdminInvitesPage";

// P1 Integrity Operations
export {
  useIntegrityRuns,
  useAdminAlerts,
  useRunIntegrityCheck,
  useAcknowledgeAlert,
  useCrystallizationDashboard,
  useCrystallizationGaps,
  useBatchCrystallizeFund,
  useDuplicateProfiles,
  useMergeDuplicateProfiles,
  useBypassAttempts,
  useLedgerReconciliation,
} from "../useIntegrityOperations";

// Operations Hub Metrics
export {
  useOperationsMetrics,
  useOperationsSystemHealth,
  type OperationsMetricsData,
  type PendingBreakdown,
} from "../useOperationsMetrics";
