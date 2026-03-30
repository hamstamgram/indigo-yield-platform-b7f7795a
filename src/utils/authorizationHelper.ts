/**
 * Authorization Helper Utilities
 *
 * Provides service-layer authorization checks as defense-in-depth.
 * NOTE: Supabase RLS is the primary access control layer. These helpers
 * provide additional validation at the application layer.
 */

import { supabase } from "@/integrations/supabase/client";

export type UserRole = "investor" | "admin" | "super_admin" | "ib";

export interface AuthorizationResult {
  authorized: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  userId: string | null;
  roles: UserRole[];
}

/**
 * Cache for user roles to avoid repeated database lookups
 * Expires after 5 minutes
 */
const roleCache = new Map<string, { roles: UserRole[]; expiry: number }>();
const CACHE_TTL_MS = 60 * 1000; // 1 minute

/**
 * Get the current authenticated user's ID
 */
export async function getCurrentUserId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id || null;
}

/**
 * Get user roles with caching
 */
async function getUserRoles(userId: string): Promise<UserRole[]> {
  const now = Date.now();
  const cached = roleCache.get(userId);

  if (cached && cached.expiry > now) {
    return cached.roles;
  }

  const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", userId);

  const roles = (roleData || []).map((r) => r.role as UserRole);

  roleCache.set(userId, { roles, expiry: now + CACHE_TTL_MS });

  return roles;
}

/**
 * Clear role cache for a user (call after role changes)
 */
export function clearRoleCache(userId?: string): void {
  if (userId) {
    roleCache.delete(userId);
  } else {
    roleCache.clear();
  }
}

/**
 * Verify if the current user can access a specific investor's data.
 *
 * Access rules:
 * - Self-access: Users can always access their own data
 * - Admin access: Admins and super_admins can access any investor's data
 * - IB access: IBs can access their referred investors' data
 *
 * @param targetInvestorId - The investor ID whose data is being accessed
 * @param requestingUserId - Optional, uses current user if not provided
 * @returns Authorization result with access decision and role info
 */
export async function verifyResourceAccess(
  targetInvestorId: string,
  requestingUserId?: string
): Promise<AuthorizationResult> {
  const userId = requestingUserId || (await getCurrentUserId());

  if (!userId) {
    return {
      authorized: false,
      isAdmin: false,
      isSuperAdmin: false,
      userId: null,
      roles: [],
    };
  }

  // Self-access is always allowed
  if (userId === targetInvestorId) {
    const roles = await getUserRoles(userId);
    return {
      authorized: true,
      isAdmin: roles.includes("admin") || roles.includes("super_admin"),
      isSuperAdmin: roles.includes("super_admin"),
      userId,
      roles,
    };
  }

  // Check if requester has admin role
  const roles = await getUserRoles(userId);
  const isAdmin = roles.includes("admin") || roles.includes("super_admin");
  const isSuperAdmin = roles.includes("super_admin");

  // Check if requester is the IB for the target investor
  let isAuthorizedIB = false;
  if (!isAdmin && roles.includes("ib")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("ib_parent_id")
      .eq("id", targetInvestorId)
      .single();

    if (profile?.ib_parent_id === userId) {
      isAuthorizedIB = true;
    }
  }

  return {
    authorized: isAdmin || isAuthorizedIB,
    isAdmin,
    isSuperAdmin,
    userId,
    roles,
  };
}

/**
 * Require admin access for an operation.
 * Throws an error if the current user is not an admin.
 *
 * @param operation - Description of the operation for error message
 * @throws Error if user is not an admin
 */
export async function requireAdmin(operation: string = "this operation"): Promise<{
  userId: string;
  isSuperAdmin: boolean;
}> {
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error("Authentication required");
  }

  const roles = await getUserRoles(userId);
  const isAdmin = roles.includes("admin") || roles.includes("super_admin");

  if (!isAdmin) {
    throw new Error(`Access denied: Only administrators can perform ${operation}`);
  }

  return {
    userId,
    isSuperAdmin: roles.includes("super_admin"),
  };
}

/**
 * Require super_admin access for an operation.
 * Throws an error if the current user is not a super_admin.
 *
 * @param operation - Description of the operation for error message
 * @throws Error if user is not a super_admin
 */
export async function requireSuperAdmin(operation: string = "this operation"): Promise<{
  userId: string;
}> {
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error("Authentication required");
  }

  const roles = await getUserRoles(userId);

  if (!roles.includes("super_admin")) {
    throw new Error(`Access denied: Only super administrators can perform ${operation}`);
  }

  return { userId };
}

/**
 * Check if the current user is an admin (without throwing)
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const userId = await getCurrentUserId();
  if (!userId) return false;

  const roles = await getUserRoles(userId);
  return roles.includes("admin") || roles.includes("super_admin");
}

/**
 * Check if the current user is a super_admin (without throwing)
 */
export async function isCurrentUserSuperAdmin(): Promise<boolean> {
  const userId = await getCurrentUserId();
  if (!userId) return false;

  const roles = await getUserRoles(userId);
  return roles.includes("super_admin");
}
