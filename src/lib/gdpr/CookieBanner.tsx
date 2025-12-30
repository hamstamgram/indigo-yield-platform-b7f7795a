/**
 * Cookie Banner Component
 * GDPR-compliant cookie consent UI
 */

import { useState, useEffect } from 'react';
import { gdprManager } from './GDPRComplianceManager';

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) {
      setVisible(true);
    }
  }, []);

  const handleAccept = async () => {
    await gdprManager.setCookieConsent(true);
    setVisible(false);
  };

  const handleReject = async () => {
    await gdprManager.setCookieConsent(false);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-lg p-4 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">Cookie Notice</h3>
          <p className="text-sm text-muted-foreground">
            We use cookies to improve your experience. By continuing to use our site, you accept our use of cookies.
          </p>
        </div>
        <div className="flex gap-2 ml-4">
          <button
            onClick={handleReject}
            className="px-4 py-2 border border-border rounded hover:bg-muted text-foreground"
          >
            Reject
          </button>
          <button
            onClick={handleAccept}
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
