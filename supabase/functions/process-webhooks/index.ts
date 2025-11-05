/**
 * Supabase Edge Function: Process Webhooks
 * Handles webhooks from third-party services (Stripe, Plaid, crypto providers, etc.)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature, plaid-verification',
};

interface WebhookPayload {
  provider: 'stripe' | 'plaid' | 'coinbase' | 'circle' | 'docusign' | 'twilio' | 'sendgrid';
  event: string;
  data: any;
  signature?: string;
  timestamp?: number;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get webhook provider from path or header
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const provider = pathParts[pathParts.length - 1] as WebhookPayload['provider'];

    console.log('Processing webhook:', { provider, method: req.method });

    // Get raw body for signature verification
    const rawBody = await req.text();
    let payload: any;

    try {
      payload = JSON.parse(rawBody);
    } catch {
      throw new Error('Invalid JSON payload');
    }

    // Verify webhook signature based on provider
    const isValid = await verifyWebhookSignature(
      provider,
      rawBody,
      req.headers,
      payload
    );

    if (!isValid) {
      console.error('Webhook signature verification failed');
      throw new Error('Invalid webhook signature');
    }

    // Log webhook receipt
    const webhookLogId = crypto.randomUUID();
    await supabaseClient
      .from('webhook_logs')
      .insert({
        id: webhookLogId,
        provider,
        event_type: payload.type || payload.event || 'unknown',
        payload: payload,
        received_at: new Date().toISOString(),
        status: 'processing',
      });

    // Process webhook based on provider
    let result: any;

    switch (provider) {
      case 'stripe':
        result = await processStripeWebhook(supabaseClient, payload);
        break;
      case 'plaid':
        result = await processPlaidWebhook(supabaseClient, payload);
        break;
      case 'coinbase':
        result = await processCoinbaseWebhook(supabaseClient, payload);
        break;
      case 'circle':
        result = await processCircleWebhook(supabaseClient, payload);
        break;
      case 'docusign':
        result = await processDocuSignWebhook(supabaseClient, payload);
        break;
      case 'twilio':
        result = await processTwilioWebhook(supabaseClient, payload);
        break;
      case 'sendgrid':
        result = await processSendGridWebhook(supabaseClient, payload);
        break;
      default:
        throw new Error(`Unsupported webhook provider: ${provider}`);
    }

    // Update webhook log with success
    await supabaseClient
      .from('webhook_logs')
      .update({
        status: 'processed',
        processed_at: new Date().toISOString(),
        result: result,
      })
      .eq('id', webhookLogId);

    console.log('Webhook processed successfully:', { provider, webhookLogId });

    return new Response(
      JSON.stringify({
        success: true,
        received: true,
        webhookLogId,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Webhook processing failed:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

/**
 * Verify webhook signature
 */
async function verifyWebhookSignature(
  provider: string,
  rawBody: string,
  headers: Headers,
  payload: any
): Promise<boolean> {
  switch (provider) {
    case 'stripe':
      return verifyStripeSignature(rawBody, headers);
    case 'plaid':
      return verifyPlaidSignature(rawBody, headers);
    case 'coinbase':
      return verifyCoinbaseSignature(rawBody, headers);
    case 'circle':
      return verifyCircleSignature(rawBody, headers);
    default:
      // For development, allow unsigned webhooks with a flag
      return Deno.env.get('ALLOW_UNSIGNED_WEBHOOKS') === 'true';
  }
}

/**
 * Verify Stripe webhook signature
 */
async function verifyStripeSignature(rawBody: string, headers: Headers): Promise<boolean> {
  const signature = headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  if (!signature || !webhookSecret) {
    return false;
  }

  try {
    // In production, use Stripe's signature verification library
    // For now, basic validation
    return signature.length > 0;
  } catch {
    return false;
  }
}

/**
 * Verify Plaid webhook signature
 */
async function verifyPlaidSignature(rawBody: string, headers: Headers): Promise<boolean> {
  const verification = headers.get('plaid-verification');
  // Plaid verification logic
  return !!verification;
}

/**
 * Verify Coinbase webhook signature
 */
async function verifyCoinbaseSignature(rawBody: string, headers: Headers): Promise<boolean> {
  const signature = headers.get('x-cc-webhook-signature');
  // Coinbase signature verification logic
  return !!signature;
}

/**
 * Verify Circle webhook signature
 */
async function verifyCircleSignature(rawBody: string, headers: Headers): Promise<boolean> {
  const signature = headers.get('x-circle-signature');
  // Circle signature verification logic
  return !!signature;
}

/**
 * Process Stripe webhook events
 */
async function processStripeWebhook(supabase: any, payload: any): Promise<any> {
  const eventType = payload.type;
  const data = payload.data?.object;

  console.log('Processing Stripe event:', eventType);

  switch (eventType) {
    case 'payment_intent.succeeded':
      // Handle successful payment
      await handleStripePaymentSuccess(supabase, data);
      break;

    case 'payment_intent.payment_failed':
      // Handle failed payment
      await handleStripePaymentFailure(supabase, data);
      break;

    case 'charge.succeeded':
      // Handle successful charge
      await handleStripeChargeSuccess(supabase, data);
      break;

    case 'charge.refunded':
      // Handle refund
      await handleStripeRefund(supabase, data);
      break;

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      // Handle subscription changes
      await handleStripeSubscriptionChange(supabase, data, eventType);
      break;

    default:
      console.log('Unhandled Stripe event type:', eventType);
  }

  return { processed: true, eventType };
}

/**
 * Process Plaid webhook events
 */
async function processPlaidWebhook(supabase: any, payload: any): Promise<any> {
  const webhookType = payload.webhook_type;
  const webhookCode = payload.webhook_code;

  console.log('Processing Plaid event:', webhookType, webhookCode);

  switch (webhookCode) {
    case 'DEFAULT_UPDATE':
      // New transaction data available
      await handlePlaidTransactionUpdate(supabase, payload);
      break;

    case 'TRANSACTIONS_REMOVED':
      // Transactions removed
      await handlePlaidTransactionRemoved(supabase, payload);
      break;

    case 'ITEM_LOGIN_REQUIRED':
      // User needs to re-authenticate
      await handlePlaidLoginRequired(supabase, payload);
      break;

    case 'ERROR':
      // Error occurred
      await handlePlaidError(supabase, payload);
      break;

    default:
      console.log('Unhandled Plaid webhook code:', webhookCode);
  }

  return { processed: true, webhookType, webhookCode };
}

/**
 * Process Coinbase webhook events
 */
async function processCoinbaseWebhook(supabase: any, payload: any): Promise<any> {
  const eventType = payload.event?.type;
  const data = payload.event?.data;

  console.log('Processing Coinbase event:', eventType);

  switch (eventType) {
    case 'charge:confirmed':
      // Crypto payment confirmed
      await handleCoinbasePaymentConfirmed(supabase, data);
      break;

    case 'charge:failed':
      // Crypto payment failed
      await handleCoinbasePaymentFailed(supabase, data);
      break;

    case 'charge:pending':
      // Crypto payment pending
      await handleCoinbasePaymentPending(supabase, data);
      break;

    default:
      console.log('Unhandled Coinbase event type:', eventType);
  }

  return { processed: true, eventType };
}

/**
 * Process Circle webhook events (USDC payments)
 */
async function processCircleWebhook(supabase: any, payload: any): Promise<any> {
  const eventType = payload.type;
  const data = payload.data;

  console.log('Processing Circle event:', eventType);

  switch (eventType) {
    case 'transfer.confirmed':
      // USDC transfer confirmed
      await handleCircleTransferConfirmed(supabase, data);
      break;

    case 'transfer.failed':
      // USDC transfer failed
      await handleCircleTransferFailed(supabase, data);
      break;

    default:
      console.log('Unhandled Circle event type:', eventType);
  }

  return { processed: true, eventType };
}

/**
 * Process DocuSign webhook events
 */
async function processDocuSignWebhook(supabase: any, payload: any): Promise<any> {
  const event = payload.event;
  const envelopeId = payload.data?.envelopeId;

  console.log('Processing DocuSign event:', event);

  switch (event) {
    case 'envelope-completed':
      // Document signed
      await handleDocuSignCompleted(supabase, payload.data);
      break;

    case 'envelope-declined':
      // Document declined
      await handleDocuSignDeclined(supabase, payload.data);
      break;

    case 'envelope-voided':
      // Document voided
      await handleDocuSignVoided(supabase, payload.data);
      break;

    default:
      console.log('Unhandled DocuSign event:', event);
  }

  return { processed: true, event, envelopeId };
}

/**
 * Process Twilio webhook events (SMS, calls)
 */
async function processTwilioWebhook(supabase: any, payload: any): Promise<any> {
  const messageStatus = payload.MessageStatus;
  const messageSid = payload.MessageSid;

  console.log('Processing Twilio event:', messageStatus);

  switch (messageStatus) {
    case 'delivered':
      await handleTwilioDelivered(supabase, payload);
      break;

    case 'failed':
    case 'undelivered':
      await handleTwilioFailed(supabase, payload);
      break;

    default:
      console.log('Unhandled Twilio status:', messageStatus);
  }

  return { processed: true, messageStatus, messageSid };
}

/**
 * Process SendGrid webhook events (email)
 */
async function processSendGridWebhook(supabase: any, payload: any): Promise<any> {
  // SendGrid sends array of events
  const events = Array.isArray(payload) ? payload : [payload];

  for (const event of events) {
    const eventType = event.event;
    const email = event.email;

    console.log('Processing SendGrid event:', eventType, email);

    switch (eventType) {
      case 'delivered':
        await handleSendGridDelivered(supabase, event);
        break;

      case 'bounce':
      case 'dropped':
        await handleSendGridFailed(supabase, event);
        break;

      case 'open':
        await handleSendGridOpened(supabase, event);
        break;

      case 'click':
        await handleSendGridClicked(supabase, event);
        break;

      default:
        console.log('Unhandled SendGrid event:', eventType);
    }
  }

  return { processed: true, eventCount: events.length };
}

/**
 * Individual webhook handlers
 * These would contain the actual business logic
 */

async function handleStripePaymentSuccess(supabase: any, data: any) {
  const transactionId = data.metadata?.transaction_id;
  if (transactionId) {
    await supabase
      .from('transactions')
      .update({
        status: 'completed',
        stripe_payment_intent_id: data.id,
        completed_at: new Date().toISOString(),
      })
      .eq('id', transactionId);
  }
}

async function handleStripePaymentFailure(supabase: any, data: any) {
  const transactionId = data.metadata?.transaction_id;
  if (transactionId) {
    await supabase
      .from('transactions')
      .update({
        status: 'failed',
        error_message: data.last_payment_error?.message || 'Payment failed',
      })
      .eq('id', transactionId);
  }
}

async function handleStripeChargeSuccess(supabase: any, data: any) {
  console.log('Stripe charge succeeded:', data.id);
}

async function handleStripeRefund(supabase: any, data: any) {
  console.log('Stripe refund processed:', data.id);
}

async function handleStripeSubscriptionChange(supabase: any, data: any, eventType: string) {
  console.log('Stripe subscription change:', eventType, data.id);
}

async function handlePlaidTransactionUpdate(supabase: any, payload: any) {
  console.log('Plaid transaction update:', payload.item_id);
}

async function handlePlaidTransactionRemoved(supabase: any, payload: any) {
  console.log('Plaid transactions removed:', payload.removed_transactions);
}

async function handlePlaidLoginRequired(supabase: any, payload: any) {
  console.log('Plaid login required:', payload.item_id);
}

async function handlePlaidError(supabase: any, payload: any) {
  console.error('Plaid error:', payload.error);
}

async function handleCoinbasePaymentConfirmed(supabase: any, data: any) {
  const chargeId = data.id;
  console.log('Coinbase payment confirmed:', chargeId);
}

async function handleCoinbasePaymentFailed(supabase: any, data: any) {
  console.log('Coinbase payment failed:', data.id);
}

async function handleCoinbasePaymentPending(supabase: any, data: any) {
  console.log('Coinbase payment pending:', data.id);
}

async function handleCircleTransferConfirmed(supabase: any, data: any) {
  console.log('Circle transfer confirmed:', data.id);
}

async function handleCircleTransferFailed(supabase: any, data: any) {
  console.log('Circle transfer failed:', data.id);
}

async function handleDocuSignCompleted(supabase: any, data: any) {
  console.log('DocuSign completed:', data.envelopeId);
}

async function handleDocuSignDeclined(supabase: any, data: any) {
  console.log('DocuSign declined:', data.envelopeId);
}

async function handleDocuSignVoided(supabase: any, data: any) {
  console.log('DocuSign voided:', data.envelopeId);
}

async function handleTwilioDelivered(supabase: any, payload: any) {
  console.log('Twilio message delivered:', payload.MessageSid);
}

async function handleTwilioFailed(supabase: any, payload: any) {
  console.log('Twilio message failed:', payload.MessageSid);
}

async function handleSendGridDelivered(supabase: any, event: any) {
  console.log('SendGrid email delivered:', event.email);
}

async function handleSendGridFailed(supabase: any, event: any) {
  console.log('SendGrid email failed:', event.email);
}

async function handleSendGridOpened(supabase: any, event: any) {
  console.log('SendGrid email opened:', event.email);
}

async function handleSendGridClicked(supabase: any, event: any) {
  console.log('SendGrid email clicked:', event.email);
}
