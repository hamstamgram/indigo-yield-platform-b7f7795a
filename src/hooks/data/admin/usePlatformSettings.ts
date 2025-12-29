/**
 * Platform Settings Hooks
 * React Query hooks for admin platform settings
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/queryKeys";
import {
  systemConfigService,
  PlatformSettings,
  defaultPlatformSettings,
} from "@/services/shared/systemConfigService";

/**
 * Hook to fetch platform settings
 */
export function usePlatformSettings() {
  return useQuery<PlatformSettings>({
    queryKey: QUERY_KEYS.platformSettings,
    queryFn: () => systemConfigService.getPlatformSettings(),
  });
}

/**
 * Hook to manage platform settings with local state
 */
export function usePlatformSettingsForm() {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<PlatformSettings>(defaultPlatformSettings);

  const { data, isLoading, error } = usePlatformSettings();

  // Sync local state with fetched data
  useEffect(() => {
    if (data) {
      setSettings(data);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (newSettings: PlatformSettings) =>
      systemConfigService.savePlatformSettings(newSettings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.platformSettings });
    },
  });

  const handleSave = () => {
    return saveMutation.mutateAsync(settings);
  };

  return {
    settings,
    setSettings,
    isLoading,
    error,
    saveMutation,
    handleSave,
    isSaving: saveMutation.isPending,
  };
}

// Re-export types
export type { PlatformSettings };
export { defaultPlatformSettings };
