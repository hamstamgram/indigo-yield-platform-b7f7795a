// Indigo Yield Platform - Email Edge Function
// Created: 2025-11-20
// Purpose: Secure server-side email sending with SMTP
//
// Security Features:
// - SMTP credentials stored as Supabase secrets (never exposed to client)
// - Rate limiting (10 emails per minute per user)
// - Input validation with Zod
// - Audit logging to email_logs table
// - JWT authentication required

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4'
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts"
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts"

// ============= CORS CONFIGURATION =============
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ============= INPUT VALIDATION =============
const EmailRequestSchema = z.object({
  to: z.string().email('Invalid email address'),
  subject: z.string().min(1, 'Subject required').max(200, 'Subject too long'),
  template: z.enum([
    'STATEMENT_READY',
    'WELCOME',
    'PASSWORD_RESET',
    'TOTP_ENABLED',
    'WITHDRAWAL_REQUEST',
    'ADMIN_NOTIFICATION'
  ]),
  variables: z.record(z.any()).default({}),
});

type EmailRequest = z.infer<typeof EmailRequestSchema>;

// ============= EMAIL TEMPLATES =============
const EMAIL_TEMPLATES: Record<string, (vars: Record<string, any>) => string> = {
  STATEMENT_READY: (vars) => `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #4F46E5;">Your Statement is Ready</h1>
      <p>Your Indigo Yield statement (ID: <strong>${vars.statementId}</strong>) is ready for download.</p>
      <p><a href="${vars.downloadUrl}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Download Statement</a></p>
      <p style="color: #6B7280; font-size: 14px;"><em>This link expires in ${vars.expiresIn}</em></p>
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #E5E7EB;">
      <p style="color: #9CA3AF; font-size: 12px;">Indigo Yield Platform - Secure Investment Management</p>
    </body>
    </html>
  `,

  WELCOME: (vars) => `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #4F46E5;">Welcome to Indigo Yield, ${vars.userName}!</h1>
      <p>Your account is ready to use. We're excited to have you join our platform.</p>
      <p><a href="${vars.loginUrl}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Log In to Your Account</a></p>
      <p>Questions? <a href="${vars.supportUrl}" style="color: #4F46E5;">Contact Support</a></p>
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #E5E7EB;">
      <p style="color: #9CA3AF; font-size: 12px;">Indigo Yield Platform - Secure Investment Management</p>
    </body>
    </html>
  `,

  PASSWORD_RESET: (vars) => `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #4F46E5;">Password Reset Request</h1>
      <p>Hi ${vars.userName},</p>
      <p>We received a request to reset your password. Click the button below to set a new password:</p>
      <p><a href="${vars.resetUrl}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a></p>
      <p style="color: #6B7280; font-size: 14px;"><em>This link expires in ${vars.expiresIn || '1 hour'}</em></p>
      <p style="color: #EF4444; font-size: 14px;"><strong>If you didn't request this, please ignore this email.</strong></p>
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #E5E7EB;">
      <p style="color: #9CA3AF; font-size: 12px;">Indigo Yield Platform - Secure Investment Management</p>
    </body>
    </html>
  `,

  TOTP_ENABLED: (vars) => `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #10B981;">Two-Factor Authentication Enabled</h1>
      <p>Hi ${vars.userName},</p>
      <p>2FA has been <strong>successfully enabled</strong> on your account.</p>
      <p><strong>Timestamp:</strong> ${vars.timestamp}</p>
      <p style="color: #6B7280; font-size: 14px;">Your account is now more secure. You'll need your authenticator app to log in.</p>
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #E5E7EB;">
      <p style="color: #9CA3AF; font-size: 12px;">Indigo Yield Platform - Secure Investment Management</p>
    </body>
    </html>
  `,

  WITHDRAWAL_REQUEST: (vars) => `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #4F46E5;">Withdrawal Request Received</h1>
      <p>We've received your withdrawal request:</p>
      <p><strong>Amount:</strong> ${vars.amount} ${vars.currency}</p>
      <p><strong>Request ID:</strong> ${vars.requestId}</p>
      <p><strong>Status:</strong> Processing</p>
      <p style="color: #6B7280; font-size: 14px;">We'll process your request within 1-2 business days. You'll receive a confirmation email once complete.</p>
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #E5E7EB;">
      <p style="color: #9CA3AF; font-size: 12px;">Indigo Yield Platform - Secure Investment Management</p>
    </body>
    </html>
  `,

  ADMIN_NOTIFICATION: (vars) => `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #DC2626;">Admin Notification</h1>
      <p>${vars.message}</p>
      <p><a href="${vars.dashboardUrl}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View in Dashboard</a></p>
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #E5E7EB;">
      <p style="color: #9CA3AF; font-size: 12px;">Indigo Yield Platform - Admin Alert</p>
    </body>
    </html>
  `,
};

// ============= RATE LIMITING =============
async function checkRateLimit(
  supabase: any,
  userId: string,
  maxPerMinute: number = 10
): Promise<{ allowed: boolean; remaining: number }> {
  // Simple rate limiting: check email count in last minute
  const { count } = await supabase
    .from('email_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', new Date(Date.now() - 60000).toISOString());

  const remaining = Math.max(0, maxPerMinute - (count || 0));
  return {
    allowed: remaining > 0,
    remaining
  };
}

// ============= MAIN EDGE FUNCTION =============
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: corsHeaders
    });
  }

  try {
    // 1. AUTHENTICATE USER
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid or expired token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // 2. PARSE AND VALIDATE REQUEST
    const body = await req.json();
    let emailRequest: EmailRequest;

    try {
      emailRequest = EmailRequestSchema.parse(body);
    } catch (validationError) {
      return new Response(
        JSON.stringify({
          error: 'Invalid request',
          details: validationError.errors
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // 3. CHECK RATE LIMIT
    const rateLimit = await checkRateLimit(supabase, user.id);
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: `Maximum 10 emails per minute. Try again in 1 minute.`
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': '60'
          }
        }
      );
    }

    // 4. GET SMTP CREDENTIALS (from Supabase secrets)
    const smtpHost = Deno.env.get('SMTP_HOST')!;
    const smtpPort = parseInt(Deno.env.get('SMTP_PORT') || '587');
    const smtpUser = Deno.env.get('SMTP_USER')!;
    const smtpPass = Deno.env.get('SMTP_PASS')!;
    const smtpFrom = Deno.env.get('SMTP_FROM')!;

    if (!smtpHost || !smtpUser || !smtpPass || !smtpFrom) {
      console.error('Missing SMTP configuration');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // 5. RENDER EMAIL TEMPLATE
    const templateRenderer = EMAIL_TEMPLATES[emailRequest.template];
    if (!templateRenderer) {
      return new Response(
        JSON.stringify({ error: `Unknown template: ${emailRequest.template}` }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const emailContent = templateRenderer(emailRequest.variables);

    // 6. SEND EMAIL VIA SMTP
    const client = new SMTPClient({
      connection: {
        hostname: smtpHost,
        port: smtpPort,
        tls: true,
        auth: {
          username: smtpUser,
          password: smtpPass,
        },
      },
    });

    const messageId = `${user.id}-${Date.now()}`;

    await client.send({
      from: smtpFrom,
      to: emailRequest.to,
      subject: emailRequest.subject,
      content: emailContent,
      html: emailContent, // Send as HTML
      headers: {
        'X-Message-ID': messageId,
        'X-User-ID': user.id,
        'X-Template': emailRequest.template,
      }
    });

    await client.close();

    // 7. LOG TO AUDIT TRAIL
    await supabase.from('email_logs').insert({
      user_id: user.id,
      recipient: emailRequest.to,
      subject: emailRequest.subject,
      template: emailRequest.template,
      status: 'sent',
      sent_at: new Date().toISOString(),
    });

    // 8. RETURN SUCCESS
    return new Response(
      JSON.stringify({
        success: true,
        message: `Email sent to ${emailRequest.to}`,
        messageId
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      }
    );

  } catch (error) {
    // Log error for debugging
    console.error('Email function error:', error);

    // Return generic error (don't expose internal details)
    return new Response(
      JSON.stringify({
        error: 'Failed to send email',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
