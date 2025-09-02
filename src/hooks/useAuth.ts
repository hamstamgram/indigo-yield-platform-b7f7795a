import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAdmin: boolean;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    isAdmin: false,
  });

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user || null;
      const isAdmin = user?.user_metadata?.is_admin || false;
      
      setAuthState({
        user,
        session,
        isLoading: false,
        isAdmin,
      });
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const user = session?.user || null;
      let isAdmin = false;

      if (user) {
        // Check if user is admin from user_metadata or profiles table
        isAdmin = user.user_metadata?.is_admin || false;
        
        if (!isAdmin) {
          // Fallback: check profiles table
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('is_admin')
              .eq('id', user.id)
              .single();
            
            isAdmin = profile?.is_admin || false;
          } catch (error) {
            console.warn('Failed to check admin status from profiles:', error);
          }
        }
      }

      setAuthState({
        user,
        session,
        isLoading: false,
        isAdmin,
      });
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    }
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signUp = async (email: string, password: string, metadata?: any) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });
    return { data, error };
  };

  return {
    ...authState,
    signIn,
    signUp,
    signOut,
  };
};
