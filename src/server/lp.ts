/**
 * Simplified LP Management
 */

import { supabase } from '@/integrations/supabase/client';

export interface LPSummary {
  id: string;
  name: string;
  email: string;
  totalInvested: number;
  currentValue: number;
  totalReturn: number;
  status: string;
}

/**
 * Get all LPs
 */
export async function getAllLPs(): Promise<LPSummary[]> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name')
      .eq('is_admin', false);

    if (error) throw error;

    return (data || []).map(profile => ({
      id: profile.id,
      name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown',
      email: profile.email,
      totalInvested: 0,
      currentValue: 0,
      totalReturn: 0,
      status: 'active'
    }));
  } catch (error) {
    console.error('Error getting LPs:', error);
    return [];
  }
}

/**
 * Get LP by ID
 */
export async function getLPById(id: string): Promise<LPSummary | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name')
      .eq('id', id)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      name: `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'Unknown',
      email: data.email,
      totalInvested: 0,
      currentValue: 0,
      totalReturn: 0,
      status: 'active'
    };
  } catch (error) {
    console.error('Error getting LP:', error);
    return null;
  }
}