/**
 * Supabase Edge Function: Generate Tax Documents
 * Generates 1099 forms and tax reports for investors
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const allowedOrigins = Deno.env.get('ALLOWED_ORIGINS')?.split(',') || [];

const corsHeaders = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-csrf-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
});

interface TaxDocumentRequest {
  investorId: string;
  taxYear: number;
  documentType: '1099-DIV' | '1099-INT' | '1099-B' | 'tax_summary';
  format?: 'pdf' | 'json';
}

interface TaxData {
  investor: InvestorTaxInfo;
  income: IncomeData;
  distributions: DistributionData;
  capitalGains: CapitalGainsData;
  summary: TaxSummary;
}

interface InvestorTaxInfo {
  id: string;
  name: string;
  ssn: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

interface IncomeData {
  ordinaryDividends: number;
  qualifiedDividends: number;
  interestIncome: number;
  capitalGainDistributions: number;
}

interface DistributionData {
  totalDistributions: number;
  qualifiedDividends: number;
  ordinaryDividends: number;
  returnOfCapital: number;
}

interface CapitalGainsData {
  shortTermGains: number;
  longTermGains: number;
  totalGains: number;
  costBasis: number;
  proceeds: number;
}

interface TaxSummary {
  totalIncome: number;
  totalCapitalGains: number;
  totalTaxableAmount: number;
  estimatedTaxLiability: number;
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const headers = corsHeaders(origin);

  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers });
  }

  try {
    // CSRF token validation
    const csrfToken = req.headers.get('x-csrf-token');
    if (!csrfToken || csrfToken.length < 32) {
      return new Response(
        JSON.stringify({ error: 'Invalid CSRF token' }),
        { status: 403, headers: { ...headers, 'Content-Type': 'application/json' } }
      )
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
    const taxDocRequest: TaxDocumentRequest = await req.json();

    console.log('Generating tax document:', {
      investorId: taxDocRequest.investorId,
      taxYear: taxDocRequest.taxYear,
      documentType: taxDocRequest.documentType,
    });

    // Verify access
    if (taxDocRequest.investorId !== user.id) {
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        throw new Error('Unauthorized to generate tax documents for this investor');
      }
    }

    // Validate tax year
    const currentYear = new Date().getFullYear();
    if (taxDocRequest.taxYear > currentYear) {
      throw new Error('Cannot generate tax documents for future years');
    }

    if (taxDocRequest.taxYear < 2020) {
      throw new Error('Tax documents only available from 2020 onwards');
    }

    // Collect tax data
    const taxData = await collectTaxData(
      supabaseClient,
      taxDocRequest.investorId,
      taxDocRequest.taxYear
    );

    // Generate document based on type
    let documentData: any;

    switch (taxDocRequest.documentType) {
      case '1099-DIV':
        documentData = generate1099DIV(taxData);
        break;
      case '1099-INT':
        documentData = generate1099INT(taxData);
        break;
      case '1099-B':
        documentData = generate1099B(taxData);
        break;
      case 'tax_summary':
        documentData = generateTaxSummary(taxData);
        break;
      default:
        throw new Error(`Unsupported document type: ${taxDocRequest.documentType}`);
    }

    // Store document record
    const documentId = crypto.randomUUID();
    const format = taxDocRequest.format || 'pdf';

    await supabaseClient
      .from('tax_documents')
      .insert({
        id: documentId,
        investor_id: taxDocRequest.investorId,
        tax_year: taxDocRequest.taxYear,
        document_type: taxDocRequest.documentType,
        format: format,
        generated_at: new Date().toISOString(),
        generated_by: user.id,
        data: documentData,
      });

    // Generate PDF if requested
    let downloadUrl: string | null = null;
    if (format === 'pdf') {
      downloadUrl = await generatePDF(
        supabaseClient,
        documentId,
        taxDocRequest.documentType,
        documentData,
        taxDocRequest.investorId
      );
    }

    // Create audit log
    await supabaseClient
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'tax_document_generated',
        resource_type: 'tax_document',
        resource_id: documentId,
        details: {
          investorId: taxDocRequest.investorId,
          taxYear: taxDocRequest.taxYear,
          documentType: taxDocRequest.documentType,
          format: format,
        },
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown',
      });

    console.log('Tax document generated successfully:', {
      documentId,
      type: taxDocRequest.documentType,
      year: taxDocRequest.taxYear,
    });

    return new Response(
      JSON.stringify({
        success: true,
        documentId,
        documentType: taxDocRequest.documentType,
        taxYear: taxDocRequest.taxYear,
        format: format,
        downloadUrl: downloadUrl,
        data: format === 'json' ? documentData : undefined,
      }),
      {
        headers: { ...headers, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Tax document generation failed:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...headers, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

/**
 * Collect tax data for the specified year
 */
async function collectTaxData(
  supabase: any,
  investorId: string,
  taxYear: number
): Promise<TaxData> {
  // Get investor information
  const { data: investor } = await supabase
    .from('investors')
    .select('id, first_name, last_name, ssn, address, city, state, zip_code')
    .eq('id', investorId)
    .single();

  if (!investor) {
    throw new Error('Investor not found');
  }

  // Date range for tax year
  const startDate = new Date(taxYear, 0, 1);
  const endDate = new Date(taxYear, 11, 31, 23, 59, 59);

  // Get distributions and dividends
  const { data: distributions } = await supabase
    .from('distributions')
    .select('*')
    .eq('investor_id', investorId)
    .gte('distribution_date', startDate.toISOString())
    .lte('distribution_date', endDate.toISOString());

  const ordinaryDividends = distributions
    ?.filter((d: any) => d.distribution_type === 'ordinary_dividend')
    .reduce((sum: number, d: any) => sum + Number(d.amount), 0) || 0;

  const qualifiedDividends = distributions
    ?.filter((d: any) => d.distribution_type === 'qualified_dividend')
    .reduce((sum: number, d: any) => sum + Number(d.amount), 0) || 0;

  const interestIncome = distributions
    ?.filter((d: any) => d.distribution_type === 'interest')
    .reduce((sum: number, d: any) => sum + Number(d.amount), 0) || 0;

  const capitalGainDistributions = distributions
    ?.filter((d: any) => d.distribution_type === 'capital_gain')
    .reduce((sum: number, d: any) => sum + Number(d.amount), 0) || 0;

  const returnOfCapital = distributions
    ?.filter((d: any) => d.distribution_type === 'return_of_capital')
    .reduce((sum: number, d: any) => sum + Number(d.amount), 0) || 0;

  // Get realized capital gains/losses
  const { data: trades } = await supabase
    .from('trades')
    .select('*')
    .eq('investor_id', investorId)
    .gte('trade_date', startDate.toISOString())
    .lte('trade_date', endDate.toISOString())
    .eq('trade_type', 'sell');

  let shortTermGains = 0;
  let longTermGains = 0;
  let totalCostBasis = 0;
  let totalProceeds = 0;

  if (trades) {
    for (const trade of trades) {
      const proceeds = Number(trade.amount);
      const costBasis = Number(trade.cost_basis || 0);
      const gain = proceeds - costBasis;

      totalProceeds += proceeds;
      totalCostBasis += costBasis;

      // Determine if short-term or long-term
      // (In production, you'd get the acquisition date)
      const holdingPeriodDays = 400; // Placeholder

      if (holdingPeriodDays <= 365) {
        shortTermGains += gain;
      } else {
        longTermGains += gain;
      }
    }
  }

  // Calculate summary
  const totalIncome = ordinaryDividends + qualifiedDividends + interestIncome;
  const totalCapitalGains = shortTermGains + longTermGains + capitalGainDistributions;
  const totalTaxableAmount = totalIncome + totalCapitalGains;

  // Estimate tax liability (simplified)
  const estimatedTaxLiability = calculateEstimatedTax(
    totalIncome,
    shortTermGains,
    longTermGains
  );

  return {
    investor: {
      id: investor.id,
      name: `${investor.first_name} ${investor.last_name}`,
      ssn: investor.ssn || '***-**-****',
      address: investor.address || '',
      city: investor.city || '',
      state: investor.state || '',
      zip: investor.zip_code || '',
    },
    income: {
      ordinaryDividends,
      qualifiedDividends,
      interestIncome,
      capitalGainDistributions,
    },
    distributions: {
      totalDistributions: distributions?.reduce((sum: number, d: any) => sum + Number(d.amount), 0) || 0,
      qualifiedDividends,
      ordinaryDividends,
      returnOfCapital,
    },
    capitalGains: {
      shortTermGains,
      longTermGains,
      totalGains: shortTermGains + longTermGains,
      costBasis: totalCostBasis,
      proceeds: totalProceeds,
    },
    summary: {
      totalIncome,
      totalCapitalGains,
      totalTaxableAmount,
      estimatedTaxLiability,
    },
  };
}

/**
 * Generate Form 1099-DIV
 */
function generate1099DIV(taxData: TaxData): any {
  return {
    formType: '1099-DIV',
    taxYear: new Date().getFullYear() - 1,
    payer: {
      name: 'Indigo Capital LLC',
      tin: '**-*******',
      address: '123 Financial Blvd',
      city: 'San Francisco',
      state: 'CA',
      zip: '94105',
    },
    recipient: taxData.investor,
    box1a_ordinaryDividends: taxData.income.ordinaryDividends,
    box1b_qualifiedDividends: taxData.income.qualifiedDividends,
    box2a_capitalGainDistributions: taxData.income.capitalGainDistributions,
    box3_nondividendDistributions: taxData.distributions.returnOfCapital,
    box4_federalTaxWithheld: 0,
    box5_section199ADividends: 0,
    box6_investmentExpenses: 0,
    box7_foreignTaxPaid: 0,
  };
}

/**
 * Generate Form 1099-INT
 */
function generate1099INT(taxData: TaxData): any {
  return {
    formType: '1099-INT',
    taxYear: new Date().getFullYear() - 1,
    payer: {
      name: 'Indigo Capital LLC',
      tin: '**-*******',
      address: '123 Financial Blvd',
      city: 'San Francisco',
      state: 'CA',
      zip: '94105',
    },
    recipient: taxData.investor,
    box1_interestIncome: taxData.income.interestIncome,
    box2_earlyWithdrawalPenalty: 0,
    box3_interestOnUSSavingsBonds: 0,
    box4_federalTaxWithheld: 0,
    box5_investmentExpenses: 0,
    box8_taxExemptInterest: 0,
  };
}

/**
 * Generate Form 1099-B
 */
function generate1099B(taxData: TaxData): any {
  return {
    formType: '1099-B',
    taxYear: new Date().getFullYear() - 1,
    payer: {
      name: 'Indigo Capital LLC',
      tin: '**-*******',
      address: '123 Financial Blvd',
      city: 'San Francisco',
      state: 'CA',
      zip: '94105',
    },
    recipient: taxData.investor,
    proceeds: taxData.capitalGains.proceeds,
    costBasis: taxData.capitalGains.costBasis,
    shortTermGain: taxData.capitalGains.shortTermGains,
    longTermGain: taxData.capitalGains.longTermGains,
    totalGain: taxData.capitalGains.totalGains,
    washSaleLossDisallowed: 0,
    federalTaxWithheld: 0,
  };
}

/**
 * Generate tax summary report
 */
function generateTaxSummary(taxData: TaxData): any {
  return {
    documentType: 'tax_summary',
    taxYear: new Date().getFullYear() - 1,
    investor: taxData.investor,
    summary: {
      totalIncome: taxData.summary.totalIncome,
      ordinaryDividends: taxData.income.ordinaryDividends,
      qualifiedDividends: taxData.income.qualifiedDividends,
      interestIncome: taxData.income.interestIncome,
      capitalGains: taxData.summary.totalCapitalGains,
      shortTermGains: taxData.capitalGains.shortTermGains,
      longTermGains: taxData.capitalGains.longTermGains,
      totalTaxableAmount: taxData.summary.totalTaxableAmount,
      estimatedTaxLiability: taxData.summary.estimatedTaxLiability,
    },
    details: {
      distributions: taxData.distributions,
      capitalGains: taxData.capitalGains,
    },
    notes: [
      'This is a summary for informational purposes only',
      'Please consult with a tax professional for tax advice',
      'Official tax forms will be mailed by January 31st',
    ],
  };
}

/**
 * Calculate estimated tax liability (simplified)
 */
function calculateEstimatedTax(
  ordinaryIncome: number,
  shortTermGains: number,
  longTermGains: number
): number {
  // Simplified tax calculation
  // In production, this would use actual tax brackets and rates

  // Ordinary income + short-term gains taxed as ordinary income (assume 24% bracket)
  const ordinaryTax = (ordinaryIncome + shortTermGains) * 0.24;

  // Long-term capital gains taxed at 15% (simplified)
  const capitalGainsTax = longTermGains * 0.15;

  return parseFloat((ordinaryTax + capitalGainsTax).toFixed(2));
}

/**
 * Generate PDF version of tax document
 */
async function generatePDF(
  supabase: any,
  documentId: string,
  documentType: string,
  documentData: any,
  investorId: string
): Promise<string> {
  // In production, this would use a PDF generation library
  // For now, create a placeholder

  const pdfContent = JSON.stringify(documentData, null, 2);
  const filename = `${documentType}_${documentData.taxYear}_${documentId}.pdf`;
  const storagePath = `tax-documents/${investorId}/${filename}`;

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from('tax-documents')
    .upload(storagePath, new TextEncoder().encode(pdfContent), {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (uploadError) {
    console.error('Failed to upload PDF:', uploadError);
    return '';
  }

  // Generate signed URL (valid for 30 days)
  const { data: signedUrlData } = await supabase.storage
    .from('tax-documents')
    .createSignedUrl(storagePath, 2592000); // 30 days

  return signedUrlData?.signedUrl || '';
}
