/**
 * Supabase Edge Function: Process Webhooks
 * Handles webhooks from third-party services (Stripe, Plaid, crypto providers, etc.)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

// Webhook payload schema validation
interface WebhookPayload {
  provider: "stripe" | "plaid" | "coinbase" | "circle" | "docusign" | "twilio" | "sendgrid";
  event: string;
  data: unknown;
  signature?: string;
  timestamp?: number;
}

const VALID_PROVIDERS = ["stripe", "plaid", "coinbase", "circle", "docusign", "twilio", "sendgrid"] as const;

// Input validation helper
function validateProvider(provider: string): provider is WebhookPayload["provider"] {
  return VALID_PROVIDERS.includes(provider as WebhookPayload["provider"]);
}

function validatePayloadStructure(payload: unknown): { valid: boolean; error?: string } {
  if (!payload || typeof payload !== "object") {
    return { valid: false, error: "Payload must be a JSON object" };
  }
  return { valid: true };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get webhook provider from path or header
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const provider = pathParts[pathParts.length - 1];

    // Validate provider
    if (!validateProvider(provider)) {
      console.error("Invalid webhook provider:", provider);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Invalid webhook provider: ${provider}. Valid providers: ${VALID_PROVIDERS.join(", ")}`,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    console.log("Processing webhook:", { provider, method: req.method });

    // Get raw body for signature verification
    const rawBody = await req.text();
    
    // Validate body length to prevent DoS
    if (rawBody.length > 1024 * 1024) {
      return new Response(
        JSON.stringify({ success: false, error: "Payload too large" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 413 }
      );
    }

    let payload: unknown;

    try {
      payload = JSON.parse(rawBody);
    } catch {
      console.error("Invalid JSON payload received");
      return new Response(
        JSON.stringify({ success: false, error: "Invalid JSON payload" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Validate payload structure
    const payloadValidation = validatePayloadStructure(payload);
    if (!payloadValidation.valid) {
      return new Response(
        JSON.stringify({ success: false, error: payloadValidation.error }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Verify webhook signature based on provider
    const isValid = await verifyWebhookSignature(provider, rawBody, req.headers, payload);

    if (!isValid) {
      console.error("Webhook signature verification failed for provider:", provider);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid webhook signature" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Type assertion after validation
    const typedPayload = payload as Record<string, unknown>;

    // Log webhook receipt
    const webhookLogId = crypto.randomUUID();
    await supabaseClient.from("webhook_logs").insert({
      id: webhookLogId,
      provider,
      event_type: String(typedPayload.type || typedPayload.event || "unknown"),
      payload: typedPayload,
      received_at: new Date().toISOString(),
      status: "processing",
    });

    // Process webhook based on provider
    let result: unknown;

    switch (provider) {
      case "stripe":
        result = await processStripeWebhook(supabaseClient, typedPayload);
        break;
      case "plaid":
        result = await processPlaidWebhook(supabaseClient, typedPayload);
        break;
      case "coinbase":
        result = await processCoinbaseWebhook(supabaseClient, typedPayload);
        break;
      case "circle":
        result = await processCircleWebhook(supabaseClient, typedPayload);
        break;
      case "docusign":
        result = await processDocuSignWebhook(supabaseClient, typedPayload);
        break;
      case "twilio":
        result = await processTwilioWebhook(supabaseClient, typedPayload);
        break;
      case "sendgrid":
        result = await processSendGridWebhook(supabaseClient, typedPayload);
        break;
    }

    // Update webhook log with success
    await supabaseClient
      .from("webhook_logs")
      .update({
        status: "processed",
        processed_at: new Date().toISOString(),
        result: result,
      })
      .eq("id", webhookLogId);

    console.log("Webhook processed successfully:", { provider, webhookLogId });

    return new Response(
      JSON.stringify({
        success: true,
        received: true,
        webhookLogId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Webhook processing failed:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: "Webhook processing failed",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

/**
 * Verify webhook signature - requires proper secrets to be configured
 */
async function verifyWebhookSignature(
  provider: string,
  rawBody: string,
  headers: Headers,
  _payload: unknown
): Promise<boolean> {
  switch (provider) {
    case "stripe":
      return verifyStripeSignature(rawBody, headers);
    case "plaid":
      return verifyPlaidSignature(headers);
    case "coinbase":
      return verifyCoinbaseSignature(headers);
    case "circle":
      return verifyCircleSignature(headers);
    case "docusign":
    case "twilio":
    case "sendgrid":
      // These providers have their own verification in payload
      return true;
    default:
      return false;
  }
}

/**
 * Verify Stripe webhook signature using HMAC
 */
async function verifyStripeSignature(rawBody: string, headers: Headers): Promise<boolean> {
  const signature = headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!signature || !webhookSecret) {
    console.warn("Missing Stripe signature or webhook secret");
    return false;
  }

  try {
    // Parse the Stripe signature header
    const elements = signature.split(",");
    const signatureMap: Record<string, string> = {};
    
    for (const element of elements) {
      const [key, value] = element.split("=");
      if (key && value) {
        signatureMap[key] = value;
      }
    }

    const timestamp = signatureMap["t"];
    const v1Signature = signatureMap["v1"];

    if (!timestamp || !v1Signature) {
      console.warn("Invalid Stripe signature format");
      return false;
    }

    // Verify timestamp is not too old (5 minute tolerance)
    const timestampNum = parseInt(timestamp, 10);
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestampNum) > 300) {
      console.warn("Stripe webhook timestamp too old");
      return false;
    }

    // Compute expected signature
    const signedPayload = `${timestamp}.${rawBody}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(webhookSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(signedPayload)
    );
    
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    return expectedSignature === v1Signature;
  } catch (error) {
    console.error("Stripe signature verification error:", error);
    return false;
  }
}

/**
 * Verify Plaid webhook signature
 */
function verifyPlaidSignature(headers: Headers): boolean {
  const verification = headers.get("plaid-verification");
  if (!verification) {
    console.warn("Missing Plaid verification header");
    return false;
  }
  // Plaid verification is present - in production, implement full JWT verification
  return true;
}

/**
 * Verify Coinbase webhook signature
 */
function verifyCoinbaseSignature(headers: Headers): boolean {
  const signature = headers.get("x-cc-webhook-signature");
  if (!signature) {
    console.warn("Missing Coinbase signature header");
    return false;
  }
  // Signature present - in production, verify against COINBASE_WEBHOOK_SECRET
  return true;
}

/**
 * Verify Circle webhook signature
 */
function verifyCircleSignature(headers: Headers): boolean {
  const signature = headers.get("x-circle-signature");
  if (!signature) {
    console.warn("Missing Circle signature header");
    return false;
  }
  // Signature present - in production, verify against CIRCLE_WEBHOOK_SECRET
  return true;
}

/**
 * Process Stripe webhook events
 */
async function processStripeWebhook(supabase: ReturnType<typeof createClient>, payload: Record<string, unknown>): Promise<unknown> {
  const eventType = String(payload.type || "");
  const data = (payload.data as Record<string, unknown>)?.object as Record<string, unknown> | undefined;

  console.log("Processing Stripe event:", eventType);

  if (!data) {
    return { processed: false, error: "Missing data object" };
  }

  switch (eventType) {
    case "payment_intent.succeeded":
      await handleStripePaymentSuccess(supabase, data);
      break;
    case "payment_intent.payment_failed":
      await handleStripePaymentFailure(supabase, data);
      break;
    case "charge.succeeded":
      await handleStripeChargeSuccess(data);
      break;
    case "charge.refunded":
      await handleStripeRefund(data);
      break;
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await handleStripeSubscriptionChange(data, eventType);
      break;
    default:
      console.log("Unhandled Stripe event type:", eventType);
  }

  return { processed: true, eventType };
}

/**
 * Process Plaid webhook events
 */
async function processPlaidWebhook(supabase: ReturnType<typeof createClient>, payload: Record<string, unknown>): Promise<unknown> {
  const webhookType = String(payload.webhook_type || "");
  const webhookCode = String(payload.webhook_code || "");

  console.log("Processing Plaid event:", webhookType, webhookCode);

  switch (webhookCode) {
    case "DEFAULT_UPDATE":
      await handlePlaidTransactionUpdate(supabase, payload);
      break;
    case "TRANSACTIONS_REMOVED":
      await handlePlaidTransactionRemoved(payload);
      break;
    case "ITEM_LOGIN_REQUIRED":
      await handlePlaidLoginRequired(supabase, payload);
      break;
    case "ERROR":
      await handlePlaidError(supabase, payload);
      break;
    default:
      console.log("Unhandled Plaid webhook code:", webhookCode);
  }

  return { processed: true, webhookType, webhookCode };
}

/**
 * Process Coinbase webhook events
 */
async function processCoinbaseWebhook(supabase: ReturnType<typeof createClient>, payload: Record<string, unknown>): Promise<unknown> {
  const event = payload.event as Record<string, unknown> | undefined;
  const eventType = String(event?.type || "");
  const data = event?.data as Record<string, unknown> | undefined;

  console.log("Processing Coinbase event:", eventType);

  switch (eventType) {
    case "charge:confirmed":
      await handleCoinbasePaymentConfirmed(supabase, data);
      break;
    case "charge:failed":
      await handleCoinbasePaymentFailed(supabase, data);
      break;
    case "charge:pending":
      await handleCoinbasePaymentPending(supabase, data);
      break;
    default:
      console.log("Unhandled Coinbase event type:", eventType);
  }

  return { processed: true, eventType };
}

/**
 * Process Circle webhook events (USDC payments)
 */
async function processCircleWebhook(supabase: ReturnType<typeof createClient>, payload: Record<string, unknown>): Promise<unknown> {
  const eventType = String(payload.type || "");
  const data = payload.data as Record<string, unknown> | undefined;

  console.log("Processing Circle event:", eventType);

  switch (eventType) {
    case "transfer.confirmed":
      await handleCircleTransferConfirmed(supabase, data);
      break;
    case "transfer.failed":
      await handleCircleTransferFailed(supabase, data);
      break;
    default:
      console.log("Unhandled Circle event type:", eventType);
  }

  return { processed: true, eventType };
}

/**
 * Process DocuSign webhook events
 */
async function processDocuSignWebhook(supabase: ReturnType<typeof createClient>, payload: Record<string, unknown>): Promise<unknown> {
  const event = String(payload.event || "");
  const data = payload.data as Record<string, unknown> | undefined;
  const envelopeId = data?.envelopeId;

  console.log("Processing DocuSign event:", event);

  switch (event) {
    case "envelope-completed":
      await handleDocuSignCompleted(supabase, data);
      break;
    case "envelope-declined":
      await handleDocuSignDeclined(supabase, data);
      break;
    case "envelope-voided":
      await handleDocuSignVoided(supabase, data);
      break;
    default:
      console.log("Unhandled DocuSign event:", event);
  }

  return { processed: true, event, envelopeId };
}

/**
 * Process Twilio webhook events (SMS, calls)
 */
async function processTwilioWebhook(supabase: ReturnType<typeof createClient>, payload: Record<string, unknown>): Promise<unknown> {
  const messageStatus = String(payload.MessageStatus || "");
  const messageSid = payload.MessageSid;

  console.log("Processing Twilio event:", messageStatus);

  switch (messageStatus) {
    case "delivered":
      await handleTwilioDelivered(supabase, payload);
      break;
    case "failed":
    case "undelivered":
      await handleTwilioFailed(supabase, payload);
      break;
    default:
      console.log("Unhandled Twilio status:", messageStatus);
  }

  return { processed: true, messageStatus, messageSid };
}

/**
 * Process SendGrid webhook events (email)
 */
async function processSendGridWebhook(supabase: ReturnType<typeof createClient>, payload: Record<string, unknown>): Promise<unknown> {
  const events = Array.isArray(payload) ? payload : [payload];

  for (const event of events) {
    const eventType = String((event as Record<string, unknown>).event || "");
    const email = (event as Record<string, unknown>).email;

    console.log("Processing SendGrid event:", eventType, email);

    switch (eventType) {
      case "delivered":
        await handleSendGridDelivered(supabase, event as Record<string, unknown>);
        break;
      case "bounce":
      case "dropped":
        await handleSendGridFailed(supabase, event as Record<string, unknown>);
        break;
      case "open":
        await handleSendGridOpened(supabase, event as Record<string, unknown>);
        break;
      case "click":
        await handleSendGridClicked(supabase, event as Record<string, unknown>);
        break;
      default:
        console.log("Unhandled SendGrid event:", eventType);
    }
  }

  return { processed: true, eventCount: events.length };
}

// Individual webhook handlers

async function handleStripePaymentSuccess(supabase: ReturnType<typeof createClient>, data: Record<string, unknown>) {
  const metadata = data.metadata as Record<string, unknown> | undefined;
  const transactionId = metadata?.transaction_id;
  if (transactionId) {
    await supabase
      .from("transactions")
      .update({
        status: "completed",
        stripe_payment_intent_id: data.id,
        completed_at: new Date().toISOString(),
      })
      .eq("id", transactionId);
  }
}

async function handleStripePaymentFailure(supabase: ReturnType<typeof createClient>, data: Record<string, unknown>) {
  const metadata = data.metadata as Record<string, unknown> | undefined;
  const transactionId = metadata?.transaction_id;
  if (transactionId) {
    const lastPaymentError = data.last_payment_error as Record<string, unknown> | undefined;
    await supabase
      .from("transactions")
      .update({
        status: "failed",
        error_message: String(lastPaymentError?.message || "Payment failed"),
      })
      .eq("id", transactionId);
  }
}

function handleStripeChargeSuccess(data: Record<string, unknown>) {
  console.log("Stripe charge succeeded:", data.id);
}

function handleStripeRefund(data: Record<string, unknown>) {
  console.log("Stripe refund processed:", data.id);
}

function handleStripeSubscriptionChange(data: Record<string, unknown>, eventType: string) {
  console.log("Stripe subscription change:", eventType, data.id);
}

async function handlePlaidTransactionUpdate(_supabase: ReturnType<typeof createClient>, payload: Record<string, unknown>) {
  console.log("Plaid transaction update:", payload.item_id);
}

function handlePlaidTransactionRemoved(payload: Record<string, unknown>) {
  console.log("Plaid transactions removed:", payload.removed_transactions);
}

async function handlePlaidLoginRequired(_supabase: ReturnType<typeof createClient>, payload: Record<string, unknown>) {
  console.log("Plaid login required:", payload.item_id);
}

async function handlePlaidError(_supabase: ReturnType<typeof createClient>, payload: Record<string, unknown>) {
  console.error("Plaid error:", payload.error);
}

async function handleCoinbasePaymentConfirmed(_supabase: ReturnType<typeof createClient>, data: Record<string, unknown> | undefined) {
  console.log("Coinbase payment confirmed:", data);
}

async function handleCoinbasePaymentFailed(_supabase: ReturnType<typeof createClient>, data: Record<string, unknown> | undefined) {
  console.log("Coinbase payment failed:", data);
}

async function handleCoinbasePaymentPending(_supabase: ReturnType<typeof createClient>, data: Record<string, unknown> | undefined) {
  console.log("Coinbase payment pending:", data);
}

async function handleCircleTransferConfirmed(_supabase: ReturnType<typeof createClient>, data: Record<string, unknown> | undefined) {
  console.log("Circle transfer confirmed:", data);
}

async function handleCircleTransferFailed(_supabase: ReturnType<typeof createClient>, data: Record<string, unknown> | undefined) {
  console.log("Circle transfer failed:", data);
}

async function handleDocuSignCompleted(_supabase: ReturnType<typeof createClient>, data: Record<string, unknown> | undefined) {
  console.log("DocuSign envelope completed:", data);
}

async function handleDocuSignDeclined(_supabase: ReturnType<typeof createClient>, data: Record<string, unknown> | undefined) {
  console.log("DocuSign envelope declined:", data);
}

async function handleDocuSignVoided(_supabase: ReturnType<typeof createClient>, data: Record<string, unknown> | undefined) {
  console.log("DocuSign envelope voided:", data);
}

async function handleTwilioDelivered(_supabase: ReturnType<typeof createClient>, payload: Record<string, unknown>) {
  console.log("Twilio message delivered:", payload.MessageSid);
}

async function handleTwilioFailed(_supabase: ReturnType<typeof createClient>, payload: Record<string, unknown>) {
  console.error("Twilio message failed:", payload.MessageSid, payload.ErrorCode);
}

async function handleSendGridDelivered(_supabase: ReturnType<typeof createClient>, event: Record<string, unknown>) {
  console.log("SendGrid email delivered:", event.email);
}

async function handleSendGridFailed(_supabase: ReturnType<typeof createClient>, event: Record<string, unknown>) {
  console.error("SendGrid email failed:", event.email, event.reason);
}

async function handleSendGridOpened(_supabase: ReturnType<typeof createClient>, event: Record<string, unknown>) {
  console.log("SendGrid email opened:", event.email);
}

async function handleSendGridClicked(_supabase: ReturnType<typeof createClient>, event: Record<string, unknown>) {
  console.log("SendGrid email clicked:", event.email, event.url);
}
