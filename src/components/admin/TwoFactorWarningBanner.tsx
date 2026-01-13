/**
 * 2FA Warning Banner for Admin Users
 * Shows a warning when admin doesn't have TOTP enabled
 */

import { useState, useEffect } from "react";
import { Shield, X, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth, getTotpStatus } from "@/services/auth";
import { Button } from "@/components/ui";
import { logError } from "@/lib/logger";

export function TwoFactorWarningBanner() {
  const { profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);
  const [totpEnabled, setTotpEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    const checkTotpStatus = async () => {
      try {
        const { status } = await getTotpStatus();
        setTotpEnabled(status === "enabled");
      } catch (error) {
        logError("auth.checkTotpStatus", error);
        setTotpEnabled(false);
      } finally {
        setLoading(false);
      }
    };

    checkTotpStatus();
  }, [isAdmin]);

  // Don't show if: not admin, loading, already has 2FA, or dismissed
  if (!isAdmin || loading || totpEnabled || dismissed) {
    return null;
  }

  return (
    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <Shield className="h-5 w-5 text-destructive" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-destructive">
            Two-Factor Authentication Required
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            As an administrator, you are required to enable 2FA to protect sensitive operations.
            Please set up two-factor authentication to continue using admin features securely.
          </p>
          <div className="mt-3 flex items-center gap-3">
            <Button
              size="sm"
              variant="destructive"
              onClick={() => navigate("/settings/security")}
              className="gap-2"
            >
              Enable 2FA Now
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDismissed(true)}
              className="text-muted-foreground hover:text-foreground"
            >
              Remind me later
            </Button>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
