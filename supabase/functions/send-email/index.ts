import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  to: string
  subject: string
  html: string
  text?: string
  template?: string
  variables?: Record<string, any>
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Verify authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    // Check if user is admin
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      throw new Error('Only admins can send emails')
    }

    const emailData: EmailRequest = await req.json()

    // Email templates
    const templates = {
      welcome: {
        subject: 'Welcome to Indigo Investor',
        html: `
          <h1>Welcome to Indigo Investor!</h1>
          <p>Dear {{name}},</p>
          <p>Your account has been successfully created. You can now access your portfolio and start tracking your investments.</p>
          <p>Best regards,<br/>The Indigo Team</p>
        `
      },
      statement_ready: {
        subject: 'Your Monthly Statement is Ready',
        html: `
          <h1>Monthly Statement Available</h1>
          <p>Dear {{name}},</p>
          <p>Your statement for {{period}} is now available in your account.</p>
          <p><a href="{{link}}">View Statement</a></p>
          <p>Best regards,<br/>The Indigo Team</p>
        `
      },
      withdrawal_approved: {
        subject: 'Withdrawal Request Approved',
        html: `
          <h1>Withdrawal Approved</h1>
          <p>Dear {{name}},</p>
          <p>Your withdrawal request for {{amount}} has been approved and will be processed within 3-5 business days.</p>
          <p>Reference: {{reference}}</p>
          <p>Best regards,<br/>The Indigo Team</p>
        `
      }
    }

    // Use template if specified
    let emailContent = emailData
    if (emailData.template && templates[emailData.template]) {
      const template = templates[emailData.template]
      emailContent.subject = emailContent.subject || template.subject
      emailContent.html = template.html

      // Replace variables
      if (emailData.variables) {
        for (const [key, value] of Object.entries(emailData.variables)) {
          emailContent.html = emailContent.html.replace(
            new RegExp(`{{${key}}}`, 'g'),
            value
          )
        }
      }
    }

    // Here you would integrate with your email service (SendGrid, Resend, etc.)
    // For now, we'll log the email and store it in the database
    const { error: logError } = await supabaseClient
      .from('email_logs')
      .insert({
        to: emailContent.to,
        subject: emailContent.subject,
        template: emailData.template,
        sent_by: user.id,
        sent_at: new Date().toISOString(),
        status: 'sent'
      })

    if (logError) {
      console.error('Failed to log email:', logError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email sent successfully',
        to: emailContent.to,
        subject: emailContent.subject
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Email sending error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
