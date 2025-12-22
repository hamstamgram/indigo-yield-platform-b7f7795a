/**
 * Investor Type Adapters
 * Transform between Supabase profile types and application Investor types
 */

import { Database } from "@/integrations/supabase/types";

type SupabaseProfile = Database["public"]["Tables"]["profiles"]["Row"];

export interface InvestorProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  is_admin: boolean;
  fee_percentage: number;
  avatar_url: string | null;
  totp_enabled: boolean;
  totp_verified: boolean;
  status: "Active" | "Pending" | "Closed";
  created_at: string;
  updated_at: string;
}

/**
 * Transform Supabase profile to InvestorProfile
 */
export function toInvestorProfile(row: SupabaseProfile): InvestorProfile {
  return {
    id: row.id,
    email: row.email,
    first_name: row.first_name,
    last_name: row.last_name,
    phone: row.phone,
    is_admin: row.is_admin ?? false,
    fee_percentage: row.fee_percentage ?? 0,
    avatar_url: row.avatar_url,
    totp_enabled: row.totp_enabled ?? false,
    totp_verified: row.totp_verified ?? false,
    status: (row.status as "Active" | "Pending" | "Closed") ?? "Pending",
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Transform multiple profiles
 */
export function toInvestorProfiles(rows: SupabaseProfile[]): InvestorProfile[] {
  return rows.map(toInvestorProfile);
}

/**
 * Get display name from investor profile
 * Falls back to email prefix when name is empty for better UX
 */
export function getInvestorDisplayName(profile: InvestorProfile | SupabaseProfile): string {
  const firstName = profile.first_name || "";
  const lastName = profile.last_name || "";
  const fullName = `${firstName} ${lastName}`.trim();
  if (fullName) return fullName;
  // Use email prefix as fallback instead of full email
  const emailPrefix = profile.email.split("@")[0];
  return emailPrefix || profile.email;
}
