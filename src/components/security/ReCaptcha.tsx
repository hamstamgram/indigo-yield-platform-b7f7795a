/**
 * Google reCAPTCHA Component
 * Protects forms from automated attacks
 */

import React, { useCallback, useRef } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { useToast } from "@/hooks/use-toast";

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
  onVerify,
  onExpire,
  onError,
  size = "normal",
  theme = "light",
  className = "",
}) => {
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const { toast } = useToast();

  const handleChange = useCallback(
    (token: string | null) => {
      if (token) {
        onVerify(token);
      }
    },
    [onVerify]
  );

  const handleExpired = useCallback(() => {
    if (onExpire) {
      onExpire();
    }
    toast({
      title: "Verification Expired",
      description: "Please complete the CAPTCHA again.",
      variant: "default",
    });
  }, [onExpire, toast]);

  const handleError = useCallback(() => {
    if (onError) {
      onError();
    }
    toast({
      title: "Verification Error",
      description: "Unable to verify CAPTCHA. Please try again.",
      variant: "destructive",
    });
  }, [onError, toast]);

  // Don't render if no site key is configured
  if (!RECAPTCHA_SITE_KEY) {
    console.warn("ReCAPTCHA site key not configured");
    return null;
  }

  return (
    <div className={className}>
      <ReCAPTCHA
        ref={recaptchaRef}
        sitekey={RECAPTCHA_SITE_KEY}
        onChange={handleChange}
        onExpired={handleExpired}
        onErrored={handleError}
        size={size}
        theme={theme}
      />
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
    // This should be called from an Edge Function or API route
    // Never expose the secret key to the client
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
    console.error("ReCAPTCHA verification error:", error);
    return false;
  }
}

export default ReCaptchaWrapper;
