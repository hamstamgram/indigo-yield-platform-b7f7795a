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
  template:
    | "statement_ready"
    | "withdrawal_status"
    | "welcome"
    | "admin_notification"
    | "deposit_confirmed"
    | "yield_distributed";
  data: Record<string, any>;
}

import { generateUnifiedEmailHtml } from "../_shared/email-layout.ts";

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  try {
    // CSRF defense: JWT bearer token + CORS origin validation.
    // No separate CSRF token needed for API-only endpoints with Authorization headers.
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

    // institutional Gating: Check user preferences
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("preferences, email")
      .eq("email", to)
      .single();

    if (profile) {
      const prefs = profile.preferences as any;
      const isEmailEnabled = prefs?.notifications?.email !== false;
      const isTypeEnabled = prefs?.notifications?.[template] !== false;

      if (!isEmailEnabled || !isTypeEnabled) {
        console.log(`Skipping email to ${to}: Preference disabled for ${template}`);
        return new Response(JSON.stringify({ success: true, message: "Skipped due to preferences" }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...headers },
        });
      }
    }

    // Email templates - Inner content only
    const templates = {
      statement_ready: {
        title: "Account Statement",
        subject: subject || "Your Monthly Statement is Ready",
        html: `
            <p style="color: #4F46E5; font-size: 18px; font-weight: 600; margin-top: 0;">Monthly Statement Available</p>
            <p>Dear ${data.name},</p>
            <p>Your statement for ${data.period} is now available in your account.</p>
            <div style="margin: 24px 0;">
              <a href="${data.link}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">View Statement</a>
            </div>
            <p>Best regards,<br/>The Indigo Yield Team</p>
        `,
      },
      withdrawal_status: {
        title: "Withdrawal Update",
        subject: subject || "Withdrawal Request Update",
        html: `
            <p style="color: #4F46E5; font-size: 18px; font-weight: 600; margin-top: 0;">Withdrawal Request ${data.status}</p>
            <p>Dear ${data.name},</p>
            <p>Your withdrawal request for ${data.amount} has been ${data.status.toLowerCase()}.</p>
            ${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ""}
            ${data.reference ? `<p><strong>Reference:</strong> ${data.reference}</p>` : ""}
            <p>Best regards,<br/>The Indigo Yield Team</p>
        `,
      },
      welcome: {
        title: "Welcome to Indigo",
        subject: subject || "Welcome to Indigo Yield",
        html: `
            <p style="color: #4F46E5; font-size: 18px; font-weight: 600; margin-top: 0;">Account Created</p>
            <p>Dear ${data.name},</p>
            <p>Your account has been successfully created. You can now access your portfolio and start tracking your investments.</p>
            <div style="margin: 24px 0;">
              <a href="${data.loginLink}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Access Your Account</a>
            </div>
            <p>Best regards,<br/>The Indigo Yield Team</p>
        `,
      },
      admin_notification: {
        title: "System Alert",
        subject: subject || "Admin Notification",
        html: `
            <p style="color: #DC2626; font-size: 18px; font-weight: 600; margin-top: 0;">Action Required</p>
            <p>Dear Admin,</p>
            <p>${data.message}</p>
            ${data.details ? `<div style="background: #F3F4F6; padding: 16px; margin: 16px 0; border-radius: 6px; overflow-x: auto;"><pre style="font-family: monospace; font-size: 13px; margin: 0;">${JSON.stringify(data.details, null, 2)}</pre></div>` : ""}
            <p>Please review and take appropriate action.</p>
            <p>System Notification</p>
        `,
      },
      deposit_confirmed: {
        title: "Deposit Confirmation",
        subject: subject || "Deposit Confirmed",
        html: `
            <p style="color: #10B981; font-size: 18px; font-weight: 600; margin-top: 0;">Deposit Confirmed</p>
            <p>Dear ${data.name},</p>
            <p>Your deposit of <strong>${data.amount} ${data.asset}</strong>${data.fundName ? ` to ${data.fundName}` : ""} has been confirmed and credited to your account.</p>
            <div style="background: #F0FDF4; padding: 16px; margin: 20px 0; border-radius: 6px; border-left: 4px solid #10B981;">
              <p style="margin: 0;"><strong>Amount:</strong> ${data.amount} ${data.asset}</p>
              ${data.fundName ? `<p style="margin: 8px 0 0 0;"><strong>Fund:</strong> ${data.fundName}</p>` : ""}
              ${data.reference ? `<p style="margin: 8px 0 0 0;"><strong>Reference:</strong> ${data.reference}</p>` : ""}
            </div>
            <div style="margin: 24px 0;">
              <a href="${data.portalLink || "https://indigo.fund"}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">View Your Portfolio</a>
            </div>
            <p>Best regards,<br/>The Indigo Yield Team</p>
        `,
      },
      yield_distributed: {
        title: "Yield Update",
        subject: subject || "Yield Distribution",
        html: `
            <p style="color: #4F46E5; font-size: 18px; font-weight: 600; margin-top: 0;">Yield Distributed</p>
            <p>Dear ${data.name},</p>
            <p>Good news! Your yield for ${data.period} has been distributed.</p>
            <div style="background: #EEF2FF; padding: 16px; margin: 20px 0; border-radius: 6px; border-left: 4px solid #4F46E5;">
              <p style="margin: 0;"><strong>Yield Earned:</strong> ${data.amount} ${data.asset}</p>
              ${data.yieldPercentage ? `<p style="margin: 8px 0 0 0;"><strong>Rate:</strong> ${data.yieldPercentage}%</p>` : ""}
              ${data.fundName ? `<p style="margin: 8px 0 0 0;"><strong>Fund:</strong> ${data.fundName}</p>` : ""}
            </div>
            <p>Your yield has been automatically compounded into your position.</p>
            <div style="margin: 24px 0;">
              <a href="${data.portalLink || "https://indigo.fund"}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">View Your Portfolio</a>
            </div>
            <p>Best regards,<br/>The Indigo Yield Team</p>
        `,
      },
    };

    const templateConfig = templates[template];
    if (!templateConfig) {
      throw new Error(`Template '${template}' not found`);
    }

    // Generate the unified HTML
    const finalHtml = generateUnifiedEmailHtml(templateConfig.title, templateConfig.html);

    const emailResponse = await resend.emails.send({
      from: "Indigo Yield <notifications@indigo.fund>",
      to: [to],
      subject: templateConfig.subject,
      html: finalHtml,
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
