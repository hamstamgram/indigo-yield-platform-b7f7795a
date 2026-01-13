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
  is_admin: boolean;
  totp_enabled?: boolean;
  totp_verified?: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
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
  const initializedRef = useRef(false);
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
    // Prevent double-initialization in StrictMode
    if (initializedRef.current) return;
    initializedRef.current = true;

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
      }
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfileOnce(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfileOnce]);

  const fetchProfile = async (userId: string) => {
    setProfileLoading(true);
    try {
      // Direct query to profiles table for basic info
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", userId)
        .maybeSingle();

      // Check admin role from user_roles table (SECURITY: Server-side role check)
      const { data: adminRole, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .in("role", ["admin", "super_admin"])
        .maybeSingle();

      const isAdmin = !!adminRole;

      // Try to get TOTP status
      let totpData: { enabled?: boolean; verified_at?: string | null } | null = null;
      try {
        const totpResponse = await supabase
          .from("user_totp_settings")
          .select("enabled, verified_at")
          .eq("user_id", userId)
          .maybeSingle();

        if (!totpResponse.error && totpResponse.data) {
          totpData = totpResponse.data as { enabled?: boolean; verified_at?: string | null };
        }
      } catch (e) {
        logWarn("fetchProfile.totp", { error: e });
      }

      if (profileData) {
        setProfile({
          id: userId,
          email: user?.email || "",
          first_name: profileData.first_name ?? undefined,
          last_name: profileData.last_name ?? undefined,
          is_admin: isAdmin,
          totp_enabled: totpData?.enabled || false,
          totp_verified:
            (totpData?.verified_at !== null && totpData?.verified_at !== undefined) || false,
        });
      } else {
        // SECURITY: Fail closed - never trust user_metadata for admin status
        // Admin status MUST come from the user_roles table (server-verified)
        logWarn("fetchProfile.notFound", { userId, reason: "Profile not found in database, defaulting to non-admin" });
        setProfile({
          id: userId,
          email: user?.email || "",
          is_admin: false, // Always default to false for security
          totp_enabled: totpData?.enabled || false,
          totp_verified:
            (totpData?.verified_at !== null && totpData?.verified_at !== undefined) || false,
        });
      }
    } catch (error) {
      logError("fetchProfile", error, { userId });

      // SECURITY: Fail closed - no admin access if profile can't be loaded
      // Never use user_metadata.is_admin as it can be manipulated client-side
      // Admin status MUST come from user_roles table
      setProfile({
        id: userId,
        email: user?.email || "",
        is_admin: false, // Always default to false for security
        totp_enabled: false,
        totp_verified: false,
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
    loading: loading || (user !== null && profileLoading),
    isAdmin: profile?.is_admin ?? false,
    signIn: handleSignIn,
    signOut: handleSignOut,
    signUp: handleSignUp,
    resetPassword,
    updatePassword: handleUpdatePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
