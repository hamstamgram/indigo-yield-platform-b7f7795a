import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { authService } from "@/services/core";

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

  useEffect(() => {
    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Defer profile fetching to avoid auth callback deadlock
        setTimeout(() => {
          fetchProfile(session.user.id);
        }, 0);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      // Use secure functions to bypass RLS issues
      const [basicProfile, adminStatus] = await Promise.all([
        supabase.rpc("get_profile_basic", { user_id: userId }),
        supabase.rpc("get_user_admin_status", { user_id: userId }),
      ]);

      // Try to get TOTP status (may fail if table doesn't exist yet)
      let totpData: { enabled?: boolean; verified_at?: string | null } | null = null;
      try {
        const totpResponse = await supabase
          .from("user_totp_settings" as any)
          .select("enabled, verified_at")
          .eq("user_id", userId)
          .maybeSingle();

        if (!totpResponse.error && totpResponse.data) {
          totpData = totpResponse.data as { enabled?: boolean; verified_at?: string | null };
        }
      } catch (e) {
        console.warn("TOTP settings not available:", e);
      }

      if (basicProfile.data && basicProfile.data.length > 0) {
        const p = basicProfile.data[0];
        setProfile({
          id: userId,
          email: user?.email || "",
          first_name: p.first_name,
          last_name: p.last_name,
          is_admin: adminStatus.data === true,
          totp_enabled: totpData?.enabled || false,
          totp_verified:
            (totpData?.verified_at !== null && totpData?.verified_at !== undefined) || false,
        });
      } else {
        setProfile({
          id: userId,
          email: user?.email || "",
          is_admin: adminStatus.data === true,
          totp_enabled: totpData?.enabled || false,
          totp_verified:
            (totpData?.verified_at !== null && totpData?.verified_at !== undefined) || false,
        });
      }

      // Log successful authentication (ignore errors)
      try {
        await supabase.rpc("log_security_event", {
          event_type: "PROFILE_ACCESS",
          details: {
            user_id: userId,
            has_2fa:
              (totpData?.verified_at !== null && totpData?.verified_at !== undefined) || false,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (e) {
        console.warn("Failed to log security event:", e);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);

      // Log failed profile fetch (ignore errors)
      try {
        await supabase.rpc("log_security_event", {
          event_type: "PROFILE_ACCESS_FAILED",
          details: { user_id: userId, error: (error as Error).message },
        });
      } catch (e) {
        console.warn("Failed to log security event:", e);
      }

      // Fallback to minimal profile with user metadata
      setProfile({
        id: userId,
        email: user?.email || "",
        is_admin: user?.user_metadata?.is_admin || false,
        totp_enabled: false,
        totp_verified: false,
      });
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    return await authService.signIn({ email, password });
  };

  const signOut = async () => {
    await authService.signOut();
  };

  const signUp = async (email: string, password: string) => {
    return await authService.signUp({ email, password });
  };

  const resetPassword = async (email: string) => {
    return await authService.resetPasswordForEmail(email);
  };

  const updatePassword = async (password: string) => {
    return await authService.updatePassword(password);
  };

  const value = {
    user,
    session,
    profile,
    loading,
    isAdmin: profile?.is_admin ?? false,
    signIn,
    signOut,
    signUp,
    resetPassword,
    updatePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
