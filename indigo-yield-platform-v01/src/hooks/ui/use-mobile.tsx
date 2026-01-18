import * as React from "react";

/**
 * Mobile breakpoint - MUST match Tailwind's `lg:` breakpoint (1024px)
 * The Sidebar component uses `lg:` CSS classes for responsive behavior,
 * so this hook must use the same breakpoint to avoid display issues.
 *
 * Previously used 768px which caused menu bar visibility issues at
 * screen widths 768-1023px where JS thought it was desktop but CSS
 * still applied mobile styles.
 */
const MOBILE_BREAKPOINT = 1024;

export function useIsMobile() {
  // Initialize to true to prevent hydration mismatch and flash of incorrect state
  // Server/initial render assumes mobile, then updates on client
  const [isMobile, setIsMobile] = React.useState<boolean>(true);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    // Immediately set correct value on mount
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
