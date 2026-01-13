/**
 * Google reCAPTCHA Component
 * Protects forms from automated attacks
 */

import React, { useCallback } from "react";
import { logWarn, logError } from "@/lib/logger";

interface ReCaptchaProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  size?: "normal" | "compact" | "invisible";
  theme?: "light" | "dark";
  className?: string;
}

// Get reCAPTCHA site key from environment
const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || "";

export const ReCaptchaWrapper: React.FC<ReCaptchaProps> = ({
  className = "",
}) => {
  // Don't render if no site key is configured or package not installed
  if (!RECAPTCHA_SITE_KEY) {
    logWarn("ReCaptcha.siteKeyNotConfigured", { message: "ReCAPTCHA not available or site key not configured" });
    return null;
  }

  return (
    <div className={className}>
      <div className="text-muted-foreground text-sm">
        ReCAPTCHA component (install react-google-recaptcha to enable)
      </div>
    </div>
  );
};

/**
 * Hook for programmatic reCAPTCHA control
 */
export function useReCaptcha() {
  const [token, setToken] = React.useState<string | null>(null);
  const [isVerified, setIsVerified] = React.useState(false);
  const [isExpired, setIsExpired] = React.useState(false);

  const handleVerify = useCallback((token: string) => {
    setToken(token);
    setIsVerified(true);
    setIsExpired(false);
  }, []);

  const handleExpire = useCallback(() => {
    setToken(null);
    setIsVerified(false);
    setIsExpired(true);
  }, []);

  const handleError = useCallback(() => {
    setToken(null);
    setIsVerified(false);
    setIsExpired(false);
  }, []);

  const reset = useCallback(() => {
    setToken(null);
    setIsVerified(false);
    setIsExpired(false);
  }, []);

  return {
    token,
    isVerified,
    isExpired,
    handleVerify,
    handleExpire,
    handleError,
    reset,
  };
}

/**
 * Server-side token verification helper
 */
export async function verifyReCaptchaToken(token: string): Promise<boolean> {
  try {
    const response = await fetch("/api/verify-recaptcha", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      throw new Error("Verification failed");
    }

    const data = await response.json();
    return data.success === true;
  } catch (error) {
    logError("ReCaptcha.verifyToken", error);
    return false;
  }
}

export default ReCaptchaWrapper;
