/**
 * Investor Domain Types
 * CANONICAL SOURCE - All investor-related types should be imported from here
 *
 * Database Schema Mapping:
 * - profiles table: id, email, first_name, last_name, is_admin, status, phone, onboarding_date
 * - investor_positions table: investor_id, fund_id, shares, cost_basis, etc.
 */

import { Database } from "@/integrations/supabase/types";

// Base types from database
type DbProfile = Database["public"]["Tables"]["profiles"]["Row"];
type DbInvestorPosition = Database["public"]["Tables"]["investor_positions"]["Row"];

// Status mapping - matches database CHECK constraint
// DB: CHECK (status = ANY (ARRAY['active', 'pending', 'suspended', 'archived', 'inactive']))
export type InvestorStatus = "active" | "pending" | "suspended" | "archived" | "inactive";

/**
 * Core investor type - the main type for investor data
 * Maps to the profiles table with standardized naming
 */
export interface Investor {
  id: string;
  name: string;
  email: string;
  profile_id: string | null;
  status: InvestorStatus;
  created_at: string;
  updated_at: string;
  phone: string | null;
  onboarding_date: string | null;
}

/**
 * Investor with profile fields exposed (for detailed views)
 */
export interface InvestorWithProfile extends Investor {
  first_name: string | null;
  last_name: string | null;
  is_admin: boolean;
  avatar_url: string | null;
}

/**
 * Investor profile for user settings/profile pages
 */
export interface InvestorProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  is_admin: boolean;
  avatar_url: string | null;
  status: InvestorStatus;
  created_at: string;
  updated_at: string;
  preferences?: any;
  totp_enabled?: boolean;
}

/**
 * Investor position from investor_positions table
 * Financial fields use string for NUMERIC(38,18) precision preservation
 */
export interface InvestorPosition {
  investor_id: string;
  fund_id: string;
  fund_class: string | null;
  /** @precision NUMERIC(38,18) from database */
  shares: string;
  /** @precision NUMERIC(38,18) from database */
  cost_basis: string;
  /** @precision NUMERIC(38,18) from database */
  current_value: string;
  /** @precision NUMERIC(38,18) from database */
  unrealized_pnl: string;
  /** @precision NUMERIC(38,18) from database */
  realized_pnl: string;
  /** @precision NUMERIC(38,18) from database */
  high_water_mark: string | null;
  /** @precision NUMERIC(38,18) from database */
  aum_percentage: string | null;
  /** @precision NUMERIC(38,18) from database */
  mgmt_fees_paid: string | null;
  /** @precision NUMERIC(38,18) from database */
  perf_fees_paid: string | null;
  last_transaction_date: string | null;
  last_modified_at: string | null;
  last_modified_by: string | null;
  updated_at: string | null;
}

/**
 * Investor summary with aggregated position data
 * Financial fields use string for NUMERIC(38,18) precision preservation
 */
export interface InvestorSummary extends Investor {
  /** @precision NUMERIC(38,18) from database */
  total_principal: string;
  /** @precision NUMERIC(38,18) from database */
  total_earned: string;
  /** @precision NUMERIC(38,18) from database */
  portfolio_value: string;
  total_positions: number;
}

/**
 * Minimal investor reference for dropdowns/lists
 */
export interface InvestorRef {
  id: string;
  name: string;
  email: string;
}

/**
 * Convert database profile row to application Investor type
 */
export function mapDbProfileToInvestor(dbProfile: DbProfile): Investor {
  return {
    id: dbProfile.id,
    name: `${dbProfile.first_name || ""} ${dbProfile.last_name || ""}`.trim() || dbProfile.email,
    email: dbProfile.email,
    profile_id: dbProfile.id,
    status: (dbProfile.status || "pending") as InvestorStatus,
    created_at: dbProfile.created_at || new Date().toISOString(),
    updated_at: dbProfile.updated_at || new Date().toISOString(),
    phone: dbProfile.phone,
    onboarding_date: dbProfile.onboarding_date,
  };
}

// Alias for backwards compatibility
export const mapDbInvestorToInvestor = mapDbProfileToInvestor;

/**
 * Convert database investor position to application type
 * Preserves string representation for financial precision
 */
export function mapDbPositionToInvestorPosition(dbPosition: DbInvestorPosition): InvestorPosition {
  return {
    investor_id: dbPosition.investor_id,
    fund_id: dbPosition.fund_id,
    fund_class: dbPosition.fund_class,
    shares: String(dbPosition.shares ?? "0"),
    cost_basis: String(dbPosition.cost_basis ?? "0"),
    current_value: String(dbPosition.current_value ?? "0"),
    unrealized_pnl: String(dbPosition.unrealized_pnl ?? "0"),
    realized_pnl: String(dbPosition.realized_pnl ?? "0"),
    high_water_mark: dbPosition.high_water_mark != null ? String(dbPosition.high_water_mark) : null,
    aum_percentage: dbPosition.aum_percentage != null ? String(dbPosition.aum_percentage) : null,
    mgmt_fees_paid: dbPosition.mgmt_fees_paid != null ? String(dbPosition.mgmt_fees_paid) : null,
    perf_fees_paid: dbPosition.perf_fees_paid != null ? String(dbPosition.perf_fees_paid) : null,
    last_transaction_date: dbPosition.last_transaction_date,
    last_modified_at: dbPosition.updated_at,
    last_modified_by: null,
    updated_at: dbPosition.updated_at,
  };
}

/**
 * Type guard to check if investor has profile data
 */
export function isInvestorWithProfile(
  investor: Investor | InvestorWithProfile
): investor is InvestorWithProfile {
  return "first_name" in investor && "last_name" in investor;
}

/**
 * Get display name from investor (with or without profile)
 * Falls back to email prefix when name is empty for better UX
 */
export function getInvestorDisplayName(
  investor: Investor | InvestorWithProfile | InvestorRef
): string {
  if (isInvestorWithProfile(investor as Investor | InvestorWithProfile)) {
    const inv = investor as InvestorWithProfile;
    if (inv.first_name && inv.last_name) {
      return `${inv.first_name} ${inv.last_name}`;
    }
    if (inv.first_name) return inv.first_name;
    if (inv.last_name) return inv.last_name;
  }
  if ("name" in investor && investor.name) return investor.name;
  const emailPrefix = investor.email.split("@")[0];
  return emailPrefix || investor.email;
}

/**
 * Convert Investor to InvestorRef for minimal data transfer
 */
export function toInvestorRef(investor: Investor | InvestorWithProfile): InvestorRef {
  return {
    id: investor.id,
    name: investor.name || getInvestorDisplayName(investor),
    email: investor.email,
  };
}

// Onboarding wizard types
export interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  completed: boolean;
}

export interface OnboardingData {
  profile: Partial<InvestorProfile>;
  documents_acknowledged: boolean;
  selected_funds: string[];
  step: number;
}
