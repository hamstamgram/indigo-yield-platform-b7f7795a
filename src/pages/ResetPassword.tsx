import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Button,
  Input,
  LoadingSpinner,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Alert,
  AlertDescription,
} from "@/components/ui";
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";
import { useResetPassword, useSetSessionFromTokens } from "@/hooks/data/shared/useAuthFlow";
export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();

  const resetMutation = useResetPassword();
  const setSessionMutation = useSetSessionFromTokens();

  useEffect(() => {
    // SECURITY: Try sessionStorage first (preferred - tokens not exposed in URL)
    let accessToken = sessionStorage.getItem("reset_access_token") || undefined;
    let refreshToken = sessionStorage.getItem("reset_refresh_token") || undefined;

    // Clear tokens from sessionStorage immediately after reading for security
    if (accessToken && refreshToken) {
      sessionStorage.removeItem("reset_access_token");
      sessionStorage.removeItem("reset_refresh_token");
    }

    // Fallback: Try to get tokens from query params (for backward compatibility)
    if (!accessToken || !refreshToken) {
      accessToken = searchParams.get("access_token") || undefined;
      refreshToken = searchParams.get("refresh_token") || undefined;
    }

    // Last resort: parse from URL hash (Supabase sometimes sends recovery tokens in the hash)
    if (!accessToken || !refreshToken) {
      const rawHash = window.location.hash || "";
      const hash = rawHash.startsWith("#") ? rawHash.slice(1) : rawHash;
      if (hash) {
        const hashParams = new URLSearchParams(hash);
        const type = hashParams.get("type");
        accessToken = accessToken || hashParams.get("access_token") || undefined;
        refreshToken = refreshToken || hashParams.get("refresh_token") || undefined;
        // If we found tokens in hash, clear it from URL for security
        if (accessToken && refreshToken && (type === "recovery" || type === "recovery_token")) {
          window.history.replaceState({}, "", window.location.pathname);
        }
      }
    }

    // If tokens were in URL params, clear them for security
    if (searchParams.get("access_token") || searchParams.get("refresh_token")) {
      window.history.replaceState({}, "", window.location.pathname);
    }

    if (!accessToken || !refreshToken) {
      setLocalError("Invalid or expired reset link. Please request a new password reset.");
      return;
    }

    // Set the session with the tokens
    setSessionMutation.mutate({ accessToken, refreshToken });
  }, [searchParams, setSessionMutation]);

  const validatePassword = (password: string) => {
    if (password.length < 8) {
      return "Password must be at least 8 characters long";
    }
    if (!/(?=.*[a-z])/.test(password)) {
      return "Password must contain at least one lowercase letter";
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      return "Password must contain at least one uppercase letter";
    }
    if (!/(?=.*\d)/.test(password)) {
      return "Password must contain at least one number";
    }
    return null;
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    // Validate password
    const passwordError = validatePassword(password);
    if (passwordError) {
      setLocalError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setLocalError("Passwords do not match");
      return;
    }

    resetMutation.mutate(password);
  };

  const error = localError || resetMutation.error?.message;

  // Yield Spectrum Background
  const backgroundDecorators = (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none select-none">
      <div className="absolute inset-0 bg-background" />
      <div className="absolute top-[-10%] left-[20%] w-[50%] h-[50%] rounded-full bg-indigo-brand/20 blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-yield-neon/5 blur-[100px] animate-pulse animate-delay-200" />
    </div>
  );

  if (resetMutation.isSuccess) {
    return (
      <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-4 lg:p-8 overflow-y-auto">
        {backgroundDecorators}

        <div className="relative z-10 w-full max-w-md animate-fade-in-up">
          <div className="glass-panel rounded-3xl p-8 backdrop-blur-2xl bg-black/40 border border-white/10 shadow-2xl relative overflow-hidden text-center space-y-6">
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            <div className="w-20 h-20 mx-auto rounded-full bg-yield-neon/10 flex items-center justify-center border border-yield-neon/20 shadow-[0_0_30px_-5px_rgba(74,222,128,0.3)]">
              <CheckCircle2 className="h-10 w-10 text-yield-neon" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">Password Updated</h2>
              <p className="text-indigo-200/70 text-sm">
                Your password has been successfully secured.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-sm text-indigo-200/50">
              Redirecting you to login...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-4 lg:p-8 overflow-y-auto">
      {backgroundDecorators}

      <div className="relative z-10 w-full max-w-md animate-fade-in-up">
        {/* Brand Header */}
        <div className="mb-8 flex flex-col items-center justify-center text-center space-y-4">
          <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl shadow-indigo-500/10">
            <img
              src="/brand/logo-white.svg"
              alt="Infinite Yield Fund"
              className="h-16 w-auto drop-shadow-lg"
            />
          </div>
        </div>

        {/* Glass Card */}
        <div className="glass-panel rounded-3xl p-8 backdrop-blur-2xl bg-black/40 border border-white/10 shadow-2xl relative overflow-hidden group">
          {/* Top light reflection */}
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Set New Password</h2>
            <p className="text-indigo-200/60 text-sm">Secure your account with a strong password</p>
          </div>

          {error && (
            <div className="mb-6 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
              <p className="text-sm text-rose-200/90">{error}</p>
            </div>
          )}

          <form onSubmit={handleResetPassword} className="space-y-5">
            <div className="space-y-2">
              <div className="relative group/input">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors group-focus-within/input:text-indigo-400 text-indigo-200/30">
                  <Lock className="h-5 w-5" />
                </div>
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="New Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-12 bg-white/5 border-white/10 text-white placeholder:text-white/20 rounded-xl focus:bg-white/10 focus:border-indigo-500/50 transition-all font-medium text-base font-mono tracking-tighter"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-indigo-200/30 hover:text-indigo-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="relative group/input">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors group-focus-within/input:text-indigo-400 text-indigo-200/30">
                  <Lock className="h-5 w-5" />
                </div>
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm New Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 pr-10 h-12 bg-white/5 border-white/10 text-white placeholder:text-white/20 rounded-xl focus:bg-white/10 focus:border-indigo-500/50 transition-all font-medium text-base font-mono tracking-tighter"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-indigo-200/30 hover:text-indigo-200 transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
              <p className="text-xs text-indigo-200/70 font-medium">Password Requirements:</p>
              <ul className="text-xs text-indigo-200/40 space-y-1 list-disc list-inside">
                <li>At least 8 characters long</li>
                <li>Contains uppercase & lowercase letters</li>
                <li>Contains at least one number</li>
              </ul>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                className="w-full h-12 btn-premium bg-indigo-600 hover:bg-indigo-500 text-white font-bold tracking-wide rounded-xl shadow-lg shadow-indigo-600/20 text-base"
                disabled={resetMutation.isPending}
              >
                {resetMutation.isPending ? (
                  <span className="flex items-center">
                    <LoadingSpinner size="sm" className="mr-2 text-white" />
                    Securing Account...
                  </span>
                ) : (
                  "Update Password"
                )}
              </Button>
            </div>
          </form>
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-indigo-200/30 font-medium tracking-widest uppercase">
            Secure Password Encryption
          </p>
        </div>
      </div>
    </div>
  );
}
