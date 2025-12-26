import { useCallback } from "react";
import { useLocalStorage } from "./useLocalStorage";

/**
 * Hook to manage inline management mode toggle with localStorage persistence
 * When ON: clicking investor opens drawer with full management capabilities
 * When OFF: clicking investor navigates to full profile page
 */
export function useInlineManagementToggle() {
  const [isInlineMode, setIsInlineMode] = useLocalStorage<boolean>(
    "investor-inline-management-mode",
    true // Default to inline mode for better UX
  );

  const toggleMode = useCallback(() => {
    setIsInlineMode((prev) => !prev);
  }, [setIsInlineMode]);

  return {
    isInlineMode,
    setIsInlineMode,
    toggleMode,
  };
}
