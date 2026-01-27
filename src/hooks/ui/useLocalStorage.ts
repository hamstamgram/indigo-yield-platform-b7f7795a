import { useState, useEffect, useCallback } from "react";
import { logError } from "@/lib/logger";

/**
 * Hook for syncing state with localStorage
 * Automatically handles JSON serialization and SSR
 *
 * @param key - localStorage key
 * @param initialValue - Initial value if key doesn't exist
 * @returns [value, setValue, removeValue]
 *
 * @example
 * const [user, setUser, removeUser] = useLocalStorage('user', null);
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void, () => void] {
  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      logError("useLocalStorage.load", error, { key });
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that persists to localStorage
  // Uses functional state update to avoid stale closure issues
  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        // Use functional update to get latest value and avoid stale closures
        setStoredValue((prevValue) => {
          const valueToStore = value instanceof Function ? value(prevValue) : value;

          // Save to localStorage
          if (typeof window !== "undefined") {
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
          }

          return valueToStore;
        });
      } catch (error) {
        logError("useLocalStorage.set", error, { key });
      }
    },
    [key]
  );

  // Remove from localStorage
  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(key);
      }
    } catch (error) {
      logError("useLocalStorage.remove", error, { key });
    }
  }, [key, initialValue]);

  // Listen for changes in other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        try {
          setStoredValue(JSON.parse(e.newValue));
        } catch (error) {
          logError("useLocalStorage.storageEvent", error, { key });
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [key]);

  return [storedValue, setValue, removeValue];
}
