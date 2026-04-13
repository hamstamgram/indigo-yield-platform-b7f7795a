import { SupabaseClient } from '@supabase/supabase-js';
import { ParsedFundData, ExcelTransaction, YieldEvent, AumSnapshot } from './excelParser';
import { TransactionMapper } from './transactionMapper';

interface FinancialTransactionResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

interface EngineState {
  totalAum: number;
  positions: Record<string, number>;
}

interface FundState {
  positions: Record<string, {  // investorId -> position
    currentValue: number;
    costBasis: number;
    shares: number;
    isActive: boolean;
  }>;
  transactions: string[]; // transaction IDs
  yieldDistributions: string[]; // distribution IDs
  engineStates: Record<string, EngineState>; // date -> state snapshot
  yieldEvents: Array<{
    periodEnd: string;
    grossYield: number;
    purpose: string;
  }>;
}

export class FundReplayer {
  private supabase: SupabaseClient;
  private transactionMapper: TransactionMapper;
  private fundId: string;
  private investorIdMap: Map<string, string>; // investorName -> investorId
  private investorIdToName: Map<string, string>; // investorId -> investorName
  private fundState: FundState;
  private adminId: string;

  constructor(supabase: SupabaseClient, adminId: string = 'cd60cf98-8ae8-436d-b53c-d1b3cbca3c47') {
    this.supabase = supabase;
    this.transactionMapper = new TransactionMapper();
    this.fundId = '';
    this.investorIdMap = new Map();
    this.investorIdToName = new Map();
    this.adminId = adminId;
    this.fundState = {
      positions: {},
      transactions: [],
      yieldDistributions: [],
      engineStates: {},
      yieldEvents: [],
    };
  }

  /**
   * Initialize a new fund for replay
   */
  async initializeFund(fundData: ParsedFundData): Promise<string> {
    // Check if fund already exists - if so, delete it to start fresh
    const fundCode = this.getFundCode(fundData.currency);
    const { data: existingFund } = await this.supabase
      .from('funds')
      .select('id')
      .eq('code', fundCode)
      .single();
    
    if (existingFund) {
      // Delete related data first (due to FK constraints)
      // Delete transactions
      await this.supabase.from('transactions_v2').delete().eq('fund_id', existingFund.id);
      // Delete yield distributions
      await this.supabase.from('yield_distributions').delete().eq('fund_id', existingFund.id);
      // Delete investor positions
      await this.supabase.from('investor_positions').delete().eq('fund_id', existingFund.id);
      // Delete fee schedules
      await this.supabase.from('investor_fee_schedule').delete().eq('fund_id', existingFund.id);
      // Delete IB schedules
      await this.supabase.from('ib_commission_schedule').delete().eq('fund_id', existingFund.id);
      // Delete AUM records
      await this.supabase.from('fund_daily_aum').delete().eq('fund_id', existingFund.id);
      // Finally delete the fund
      await this.supabase.from('funds').delete().eq('id', existingFund.id);
    }

    // Create fund record - use timestamp to make asset unique
    const timestamp = Date.now().toString(36).slice(-6);
    const { data: fund, error } = await this.supabase
      .from('funds')
      .insert({
        code: fundCode,
        name: fundData.fundName,
        asset: `${fundData.currency}-TEST-${timestamp}`, // Unique asset to bypass constraint
        status: 'active',
        inception_date: this.getInceptionDate(fundData.transactions),
        fund_class: 'yield',
      })
      .select()
      .single();

    if (error) throw error;
    this.fundId = fund.id;

    // Create investor profiles and positions
    for (const investor of fundData.investors) {
      // Get or create investor ID with profile (required for FK constraints)
      const firstName = investor.name.split(' ')[0] || investor.name;
      const lastName = investor.name.split(' ').slice(1).join(' ') || '';
      const email = `${investor.name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@test.local`;
      
      const investorId = await this.getOrCreateInvestorWithProfile(investor.name);
      this.investorIdMap.set(investor.name, investorId);
      this.investorIdToName.set(investorId, investor.name);

      // Create profile (should already exist from getOrCreateInvestorWithProfile)
      await this.supabase.from('profiles').upsert({
        id: investorId,
        email: email,
        first_name: firstName,
        last_name: lastName,
        role: 'investor',
      }, { onConflict: 'id' });

      // Create initial position
      await this.supabase.from('investor_positions').upsert({
        investor_id: investorId,
        fund_id: this.fundId,
        current_value: 0,
        cost_basis: 0,
        shares: 0,
        is_active: true,
      }, { onConflict: 'investor_id,fund_id' });

      // Set fee schedule
      await this.supabase.from('investor_fee_schedule').upsert({
        investor_id: investorId,
        fund_id: this.fundId,
        fee_pct: investor.feePct,
        effective_date: '2024-01-01',
      }, { onConflict: 'investor_id,fund_id,effective_date' });

      // Set IB schedule if applicable
      if (investor.ibPct !== null && investor.ibPct > 0) {
        await this.supabase.from('ib_commission_schedule').upsert({
          investor_id: investorId,
          fund_id: this.fundId,
          ib_percentage: investor.ibPct,
          effective_date: '2024-01-01',
        }, { onConflict: 'investor_id,fund_id,effective_date' });
      }
    }

    return this.fundId;
  }

  /**
   * Replay the complete fund lifecycle with yield distributions and snapshots
   */
  async replayLifecycle(
    fundData: ParsedFundData,
    yieldEvents: YieldEvent[],
    snapshots: AumSnapshot[]
  ): Promise<FundState> {
    const groupedTxns = this.transactionMapper.groupTransactionsByDate(fundData.transactions);
    const sortedDates = Array.from(groupedTxns.entries()).sort((a, b) => 
      new Date(a[0]).getTime() - new Date(b[0]).getTime()
    );

    // Capture initial state
    await this.captureState(sortedDates[0]?.[0] || '1970-01-01');

    for (const [dateString, transactions] of sortedDates) {
      // Apply yield distribution BEFORE transactions if there's a yield event for this date
      const yieldForDate = yieldEvents.filter(e => e.date === dateString);
      for (const yieldEvent of yieldForDate) {
        await this.applyYieldDistribution(yieldEvent);
      }

      // Process all transactions for this day
      for (const excelTx of transactions) {
        await this.processTransaction(excelTx, fundData);
      }

      // Capture state after all operations for this date
      await this.captureState(dateString);
    }

    return this.fundState;
  }

  /**
   * Capture current engine state at a given date checkpoint
   */
  private async captureState(date: string): Promise<void> {
    const { data: positions, error } = await this.supabase
      .from('investor_positions')
      .select('investor_id, current_value')
      .eq('fund_id', this.fundId);

    if (error || !positions) {
      console.error(`Failed to capture state for ${date}:`, error);
      return;
    }

    const positionMap: Record<string, number> = {};
    let totalAum = 0;

    for (const pos of positions) {
      const investorName = this.investorIdToName.get(pos.investor_id) || pos.investor_id;
      const value = Number(pos.current_value) || 0;
      positionMap[investorName] = value;
      totalAum += value;
    }

    this.fundState.engineStates[date] = {
      totalAum,
      positions: positionMap,
    };
  }

  /**
   * Apply yield distribution from Excel event data
   */
  async applyYieldDistribution(yieldEvent: YieldEvent): Promise<void> {
    const { data, error } = await this.supabase
      .rpc('apply_segmented_yield_distribution_v5', {
        p_fund_id: this.fundId,
        p_period_end: yieldEvent.date,
        p_recorded_aum: yieldEvent.recordedAum,
        p_purpose: yieldEvent.purpose,
        p_admin_id: this.adminId,
        p_yield_amount: yieldEvent.grossYield,
      });

    if (error) {
      console.error(`Failed to apply yield distribution for ${yieldEvent.date}:`, error.message);
      throw error;
    }

    if (data) {
      this.fundState.yieldDistributions.push(data.id || data.distribution_id || String(data));
      this.fundState.yieldEvents.push({
        periodEnd: yieldEvent.date,
        grossYield: yieldEvent.grossYield,
        purpose: yieldEvent.purpose,
      });
    }
  }

  /**
   * Process a single transaction
   */
  private async processTransaction(excelTx: ExcelTransaction, fundData: ParsedFundData): Promise<void> {
    const investorName = excelTx.investorName;
    const investorId = this.investorIdMap.get(investorName);
    
    if (!investorId) {
      throw new Error(`Investor not found: ${investorName}`);
    }

    // Map to financial transaction format
    const financialTx = this.transactionMapper.mapToFinancialTransaction(
      excelTx, 
      this.fundId, 
      investorId
    );

    // Apply investor transaction via RPC
    // Note: apply_investor_transaction has the PostgREST schema cache bug with 5+ args + enum
    // We use direct Supabase client which can invoke it properly
    const { data, error } = await this.supabase.rpc('apply_investor_transaction', {
      p_investor_id: financialTx.investor_id,
      p_fund_id: financialTx.fund_id,
      p_amount: financialTx.amount,
      p_transaction_type: financialTx.transaction_type,
      p_transaction_date: financialTx.transaction_date,
      p_reference_id: financialTx.metadata?.referenceId || `test-${Date.now()}`,
      p_admin_id: this.adminId,
      p_purpose: 'transaction',
    });

    if (error) {
      throw new Error(`Failed to apply transaction: ${error.message}`);
    }

    if (data) {
      this.fundState.transactions.push(data);
    }
  }

  /**
   * Public method to process a single transaction from Excel
   * Used by the validation test
   */
  async processTransactionFromExcel(excelTx: ExcelTransaction, fundData: ParsedFundData): Promise<void> {
    const investorName = excelTx.investorName;
    const investorId = this.investorIdMap.get(investorName);
    
    if (!investorId) {
      throw new Error(`Investor not found: ${investorName}`);
    }

    const isWithdrawal = excelTx.amount < 0;
    const amount = Math.abs(excelTx.amount);
    const txType = isWithdrawal ? 'WITHDRAWAL' : 'DEPOSIT';
    const referenceId = `test-${excelTx.date}-${excelTx.investorName.replace(/\s+/g, '-')}-${Math.abs(excelTx.amount)}`;

    const { data, error } = await this.supabase.rpc('apply_investor_transaction', {
      p_investor_id: investorId,
      p_fund_id: this.fundId,
      p_tx_type: txType,
      p_amount: amount,
      p_tx_date: excelTx.date,
      p_reference_id: referenceId,
      p_notes: `Test transaction from Excel: ${excelTx.date} ${excelTx.investorName} ${excelTx.amount}`,
      p_admin_id: this.adminId,
      p_purpose: 'transaction',
      p_distribution_id: null,
      p_new_total_aum: null
    });

    if (error) {
      // Log detailed error for debugging
      console.error(`RPC Error details:`, JSON.stringify(error, null, 2));
      throw new Error(`Failed to apply transaction: ${error.message}`);
    }

    if (data) {
      this.fundState.transactions.push(data.tx_id || data.id || JSON.stringify(data));
    }
  }

  /**
   * Create auth user via Supabase Auth Admin API
   */
  private async createAuthUser(email: string, firstName: string, lastName: string): Promise<string> {
    const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
    const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
    
    // Check if user exists
    const checkRes = await fetch('http://127.0.0.1:54321/auth/v1/admin/users', {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    });
    const checkData = await checkRes.json();
    const existingUser = (checkData.users || []).find((u: any) => u.email === email);
    if (existingUser) {
      return existingUser.id;
    }
    
    // Create new user (normalize email to avoid validation issues)
    const normalizedEmail = email.toLowerCase().replace(/[^a-z0-9@.]/g, '_');
    const res = await fetch('http://127.0.0.1:54321/auth/v1/admin/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        email: normalizedEmail,
        password: 'Test1234!',
        email_confirm: true,
        user_metadata: { first_name: firstName, last_name: lastName },
      }),
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to create auth user: ${errorText}`);
    }
    
    const user = await res.json();
    return user.id;
  }

  /**
   * Get or create investor ID with profile - for testing when auth fails
   */
  private async getOrCreateInvestorWithProfile(investorName: string): Promise<string> {
    // Generate deterministic ID from name
    const hash = this.simpleHash(investorName);
    const investorId = `00000000-0000-0000-0000-${hash.toString(16).padStart(12, '0')}`;
    
    // Create profile for this investor (required for FK constraints)
    const firstName = investorName.split(' ')[0] || investorName;
    const lastName = investorName.split(' ').slice(1).join(' ') || '';
    const email = `${investorName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@test.local`;
    
    // Insert into auth.users first (bypassing email validation via direct DB insert)
    try {
      await this.supabase.from('profiles').upsert({
        id: investorId,
        email: email,
        first_name: firstName,
        last_name: lastName,
        role: 'investor',
      });
    } catch (e) {
      // Profile might already exist, continue
    }
    
    return investorId;
  }

  /**
   * Get or create investor ID (in real system, these would come from auth)
   */
  private async getOrCreateInvestor(investorName: string): Promise<string> {
    // For validation purposes, try to create auth user first
    // If that fails, create profile directly in DB
    try {
      return await this.getOrCreateInvestorWithProfile(investorName);
    } catch (e) {
      // Fallback to deterministic ID
      const hash = this.simpleHash(investorName);
      return `00000000-0000-0000-0000-${hash.toString(16).padStart(12, '0')}`;
    }
  }

  /**
   * Simple hash function for generating deterministic IDs
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Get fund code from currency
   */
  private getFundCode(currency: string): string {
    const timestamp = Date.now().toString(36).slice(-4);
    const map: Record<string, string> = {
      'BTC': `IND-BTC-${timestamp}`,
      'BTC Boost': `IND-BTC-Boost-${timestamp}`,
      'BTC TAC': `IND-BTCTAC-${timestamp}`,
      'USDT': `IND-USDT-${timestamp}`,
      'ETH': `IND-ETH-${timestamp}`,
      'ETH TAC': `IND-ETHTAC-${timestamp}`,
      'SOL': `IND-SOL-${timestamp}`,
      'XRP': `IND-XRP-${timestamp}`,
      'Ripple': `IND-XRP-${timestamp}`,
    };
    return map[currency] || `IND-${currency.replace(/\s+/g, '-')}-${timestamp}`;
  }

  /**
   * Get inception date from transactions
   */
  private getInceptionDate(transactions: ExcelTransaction[]): string {
    if (transactions.length === 0) return '2024-01-01';
    const dates = transactions.map(t => new Date(t.date as string));
    const earliest = new Date(Math.min(...dates.map(d => d.getTime())));
    return earliest.toISOString().split('T')[0];
  }

  /**
   * Get current fund state for comparison
   */
  async getCurrentState(): Promise<FundState> {
    // Fetch current positions from database
    const { data: positions, error } = await this.supabase
      .from('investor_positions')
      .select('investor_id, current_value, cost_basis, shares, is_active')
      .eq('fund_id', this.fundId);

    if (error) throw error;
    
    // Convert to map
    const positionMap: Record<string, { 
      currentValue: number; 
      costBasis: number; 
      shares: number; 
      isActive: boolean 
    }> = {};
    
    positions.forEach(pos => {
      positionMap[pos.investor_id] = {
        currentValue: Number(pos.current_value),
        costBasis: Number(pos.cost_basis),
        shares: Number(pos.shares),
        isActive: pos.is_active,
      };
    });

    return {
      positions: positionMap,
      transactions: [...this.fundState.transactions],
      yieldDistributions: [...this.fundState.yieldDistributions],
      engineStates: { ...this.fundState.engineStates },
      yieldEvents: [...this.fundState.yieldEvents],
    };
  }
}
