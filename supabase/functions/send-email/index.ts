import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { sendEmailRequestSchema, parseAndValidate } from "../_shared/validation.ts";
import { checkAdminAccess, createAdminDeniedResponse } from "../_shared/admin-check.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Allowed sender domains for security
const ALLOWED_SENDER_DOMAINS = ["indigo.fund", "indigoyield.com"];

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not set");
    }

    // ========================================
    // SECURITY FIX: Require admin authorization
    // ========================================
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[send-email] Missing authorization header");
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify the user's JWT token
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      console.error("[send-email] Invalid token:", authError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized - invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is admin via user_roles table (secure method)
    const adminCheck = await checkAdminAccess(supabaseAuth, user.id);
    if (!adminCheck.isAdmin) {
      console.error("[send-email] Non-admin attempted to send email:", user.email);
      return createAdminDeniedResponse(corsHeaders);
    }

    console.log("[send-email] Admin authorized:", adminCheck.email || user.email);

    // Validate request body
    const validation = await parseAndValidate(req, sendEmailRequestSchema, corsHeaders);
    if (!validation.success) {
      return validation.response;
    }

    const { to, subject, html, from, reply_to, email_type } = validation.data;

    // ========================================
    // SECURITY FIX: Validate sender domain
    // ========================================
    const sender = from || "Indigo Yield Platform <noreply@indigo.fund>";

    // Extract domain from sender email
    const senderMatch = sender.match(/<([^>]+)>/) || sender.match(/([^\s]+@[^\s]+)/);
    if (senderMatch) {
      const senderEmail = senderMatch[1] || senderMatch[0];
      const senderDomain = senderEmail.split("@")[1]?.toLowerCase();

      if (senderDomain && !ALLOWED_SENDER_DOMAINS.some((d) => senderDomain.endsWith(d))) {
        console.error("[send-email] Invalid sender domain:", senderDomain);
        return new Response(
          JSON.stringify({ error: "Invalid sender domain. Only approved domains are allowed." }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

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

    // Create Supabase client for logging
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const recipients = Array.isArray(to) ? to : [to];

    if (!res.ok) {
      console.error("[send-email] Resend API error:", data);

      // Log failure
      for (const recipient of recipients) {
        await supabase.from("email_logs").insert({
          recipient: recipient,
          subject: subject,
          status: "failed",
          error: JSON.stringify(data),
          metadata: { email_type, sent_by: user.id },
          sent_at: new Date().toISOString(),
        });
      }

      return new Response(JSON.stringify({ error: data }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[send-email] Email sent successfully to:", recipients.join(", "));

    // Log Success
    for (const recipient of recipients) {
      await supabase.from("email_logs").insert({
        recipient: recipient,
        subject: subject,
        status: "sent",
        message_id: data.id,
        metadata: { email_type, sent_by: user.id },
        sent_at: new Date().toISOString(),
      });
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[send-email] Unexpected error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
