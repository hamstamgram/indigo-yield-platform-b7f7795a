# INDIGO YIELD PLATFORM - EXPERT ENHANCEMENT RECOMMENDATIONS

> **Analysis Date**: 2025-12-07
> **Prepared By**: Expert Architecture Team
> **Focus**: Admin Controls, Calculation Logic, Data Input Workflow, Historical Data Display

---

## EXECUTIVE SUMMARY

After deep analysis of your platform architecture, we've identified **critical gaps** preventing accurate fund management and **13 high-priority enhancements** needed for proper month-end reporting.

**Current State Issues:**
1. No historical AUM snapshots - data calculated on-the-fly
2. Missing RPC functions for yield distribution
3. No manual adjustment UI for position corrections
4. Performance data depends on pre-populated monthly records
5. No daily yield entry workflow for admins

**Solution Approach:**
Create an **Admin Operations Center** with complete control over:
- Daily AUM entry per fund
- Yield calculation and distribution
- Position adjustments with audit trail
- Monthly report generation and validation

---

## PART 1: ADMIN FUND MANAGEMENT CENTER

### 1.1 New Admin Page: `/admin/fund-operations`

**Purpose:** Single dashboard for all fund management operations

```
┌─────────────────────────────────────────────────────────────────────────┐
│  FUND OPERATIONS CENTER                                    [Dec 2025]   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  SELECT FUND:  [BTC Yield Fund ▼]    DATE: [2025-12-07]         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌───────────────────────┬───────────────────────────────────────────┐ │
│  │  CURRENT STATE        │  DAILY ENTRY                              │ │
│  ├───────────────────────┼───────────────────────────────────────────┤ │
│  │  System AUM: 44.89 BTC│  New Total AUM: [________] BTC            │ │
│  │  Last Update: Dec 6   │                                           │ │
│  │  Active Investors: 14 │  ═══════════════════════════════════════  │ │
│  │                       │  Calculated Yield: 0.1547 BTC (+0.34%)    │ │
│  │  MTD Yield: 1.23%     │                                           │ │
│  │  YTD Yield: 9.86%     │  Gross Yield: 0.1934 BTC                  │ │
│  │                       │  Platform Fees: 0.0387 BTC (20% avg)      │ │
│  │                       │  Net Yield: 0.1547 BTC                    │ │
│  └───────────────────────┴───────────────────────────────────────────┘ │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  INVESTOR DISTRIBUTION PREVIEW                                   │   │
│  ├────────────────┬──────────┬───────────┬──────────┬──────────────┤   │
│  │ Investor       │ Balance  │ Fee Tier  │ Gross    │ Net Yield    │   │
│  ├────────────────┼──────────┼───────────┼──────────┼──────────────┤   │
│  │ Thomas Puech   │ 6.79 BTC │ 0%        │ 0.0231   │ 0.0231 BTC   │   │
│  │ Sam Johnson    │ 5.50 BTC │ 18%       │ 0.0187   │ 0.0154 BTC   │   │
│  │ Matthias Reiser│ 4.98 BTC │ 10%       │ 0.0169   │ 0.0152 BTC   │   │
│  │ Jose Molla     │ 4.81 BTC │ 20%       │ 0.0164   │ 0.0131 BTC   │   │
│  │ ...            │ ...      │ ...       │ ...      │ ...          │   │
│  └────────────────┴──────────┴───────────┴──────────┴──────────────┘   │
│                                                                         │
│  [PREVIEW DISTRIBUTION]   [APPLY YIELD]   [SAVE DRAFT]                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Required Database Changes

```sql
-- 1. Fund Daily AUM History Table
CREATE TABLE fund_daily_aum (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fund_id UUID REFERENCES funds(id) NOT NULL,
  record_date DATE NOT NULL,
  opening_aum NUMERIC(20,8) NOT NULL,
  closing_aum NUMERIC(20,8) NOT NULL,
  gross_yield NUMERIC(20,8) DEFAULT 0,
  net_yield NUMERIC(20,8) DEFAULT 0,
  yield_percentage NUMERIC(10,6) DEFAULT 0,
  total_fees_collected NUMERIC(20,8) DEFAULT 0,
  investor_count INTEGER DEFAULT 0,
  entered_by UUID REFERENCES profiles(id),
  status VARCHAR(20) DEFAULT 'draft', -- draft, applied, adjusted
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  applied_at TIMESTAMPTZ,
  UNIQUE(fund_id, record_date)
);

-- 2. Position Adjustment Log
CREATE TABLE position_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investor_id UUID REFERENCES profiles(id) NOT NULL,
  fund_id UUID REFERENCES funds(id) NOT NULL,
  adjustment_date DATE NOT NULL,
  previous_balance NUMERIC(20,8) NOT NULL,
  new_balance NUMERIC(20,8) NOT NULL,
  adjustment_amount NUMERIC(20,8) NOT NULL,
  adjustment_type VARCHAR(20) NOT NULL, -- yield, correction, rebalance
  reason TEXT NOT NULL,
  approved_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enhanced investor_fund_performance with daily granularity
ALTER TABLE investor_fund_performance
ADD COLUMN daily_yield_applied NUMERIC(20,8) DEFAULT 0,
ADD COLUMN last_yield_date DATE;
```

### 1.3 Yield Distribution RPC Function

```sql
-- Core yield distribution function
CREATE OR REPLACE FUNCTION distribute_daily_yield(
  p_fund_id UUID,
  p_yield_date DATE,
  p_new_aum NUMERIC,
  p_admin_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_aum NUMERIC;
  v_gross_yield NUMERIC;
  v_net_yield NUMERIC := 0;
  v_total_fees NUMERIC := 0;
  v_investor RECORD;
  v_investor_yield NUMERIC;
  v_investor_fee NUMERIC;
  v_investor_net NUMERIC;
  v_result JSONB;
  v_distributions JSONB := '[]'::JSONB;
BEGIN
  -- Calculate current AUM from positions
  SELECT COALESCE(SUM(current_value), 0)
  INTO v_current_aum
  FROM investor_positions
  WHERE fund_id = p_fund_id AND current_value > 0;

  -- Calculate gross yield
  v_gross_yield := p_new_aum - v_current_aum;

  IF v_gross_yield <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'New AUM must be greater than current AUM for positive yield'
    );
  END IF;

  -- Process each investor
  FOR v_investor IN
    SELECT
      ip.investor_id,
      ip.current_value,
      ip.current_value / NULLIF(v_current_aum, 0) as allocation_pct,
      COALESCE(p.fee_percentage, 0.20) as fee_pct
    FROM investor_positions ip
    JOIN profiles p ON p.id = ip.investor_id
    WHERE ip.fund_id = p_fund_id AND ip.current_value > 0
  LOOP
    -- Calculate proportional yield
    v_investor_yield := v_gross_yield * v_investor.allocation_pct;

    -- Calculate fee (only on positive yield)
    v_investor_fee := v_investor_yield * v_investor.fee_pct;
    v_investor_net := v_investor_yield - v_investor_fee;

    -- Update position
    UPDATE investor_positions
    SET current_value = current_value + v_investor_net,
        updated_at = NOW()
    WHERE investor_id = v_investor.investor_id
      AND fund_id = p_fund_id;

    -- Create INTEREST transaction
    INSERT INTO transactions_v2 (
      investor_id, fund_id, type, asset, amount, tx_date, notes
    )
    SELECT
      v_investor.investor_id,
      p_fund_id,
      'INTEREST',
      f.asset,
      v_investor_net,
      p_yield_date,
      'Daily yield distribution'
    FROM funds f WHERE f.id = p_fund_id;

    -- Create FEE transaction if fee > 0
    IF v_investor_fee > 0 THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, asset, amount, tx_date, notes
      )
      SELECT
        v_investor.investor_id,
        p_fund_id,
        'FEE',
        f.asset,
        v_investor_fee,
        p_yield_date,
        'Performance fee (' || (v_investor.fee_pct * 100)::TEXT || '%)'
      FROM funds f WHERE f.id = p_fund_id;
    END IF;

    -- Track totals
    v_net_yield := v_net_yield + v_investor_net;
    v_total_fees := v_total_fees + v_investor_fee;

    -- Add to distributions array
    v_distributions := v_distributions || jsonb_build_object(
      'investor_id', v_investor.investor_id,
      'previous_balance', v_investor.current_value,
      'gross_yield', v_investor_yield,
      'fee', v_investor_fee,
      'net_yield', v_investor_net,
      'new_balance', v_investor.current_value + v_investor_net
    );
  END LOOP;

  -- Record in fund_daily_aum
  INSERT INTO fund_daily_aum (
    fund_id, record_date, opening_aum, closing_aum,
    gross_yield, net_yield, yield_percentage,
    total_fees_collected, investor_count, entered_by, status, applied_at
  )
  VALUES (
    p_fund_id, p_yield_date, v_current_aum, p_new_aum,
    v_gross_yield, v_net_yield,
    (v_gross_yield / NULLIF(v_current_aum, 0)) * 100,
    v_total_fees,
    (SELECT COUNT(*) FROM investor_positions WHERE fund_id = p_fund_id AND current_value > 0),
    p_admin_id, 'applied', NOW()
  )
  ON CONFLICT (fund_id, record_date) DO UPDATE SET
    closing_aum = EXCLUDED.closing_aum,
    gross_yield = EXCLUDED.gross_yield,
    net_yield = EXCLUDED.net_yield,
    yield_percentage = EXCLUDED.yield_percentage,
    total_fees_collected = EXCLUDED.total_fees_collected,
    status = 'applied',
    applied_at = NOW();

  RETURN jsonb_build_object(
    'success', true,
    'current_aum', v_current_aum,
    'new_aum', p_new_aum,
    'gross_yield', v_gross_yield,
    'net_yield', v_net_yield,
    'total_fees', v_total_fees,
    'yield_percentage', (v_gross_yield / NULLIF(v_current_aum, 0)) * 100,
    'investor_count', jsonb_array_length(v_distributions),
    'distributions', v_distributions
  );
END;
$$;
```

---

## PART 2: CALCULATION LOGIC IMPROVEMENTS

### 2.1 Current Issues

| Issue | Current Behavior | Required Behavior |
|-------|------------------|-------------------|
| AUM Calculation | Sum of positions (real-time) | Store daily snapshots |
| Yield Distribution | Manual per-investor | Automatic pro-rata |
| Fee Extraction | Hardcoded percentages | Use investor.fee_percentage |
| Position Updates | No audit trail | Full adjustment history |
| Performance Tracking | Monthly only | Daily + monthly rollups |

### 2.2 Enhanced Calculation Service

```typescript
// src/services/yieldCalculationService.ts

export interface YieldCalculationInput {
  fundId: string;
  targetDate: Date;
  newTotalAUM: number;
}

export interface YieldDistribution {
  investorId: string;
  investorName: string;
  currentBalance: number;
  allocationPercentage: number;
  feePercentage: number;
  grossYield: number;
  feeAmount: number;
  netYield: number;
  newBalance: number;
}

export interface YieldCalculationResult {
  fundId: string;
  fundCode: string;
  fundAsset: string;
  date: Date;
  currentAUM: number;
  newAUM: number;
  grossYield: number;
  netYield: number;
  totalFees: number;
  yieldPercentage: number;
  investorCount: number;
  distributions: YieldDistribution[];
  status: 'preview' | 'applied';
}

export const yieldCalculationService = {
  /**
   * Preview yield distribution without applying changes
   */
  async previewYieldDistribution(
    input: YieldCalculationInput
  ): Promise<YieldCalculationResult> {
    const { fundId, targetDate, newTotalAUM } = input;

    // 1. Get fund details
    const { data: fund } = await supabase
      .from('funds')
      .select('id, code, asset, name')
      .eq('id', fundId)
      .single();

    // 2. Get all active positions with investor fee rates
    const { data: positions } = await supabase
      .from('investor_positions')
      .select(`
        investor_id,
        current_value,
        profiles!inner(
          id,
          first_name,
          last_name,
          fee_percentage
        )
      `)
      .eq('fund_id', fundId)
      .gt('current_value', 0);

    // 3. Calculate current AUM
    const currentAUM = positions?.reduce(
      (sum, p) => sum + (p.current_value || 0), 0
    ) || 0;

    // 4. Calculate gross yield
    const grossYield = newTotalAUM - currentAUM;

    if (grossYield <= 0) {
      throw new Error('New AUM must exceed current AUM for positive yield');
    }

    // 5. Calculate per-investor distribution
    const distributions: YieldDistribution[] = positions?.map(pos => {
      const allocationPct = pos.current_value / currentAUM;
      const investorGrossYield = grossYield * allocationPct;
      const feeRate = pos.profiles?.fee_percentage ?? 0.20;
      const feeAmount = investorGrossYield * feeRate;
      const netYield = investorGrossYield - feeAmount;

      return {
        investorId: pos.investor_id,
        investorName: `${pos.profiles?.first_name || ''} ${pos.profiles?.last_name || ''}`.trim(),
        currentBalance: pos.current_value,
        allocationPercentage: allocationPct * 100,
        feePercentage: feeRate * 100,
        grossYield: investorGrossYield,
        feeAmount,
        netYield,
        newBalance: pos.current_value + netYield,
      };
    }) || [];

    // 6. Calculate totals
    const totalFees = distributions.reduce((sum, d) => sum + d.feeAmount, 0);
    const netYield = distributions.reduce((sum, d) => sum + d.netYield, 0);

    return {
      fundId,
      fundCode: fund?.code || '',
      fundAsset: fund?.asset || '',
      date: targetDate,
      currentAUM,
      newAUM: newTotalAUM,
      grossYield,
      netYield,
      totalFees,
      yieldPercentage: (grossYield / currentAUM) * 100,
      investorCount: distributions.length,
      distributions,
      status: 'preview',
    };
  },

  /**
   * Apply yield distribution (calls RPC function)
   */
  async applyYieldDistribution(
    input: YieldCalculationInput,
    adminId: string
  ): Promise<YieldCalculationResult> {
    const { fundId, targetDate, newTotalAUM } = input;

    const { data, error } = await supabase.rpc('distribute_daily_yield', {
      p_fund_id: fundId,
      p_yield_date: formatDate(targetDate),
      p_new_aum: newTotalAUM,
      p_admin_id: adminId,
    });

    if (error) throw error;
    if (!data.success) throw new Error(data.error);

    return {
      ...data,
      status: 'applied',
    };
  },

  /**
   * Get historical AUM for a fund
   */
  async getFundAUMHistory(
    fundId: string,
    startDate: Date,
    endDate: Date
  ): Promise<FundDailyAUM[]> {
    const { data } = await supabase
      .from('fund_daily_aum')
      .select('*')
      .eq('fund_id', fundId)
      .gte('record_date', formatDate(startDate))
      .lte('record_date', formatDate(endDate))
      .order('record_date', { ascending: true });

    return data || [];
  },
};
```

### 2.3 Monthly Performance Rollup

```typescript
// Called at month-end to populate investor_fund_performance
export async function generateMonthlyPerformance(
  fundId: string,
  year: number,
  month: number
): Promise<void> {
  // 1. Get or create statement period
  const periodId = await getOrCreatePeriod(year, month);

  // 2. Get all daily AUM records for the month
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const dailyRecords = await yieldCalculationService.getFundAUMHistory(
    fundId, startDate, endDate
  );

  // 3. Get investors with positions
  const { data: investors } = await supabase
    .from('investor_positions')
    .select('investor_id, profiles(first_name, last_name)')
    .eq('fund_id', fundId);

  // 4. For each investor, calculate MTD/QTD/YTD
  for (const inv of investors || []) {
    // Get transactions for the period
    const { data: txs } = await supabase
      .from('transactions_v2')
      .select('*')
      .eq('investor_id', inv.investor_id)
      .eq('fund_id', fundId)
      .gte('tx_date', formatDate(startDate))
      .lte('tx_date', formatDate(endDate));

    const deposits = txs?.filter(t => t.type === 'DEPOSIT')
      .reduce((sum, t) => sum + t.amount, 0) || 0;

    const withdrawals = txs?.filter(t => t.type === 'WITHDRAWAL')
      .reduce((sum, t) => sum + t.amount, 0) || 0;

    const interest = txs?.filter(t => t.type === 'INTEREST')
      .reduce((sum, t) => sum + t.amount, 0) || 0;

    // Calculate opening balance (closing from previous month)
    const openingBalance = await getInvestorOpeningBalance(
      inv.investor_id, fundId, startDate
    );

    const closingBalance = openingBalance + deposits - withdrawals + interest;

    const mtdReturn = openingBalance > 0
      ? ((closingBalance - openingBalance - deposits + withdrawals) / openingBalance) * 100
      : 0;

    // Upsert performance record
    await supabase
      .from('investor_fund_performance')
      .upsert({
        user_id: inv.investor_id,
        period_id: periodId,
        fund_name: fundId,
        mtd_beginning_balance: openingBalance,
        mtd_additions: deposits,
        mtd_redemptions: withdrawals,
        mtd_net_income: interest,
        mtd_ending_balance: closingBalance,
        mtd_rate_of_return: mtdReturn,
        // QTD and YTD calculated similarly...
      }, {
        onConflict: 'user_id,period_id,fund_name',
      });
  }
}
```

---

## PART 3: ADMIN MANUAL ADJUSTMENT CAPABILITIES

### 3.1 Position Adjustment UI

```
┌─────────────────────────────────────────────────────────────────────────┐
│  POSITION ADJUSTMENT                                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Investor: [Jose Molla ▼]     Fund: [BTC Yield Fund ▼]                 │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  CURRENT POSITION                                                │   │
│  │  Balance: 4.81 BTC                                               │   │
│  │  Cost Basis: 4.50 BTC                                            │   │
│  │  Unrealized PnL: +0.31 BTC (+6.89%)                             │   │
│  │  Last Updated: 2025-12-06                                        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ADJUSTMENT TYPE:                                                       │
│  ○ Add Yield (positive adjustment)                                     │
│  ○ Remove Yield (negative adjustment)                                  │
│  ○ Correction (fix error)                                              │
│  ● Rebalance (neutral - update balance only)                           │
│                                                                         │
│  New Balance: [4.89_______] BTC                                        │
│  Adjustment: +0.08 BTC                                                 │
│                                                                         │
│  Reason (required):                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Manual correction to match Excel accounting data - reconciled    │   │
│  │ Dec 2025 statement                                               │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ☑ Create audit transaction                                            │
│  ☑ Notify investor via email                                           │
│                                                                         │
│  [CANCEL]                              [APPLY ADJUSTMENT]              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Adjustment Service

```typescript
// src/services/positionAdjustmentService.ts

export type AdjustmentType = 'yield' | 'correction' | 'rebalance' | 'deposit' | 'withdrawal';

export interface PositionAdjustmentInput {
  investorId: string;
  fundId: string;
  adjustmentType: AdjustmentType;
  newBalance: number;
  reason: string;
  createTransaction: boolean;
  notifyInvestor: boolean;
}

export async function adjustPosition(
  input: PositionAdjustmentInput,
  adminId: string
): Promise<{ success: boolean; adjustment: PositionAdjustment }> {
  const { investorId, fundId, adjustmentType, newBalance, reason } = input;

  // 1. Get current position
  const { data: position } = await supabase
    .from('investor_positions')
    .select('*, funds(asset, code)')
    .eq('investor_id', investorId)
    .eq('fund_id', fundId)
    .single();

  if (!position) {
    throw new Error('Position not found');
  }

  const previousBalance = position.current_value;
  const adjustmentAmount = newBalance - previousBalance;

  // 2. Update position
  await supabase
    .from('investor_positions')
    .update({
      current_value: newBalance,
      updated_at: new Date().toISOString(),
    })
    .eq('investor_id', investorId)
    .eq('fund_id', fundId);

  // 3. Log adjustment
  const { data: adjustment } = await supabase
    .from('position_adjustments')
    .insert({
      investor_id: investorId,
      fund_id: fundId,
      adjustment_date: new Date().toISOString().split('T')[0],
      previous_balance: previousBalance,
      new_balance: newBalance,
      adjustment_amount: adjustmentAmount,
      adjustment_type: adjustmentType,
      reason,
      approved_by: adminId,
    })
    .select()
    .single();

  // 4. Create transaction if requested
  if (input.createTransaction) {
    const txType = adjustmentAmount >= 0 ? 'INTEREST' : 'FEE';
    await supabase
      .from('transactions_v2')
      .insert({
        investor_id: investorId,
        fund_id: fundId,
        type: txType,
        asset: position.funds.asset,
        amount: Math.abs(adjustmentAmount),
        tx_date: new Date().toISOString().split('T')[0],
        notes: `Position adjustment: ${reason}`,
      });
  }

  // 5. Notify investor if requested
  if (input.notifyInvestor) {
    await sendAdjustmentNotification(investorId, adjustment);
  }

  return { success: true, adjustment };
}
```

---

## PART 4: MONTH-END REPORTING WORKFLOW

### 4.1 Complete Month-End Checklist

```
┌─────────────────────────────────────────────────────────────────────────┐
│  MONTH-END CLOSE: NOVEMBER 2025                        [Progress: 60%] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ☑ Step 1: Import all daily AUM entries                    [Completed] │
│     → 30 days entered, 0 missing                                        │
│                                                                         │
│  ☑ Step 2: Verify all yield distributions applied          [Completed] │
│     → Total yield distributed: 1.34 BTC, 23.4 ETH, 42K USDT            │
│                                                                         │
│  ☐ Step 3: Reconcile positions with Excel                [In Progress] │
│     → 32/37 investors reconciled                                        │
│     → 5 investors need adjustment                                       │
│     → [VIEW DISCREPANCIES]                                              │
│                                                                         │
│  ☐ Step 4: Review and apply position adjustments             [Pending] │
│     → [OPEN ADJUSTMENT QUEUE]                                           │
│                                                                         │
│  ☐ Step 5: Generate monthly performance records              [Pending] │
│     → Statement period: November 2025                                   │
│     → [GENERATE PERFORMANCE DATA]                                       │
│                                                                         │
│  ☐ Step 6: Preview investor reports                          [Pending] │
│     → [PREVIEW ALL REPORTS]                                             │
│                                                                         │
│  ☐ Step 7: Approve and send reports                          [Pending] │
│     → [SEND TO ALL INVESTORS]                                           │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  [BACK TO DASHBOARD]     [EXPORT AUDIT LOG]     [CLOSE MONTH]          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Reconciliation Service

```typescript
// src/services/reconciliationService.ts

export interface ReconciliationResult {
  investorId: string;
  investorName: string;
  fundId: string;
  fundCode: string;
  systemBalance: number;
  expectedBalance: number;
  variance: number;
  variancePercent: number;
  status: 'matched' | 'discrepancy' | 'missing';
  suggestedAction: string;
}

export async function reconcileWithExternalData(
  fundId: string,
  externalData: Map<string, number>, // investorId -> expected balance
  tolerancePercent: number = 0.01 // 1% tolerance
): Promise<ReconciliationResult[]> {
  // Get all system positions
  const { data: positions } = await supabase
    .from('investor_positions')
    .select(`
      investor_id,
      current_value,
      profiles(first_name, last_name),
      funds(code, asset)
    `)
    .eq('fund_id', fundId);

  const results: ReconciliationResult[] = [];

  for (const pos of positions || []) {
    const expectedBalance = externalData.get(pos.investor_id) || 0;
    const systemBalance = pos.current_value || 0;
    const variance = systemBalance - expectedBalance;
    const variancePercent = expectedBalance > 0
      ? Math.abs(variance / expectedBalance) * 100
      : 0;

    let status: ReconciliationResult['status'];
    let suggestedAction: string;

    if (variancePercent <= tolerancePercent) {
      status = 'matched';
      suggestedAction = 'No action required';
    } else if (variance > 0) {
      status = 'discrepancy';
      suggestedAction = `Reduce balance by ${variance.toFixed(4)} ${pos.funds.asset}`;
    } else {
      status = 'discrepancy';
      suggestedAction = `Increase balance by ${Math.abs(variance).toFixed(4)} ${pos.funds.asset}`;
    }

    results.push({
      investorId: pos.investor_id,
      investorName: `${pos.profiles.first_name} ${pos.profiles.last_name}`,
      fundId,
      fundCode: pos.funds.code,
      systemBalance,
      expectedBalance,
      variance,
      variancePercent,
      status,
      suggestedAction,
    });
  }

  // Check for missing investors (in external data but not in system)
  for (const [investorId, expectedBalance] of externalData) {
    if (!positions?.find(p => p.investor_id === investorId)) {
      results.push({
        investorId,
        investorName: 'Unknown',
        fundId,
        fundCode: '',
        systemBalance: 0,
        expectedBalance,
        variance: -expectedBalance,
        variancePercent: 100,
        status: 'missing',
        suggestedAction: `Create position with balance ${expectedBalance}`,
      });
    }
  }

  return results.sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));
}
```

---

## PART 5: HISTORICAL DATA DISPLAY

### 5.1 Investor Portal Enhancement

```
┌─────────────────────────────────────────────────────────────────────────┐
│  MY PORTFOLIO                                           Welcome, Jose  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  TOTAL PORTFOLIO VALUE                                                  │
│  ══════════════════════════════════════════════════════════════════════ │
│                                                                         │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐                    │
│  │ 4.81    │  │ 68.10   │  │ 88.73   │  │ 294     │                    │
│  │ BTC     │  │ ETH     │  │ SOL     │  │ USDT    │                    │
│  │ +5.45%  │  │ +1.19%  │  │ +7.37%  │  │ +0.12%  │                    │
│  │ ITD     │  │ ITD     │  │ ITD     │  │ ITD     │                    │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘                    │
│                                                                         │
│  ══════════════════════════════════════════════════════════════════════ │
│                                                                         │
│  PERFORMANCE HISTORY                            [MTD ▾] [Chart ▾]      │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                           BTC Balance                            │   │
│  │  4.9 ─┐                                                    ●     │   │
│  │       │                                               ●──●       │   │
│  │  4.7 ─┤                                          ●──●            │   │
│  │       │                                     ●──●                  │   │
│  │  4.5 ─┤                               ●──●                        │   │
│  │       │                          ●──●                             │   │
│  │  4.3 ─┤                     ●──●                                  │   │
│  │       │               ●──●●                                       │   │
│  │  4.1 ─┤          ●──●                                             │   │
│  │       │     ●──●                                                  │   │
│  │  3.9 ─┴──●●                                                       │   │
│  │     Aug  Sep  Oct  Nov  Dec  Jan  Feb  Mar  Apr  May  Jun  Jul   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  MONTHLY STATEMENTS                                                     │
│  ┌────────────┬───────────┬───────────┬───────────┬─────────────────┐  │
│  │ Month      │ Opening   │ Yield     │ Closing   │ Actions         │  │
│  ├────────────┼───────────┼───────────┼───────────┼─────────────────┤  │
│  │ Dec 2025   │ 4.78 BTC  │ +0.03 BTC │ 4.81 BTC  │ [View] [PDF]    │  │
│  │ Nov 2025   │ 4.74 BTC  │ +0.04 BTC │ 4.78 BTC  │ [View] [PDF]    │  │
│  │ Oct 2025   │ 3.77 BTC  │ +0.02 BTC │ 4.74 BTC* │ [View] [PDF]    │  │
│  │ Sep 2025   │ 3.73 BTC  │ +0.04 BTC │ 3.77 BTC  │ [View] [PDF]    │  │
│  │ ...        │ ...       │ ...       │ ...       │ ...             │  │
│  └────────────┴───────────┴───────────┴───────────┴─────────────────┘  │
│  * Includes +1.00 BTC deposit                                          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Historical Data Hook

```typescript
// src/hooks/useInvestorHistory.ts

export function useInvestorHistory(investorId: string, fundId?: string) {
  const [history, setHistory] = useState<PerformanceHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      setLoading(true);

      // Fetch all performance records for investor
      let query = supabase
        .from('investor_fund_performance')
        .select(`
          *,
          statement_periods(year, month, period_end_date)
        `)
        .eq('user_id', investorId)
        .order('statement_periods(period_end_date)', { ascending: false });

      if (fundId) {
        query = query.eq('fund_name', fundId);
      }

      const { data, error } = await query;

      if (!error && data) {
        // Transform to chart-friendly format
        const transformed = data.map(record => ({
          date: record.statement_periods?.period_end_date,
          month: `${record.statement_periods?.year}-${String(record.statement_periods?.month).padStart(2, '0')}`,
          fundId: record.fund_name,
          openingBalance: record.mtd_beginning_balance,
          additions: record.mtd_additions,
          withdrawals: record.mtd_redemptions,
          yield: record.mtd_net_income,
          closingBalance: record.mtd_ending_balance,
          returnRate: record.mtd_rate_of_return,
        }));

        setHistory(transformed);
      }

      setLoading(false);
    }

    fetchHistory();
  }, [investorId, fundId]);

  // Calculate ITD metrics
  const itdMetrics = useMemo(() => {
    if (history.length === 0) return null;

    const firstRecord = history[history.length - 1];
    const lastRecord = history[0];

    const totalDeposits = history.reduce((sum, r) => sum + r.additions, 0);
    const totalWithdrawals = history.reduce((sum, r) => sum + r.withdrawals, 0);
    const totalYield = history.reduce((sum, r) => sum + r.yield, 0);

    return {
      startDate: firstRecord.date,
      endDate: lastRecord.date,
      startingBalance: firstRecord.openingBalance,
      currentBalance: lastRecord.closingBalance,
      totalDeposits,
      totalWithdrawals,
      totalYield,
      netContribution: totalDeposits - totalWithdrawals,
      itdReturn: firstRecord.openingBalance > 0
        ? (totalYield / firstRecord.openingBalance) * 100
        : 0,
    };
  }, [history]);

  return { history, itdMetrics, loading };
}
```

---

## PART 6: FUND AUM TRACKING

### 6.1 Fund AUM Dashboard Component

```tsx
// src/components/admin/FundAUMDashboard.tsx

export function FundAUMDashboard() {
  const [selectedFund, setSelectedFund] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({ start: startOfMonth, end: today });

  const { data: funds } = useFunds();
  const { data: aumHistory } = useFundAUMHistory(selectedFund, dateRange);

  return (
    <div className="space-y-6">
      {/* Fund Selector */}
      <div className="flex gap-4">
        {funds?.map(fund => (
          <FundCard
            key={fund.id}
            fund={fund}
            selected={selectedFund === fund.id}
            onClick={() => setSelectedFund(fund.id)}
          />
        ))}
      </div>

      {/* AUM Chart */}
      {selectedFund && (
        <Card>
          <CardHeader>
            <CardTitle>AUM History - {getFundName(selectedFund)}</CardTitle>
          </CardHeader>
          <CardContent>
            <AUMLineChart data={aumHistory} />
          </CardContent>
        </Card>
      )}

      {/* Daily Entries Table */}
      {selectedFund && (
        <Card>
          <CardHeader>
            <CardTitle>Daily AUM Entries</CardTitle>
            <Button onClick={() => openNewEntryDialog()}>
              + Add Entry
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Opening AUM</TableHead>
                  <TableHead>Closing AUM</TableHead>
                  <TableHead>Yield</TableHead>
                  <TableHead>Yield %</TableHead>
                  <TableHead>Fees</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aumHistory?.map(entry => (
                  <TableRow key={entry.id}>
                    <TableCell>{formatDate(entry.record_date)}</TableCell>
                    <TableCell>{formatNumber(entry.opening_aum)}</TableCell>
                    <TableCell>{formatNumber(entry.closing_aum)}</TableCell>
                    <TableCell className="text-green-600">
                      +{formatNumber(entry.net_yield)}
                    </TableCell>
                    <TableCell>{entry.yield_percentage.toFixed(4)}%</TableCell>
                    <TableCell>{formatNumber(entry.total_fees_collected)}</TableCell>
                    <TableCell>
                      <Badge variant={entry.status === 'applied' ? 'success' : 'warning'}>
                        {entry.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">View</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

---

## PART 7: IMPLEMENTATION ROADMAP

### Phase 1: Database & Backend (Week 1)

| Task | Priority | Effort |
|------|----------|--------|
| Create `fund_daily_aum` table | HIGH | 1 day |
| Create `position_adjustments` table | HIGH | 1 day |
| Implement `distribute_daily_yield` RPC | HIGH | 2 days |
| Create `generate_monthly_performance` RPC | MEDIUM | 1 day |
| Add audit logging to all adjustments | HIGH | 1 day |

### Phase 2: Admin UI (Week 2)

| Task | Priority | Effort |
|------|----------|--------|
| Build Fund Operations Center page | HIGH | 2 days |
| Build Position Adjustment dialog | HIGH | 1 day |
| Build Month-End Checklist page | MEDIUM | 1 day |
| Build Reconciliation Queue | MEDIUM | 1 day |

### Phase 3: Investor Portal (Week 3)

| Task | Priority | Effort |
|------|----------|--------|
| Add historical performance chart | MEDIUM | 1 day |
| Add monthly statement viewer | MEDIUM | 1 day |
| Add ITD metrics display | LOW | 1 day |
| Add export functionality | LOW | 1 day |

### Phase 4: Integration & Testing (Week 4)

| Task | Priority | Effort |
|------|----------|--------|
| Import historical data from Excel | HIGH | 1 day |
| End-to-end testing | HIGH | 2 days |
| Documentation | MEDIUM | 1 day |
| User training | MEDIUM | 1 day |

---

## PART 8: IMMEDIATE NEXT STEPS

### Step 1: Create Migration Script

```bash
# Run this to create the new tables
supabase migration new fund_operations_tables
```

### Step 2: Deploy RPC Functions

```bash
# Deploy to Supabase
supabase functions deploy distribute_daily_yield
```

### Step 3: Import Historical Data

```bash
# Execute the prepared migration
supabase db push
```

### Step 4: Build Admin UI

```bash
# Create new admin page
mkdir -p src/routes/admin/fund-operations
touch src/routes/admin/fund-operations/FundOperationsPage.tsx
```

---

## APPENDIX: KEY FILE LOCATIONS

| Component | Location |
|-----------|----------|
| Admin Routes | `src/routes/admin/` |
| Services | `src/services/` |
| Hooks | `src/hooks/` |
| Components | `src/components/` |
| Migrations | `supabase/migrations/` |
| API Services | `src/services/api/` |

---

*Document prepared by Expert Architecture Team*
*Date: 2025-12-07*
*Classification: Internal - Platform Enhancement*
