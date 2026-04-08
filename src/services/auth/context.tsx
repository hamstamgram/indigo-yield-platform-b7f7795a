import { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import * as authService from "./authService";
import { logError, logWarn } from "@/lib/logger";

interface Profile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  /** @deprecated Use useUserRole().isAdmin instead — kept for backward compat */
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<any>;
  resetPassword: (email: string) => Promise<any>;
  updatePassword: (password: string) => Promise<any>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  isAdmin: false,
  signIn: async () => ({}),
  signOut: async () => {},
  signUp: async () => ({}),
  resetPassword: async () => ({}),
  updatePassword: async () => ({}),
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Track profile fetch state to avoid double-fetching
  const profileFetchedRef = useRef<string | null>(null);

  const [profileLoading, setProfileLoading] = useState(true);

  // Memoized profile fetch that deduplicates requests
  const fetchProfileOnce = useCallback((userId: string) => {
    // Skip if already fetched for this user
    if (profileFetchedRef.current === userId) {
      return;
    }
    profileFetchedRef.current = userId;
    fetchProfile(userId);
  }, []);

  useEffect(() => {
    // SECURITY: Add a safety timeout to force loading to false if auth hangs
    const safetyTimeout = setTimeout(() => {
      if (loading) {
        logWarn("auth.initialization_timeout", {
          message: "Auth initialization timed out after 5s, forcing loading to false",
        });
        setLoading(false);
      }
    }, 5000);

    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Defer profile fetching to avoid auth callback deadlock
        setTimeout(() => {
          fetchProfileOnce(session.user.id);
        }, 0);
      } else {
        profileFetchedRef.current = null;
        setProfile(null);
        setLoading(false);
        clearTimeout(safetyTimeout);
      }
    });

    // THEN check for existing session
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchProfileOnce(session.user.id);
        } else {
          setLoading(false);
          clearTimeout(safetyTimeout);
        }
      })
      .catch((error) => {
        logError("auth.getSession_error", error);
        setLoading(false);
        clearTimeout(safetyTimeout);
      });

    return () => {
      subscription.unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, [fetchProfileOnce]);

  const fetchProfile = async (userId: string) => {
    setProfileLoading(true);
    try {
      // Direct query to profiles table for basic info only
      // REMOVED: user_roles query — role checks now handled by useUserRole hook (React Query cached)
      const { data: profileData } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", userId)
        .maybeSingle();

      if (profileData) {
        setProfile({
          id: userId,
          email: user?.email || "",
          first_name: profileData.first_name ?? undefined,
          last_name: profileData.last_name ?? undefined,
        });
      } else {
        logWarn("fetchProfile.notFound", {
          userId,
          reason: "Profile not found in database",
        });
        setProfile({
          id: userId,
          email: user?.email || "",
        });
      }
    } catch (error) {
      logError("fetchProfile", error, { userId });
      setProfile({
        id: userId,
        email: user?.email || "",
      });
    } finally {
      setProfileLoading(false);
      setLoading(false);
    }
  };

  const handleSignIn = async (email: string, password: string) => {
    return await authService.signIn({ email, password });
  };

  const handleSignOut = async () => {
    await authService.signOut();
  };

  const handleSignUp = async (email: string, password: string) => {
    return await authService.signUp({ email, password });
  };

  const resetPassword = async (email: string) => {
    return await authService.resetPasswordForEmail(email);
  };

  const handleUpdatePassword = async (password: string) => {
    await authService.updatePassword(password);
    return { success: true };
  };

  const value = {
    user,
    session,
    profile,
    loading: loading && (user === null || profileLoading),
    // isAdmin is now always false here — useUserRole is the single source of truth
    // Kept for backward compatibility; consumers should migrate to useUserRole
    isAdmin: false,
    signIn: handleSignIn,
    signOut: handleSignOut,
    signUp: handleSignUp,
    resetPassword,
    updatePassword: handleUpdatePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
