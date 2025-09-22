/**
 * Simplified LP Server Functions
 */

import { supabase } from '@/integrations/supabase/client';

export interface Portfolio {
  asset: string;
  principal: number;
  earned: number;
  balance: number;
}

export interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

export interface Ticket {
  id: string;
  subject: string;
  category: string;
  message: string;
  status: 'open' | 'pending' | 'resolved';
  createdAt: string;
  updatedAt: string;
}

/**
 * Get portfolio for user
 */
export async function getPortfolio(userId: string): Promise<Portfolio[]> {
  try {
    const { data, error } = await supabase
      .from('positions')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;

    return (data || []).map(pos => ({
      asset: pos.asset_code || 'UNKNOWN',
      principal: pos.principal || 0,
      earned: pos.total_earned || 0,
      balance: pos.current_balance || 0
    }));
  } catch (error) {
    console.error('Error getting portfolio:', error);
    return [];
  }
}

/**
 * Get user profile
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    return !error;
  } catch (error) {
    console.error('Error updating user profile:', error);
    return false;
  }
}