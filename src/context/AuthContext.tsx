import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Role, User, AuthContextType } from '@/types/auth';

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: 'investor',
  isAdmin: false,
  isInvestor: true,
  loading: true,
  session: null,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const useRole = () => {
  const { role, isAdmin, isInvestor } = useAuth();
  return { role, isAdmin, isInvestor };
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<Role>('investor');

  const determineRole = (session: any): Role => {
    if (!session?.user) {
      // 1. No session - check preview mode
      const isPreviewAdmin = import.meta.env.VITE_PREVIEW_ADMIN === 'true';
      const localStorageRole = localStorage.getItem('app.role') as Role;
      
      if (isPreviewAdmin) return 'admin';
      if (localStorageRole && (localStorageRole === 'admin' || localStorageRole === 'investor')) {
        return localStorageRole;
      }
      return 'investor';
    }

    // 2. Check Supabase metadata
    const userRole = session.user.app_metadata?.role || session.user.user_metadata?.role;
    if (userRole === 'admin' || userRole === 'investor') {
      return userRole;
    }

    // 3. Check preview mode for authenticated users
    const isPreviewAdmin = import.meta.env.VITE_PREVIEW_ADMIN === 'true';
    const localStorageRole = localStorage.getItem('app.role') as Role;
    
    if (isPreviewAdmin) return 'admin';
    if (localStorageRole && (localStorageRole === 'admin' || localStorageRole === 'investor')) {
      return localStorageRole;
    }

    // 4. Default to investor
    return 'investor';
  };

  const checkAdminStatusFromDB = async (userId: string): Promise<boolean> => {
    try {
      // Try RPC function first (if available)
      const { data, error } = await supabase
        .rpc('get_user_admin_status', { user_id: userId });
        
      if (error) {
        console.warn('RPC function failed, using direct query fallback:', error);
        
        // Fallback to direct query if RPC function doesn't exist or fails
        const { data: profile, error: queryError } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', userId)
          .single();
          
        if (queryError) {
          console.error('Direct query also failed:', queryError);
          return false;
        }
        
        console.log('Admin status from direct query:', profile?.is_admin);
        return profile?.is_admin === true;
      }
      
      console.log('Admin status from RPC function:', data);
      return data === true;
    } catch (error) {
      console.warn('Error checking admin status, trying direct fallback:', error);
      
      // Final fallback - direct query
      try {
        const { data: profile, error: queryError } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', userId)
          .single();
          
        if (queryError) {
          console.error('Final fallback failed:', queryError);
          return false;
        }
        
        console.log('Admin status from final fallback:', profile?.is_admin);
        return profile?.is_admin === true;
      } catch (fallbackError) {
        console.error('All admin status checks failed:', fallbackError);
        return false;
      }
    }
  };

  const updateAuthState = async (session: any) => {
    if (session?.user) {
      // Set user info (minimal PII)
      const newUser: User = {
        id: session.user.id,
        email: session.user.email,
        name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
      };
      setUser(newUser);
      
      // Determine role - first check DB if available, then fallback to metadata/preview
      let newRole = determineRole(session);
      
      // If not explicitly admin in metadata, check database
      if (newRole !== 'admin') {
        const dbAdminStatus = await checkAdminStatusFromDB(session.user.id);
        if (dbAdminStatus) {
          newRole = 'admin';
        }
      }
      
      setRole(newRole);
    } else {
      // No session - use preview/localStorage fallbacks
      setUser(null);
      setRole(determineRole(null));
    }
    
    setSession(session);
    setLoading(false);
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      updateAuthState(session);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);
        updateAuthState(session);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const value = useMemo(() => ({
    user,
    role,
    isAdmin: role === 'admin',
    isInvestor: role === 'investor',
    loading,
    session,
  }), [user, role, loading, session]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
