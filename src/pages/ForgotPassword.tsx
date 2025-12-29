import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Button, Input,
  Card, CardContent, CardHeader, CardTitle,
  Alert, AlertDescription,
} from "@/components/ui";
import { Mail, ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react";
import { useRequestPasswordReset } from "@/hooks/data/useAuthFlow";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const resetMutation = useRequestPasswordReset();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMutation.mutate(email, {
      onSuccess: () => setSent(true),
    });
  };

  if (sent) {
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
          <Card className="border shadow-md">
            <CardHeader>
              <CardTitle className="text-center text-2xl">Check Your Email</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="flex justify-center">
                <CheckCircle2 className="h-16 w-16 text-green-500" />
              </div>
              <p className="text-muted-foreground">
                We've sent a password reset link to <strong>{email}</strong>
              </p>
              <p className="text-sm text-muted-foreground">
                If you don't see the email, check your spam folder.
              </p>
              <div className="pt-4">
                <Link to="/login">
                  <Button variant="outline" className="w-full">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Login
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
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
        <Card className="border shadow-md">
          <CardHeader>
            <CardTitle className="text-center text-2xl">Reset Password</CardTitle>
          </CardHeader>
          <CardContent>
            {resetMutation.error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{resetMutation.error.message}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="pt-2 space-y-3">
                <Button type="submit" className="w-full" disabled={resetMutation.isPending}>
                  {resetMutation.isPending ? (
                    <span className="flex items-center">
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Sending...
                    </span>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>

                <Link to="/login">
                  <Button variant="outline" className="w-full">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Login
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>Investor Portal - Secure Password Recovery</p>
        </div>
      </div>
    </div>
  );
}
