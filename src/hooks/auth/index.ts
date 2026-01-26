/**
 * Auth Hooks - Barrel Export
 * Authentication and authorization hooks
 */

export { useUserRole, type UserRole } from "./useUserRole";
export { useHasInvestorPositions } from "./useHasInvestorPositions";
export {
  useLoginMutation,
  useGoogleLoginMutation,
  useRegisterMutation,
  useMFAEnrollment,
  useMFAVerification,
  useEmailVerification,
  useResendVerificationEmail,
} from "./useAuthMutations";
