import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { X, Cookie, Shield, BarChart } from 'lucide-react';
import { initPostHog, shutdownPostHog } from '@/utils/analytics/posthog';
import { initSentry } from '@/utils/monitoring/sentry';

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  performance: boolean;
  timestamp: number;
}

const COOKIE_CONSENT_KEY = 'indigo-cookie-consent';
const COOKIE_CONSENT_EXPIRY = 365 * 24 * 60 * 60 * 1000; // 1 year

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true,
    analytics: false,
    performance: false,
    timestamp: Date.now(),
  });

  useEffect(() => {
    // Check for existing consent
    const savedConsent = localStorage.getItem(COOKIE_CONSENT_KEY);
    
    if (savedConsent) {
      try {
        const parsed = JSON.parse(savedConsent) as CookiePreferences;
        
        // Check if consent is expired
        if (Date.now() - parsed.timestamp > COOKIE_CONSENT_EXPIRY) {
          setShowBanner(true);
        } else {
          // Apply saved preferences
          applyPreferences(parsed);
        }
      } catch {
        setShowBanner(true);
      }
    } else {
      setShowBanner(true);
    }
  }, []);

  const applyPreferences = (prefs: CookiePreferences) => {
    // Initialize or shutdown services based on preferences
    if (prefs.analytics) {
      initPostHog();
    } else {
      shutdownPostHog();
    }

    if (prefs.performance) {
      initSentry();
    }

    // Set cookie with preferences for server-side checking
    document.cookie = `cookie-consent=${JSON.stringify(prefs)}; path=/; max-age=${COOKIE_CONSENT_EXPIRY / 1000}; SameSite=Strict`;
  };

  const savePreferences = () => {
    const updatedPrefs = { ...preferences, timestamp: Date.now() };
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(updatedPrefs));
    applyPreferences(updatedPrefs);
    setShowBanner(false);
    setShowDetails(false);
  };

  const acceptAll = () => {
    const allAccepted: CookiePreferences = {
      necessary: true,
      analytics: true,
      performance: true,
      timestamp: Date.now(),
    };
    setPreferences(allAccepted);
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(allAccepted));
    applyPreferences(allAccepted);
    setShowBanner(false);
  };

  const rejectOptional = () => {
    const onlyNecessary: CookiePreferences = {
      necessary: true,
      analytics: false,
      performance: false,
      timestamp: Date.now(),
    };
    setPreferences(onlyNecessary);
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(onlyNecessary));
    applyPreferences(onlyNecessary);
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background/95 backdrop-blur-sm border-t">
      <div className="container max-w-6xl mx-auto">
        {!showDetails ? (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Cookie className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">Cookie Preferences</h3>
                <p className="text-sm text-muted-foreground">
                  We use cookies to enhance your experience and analyze our platform's performance. 
                  You can customize your preferences or accept all cookies.
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button variant="outline" onClick={() => setShowDetails(true)}>
                Customize
              </Button>
              <Button variant="outline" onClick={rejectOptional}>
                Reject Optional
              </Button>
              <Button onClick={acceptAll}>
                Accept All
              </Button>
            </div>
          </div>
        ) : (
          <Card className="p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold">Cookie Preferences</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowDetails(false)}
                aria-label="Close cookie preferences"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-6">
              {/* Necessary Cookies */}
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <Label htmlFor="necessary" className="text-base font-medium">
                      Necessary Cookies
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Essential for the platform to function properly. These cannot be disabled.
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Includes: Authentication, security tokens, session management
                    </p>
                  </div>
                </div>
                <Switch
                  id="necessary"
                  checked={true}
                  disabled
                  className="mt-1"
                />
              </div>

              {/* Analytics Cookies */}
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <BarChart className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <Label htmlFor="analytics" className="text-base font-medium">
                      Analytics Cookies
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Help us understand how you use our platform to improve your experience.
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Includes: PostHog analytics, usage patterns, feature adoption
                    </p>
                  </div>
                </div>
                <Switch
                  id="analytics"
                  checked={preferences.analytics}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, analytics: checked })
                  }
                  className="mt-1"
                />
              </div>

              {/* Performance Cookies */}
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-purple-600 mt-0.5" />
                  <div>
                    <Label htmlFor="performance" className="text-base font-medium">
                      Performance Cookies
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Monitor platform performance and help us identify and fix issues.
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Includes: Sentry error tracking, performance monitoring, load times
                    </p>
                  </div>
                </div>
                <Switch
                  id="performance"
                  checked={preferences.performance}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, performance: checked })
                  }
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex justify-between items-center mt-6 pt-6 border-t">
              <Link
                to="/privacy-policy"
                className="text-sm text-primary hover:underline"
              >
                Privacy Policy
              </Link>
              <div className="flex gap-2">
                <Button variant="outline" onClick={rejectOptional}>
                  Reject Optional
                </Button>
                <Button onClick={savePreferences}>
                  Save Preferences
                </Button>
              </div>
            </div>
          </Card>
        )}
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
