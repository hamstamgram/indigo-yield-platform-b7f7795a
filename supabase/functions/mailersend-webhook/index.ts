import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Resend webhook event types
type ResendEventType =
  | "email.sent"
  | "email.delivered"
  | "email.delivery_delayed"
  | "email.bounced"
  | "email.complained"
  | "email.opened"
  | "email.clicked";

interface ResendWebhookPayload {
  type: ResendEventType;
  created_at?: string;
  webhook_id?: string;
  domain_id?: string;
  data?: {
    id?: string;
    subject?: string;
    to?: string[];
    from?: string;
    last_event?: string;
    email?: {
      recipient?: {
        email?: string;
      };
      subject?: string;
      status?: string;
    };
    morph?: unknown;
  };
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const WEBHOOK_SECRET = Deno.env.get("RESEND_WEBHOOK_SIGNING_SECRET");

    // Create Supabase client with service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get raw body for signature verification
    const rawBody = await req.text();

    // Verify webhook signature if secret is configured
    if (WEBHOOK_SECRET) {
      const signature = req.headers.get("resend-signature");

      if (signature) {
        // Resend uses HMAC-SHA256 for webhook signatures
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
          "raw",
          encoder.encode(WEBHOOK_SECRET),
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["sign"]
        );

        const signatureBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));

        const expectedSignature = Array.from(new Uint8Array(signatureBytes))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");

        if (signature !== expectedSignature) {
          console.error("Webhook signature verification failed - rejecting request");
          return new Response(JSON.stringify({ error: "Invalid signature" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    } else {
      console.warn("RESEND_WEBHOOK_SIGNING_SECRET not configured - signature verification skipped");
    }

    // Parse webhook payload
    const payload: ResendWebhookPayload = JSON.parse(rawBody);

    console.log(`Received Resend webhook: type=${payload.type}`);

    // Extract message ID from payload
    const messageId =
      payload.data?.id ||
      (payload as any)?.data?.email?.message?.id ||
      (payload as any)?.data?.email?.id ||
      null;

    if (!messageId) {
      console.warn("No message ID in webhook payload, skipping");
      return new Response(JSON.stringify({ received: true, skipped: "no_message_id" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find delivery record by provider_message_id
    const { data: delivery, error: lookupError } = await supabase
      .from("statement_email_delivery")
      .select("id, status, investor_id, period_id")
      .eq("provider_message_id", messageId)
      .single();

    if (lookupError || !delivery) {
      console.warn(`Delivery not found for message_id: ${messageId}`);
      // Still return 200 to acknowledge webhook
      return new Response(JSON.stringify({ received: true, skipped: "delivery_not_found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Map event type to status update
    const eventTime = new Date(payload.created_at || Date.now()).toISOString();
    let statusUpdate: Record<string, unknown> = {
      updated_at: eventTime,
    };

    switch (payload.type) {
      case "email.sent":
        statusUpdate = {
          ...statusUpdate,
          status: "SENT",
          sent_at: statusUpdate.sent_at || eventTime,
        };
        break;

      case "email.delivered":
        statusUpdate = {
          ...statusUpdate,
          status: "DELIVERED",
          delivered_at: eventTime,
        };
        break;

      case "email.opened":
        // Don't change status, just record opened_at
        statusUpdate = {
          ...statusUpdate,
          opened_at: eventTime,
        };
        break;

      case "email.clicked":
        // Don't change status, just record clicked_at
        statusUpdate = {
          ...statusUpdate,
          clicked_at: eventTime,
        };
        break;

      case "email.bounced":
        statusUpdate = {
          ...statusUpdate,
          status: "BOUNCED",
          bounced_at: eventTime,
        };
        break;

      case "email.complained":
        statusUpdate = {
          ...statusUpdate,
          status: "COMPLAINED",
        };
        break;

      default:
        console.log(`Unhandled event type: ${payload.type}`);
    }

    // Update delivery record
    const { error: updateError } = await supabase
      .from("statement_email_delivery")
      .update(statusUpdate)
      .eq("id", delivery.id);

    if (updateError) {
      console.error("Failed to update delivery record:", updateError);
    }

    // Log event to report_delivery_events with idempotency check
    const eventType = payload.type.replace("activity.", "");

    // Check for existing event (idempotency)
    const { data: existingEvent } = await supabase
      .from("report_delivery_events")
      .select("id")
      .eq("delivery_id", delivery.id)
      .eq("event_type", eventType)
      .eq("occurred_at", eventTime)
      .maybeSingle();

    if (!existingEvent) {
      const { error: eventError } = await supabase.from("report_delivery_events").insert({
        delivery_id: delivery.id,
        provider_message_id: messageId,
        event_type: eventType,
        event_data: {
          recipient: payload.data?.email?.recipient?.email,
          subject: payload.data?.email?.subject,
          status: payload.data?.email?.status,
          morph: payload.data?.morph,
          webhook_id: payload.webhook_id,
          domain_id: payload.domain_id,
        },
        occurred_at: eventTime,
      });

      if (eventError) {
        console.error("Failed to log delivery event:", eventError);
      }
    } else {
      console.log(
        `Event ${eventType} at ${eventTime} already logged for delivery ${delivery.id}, skipping`
      );
    }

    console.log(`Processed ${payload.type} for delivery ${delivery.id}`);

    return new Response(
      JSON.stringify({
        received: true,
        delivery_id: delivery.id,
        event_type: payload.type,
        processed: true,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error processing Resend webhook:", errorMessage);

    // Always return 200 to prevent webhook retries for parse errors
    return new Response(JSON.stringify({ received: true, error: errorMessage }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
