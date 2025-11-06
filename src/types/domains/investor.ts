// @ts-nocheck
/**
 * Investor Domain Types
 * Clean abstractions over database types for investor-related entities
 */

import { Database } from '@/integrations/supabase/types';

// Base types from database
type DbInvestor = Database['public']['Tables']['investors']['Row'];
type DbInvestorPosition = Database['public']['Tables']['investor_positions']['Row'];

// Application-level investor types
export interface Investor {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  status: 'Active' | 'Pending' | 'Closed';
  created_at: string;
  updated_at: string;
  fee_percentage?: number;
}

export interface InvestorProfile {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  is_admin: boolean;
  fee_percentage: number;
  avatar_url?: string | null;
  totp_enabled: boolean;
  totp_verified: boolean;
  status: 'Active' | 'Pending' | 'Closed';
  created_at: string;
  updated_at: string;
}

export interface InvestorPosition {
  investor_id: string;
  fund_id: string;
  fund_class: string;
  shares_held: number;
  cost_basis: number;
  current_value: number;
  unrealized_gain: number;
  realized_gain: number;
  high_water_mark: number;
  aum_percentage: number;
  last_modified_at: string;
  last_modified_by: string | null;
}

export interface InvestorSummary extends Investor {
  total_principal: number;
  total_earned: number;
  portfolio_value: number;
  total_positions: number;
}

// Convert database type to application type
export function mapDbInvestorToInvestor(dbInvestor: DbInvestor): Investor {
  return {
    id: dbInvestor.id,
    email: dbInvestor.email,
    first_name: null,
    last_name: null,
    status: (dbInvestor.status || 'Pending') as 'Active' | 'Pending' | 'Closed',
    created_at: dbInvestor.created_at || new Date().toISOString(),
    updated_at: dbInvestor.updated_at || new Date().toISOString(),
  };
}
