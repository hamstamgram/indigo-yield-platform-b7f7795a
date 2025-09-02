import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface NotificationRequest {
  user_id: string;
  type: 'deposit' | 'statement' | 'performance' | 'system' | 'support';
  title: string;
  body: string;
  data?: Record<string, any>;
  priority?: 'low' | 'medium' | 'high';
  send_email?: boolean;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get user from JWT
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Invalid authorization token');
    }

    // Check if user is admin (for system notifications)
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    const request: NotificationRequest = await req.json();

    // Validate request
    if (!request.user_id || !request.type || !request.title || !request.body) {
      throw new Error('Missing required fields: user_id, type, title, body');
    }

    // Insert notification into database
    const { data: notification, error: insertError } = await supabase
      .from('notifications')
      .insert({
        user_id: request.user_id,
        type: request.type,
        title: request.title,
        body: request.body,
        data_jsonb: request.data || {},
        priority: request.priority || 'medium',
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to create notification: ${insertError.message}`);
    }

    // Send email via MailerLite if requested
    if (request.send_email && Deno.env.get('MAILERLITE_API_KEY')) {
      try {
        // Get user email
        const { data: recipient } = await supabase
          .from('profiles')
          .select('email, first_name, last_name')
          .eq('id', request.user_id)
          .single();

        if (recipient?.email) {
          const mailerliteResponse = await fetch('https://api.mailerlite.com/api/v2/campaigns', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-MailerLite-ApiKey': Deno.env.get('MAILERLITE_API_KEY')!,
            },
            body: JSON.stringify({
              type: 'regular',
              subject: request.title,
              content: request.body,
              groups: [], // Configure based on your MailerLite groups
              settings: {
                track_opens: true,
              },
            }),
          });

          if (!mailerliteResponse.ok) {
            console.error('MailerLite email failed:', await mailerliteResponse.text());
          }
        }
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
        // Don't fail the entire request if email fails
      }
    }

    // Send web push notification if user has subscriptions
    try {
      const { data: subscriptions } = await supabase
        .from('web_push_subscriptions')
        .select('*')
        .eq('user_id', request.user_id)
        .is('revoked_at', null);

      if (subscriptions && subscriptions.length > 0) {
        // Web push implementation would go here
        // Requires VAPID keys and web push library
        console.log('Web push subscriptions found:', subscriptions.length);
      }
    } catch (pushError) {
      console.error('Web push failed:', pushError);
      // Don't fail the entire request if push fails
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        notification_id: notification.id,
        message: 'Notification sent successfully' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in ef_send_notification:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
