import { supabase } from "@/integrations/supabase/client";

export async function sendPasswordResetEmail(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return { success: true };
}
