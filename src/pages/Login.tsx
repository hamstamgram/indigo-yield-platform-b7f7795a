import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Button,
  Input,
  Label,
  LoadingSpinner,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Alert,
  AlertDescription,
} from "@/components/ui";
import { Eye, EyeOff, Lock, Mail, AlertCircle } from "lucide-react";
import { useSignIn, useCheckAuthSession } from "@/hooks/data";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const { data: authData, isLoading: checkingAuth } = useCheckAuthSession();
  const signInMutation = useSignIn();

  // Redirect if already authenticated
  useEffect(() => {
    if (authData) {
      navigate(authData.isAdmin ? "/admin" : "/investor", { replace: true });
    }
  }, [authData, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    signInMutation.mutate({ email, password });
  };

  // Display loading indicator while checking authentication
  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LoadingSpinner size="lg" className="text-indigo-600" />
      </div>
    );
  }

  const error = signInMutation.error?.message || null;

  // Institutional background — no animation, no orbs
  const backgroundDecorators = (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none select-none">
      {/* Deep Space Background */}
      <div className="absolute inset-0 bg-background" />

      {/* Subtle CSS grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(99,102,241,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.4) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Two static radial gradients — indigo, 5% opacity */}
      <div
        className="absolute top-[-15%] left-[-15%] w-[55%] h-[55%] rounded-full blur-[140px]"
        style={{ background: "radial-gradient(circle, rgba(99,102,241,0.05) 0%, transparent 70%)" }}
      />
      <div
        className="absolute bottom-[-15%] right-[-15%] w-[55%] h-[55%] rounded-full blur-[140px]"
        style={{ background: "radial-gradient(circle, rgba(99,102,241,0.05) 0%, transparent 70%)" }}
      />
    </div>
  );

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-4 lg:p-8 overflow-y-auto">
      {backgroundDecorators}

      <div className="relative z-10 w-full max-w-md animate-fade-in-up">
        {/* Brand Header */}
        <div className="mb-6 flex flex-col items-center justify-center text-center space-y-4">
          <img
            src="/brand/logo-white.svg"
            alt="Infinite Yield Fund"
            className="h-14 w-auto drop-shadow-lg"
          />
          {/* Cialdini: scarcity + authority in one line */}
          <p className="text-xs text-muted-foreground tracking-widest uppercase">
            Invite-only · Accredited Investors Only
          </p>
        </div>

        {/* Glass Login Card */}
        <div
          className="rounded-3xl p-8 backdrop-blur-2xl relative overflow-hidden"
          style={{
            background: "var(--glass-bg)",
            border: "1px solid var(--glass-border)",
            boxShadow: "var(--shadow-glow-indigo), 0 25px 50px -12px rgba(0,0,0,0.5)",
          }}
        >
          {/* Top light reflection */}
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

          {error && (
            <div className="mb-6 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
              <p className="text-sm text-rose-200/90">{error}</p>
            </div>
          )}

          <div className="mb-6">
            <h2 className="text-xl font-semibold text-white">Investor Portal</h2>
            <p className="text-xs text-white/30 mt-1">Private Access</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-xs uppercase tracking-widest text-indigo-200/50 font-bold ml-1"
              >
                Email Address
              </Label>
              <div className="relative group/input">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors group-focus-within/input:text-indigo-400 text-indigo-200/30">
                  <Mail className="h-5 w-5" />
                </div>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@firm.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 bg-white/5 border-white/10 text-white placeholder:text-white/20 rounded-xl focus:bg-white/10 focus:border-indigo-500/50 focus-visible:ring-1 focus-visible:ring-indigo-500/50 transition-all duration-150 font-medium text-base"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="password"
                  className="text-xs uppercase tracking-widest text-indigo-200/50 font-bold ml-1"
                >
                  Password
                </Label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors duration-150"
                >
                  Forgot?
                </Link>
              </div>
              <div className="relative group/input">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors group-focus-within/input:text-indigo-400 text-indigo-200/30">
                  <Lock className="h-5 w-5" />
                </div>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-12 bg-white/5 border-white/10 text-white placeholder:text-white/20 rounded-xl focus:bg-white/10 focus:border-indigo-500/50 focus-visible:ring-1 focus-visible:ring-indigo-500/50 transition-all duration-150 font-medium text-base font-mono tracking-tighter"
                  required
                  minLength={6}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-indigo-200/30 hover:text-indigo-200 transition-colors duration-150"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 hover:-translate-y-0.5 text-white font-bold tracking-wide rounded-xl shadow-lg shadow-indigo-600/25 text-base mt-2 transition-all duration-150 active:scale-[0.98] active:translate-y-0"
              disabled={signInMutation.isPending}
            >
              {signInMutation.isPending ? (
                <LoadingSpinner size="sm" className="text-white" />
              ) : (
                <span className="flex items-center gap-2">
                  Access Portal
                  {!signInMutation.isPending && <span className="text-lg">→</span>}
                </span>
              )}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/5 text-center space-y-4">
            <p className="text-xs text-indigo-200/40 font-light px-4 leading-relaxed">
              By accessing this platform, you acknowledge that you are an accredited investor or
              authorized representative.
            </p>
            <div className="flex justify-center gap-6 text-xs text-indigo-300/60 font-medium tracking-wide">
              <Link to="/terms" className="hover:text-white transition-colors duration-150">
                Terms of Service
              </Link>
              <Link to="/privacy" className="hover:text-white transition-colors duration-150">
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>

        {/* Secure connection badge */}
        <div className="mt-8 flex justify-center">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 text-[10px] text-indigo-200/50 font-medium">
            <Lock className="h-3 w-3" />
            256-Bit SSL Secured Connection
          </div>
        </div>
      </div>
    </div>
  );
}
