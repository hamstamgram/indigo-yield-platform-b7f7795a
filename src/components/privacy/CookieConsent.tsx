import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui";
import { initPostHog, shutdownPostHog } from "@/utils/analytics/posthog";

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  performance: boolean;
  timestamp: number;
}

const COOKIE_CONSENT_KEY = "indigo-cookie-consent";
const COOKIE_CONSENT_EXPIRY = 365 * 24 * 60 * 60 * 1000; // 1 year
const AUTO_DISMISS_MS = 12000;

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const savedConsent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (savedConsent) {
      try {
        const parsed = JSON.parse(savedConsent) as CookiePreferences;
        if (Date.now() - parsed.timestamp > COOKIE_CONSENT_EXPIRY) {
          setShowBanner(true);
        } else {
          applyPreferences(parsed);
        }
      } catch {
        setShowBanner(true);
      }
    } else {
      setShowBanner(true);
    }
  }, []);

  // Animate in when showBanner becomes true
  useEffect(() => {
    if (showBanner) {
      // Small delay so the CSS transition fires
      const t = setTimeout(() => setVisible(true), 50);

      // Auto-dismiss after 12s
      timerRef.current = setTimeout(() => {
        dismiss();
      }, AUTO_DISMISS_MS);

      return () => {
        clearTimeout(t);
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }
  }, [showBanner]);

  const applyPreferences = (prefs: CookiePreferences) => {
    if (prefs.analytics) {
      initPostHog();
    } else {
      shutdownPostHog();
    }
    document.cookie = `cookie-consent=${JSON.stringify(prefs)}; path=/; max-age=${COOKIE_CONSENT_EXPIRY / 1000}; SameSite=Strict`;
  };

  const dismiss = () => {
    setVisible(false);
    setTimeout(() => setShowBanner(false), 350); // wait for slide-out
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const accept = () => {
    const prefs: CookiePreferences = {
      necessary: true,
      analytics: true,
      performance: true,
      timestamp: Date.now(),
    };
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(prefs));
    applyPreferences(prefs);
    dismiss();
  };

  const decline = () => {
    const prefs: CookiePreferences = {
      necessary: true,
      analytics: false,
      performance: false,
      timestamp: Date.now(),
    };
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(prefs));
    applyPreferences(prefs);
    dismiss();
  };

  if (!showBanner) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 w-72 bg-card border border-border/50 rounded-xl p-4 shadow-lg transition-all duration-350"
      style={{
        transform: visible ? "translateY(0)" : "translateY(calc(100% + 1rem))",
        opacity: visible ? 1 : 0,
      }}
    >
      <p className="text-sm text-foreground/80 leading-snug">
        We use cookies to improve your experience.
      </p>
      <div className="flex gap-2 mt-3">
        <Button size="sm" onClick={accept} className="flex-1 h-8 text-xs">
          Accept
        </Button>
        <Button size="sm" variant="outline" onClick={decline} className="flex-1 h-8 text-xs">
          Decline
        </Button>
      </div>
    </div>
  );
}

// Helper hook to check consent status
export function useCookieConsent() {
  const [consent, setConsent] = useState<CookiePreferences | null>(null);

  useEffect(() => {
    const savedConsent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (savedConsent) {
      try {
        setConsent(JSON.parse(savedConsent));
      } catch {
        setConsent(null);
      }
    }
  }, []);

  return {
    hasConsent: consent !== null,
    analyticsEnabled: consent?.analytics || false,
    performanceEnabled: consent?.performance || false,
  };
}
