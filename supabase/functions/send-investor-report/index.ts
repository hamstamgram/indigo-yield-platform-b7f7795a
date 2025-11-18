import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const MAILERLITE_API_KEY = Deno.env.get('MAILERLITE_API_KEY') || '';
const MAILERLITE_API_URL = 'https://connect.mailerlite.com/api';

interface EmailRequest {
  to: string;
  investorName: string;
  reportMonth: string; // YYYY-MM
  htmlContent: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized - No authorization header' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify admin access
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized - Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden - Admin access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const body: EmailRequest = await req.json();
    const { to, investorName, reportMonth, htmlContent } = body;

    if (!to || !investorName || !reportMonth || !htmlContent) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, investorName, reportMonth, htmlContent' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Format report month for subject
    const reportDate = new Date(reportMonth + '-01').toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
    });

    // Send email via MailerLite
    const emailPayload = {
      to: [
        {
          email: to,
          name: investorName,
        },
      ],
      from: {
        email: 'reports@indigoyield.com',
        name: 'Indigo Yield',
      },
      subject: `Your Investment Report - ${reportDate}`,
      html: htmlContent,
      text: `Dear ${investorName},\n\nPlease view this email in an HTML-compatible email client to see your investment report for ${reportDate}.\n\nThank you for trusting us with your investments.\n\nBest regards,\nIndigo Yield Team`,
    };

    const mailerliteResponse = await fetch(`${MAILERLITE_API_URL}/emails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MAILERLITE_API_KEY}`,
        'Accept': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    if (!mailerliteResponse.ok) {
      const errorText = await mailerliteResponse.text();
      console.error('MailerLite error:', errorText);
      throw new Error(`MailerLite API error: ${mailerliteResponse.status} - ${errorText}`);
    }

    const mailerliteResult = await mailerliteResponse.json();

    // Log email send to database
    await supabaseClient.from('email_logs').insert({
      recipient_email: to,
      recipient_name: investorName,
      subject: `Your Investment Report - ${reportDate}`,
      email_type: 'investor_report',
      report_month: reportMonth + '-01',
      sent_by: user.id,
      sent_at: new Date().toISOString(),
      status: 'sent',
      external_id: mailerliteResult.data?.id || null,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email sent successfully',
        recipient: to,
        reportMonth,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error: any) {
    console.error('Error in send-investor-report:', error);

    return new Response(
      JSON.stringify({
        error: 'Failed to send email',
        message: error.message || 'Unknown error occurred',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
