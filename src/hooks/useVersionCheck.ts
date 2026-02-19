/**
 * useVersionCheck - Detects new app deployments and prompts reload.
 *
 * On each tab re-activation (visibilitychange -> visible), fetches /version.txt
 * and compares against the version baked into the bundle at build time.
 * If they differ, shows a persistent toast prompting the user to reload.
 */

import { useEffect, useRef } from "react";
import { toast } from "sonner";

const CURRENT_VERSION = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev";

export function useVersionCheck() {
  const hasPrompted = useRef(false);

  useEffect(() => {
    // Skip in development - version.txt doesn't exist
    if (CURRENT_VERSION === "dev") return;

    const checkVersion = async () => {
      if (hasPrompted.current) return;

      try {
        const res = await fetch(`/version.txt?_=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) return;

        const serverVersion = (await res.text()).trim();
        if (serverVersion && serverVersion !== CURRENT_VERSION) {
          hasPrompted.current = true;
          toast("A new version is available", {
            description: "Reload to get the latest updates.",
            action: {
              label: "Reload",
              onClick: () => window.location.reload(),
            },
            duration: Infinity,
          });
        }
      } catch {
        // Network error - ignore silently
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkVersion();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);
}
