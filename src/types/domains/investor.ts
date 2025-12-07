/**
 * Investor Domain Types
 * Clean abstractions over database types for investor-related entities
 *
 * Database Schema Mapping:
 * - investors table: id, name, email, profile_id, status, created_at, updated_at, phone, etc.
 * - profiles table: id, first_name, last_name, is_admin, totp_enabled, totp_verified
 * - investor_positions table: investor_id, fund_id, shares, cost_basis, etc.
 */

import { Database } from "@/integrations/supabase/types";

// Base types from database
type DbInvestor = Database["public"]["Tables"]["investors"]["Row"];
type DbInvestorPosition = Database["public"]["Tables"]["investor_positions"]["Row"];

// Status mapping
type InvestorStatus = "active" | "pending" | "closed";

/**
 * Application-level investor type
 * Combines data from investors table with optional profile data
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
 * Extended investor with profile information
 * Used when profile data is joined from profiles table
 */
export interface InvestorWithProfile extends Investor {
  first_name: string | null;
  last_name: string | null;
  is_admin: boolean;
  totp_enabled: boolean;
  totp_verified: boolean;
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
  totp_enabled: boolean;
  totp_verified: boolean;
  status: InvestorStatus;
  created_at: string;
  updated_at: string;
}

/**
 * Investor position from investor_positions table
 */
export interface InvestorPosition {
  investor_id: string;
  fund_id: string;
  fund_class: string | null;
  shares: number;
  cost_basis: number;
  current_value: number;
  unrealized_pnl: number;
  realized_pnl: number;
  high_water_mark: number | null;
  aum_percentage: number | null;
  mgmt_fees_paid: number | null;
  perf_fees_paid: number | null;
  lock_until_date: string | null;
  last_transaction_date: string | null;
  last_modified_at: string | null;
  last_modified_by: string | null;
  updated_at: string | null;
}

/**
 * Investor summary with aggregated position data
 */
export interface InvestorSummary extends Investor {
  total_principal: number;
  total_earned: number;
  portfolio_value: number;
  total_positions: number;
}

/**
 * Convert database investor row to application Investor type
 */
export function mapDbInvestorToInvestor(dbInvestor: DbInvestor): Investor {
  return {
    id: dbInvestor.id,
    name: dbInvestor.name,
    email: dbInvestor.email,
    profile_id: dbInvestor.profile_id,
    status: (dbInvestor.status || "pending") as InvestorStatus,
    created_at: dbInvestor.created_at || new Date().toISOString(),
    updated_at: dbInvestor.updated_at || new Date().toISOString(),
    phone: dbInvestor.phone,
    onboarding_date: dbInvestor.onboarding_date,
  };
}

/**
 * Convert database investor position to application type
 */
export function mapDbPositionToInvestorPosition(dbPosition: DbInvestorPosition): InvestorPosition {
  return {
    investor_id: dbPosition.investor_id,
    fund_id: dbPosition.fund_id,
    fund_class: dbPosition.fund_class,
    shares: Number(dbPosition.shares) || 0,
    cost_basis: Number(dbPosition.cost_basis) || 0,
    current_value: Number(dbPosition.current_value) || 0,
    unrealized_pnl: Number(dbPosition.unrealized_pnl) || 0,
    realized_pnl: Number(dbPosition.realized_pnl) || 0,
    high_water_mark: dbPosition.high_water_mark ? Number(dbPosition.high_water_mark) : null,
    aum_percentage: null, // Column doesn't exist in current schema
    mgmt_fees_paid: dbPosition.mgmt_fees_paid ? Number(dbPosition.mgmt_fees_paid) : null,
    perf_fees_paid: dbPosition.perf_fees_paid ? Number(dbPosition.perf_fees_paid) : null,
    lock_until_date: dbPosition.lock_until_date,
    last_transaction_date: dbPosition.last_transaction_date,
    last_modified_at: dbPosition.updated_at, // Use updated_at as fallback
    last_modified_by: null, // Column doesn't exist in current schema
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
 */
export function getInvestorDisplayName(investor: Investor | InvestorWithProfile): string {
  if (isInvestorWithProfile(investor)) {
    const { first_name, last_name } = investor;
    if (first_name && last_name) {
      return `${first_name} ${last_name}`;
    }
    if (first_name) return first_name;
    if (last_name) return last_name;
  }
  return investor.name || investor.email;
}
