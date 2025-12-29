import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEmailVerification, useResendVerificationEmail } from "@/hooks/auth";
import { toast } from "sonner";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { Mail, CheckCircle2, Loader2, XCircle } from "lucide-react";
import AppLogo from "@/components/AppLogo";

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");

  const token = searchParams.get("token");
  const type = searchParams.get("type");
  const tokenHash = type === "email" ? token : null;

  const { isSuccess, isError, isLoading } = useEmailVerification(tokenHash);
  const resendMutation = useResendVerificationEmail();

  useEffect(() => {
    if (isSuccess) {
      setStatus("success");
      toast.success("Email verified successfully!");
      setTimeout(() => navigate("/dashboard"), 2000);
    } else if (isError) {
      setStatus("error");
      toast.error("Failed to verify email");
    }
  }, [isSuccess, isError, navigate]);

  const handleResendEmail = () => {
    resendMutation.mutate(undefined);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-br from-blue-50 to-indigo-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <AppLogo className="h-12" />
          </div>

          {(status === "verifying" || isLoading) && (
            <>
              <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto" />
              <CardTitle className="text-2xl font-bold">Verifying Email</CardTitle>
              <CardDescription>Please wait while we verify your email address...</CardDescription>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto" />
              <CardTitle className="text-2xl font-bold">Email Verified!</CardTitle>
              <CardDescription>
                Your email has been successfully verified. Redirecting you to the dashboard...
              </CardDescription>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="h-16 w-16 text-destructive mx-auto" />
              <CardTitle className="text-2xl font-bold">Verification Failed</CardTitle>
              <CardDescription>
                We couldn't verify your email. The link may have expired or already been used.
              </CardDescription>
            </>
          )}
        </CardHeader>

        {status === "error" && (
          <CardContent className="space-y-4">
            <Button className="w-full" onClick={handleResendEmail} disabled={resendMutation.isPending}>
              {resendMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Resend Verification Email
                </>
              )}
            </Button>

            <Button variant="outline" className="w-full" onClick={() => navigate("/login")}>
              Return to Login
            </Button>
          </CardContent>
        )}

        {status === "verifying" && !isLoading && (
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">
              Haven't received the email?{" "}
              <button
                onClick={handleResendEmail}
                disabled={resendMutation.isPending}
                className="text-primary hover:underline"
              >
                Resend verification email
              </button>
            </p>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
