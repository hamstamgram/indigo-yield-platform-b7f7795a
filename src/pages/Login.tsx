import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, Lock, Mail, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuthSession = async () => {
      try {
        setCheckingAuth(true);
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          setCheckingAuth(false);
          return;
        }

        // User is already authenticated, redirect based on admin status
        try {
          // Check admin status using the secure function
          const { data: adminStatus } = await supabase.rpc("get_user_admin_status", {
            user_id: session.user.id,
          });

          const isAdmin = adminStatus === true;

          // Redirect based on admin status
          if (isAdmin) {
            navigate("/admin", { replace: true });
          } else {
            navigate("/dashboard", { replace: true });
          }
        } catch (profileError) {
          console.error("Error checking profile:", profileError);
          // Default to regular dashboard if profile check fails
          navigate("/dashboard", { replace: true });
        }
      } catch (error) {
        console.error("Error checking session:", error);
        setCheckingAuth(false);
      }
    };

    checkAuthSession();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          console.error("Login error:", error);
          setError(error.message);
          throw error;
        }

        if (!data.user) {
          throw new Error("No user returned from login");
        }

        // Show success message
        toast({
          title: "Welcome back!",
          description: "You've successfully logged in.",
        });

        // Check admin status BEFORE redirect to prevent flash
        try {
          const { data: adminStatus } = await supabase.rpc("get_user_admin_status", {
            user_id: data.user.id,
          });
          
          if (adminStatus === true) {
            navigate("/admin", { replace: true });
          } else {
            navigate("/dashboard", { replace: true });
          }
        } catch {
          // Default to dashboard if admin check fails
          navigate("/dashboard", { replace: true });
        }
      } else {
        // Since this is invitation-only, restrict self registration
        setError("This platform requires an invitation. Please contact the administrator.");
        toast({
          title: "Invitation Only",
          description: "This platform requires an invitation. Please contact the administrator.",
          variant: "destructive",
        });
        setIsLogin(true);
      }
    } catch (error: any) {
      console.error("Login error:", error);
      // No need to set error again as it's already set above
    } finally {
      setLoading(false);
    }
  };

  // Display loading indicator while checking authentication
  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <LoadingSpinner size="lg" className="text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-6 sm:p-4">
      <div className="w-full max-w-sm sm:max-w-md">
        <div className="mb-8 flex justify-center">
          <img
            src="/lovable-uploads/74aa0ccc-22f8-4892-9282-3991b5e10f4c.png"
            alt="Infinite Yield Fund"
            className="h-12 sm:h-14 w-auto"
            loading="eager"
          />
        </div>
        <Card className="border border-gray-200 bg-white shadow-md">
          <CardHeader>
            <CardTitle className="text-center text-xl sm:text-2xl text-gray-800">
              {isLogin ? "Investor Access" : "Request Access"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail
                    className="absolute left-3 top-3 h-5 w-5 text-gray-400"
                    aria-hidden="true"
                  />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 border-gray-200 text-gray-800 placeholder-gray-400"
                    required
                    autoComplete="email"
                    error={!!error}
                    aria-invalid={!!error}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700">
                  Password
                </Label>
                <div className="relative">
                  <Lock
                    className="absolute left-3 top-3 h-5 w-5 text-gray-400"
                    aria-hidden="true"
                  />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-12 sm:pr-10 border-gray-200 text-gray-800 placeholder-gray-400"
                    required
                    minLength={6}
                    autoComplete="current-password"
                    error={!!error}
                    aria-invalid={!!error}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-9 w-9 sm:h-8 sm:w-8 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" aria-hidden="true" />
                    ) : (
                      <Eye className="h-5 w-5" aria-hidden="true" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center">
                      <LoadingSpinner size="sm" className="mr-2 text-white" />
                      Processing...
                    </span>
                  ) : isLogin ? (
                    "Sign In"
                  ) : (
                    "Request Access"
                  )}
                </Button>
              </div>
            </form>

            {isLogin && (
              <div className="mt-4 text-center text-sm">
                <Link
                  to="/forgot-password"
                  className="text-indigo-600 hover:text-indigo-800 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-center border-t border-gray-200 px-6 py-4">
            <p className="text-sm text-gray-600">
              {isLogin ? "Need access to the platform? " : "Already have access? "}
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-indigo-600 hover:text-indigo-800 hover:underline font-medium"
              >
                {isLogin ? "Request Access" : "Sign in"}
              </button>
            </p>
          </CardFooter>
        </Card>

        <div className="mt-8 text-center text-sm text-muted-foreground space-y-2">
          <p>Investor Portal - Invitation Only Access</p>
          <div className="flex justify-center space-x-4">
            <Link to="/terms" className="hover:text-foreground hover:underline">
              Terms
            </Link>
            <Link to="/privacy" className="hover:text-foreground hover:underline">
              Privacy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
