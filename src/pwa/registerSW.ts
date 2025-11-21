// Service Worker Registration for Indigo Yield Platform

export interface ServiceWorkerRegistrationResult {
  registration: ServiceWorkerRegistration | null;
  error: Error | null;
}

// Simple registration function for quick setup
export async function registerSW() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    // Optional: update flow
    if (reg && reg.waiting) {
      // Implement a simple update notifier if desired
      console.info("Service worker waiting; update available.");
    }
  } catch (e) {
    console.error("SW registration failed", e);
  }
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistrationResult> {
  // Check if service workers are supported
  if (!("serviceWorker" in navigator)) {
    console.log("[PWA] Service Workers not supported");
    return {
      registration: null,
      error: new Error("Service Workers not supported"),
    };
  }

  // Only register in production or with HTTPS
  if (window.location.protocol !== "https:" && window.location.hostname !== "localhost") {
    console.log("[PWA] Service Worker requires HTTPS");
    return {
      registration: null,
      error: new Error("Service Worker requires HTTPS"),
    };
  }

  try {
    // Register the service worker
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });

    console.log("[PWA] Service Worker registered successfully", registration);

    // Check for updates periodically
    setInterval(() => {
      registration.update();
    }, 60000); // Check every minute

    // Handle updates
    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener("statechange", () => {
        if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
          // New service worker available
          console.log("[PWA] New service worker available");

          // Dispatch custom event for update notification
          window.dispatchEvent(
            new CustomEvent("swUpdate", {
              detail: { registration },
            })
          );
        }
      });
    });

    return { registration, error: null };
  } catch (error) {
    console.error("[PWA] Service Worker registration failed:", error);
    return {
      registration: null,
      error: error as Error,
    };
  }
}

// Handle service worker messages
export function setupServiceWorkerMessaging() {
  if (!("serviceWorker" in navigator)) return;

  navigator.serviceWorker.addEventListener("message", (event) => {
    console.log("[PWA] Message from service worker:", event.data);

    // Handle different message types
    switch (event.data.type) {
      case "CACHE_UPDATED":
        console.log("[PWA] Cache updated");
        break;
      case "OFFLINE":
        console.log("[PWA] App is offline");
        break;
      case "ONLINE":
        console.log("[PWA] App is back online");
        break;
      default:
        break;
    }
  });
}

// Skip waiting and reload
export async function skipWaitingAndReload() {
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration?.waiting) return;

  // Tell the waiting service worker to skip waiting
  registration.waiting.postMessage({ type: "SKIP_WAITING" });

  // Reload once the new service worker is active
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    window.location.reload();
  });
}

// Unregister service worker (for development/debugging)
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!("serviceWorker" in navigator)) return false;

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      const success = await registration.unregister();
      console.log("[PWA] Service Worker unregistered:", success);
      return success;
    }
    return false;
  } catch (error) {
    console.error("[PWA] Failed to unregister service worker:", error);
    return false;
  }
}

// Check if app is installed
export function isAppInstalled(): boolean {
  // Check for display mode
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches;

  // Check for iOS standalone mode
  const isIOSStandalone = (window.navigator as any).standalone === true;

  return isStandalone || isIOSStandalone;
}

// Request persistent storage
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) {
    console.log("[PWA] Persistent storage not supported");
    return false;
  }

  try {
    const isPersisted = await navigator.storage.persist();
    console.log("[PWA] Persistent storage:", isPersisted ? "granted" : "denied");
    return isPersisted;
  } catch (error) {
    console.error("[PWA] Failed to request persistent storage:", error);
    return false;
  }
}

// Get storage estimate
export async function getStorageEstimate() {
  if (!navigator.storage?.estimate) {
    console.log("[PWA] Storage estimate not supported");
    return null;
  }

  try {
    const estimate = await navigator.storage.estimate();
    const percentUsed =
      estimate.usage && estimate.quota ? (estimate.usage / estimate.quota) * 100 : 0;

    return {
      usage: estimate.usage || 0,
      quota: estimate.quota || 0,
      percentUsed: Math.round(percentUsed * 100) / 100,
    };
  } catch (error) {
    console.error("[PWA] Failed to get storage estimate:", error);
    return null;
  }
}
