/**
 * Secure wrapper for Supabase function invocations
 * Automatically includes CSRF tokens and handles errors
 */

import { supabase } from "@/integrations/supabase/client";
import { addCsrfHeader } from "@/lib/security/csrf";

export async function invokeFunction<T = any>(
  functionName: string,
  body?: Record<string, any>,
  options?: {
    headers?: Record<string, string>;
  }
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.functions.invoke<T>(functionName, {
      body,
      headers: addCsrfHeader(options?.headers || {}),
    });

    if (error) {
      console.error(`Function ${functionName} error:`, error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error(`Function ${functionName} exception:`, error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error("Unknown error"),
    };
  }
}
