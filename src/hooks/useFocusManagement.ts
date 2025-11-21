import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Hook to manage focus on route changes for accessibility
 */
export function useFocusManagement() {
  const location = useLocation();

  useEffect(() => {
    // Focus main content on route change
    const mainContent = document.getElementById("main-content");
    if (mainContent) {
      mainContent.setAttribute("tabindex", "-1");
      mainContent.focus();
      mainContent.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [location.pathname]);
}
