import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminInviteService } from "@/services/admin/adminInviteService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logError, logInfo } from "@/lib/logger";

/**
 * AdminInviteCallback
 * Handles the redirect after a user clicks the Supabase Auth invite magic link.
 * The database trigger will automatically assign the admin role.
 */
export default function AdminInviteCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Setting up your admin account...");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the current session - Supabase should have processed the magic link
        const {
          data: { session },
          error: sessionError,
        } = await adminInviteService.getSession();

        if (sessionError) {
          logError("AdminInviteCallback.sessionError", sessionError);
          setStatus("error");
          setMessage("Failed to verify your session. Please try again.");
          return;
        }

        if (!session) {
          // Try to get session from URL hash (magic link)
          const {
            data: { session: urlSession },
            error: urlError,
          } = await adminInviteService.getSession();

          if (urlError || !urlSession) {
            logError("AdminInviteCallback.noSession", urlError);
            setStatus("error");
            setMessage("Invalid or expired invite link. Please request a new invite.");
            return;
          }
        }

        // Session exists - the database trigger should have assigned the role
        logInfo("AdminInviteCallback.sessionEstablished", { email: session?.user?.email });

        // Brief delay to ensure trigger has executed
        await new Promise((resolve) => setTimeout(resolve, 1000));

        setStatus("success");
        setMessage("Welcome! Your admin account has been activated.");

        // Redirect to admin dashboard after a moment
        setTimeout(() => {
          navigate("/admin/dashboard", { replace: true });
        }, 2000);
      } catch (error) {
        logError("AdminInviteCallback.callbackError", error);
        setStatus("error");
        setMessage("An unexpected error occurred. Please try again.");
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {status === "loading" && (
              <>
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span>Processing Invite</span>
              </>
            )}
            {status === "success" && (
              <>
                <CheckCircle className="h-6 w-6 text-green-500" />
                <span>Account Activated</span>
              </>
            )}
            {status === "error" && (
              <>
                <XCircle className="h-6 w-6 text-destructive" />
                <span>Invitation Error</span>
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">{message}</p>

          {status === "success" && (
            <p className="text-sm text-muted-foreground">Redirecting to dashboard...</p>
          )}

          {status === "error" && (
            <Button onClick={() => navigate("/login")} variant="outline">
              Go to Login
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
