
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, Lock, Mail, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          setCheckingAuth(false);
          return;
        }
        
        // User is already authenticated, redirect based on admin status
        console.log("User is authenticated, redirecting...");
        
        try {
          // Get user profile to check admin status
          const { data: profile } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', session.user.id)
            .single();
            
          const isAdmin = profile?.is_admin === true;
          
          // Redirect based on admin status
          if (isAdmin) {
            console.log("Admin user detected, redirecting to admin dashboard");
            navigate("/admin", { replace: true });
          } else {
            console.log("Regular user detected, redirecting to dashboard");
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
    console.log("Attempting login with:", email);

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
        
        console.log("Login successful, user:", data.user);
        
        // Show success message
        toast({
          title: "Welcome back!",
          description: "You've successfully logged in.",
        });
        
        // Redirect to dashboard - admin check will be done in the dashboard component
        navigate("/dashboard", { replace: true });
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
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <img 
            src="/lovable-uploads/74aa0ccc-22f8-4892-9282-3991b5e10f4c.png" 
            alt="Infinite Yield Fund"
            className="h-14"
          />
        </div>
        <Card className="border border-gray-200 bg-white shadow-md">
          <CardHeader>
            <CardTitle className="text-center text-2xl text-gray-800">
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
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <Input
                    type="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 border-gray-200 text-gray-800 placeholder-gray-400"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 border-gray-200 text-gray-800 placeholder-gray-400"
                    required
                    minLength={6}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                    <span className="sr-only">Toggle password visibility</span>
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
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
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
                <Link to="/forgot-password" className="text-indigo-600 hover:text-indigo-800 hover:underline">
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
        
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>Investor Portal - Invitation Only Access</p>
        </div>
      </div>
    </div>
  );
}
