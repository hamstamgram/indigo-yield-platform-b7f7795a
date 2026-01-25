import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Button,
  Input,
  Label,
  LoadingSpinner,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { useToast } from "@/hooks";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useVerifyInvestorInvite, useAcceptInvestorInvite } from "@/hooks/data";

const InvestorInvite = () => {
  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get("code");
  const navigate = useNavigate();
  const { toast } = useToast();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const { data: inviteData, isLoading, error: verifyError } = useVerifyInvestorInvite(inviteCode);
  const acceptMutation = useAcceptInvestorInvite();

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!password || password.length < 6) {
      toast({
        title: "Invalid Password",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      });
      return;
    }

    if (!inviteCode || !inviteData?.email) return;

    acceptMutation.mutate({
      inviteCode,
      email: inviteData.email,
      password,
      firstName,
      lastName,
    });
  };

  // Handle navigation to login
  const goToLogin = () => {
    navigate("/login");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const validInvite = !!inviteData && !verifyError;
  const errorMessage =
    verifyError?.message || (!inviteCode ? "Invalid invitation link. No code provided." : null);

  // Yield Spectrum Background
  const backgroundDecorators = (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none select-none">
      <div className="absolute inset-0 bg-background" />
      {/* Distinct "Invite" color scheme - slightly more green/growth focused */}
      <div className="absolute top-[-20%] left-[50%] -translate-x-1/2 w-[70%] h-[70%] rounded-full bg-yield-neon/10 blur-[150px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-brand/20 blur-[100px] animate-pulse animate-delay-200" />
    </div>
  );

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-4 lg:p-8 overflow-y-auto">
      {backgroundDecorators}

      <div className="relative z-10 w-full max-w-lg animate-fade-in-up">
        {/* Brand Header */}
        <div className="mb-8 flex flex-col items-center justify-center text-center space-y-4">
          <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl shadow-yield-neon/10">
            <img
              src="/lovable-uploads/74aa0ccc-22f8-4892-9282-3991b5e10f4c.png"
              alt="Infinite Yield Fund"
              className="h-16 w-auto drop-shadow-lg"
            />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight text-white drop-shadow-md">
              Join the Fund
            </h1>
            <p className="text-indigo-200/60 font-light tracking-wide">Exclusive Investor Access</p>
          </div>
        </div>

        {/* Glass Card */}
        <div className="glass-panel rounded-3xl p-8 backdrop-blur-2xl bg-black/40 border border-white/10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          {validInvite && !acceptMutation.isSuccess ? (
            <>
              <div className="mb-6 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yield-neon/10 border border-yield-neon/20 text-yield-neon text-xs font-medium mb-2">
                  <CheckCircle2 className="h-3 w-3" />
                  Invitation Verified
                </div>
                <p className="text-indigo-200/70 text-sm">
                  Complete your profile to access the dashboard
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email Field (Read Only) */}
                <div className="space-y-1.5 opacity-80 cursor-not-allowed">
                  <Label className="text-xs uppercase tracking-widest text-indigo-200/50 font-bold ml-1">
                    Email
                  </Label>
                  <Input
                    value={inviteData.email}
                    disabled
                    readOnly
                    className="h-12 bg-white/5 border-white/5 text-indigo-200/70 rounded-xl"
                  />
                </div>

                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-widest text-indigo-200/50 font-bold ml-1">
                      First Name
                    </Label>
                    <Input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="h-12 bg-white/5 border-white/10 text-white rounded-xl focus:bg-white/10 focus:border-indigo-500/50 transition-all"
                      placeholder="Jane"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-widest text-indigo-200/50 font-bold ml-1">
                      Last Name
                    </Label>
                    <Input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="h-12 bg-white/5 border-white/10 text-white rounded-xl focus:bg-white/10 focus:border-indigo-500/50 transition-all"
                      placeholder="Doe"
                      required
                    />
                  </div>
                </div>

                {/* Password Fields */}
                <div className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-widest text-indigo-200/50 font-bold ml-1">
                      Create Password
                    </Label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 bg-white/5 border-white/10 text-white rounded-xl focus:bg-white/10 focus:border-indigo-500/50 transition-all font-mono tracking-tighter"
                      placeholder="••••••••"
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-widest text-indigo-200/50 font-bold ml-1">
                      Confirm Password
                    </Label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-12 bg-white/5 border-white/10 text-white rounded-xl focus:bg-white/10 focus:border-indigo-500/50 transition-all font-mono tracking-tighter"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <Button
                    type="submit"
                    className="w-full h-12 btn-premium bg-yield-neon/90 hover:bg-yield-neon text-black font-bold tracking-wide rounded-xl shadow-lg shadow-yield-neon/20 text-base"
                    disabled={acceptMutation.isPending}
                  >
                    {acceptMutation.isPending ? (
                      <span className="flex items-center">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Account...
                      </span>
                    ) : (
                      "Accept Invitation & Join"
                    )}
                  </Button>
                </div>
              </form>
            </>
          ) : acceptMutation.isSuccess ? (
            <div className="text-center py-8 space-y-6">
              <div className="w-24 h-24 mx-auto rounded-full bg-yield-neon/10 flex items-center justify-center border border-yield-neon/20 shadow-[0_0_30px_-5px_rgba(74,222,128,0.3)] animate-pulse">
                <CheckCircle2 className="h-12 w-12 text-yield-neon" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white">Welcome Aboard</h2>
                <p className="text-indigo-200/70">Your account has been created successfully.</p>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-sm text-indigo-200/50">
                Initializing dashboard...
              </div>
            </div>
          ) : (
            <div className="text-center py-8 space-y-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20 shadow-[0_0_30px_-5px_rgba(244,63,94,0.3)]">
                <XCircle className="h-10 w-10 text-rose-500" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-white">Invitation Issue</h2>
                <p className="text-rose-200/80 text-sm max-w-xs mx-auto">{errorMessage}</p>
              </div>
              <Button
                onClick={goToLogin}
                variant="outline"
                className="mt-4 border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white rounded-xl h-12 w-full"
              >
                Return to Login
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvestorInvite;
