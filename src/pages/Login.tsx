import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // When the component loads, check if user is already authenticated
  useEffect(() => {
    const checkAuthSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // If there's already a session, check if user is admin based on email
        // This is a fallback in case the profiles query fails
        if (session.user.email === 'hammadou@indigo.fund') {
          navigate("/admin-dashboard");
        } else {
          try {
            // Try to check if user is admin from profiles
            const { data: profile, error } = await supabase
              .from('profiles')
              .select('is_admin')
              .eq('id', session.user.id)
              .single();
              
            if (error || !profile) {
              console.error("Error checking profile for admin status:", error);
              navigate("/dashboard");
            } else if (profile.is_admin) {
              navigate("/admin-dashboard");
            } else {
              navigate("/dashboard");
            }
          } catch (error) {
            console.error("Exception checking admin status:", error);
            navigate("/dashboard");
          }
        }
      }
    };
    checkAuthSession();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // For testing, use these credentials:
      // Email: test@investor.com
      // Password: InvestorPass123
      // Or for admin: hammadou@indigo.fund
      
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        
        // Known admin emails - hardcoded as fallback
        const isKnownAdmin = email === 'hammadou@indigo.fund';
        
        try {
          // Try to check if user is admin from profiles table
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', data.user.id)
            .single();
          
          // Determine admin status from profile or fallback
          let adminStatus = false;
          
          if (profileError) {
            console.warn("Using fallback admin detection due to profile error:", profileError);
            adminStatus = isKnownAdmin;
          } else {
            adminStatus = profile?.is_admin || isKnownAdmin;
          }
          
          toast({
            title: "Welcome back!",
            description: `You've successfully logged in as ${adminStatus ? 'Administrator' : 'Investor'}.`,
          });
          
          // Direct admin users to admin dashboard, regular users to normal dashboard
          if (adminStatus) {
            console.log("Admin user detected, redirecting to admin dashboard");
            navigate("/admin-dashboard");
          } else {
            console.log("Regular user detected, redirecting to dashboard");
            navigate("/dashboard");
          }
        } catch (error) {
          console.error("Error checking admin status:", error);
          // Fall back to email check
          if (isKnownAdmin) {
            toast({
              title: "Welcome back, Admin!",
              description: "You've successfully logged in as Administrator.",
            });
            navigate("/admin-dashboard");
          } else {
            toast({
              title: "Welcome back!",
              description: "You've successfully logged in as Investor.",
            });
            navigate("/dashboard");
          }
        }
      } else {
        // Since this is invitation-only, restrict self registration
        toast({
          title: "Invitation Only",
          description: "This platform requires an invitation. Please contact the administrator.",
          variant: "destructive",
        });
        setIsLogin(true);
      }
    } catch (error: any) {
      toast({
        title: "Authentication error",
        description: error.message || "An error occurred during authentication.",
        variant: "destructive",
      });
      console.error("Login error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-4 font-['Space_Grotesk']">
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
                <a href="#" className="text-indigo-600 hover:text-indigo-800 hover:underline">
                  Forgot password?
                </a>
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
          <p className="mt-1">Test Credentials: test@investor.com / InvestorPass123</p>
          <p className="mt-4">Note: To create a Supabase user account, please contact admin</p>
        </div>
      </div>
    </div>
  );
}
