import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Secure CORS configuration
const allowedOrigins = Deno.env.get("ALLOWED_ORIGINS")?.split(",") || [];
const corsHeaders = (origin: string | null) => ({
  "Access-Control-Allow-Origin":
    origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-csrf-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
});

interface EmailRequest {
  to: string;
  subject: string;
  template: "statement_ready" | "withdrawal_status" | "welcome" | "admin_notification";
  data: Record<string, any>;
}

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  try {
    // CSRF validation for state-changing operations
    const csrfToken = req.headers.get("x-csrf-token");
    if (!csrfToken || csrfToken.length < 32) {
      return new Response(JSON.stringify({ success: false, error: "Invalid CSRF token" }), {
        headers: { ...headers, "Content-Type": "application/json" },
        status: 403,
      });
    }
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { to, subject, template, data }: EmailRequest = await req.json();

    // Email templates
    const templates = {
      statement_ready: {
        subject: subject || "Your Monthly Statement is Ready",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #4F46E5;">Monthly Statement Available</h1>
            <p>Dear ${data.name},</p>
            <p>Your statement for ${data.period} is now available in your account.</p>
            <div style="margin: 20px 0;">
              <a href="${data.link}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Statement</a>
            </div>
            <p>Best regards,<br/>The Indigo Yield Team</p>
          </div>
        `,
      },
      withdrawal_status: {
        subject: subject || "Withdrawal Request Update",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #4F46E5;">Withdrawal Request ${data.status}</h1>
            <p>Dear ${data.name},</p>
            <p>Your withdrawal request for ${data.amount} has been ${data.status.toLowerCase()}.</p>
            ${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ""}
            ${data.reference ? `<p><strong>Reference:</strong> ${data.reference}</p>` : ""}
            <p>Best regards,<br/>The Indigo Yield Team</p>
          </div>
        `,
      },
      welcome: {
        subject: subject || "Welcome to Indigo Yield",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #4F46E5;">Welcome to Indigo Yield!</h1>
            <p>Dear ${data.name},</p>
            <p>Your account has been successfully created. You can now access your portfolio and start tracking your investments.</p>
            <div style="margin: 20px 0;">
              <a href="${data.loginLink}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Access Your Account</a>
            </div>
            <p>Best regards,<br/>The Indigo Yield Team</p>
          </div>
        `,
      },
      admin_notification: {
        subject: subject || "Admin Notification",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #DC2626;">Admin Notification</h1>
            <p>Dear Admin,</p>
            <p>${data.message}</p>
            ${data.details ? `<div style="background: #F3F4F6; padding: 15px; margin: 15px 0; border-radius: 6px;"><pre>${JSON.stringify(data.details, null, 2)}</pre></div>` : ""}
            <p>Please review and take appropriate action.</p>
            <p>System Notification</p>
          </div>
        `,
      },
    };

    const templateConfig = templates[template];
    if (!templateConfig) {
      throw new Error(`Template '${template}' not found`);
    }

    const emailResponse = await resend.emails.send({
      from: "Indigo Yield <notifications@indigo.fund>",
      to: [to],
      subject: templateConfig.subject,
      html: templateConfig.html,
    });

    console.log("Email sent successfully:", emailResponse);

    // Log email in database
    await supabaseClient.from("email_logs").insert({
      to: to,
      subject: templateConfig.subject,
      template: template,
      sent_by: user.id,
      sent_at: new Date().toISOString(),
      status: "sent",
    });

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...headers },
    });
  } catch (error: any) {
    console.error("Error in send-notification-email function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...headers },
    });
  }
};

serve(handler);
