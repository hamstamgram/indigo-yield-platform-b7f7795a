/**
 * Supabase Edge Function: Process Deposit
 * Handles deposit requests with crypto payment integration
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Secure CORS configuration
const allowedOrigins = Deno.env.get('ALLOWED_ORIGINS')?.split(',') || [];
const corsHeaders = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-csrf-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
});

interface DepositRequest {
  investorId: string;
  amount: number;
  currency: string;
  paymentMethod: 'bank_transfer' | 'crypto' | 'wire';
  cryptoAssetId?: string;
  bankAccountId?: string;
  metadata?: Record<string, any>;
}

interface CryptoPaymentDetails {
  address: string;
  network: string;
  expectedAmount: number;
  expiresAt: string;
  paymentId: string;
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const headers = corsHeaders(origin);
  
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers });
  }

  try {
    // CSRF validation for state-changing operations
    const csrfToken = req.headers.get('x-csrf-token');
    if (!csrfToken || csrfToken.length < 32) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid CSRF token' }),
        { headers: { ...headers, 'Content-Type': 'application/json' }, status: 403 }
      );
    }
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Parse request
    const depositRequest: DepositRequest = await req.json();

    console.log('Processing deposit:', {
      investorId: depositRequest.investorId,
      amount: depositRequest.amount,
      currency: depositRequest.currency,
      paymentMethod: depositRequest.paymentMethod,
    });

    // Verify investor ownership
    if (depositRequest.investorId !== user.id) {
      // Check if user is admin
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        throw new Error('Unauthorized to process deposit for this investor');
      }
    }

    // Validate deposit amount
    if (depositRequest.amount <= 0) {
      throw new Error('Deposit amount must be greater than zero');
    }

    // Check minimum deposit requirement
    const minimumDeposit = 1000; // $1,000 minimum
    if (depositRequest.amount < minimumDeposit) {
      throw new Error(`Minimum deposit amount is $${minimumDeposit.toLocaleString()}`);
    }

    // Verify investor account is active
    const { data: investor } = await supabaseClient
      .from('investors')
      .select('id, kyc_status, account_status')
      .eq('id', depositRequest.investorId)
      .single();

    if (!investor) {
      throw new Error('Investor account not found');
    }

    if (investor.account_status !== 'active') {
      throw new Error('Investor account is not active');
    }

    if (investor.kyc_status !== 'approved') {
      throw new Error('KYC verification must be completed before making deposits');
    }

    // Create deposit transaction record
    const depositId = crypto.randomUUID();
    const now = new Date().toISOString();

    const { error: insertError } = await supabaseClient
      .from('transactions')
      .insert({
        id: depositId,
        investor_id: depositRequest.investorId,
        transaction_type: 'deposit',
        amount: depositRequest.amount,
        currency: depositRequest.currency,
        status: 'pending',
        payment_method: depositRequest.paymentMethod,
        created_at: now,
        created_by: user.id,
        metadata: depositRequest.metadata || {},
      });

    if (insertError) {
      throw new Error(`Failed to create deposit record: ${insertError.message}`);
    }

    // Handle crypto deposits
    let cryptoPaymentDetails: CryptoPaymentDetails | null = null;
    if (depositRequest.paymentMethod === 'crypto' && depositRequest.cryptoAssetId) {
      cryptoPaymentDetails = await generateCryptoPaymentAddress(
        supabaseClient,
        depositId,
        depositRequest.cryptoAssetId,
        depositRequest.amount
      );
    }

    // Handle bank transfers
    let bankTransferDetails: Record<string, any> | null = null;
    if (depositRequest.paymentMethod === 'bank_transfer') {
      bankTransferDetails = await generateBankTransferInstructions(
        supabaseClient,
        depositId,
        depositRequest.amount
      );
    }

    // Create audit log
    await supabaseClient
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'deposit_initiated',
        resource_type: 'transaction',
        resource_id: depositId,
        details: {
          amount: depositRequest.amount,
          currency: depositRequest.currency,
          paymentMethod: depositRequest.paymentMethod,
        },
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown',
      });

    // Send notification email
    if (Deno.env.get('ENABLE_EMAIL_NOTIFICATIONS') === 'true') {
      await sendDepositNotificationEmail(
        supabaseClient,
        depositRequest.investorId,
        depositId,
        depositRequest.amount,
        depositRequest.paymentMethod
      );
    }

    const response: any = {
      success: true,
      depositId,
      status: 'pending',
      amount: depositRequest.amount,
      currency: depositRequest.currency,
      paymentMethod: depositRequest.paymentMethod,
      message: 'Deposit request created successfully',
    };

    if (cryptoPaymentDetails) {
      response.cryptoPayment = cryptoPaymentDetails;
    }

    if (bankTransferDetails) {
      response.bankTransfer = bankTransferDetails;
    }

    console.log('Deposit processed successfully:', { depositId, amount: depositRequest.amount });

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Deposit processing failed:', error);

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
 * Generate crypto payment address for deposit
 */
async function generateCryptoPaymentAddress(
  supabase: any,
  depositId: string,
  cryptoAssetId: string,
  amount: number
): Promise<CryptoPaymentDetails> {
  // Get crypto asset details
  const { data: cryptoAsset } = await supabase
    .from('crypto_assets')
    .select('symbol, network, current_price_usd')
    .eq('id', cryptoAssetId)
    .single();

  if (!cryptoAsset) {
    throw new Error('Crypto asset not found');
  }

  // In production, this would integrate with a crypto payment provider
  // (e.g., Coinbase Commerce, BitPay, NOWPayments)
  // For now, generate a placeholder address
  const paymentId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Calculate expected crypto amount based on current price
  const expectedCryptoAmount = amount / cryptoAsset.current_price_usd;

  // Store crypto payment details
  await supabase
    .from('crypto_payments')
    .insert({
      id: paymentId,
      transaction_id: depositId,
      crypto_asset_id: cryptoAssetId,
      expected_amount_usd: amount,
      expected_amount_crypto: expectedCryptoAmount,
      network: cryptoAsset.network,
      status: 'pending',
      expires_at: expiresAt.toISOString(),
    });

  // Generate unique payment address (placeholder)
  // In production, this would come from your crypto payment provider
  const address = `0x${Array(40).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;

  return {
    address,
    network: cryptoAsset.network,
    expectedAmount: expectedCryptoAmount,
    expiresAt: expiresAt.toISOString(),
    paymentId,
  };
}

/**
 * Generate bank transfer instructions
 */
async function generateBankTransferInstructions(
  supabase: any,
  depositId: string,
  amount: number
): Promise<Record<string, any>> {
  // In production, fetch from company bank account settings
  return {
    accountName: 'Indigo Capital LLC',
    accountNumber: '****1234',
    routingNumber: '****5678',
    bankName: 'Silicon Valley Bank',
    reference: depositId,
    amount: amount,
    instructions: [
      'Include the reference number in your wire transfer',
      'Deposits typically process within 1-3 business days',
      'Contact support if you have any questions',
    ],
  };
}

/**
 * Send deposit notification email
 */
async function sendDepositNotificationEmail(
  supabase: any,
  investorId: string,
  depositId: string,
  amount: number,
  paymentMethod: string
): Promise<void> {
  try {
    // Get investor email
    const { data: investor } = await supabase
      .from('investors')
      .select('email, first_name')
      .eq('id', investorId)
      .single();

    if (!investor) {
      console.error('Investor not found for email notification');
      return;
    }

    // Call send-email function
    const emailPayload = {
      to: investor.email,
      template: 'deposit_initiated',
      variables: {
        name: investor.first_name,
        amount: `$${amount.toLocaleString()}`,
        paymentMethod: paymentMethod.replace('_', ' '),
        reference: depositId,
      },
    };

    // Log email intent
    await supabase
      .from('email_logs')
      .insert({
        to: investor.email,
        subject: 'Deposit Request Initiated',
        template: 'deposit_initiated',
        status: 'pending',
      });

    console.log('Deposit notification email queued for:', investor.email);
  } catch (error) {
    console.error('Failed to send deposit notification email:', error);
    // Don't throw - email failure shouldn't block deposit processing
  }
}
