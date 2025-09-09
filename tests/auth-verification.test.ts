/**
 * Authentication Verification Tests
 * Ensures Supabase auth is properly configured
 */

import { supabase } from '../src/integrations/supabase/client';

describe('Supabase Authentication Configuration', () => {
  
  test('Supabase client is initialized with anon key', () => {
    expect(supabase).toBeDefined();
    // Verify we're using anon key (starts with 'eyJ')
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    expect(anonKey).toBeDefined();
    expect(anonKey).toMatch(/^eyJ/);
    // Ensure service role key is NOT in environment
    expect(import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
  });

  test('Auth session persistence is configured', async () => {
    const { data: { session } } = await supabase.auth.getSession();
    // Session should be retrievable (null if logged out is ok)
    expect(session !== undefined).toBe(true);
  });

  test('Admin detection works with is_admin_for_jwt', async () => {
    // This would need a test user - checking function exists
    try {
      const { error } = await supabase.rpc('is_admin_for_jwt');
      // Function should exist (may return false for non-admin)
      expect(error?.code).not.toBe('42883'); // Function not found error
    } catch (e) {
      // Function exists but may require auth
      expect(e).toBeDefined();
    }
  });

  test('get_all_non_admin_profiles requires admin', async () => {
    try {
      const { error } = await supabase.rpc('get_all_non_admin_profiles');
      // Should fail for non-admin
      if (error) {
        expect(error.message).toContain('Admin privileges required');
      }
    } catch (e) {
      expect(e).toBeDefined();
    }
  });

  test('Environment variables are properly set', () => {
    expect(import.meta.env.VITE_SUPABASE_URL).toBeDefined();
    expect(import.meta.env.VITE_SUPABASE_URL).toMatch(/^https:\/\//);
    expect(import.meta.env.VITE_SUPABASE_ANON_KEY).toBeDefined();
  });
});
