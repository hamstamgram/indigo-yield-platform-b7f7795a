/**
 * Secure wrapper for Supabase function invocations
 * Automatically includes CSRF tokens and handles errors
 */

import { supabase } from "@/integrations/supabase/client";
import { addCsrfHeader } from "@/lib/security/csrf";
import { logError } from "@/lib/logger";

export async function invokeFunction<T = any>(
  functionName: string,
  body?: Record<string, any>,
  options?: {
    headers?: Record<string, string>;
  }
): Promise<{ data: T | null; error: Error | null }> {
  try {
    // Verify session before invoking protected functions
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return {
        data: null,
        error: new Error("Session expired. Please log in again."),
      };
    }

    const { data, error } = await supabase.functions.invoke<T>(functionName, {
      body,
      headers: addCsrfHeader(options?.headers || {}),
    });

    if (error) {
      logError("invokeFunction", error, { functionName });

      // Improve error message for network failures
      if (error.message?.includes("Failed to send") || error.message?.includes("fetch")) {
        return {
          data: null,
          error: new Error(`Unable to reach ${functionName}. Please check your connection.`),
        };
      }

      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    logError("invokeFunction", error, { functionName });
    return {
      data: null,
      error: error instanceof Error ? error : new Error("Unknown error"),
    };
  }
}
