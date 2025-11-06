/**
 * Core API Client
 * Base class for all service operations with error handling and logging
 */

import { supabase } from '@/integrations/supabase/client';
import type { PostgrestError } from '@supabase/supabase-js';

export interface ApiResponse<T> {
  data: T | null;
  error: PostgrestError | Error | null;
  success: boolean;
}

export class ApiClient {
  protected supabase = supabase;

  /**
   * Wraps Supabase operations with standardized error handling
   */
  protected async execute<T>(
    operation: () => Promise<{ data: T | null; error: PostgrestError | null }>
  ): Promise<ApiResponse<T>> {
    try {
      const { data, error } = await operation();
      
      if (error) {
        console.error('API Error:', error);
        return { data: null, error, success: false };
      }
      
      return { data, error: null, success: true };
    } catch (error) {
      console.error('Unexpected Error:', error);
      return {
        data: null,
        error: error as Error,
        success: false,
      };
    }
  }

  /**
   * Gets the current authenticated user
   */
  protected async getCurrentUser() {
    const { data: { user }, error } = await this.supabase.auth.getUser();
    if (error) throw error;
    return user;
  }

  /**
   * Gets the current session
   */
  protected async getSession() {
    const { data: { session }, error } = await this.supabase.auth.getSession();
    if (error) throw error;
    return session;
  }
}
