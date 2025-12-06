import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  reply_to?: string;
  email_type?: string; // Metadata for logs
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not set");
    }

    const { to, subject, html, from, reply_to, email_type }: EmailRequest = await req.json();

    // Default sender if not provided
    const sender = from || "Indigo Yield Platform <noreply@indigoyield.com>";

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: sender,
        to,
        subject,
        html,
        reply_to,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      // Log failure if possible
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const recipients = Array.isArray(to) ? to : [to];

      for (const recipient of recipients) {
        await supabase.from("email_logs").insert({
          recipient: recipient,
          subject: subject,
          status: "failed",
          error: JSON.stringify(data),
          metadata: { email_type },
          sent_at: new Date().toISOString(),
        });
      }

      return new Response(JSON.stringify({ error: data }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log Success
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const recipients = Array.isArray(to) ? to : [to];

    for (const recipient of recipients) {
      await supabase.from("email_logs").insert({
        recipient: recipient, // Schema uses 'recipient' not 'recipient_email' based on migration
        subject: subject,
        status: "sent",
        message_id: data.id,
        metadata: { email_type },
        sent_at: new Date().toISOString(),
      });
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
