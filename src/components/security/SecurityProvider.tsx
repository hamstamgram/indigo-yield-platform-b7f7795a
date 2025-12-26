import React, { createContext, useContext, useEffect, useState } from "react";
import { applySecurityHeaders, generateCSRFToken, validateCSRFToken } from "@/lib/security/headers";
import { auditLogService } from "@/services/shared";
import { supabase } from "@/integrations/supabase/client";

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
      console.warn("[CSP Violation]", {
        violatedDirective: event.violatedDirective,
        blockedURI: event.blockedURI,
        documentURI: event.documentURI,
        timestamp: new Date().toISOString(),
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
      // Log to console and optionally to audit_log table
      console.log(`[Security Event] ${eventType}:`, details);
      
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
      console.warn("Failed to log security event:", error);
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
