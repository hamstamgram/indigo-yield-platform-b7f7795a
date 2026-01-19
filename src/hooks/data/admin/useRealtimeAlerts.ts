/**
 * useRealtimeAlerts - Real-time subscription to admin_alerts table
 * Provides live push notifications for integrity violations and system alerts
 */

import { useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { QUERY_KEYS } from "@/constants/queryKeys";

interface AlertPayload {
  new: {
    id: string;
    alert_type: string;
    severity: string;
    title: string;
    message: string | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
  };
}

/**
 * Subscribe to real-time admin alerts
 * Shows toast notifications and invalidates relevant queries
 */
export function useRealtimeAlerts() {
  const queryClient = useQueryClient();

  const showAlertToast = useCallback((payload: AlertPayload) => {
    const { title, message, severity } = payload.new;
    
    const toastOptions = {
      description: message || undefined,
      duration: severity === 'error' ? 10000 : 5000,
    };

    switch (severity) {
      case 'error':
        toast.error(title, toastOptions);
        break;
      case 'warning':
        toast.warning(title, toastOptions);
        break;
      default:
        toast.info(title, toastOptions);
    }
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('admin-alerts-realtime')
      .on(
        'postgres_changes' as unknown as "system",
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_alerts',
        },
        (payload: AlertPayload) => {
          // Show toast immediately
          showAlertToast(payload);
          
          // Invalidate alerts query to update UI
          queryClient.invalidateQueries({ queryKey: ['admin-alerts'] });
          
          // Invalidate integrity dashboard
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.integrityDashboard });
          
          // Invalidate integrity runs
          queryClient.invalidateQueries({ queryKey: ['admin-integrity-runs'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, showAlertToast]);
}

/**
 * Hook to fetch unacknowledged alerts count
 */
export function useUnacknowledgedAlertCount() {
  const queryClient = useQueryClient();
  
  // This can be used by components to show badge count
  // The actual count comes from the admin-alerts query
  
  return {
    invalidate: () => queryClient.invalidateQueries({ queryKey: ['admin-alerts'] })
  };
}
