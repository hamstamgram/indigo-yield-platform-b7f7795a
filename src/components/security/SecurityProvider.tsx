import React, { createContext, useContext, useEffect, useState } from "react";
import { applySecurityHeaders, generateCSRFToken, validateCSRFToken } from "@/lib/security/headers";
import { auditLogService } from "@/services/shared";
import { supabase } from "@/integrations/supabase/client";
import { logWarn, logInfo } from "@/lib/logger";

interface SecurityContextType {
  csrfToken: string;
  validateRequest: (token?: string) => boolean;
  refreshCSRF: () => string;
  logSecurityEvent: (eventType: string, details?: any) => Promise<void>;
}

const SecurityContext = createContext<SecurityContextType>({
  csrfToken: "",
  validateRequest: () => false,
  refreshCSRF: () => "",
  logSecurityEvent: async () => {},
});

export const useSecurity = () => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error("useSecurity must be used within a SecurityProvider");
  }
  return context;
};

export const SecurityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [csrfToken, setCsrfToken] = useState("");

  useEffect(() => {
    // Apply security headers on mount
    applySecurityHeaders();

    // Generate initial CSRF token
    const token = generateCSRFToken();
    setCsrfToken(token);

    // Log application start
    logSecurityEvent("APP_START", {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    });

    // Set up security monitoring - log to console only, not DB (to avoid flooding audit_log)
    const handleSecurityViolation = (event: SecurityPolicyViolationEvent) => {
      logWarn("SecurityProvider.cspViolation", {
        violatedDirective: event.violatedDirective,
        blockedURI: event.blockedURI,
        documentURI: event.documentURI,
      });
    };

    document.addEventListener("securitypolicyviolation", handleSecurityViolation);

    return () => {
      document.removeEventListener("securitypolicyviolation", handleSecurityViolation);
    };
  }, []);

  const validateRequest = (token?: string): boolean => {
    if (!token) return false;
    return validateCSRFToken(token);
  };

  const refreshCSRF = (): string => {
    const newToken = generateCSRFToken();
    setCsrfToken(newToken);
    return newToken;
  };

  const logSecurityEvent = async (eventType: string, details?: any): Promise<void> => {
    try {
      // Log via structured logger and optionally to audit_log table
      logInfo(`SecurityProvider.${eventType}`, details);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await auditLogService.logEvent({
          actorUserId: user.id,
          action: eventType,
          entity: "security",
          meta: details || {},
        });
      }
    } catch (error) {
      logWarn("SecurityProvider.logSecurityEvent", { error: error instanceof Error ? error.message : error });
    }
  };

  const value = {
    csrfToken,
    validateRequest,
    refreshCSRF,
    logSecurityEvent,
  };

  return <SecurityContext.Provider value={value}>{children}</SecurityContext.Provider>;
};
