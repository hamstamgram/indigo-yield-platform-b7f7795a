/**
 * useTabFromUrl Hook
 * Persists active tab state in URL search params for shareable, bookmarkable tabbed views.
 * Compatible with shadcn/ui Tabs component via value + onValueChange.
 */

import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

interface UseTabFromUrlOptions {
  /** URL param name (default: "tab") */
  paramName?: string;
  /** Default tab value when param is absent */
  defaultTab: string;
}

export function useTabFromUrl({ paramName = "tab", defaultTab }: UseTabFromUrlOptions) {
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = useMemo(
    () => searchParams.get(paramName) ?? defaultTab,
    [searchParams, paramName, defaultTab]
  );

  const setActiveTab = useCallback(
    (tab: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (tab === defaultTab) {
            next.delete(paramName);
          } else {
            next.set(paramName, tab);
          }
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams, paramName, defaultTab]
  );

  return { activeTab, setActiveTab } as const;
}

export default useTabFromUrl;
