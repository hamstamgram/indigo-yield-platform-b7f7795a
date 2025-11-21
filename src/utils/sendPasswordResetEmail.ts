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

// Send to hammadou@indigo.fund
sendPasswordResetEmail("hammadou@indigo.fund")
  .then(() => console.log("✅ Password reset email sent to hammadou@indigo.fund"))
  .catch((err) => console.error("❌ Error:", err.message));
