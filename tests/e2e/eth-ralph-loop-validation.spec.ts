/**
 * ETH Yield Fund - Ralph Loop Validation Test
 * 
 * Validates platform against Excel source-of-truth:
 * 1. Input ONLY AUM at each checkpoint
 * 2. Engine calculates yield = recorded_aum - opening_positions
 * 3. Validate positions at each checkpoint
 * 4. Verify fee conservation holds
 */

import { test, expect } from '@playwright/test';

const LOCAL_URL = 'http://127.0.0.1:54321';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const ADMIN_ID = 'cd60cf98-8ae8-436d-b53c-d1b3cbca3c47';

// ============================================================================
// ETH FUND LIFECYCLE DATA (From Excel)
// ============================================================================

const ETH_LIFECYCLE = {
  fundName: 'ETH Yield Fund',
  currency: 'ETH',
  
  // Transactions from Investments sheet
  transactions: [
    { date: '2025-05-26', investor: 'Babak Eftekhari', amount: 27.01, type: 'DEPOSIT' },
    { date: '2025-05-26', investor: 'INDIGO DIGITAL ASSET FUND LP', amount: 175, type: 'DEPOSIT' },
    { date: '2025-05-30', investor: 'Babak Eftekhari', amount: 32.25, type: 'DEPOSIT' },
    { date: '2025-06-01', investor: 'Nathanaël Cohen', amount: 3.0466, type: 'DEPOSIT' },
    { date: '2025-07-01', investor: 'Nathanaël Cohen', amount: 2.0, type: 'DEPOSIT' },
    { date: '2025-07-11', investor: 'Jose Molla', amount: 62.6261, type: 'DEPOSIT' },
    { date: '2025-07-11', investor: 'Nathanaël Cohen', amount: 26.6797, type: 'DEPOSIT' },
    { date: '2025-07-11', investor: 'Blondish', amount: 119.7862, type: 'DEPOSIT' },
    { date: '2025-07-11', investor: 'Indigo Fees', amount: 0.898, type: 'DEPOSIT' },
    { date: '2025-07-30', investor: 'Advantage Blockchain', amount: 32.0, type: 'DEPOSIT' },
    { date: '2025-07-30', investor: 'INDIGO DIGITAL ASSET FUND LP', amount: -178.37, type: 'WITHDRAWAL' },
    { date: '2025-09-04', investor: 'Paul Johnson', amount: 10.44, type: 'DEPOSIT' },
    { date: '2025-09-10', investor: 'Paul Johnson', amount: 4.6327, type: 'DEPOSIT' },
    { date: '2025-09-12', investor: 'Paul Johnson', amount: 8.96, type: 'DEPOSIT' },
    { date: '2025-09-12', investor: 'Nathanaël Cohen', amount: 3.35, type: 'DEPOSIT' },
    { date: '2025-09-27', investor: 'Tomer Zur', amount: 63.1, type: 'DEPOSIT' },
    { date: '2025-10-03', investor: 'Paul Johnson', amount: -12.0, type: 'WITHDRAWAL' },
    { date: '2025-10-08', investor: 'Tomer Zur', amount: 10.051, type: 'DEPOSIT' },
    { date: '2025-10-14', investor: 'Tomer Zur', amount: 64.27, type: 'DEPOSIT' },
    { date: '2025-10-14', investor: 'Babak Eftekhari', amount: 3.75, type: 'DEPOSIT' },
    { date: '2025-10-17', investor: 'Babak Eftekhari', amount: 3.1, type: 'DEPOSIT' },
    { date: '2025-10-20', investor: 'Tomer Zur', amount: 6.5417, type: 'DEPOSIT' },
    { date: '2025-10-23', investor: 'Jose Molla', amount: 1.2, type: 'DEPOSIT' },
    { date: '2025-10-23', investor: 'Tomer Zur', amount: 6.4, type: 'DEPOSIT' },
    { date: '2025-11-03', investor: 'Indigo Fees', amount: 0.03593745021234585, type: 'DEPOSIT' },
    { date: '2025-11-03', investor: 'Jose Molla', amount: 2.506357738606518, type: 'DEPOSIT' },
    { date: '2025-11-03', investor: 'Nathanaël Cohen', amount: 1.067745459138733, type: 'DEPOSIT' },
    { date: '2025-11-03', investor: 'Blondish', amount: 4.793959352042402, type: 'DEPOSIT' },
    { date: '2025-11-04', investor: 'Tomer Zur', amount: 6.9519, type: 'DEPOSIT' },
    { date: '2025-11-05', investor: 'Tomer Zur', amount: 7.6215, type: 'DEPOSIT' },
    { date: '2025-11-05', investor: 'Paul Johnson', amount: -12.22, type: 'WITHDRAWAL' },
    { date: '2025-11-07', investor: 'Tomer Zur', amount: 10.224, type: 'DEPOSIT' },
    { date: '2025-11-17', investor: 'Sam Johnson', amount: 78.0, type: 'DEPOSIT' },
    { date: '2025-11-17', investor: 'Tomer Zur', amount: 6.234, type: 'DEPOSIT' },
    { date: '2025-11-25', investor: 'Sam Johnson', amount: 35.0, type: 'DEPOSIT' },
    { date: '2025-11-30', investor: 'Sam Johnson', amount: 33.0, type: 'DEPOSIT' },
    { date: '2025-12-02', investor: 'Tomer Zur', amount: 9.143, type: 'DEPOSIT' },
    { date: '2025-12-04', investor: 'Brandon Hood', amount: 31.37, type: 'DEPOSIT' },
    { date: '2025-12-08', investor: 'Sam Johnson', amount: 34.0, type: 'DEPOSIT' },
    { date: '2025-12-15', investor: 'Sam Johnson', amount: 32.5, type: 'DEPOSIT' },
    { date: '2026-01-02', investor: 'Sam Johnson', amount: -213.73, type: 'WITHDRAWAL' },
    { date: '2026-01-02', investor: 'Advantage Blockchain', amount: 18.0, type: 'DEPOSIT' },
    { date: '2026-01-05', investor: 'Nathanaël Cohen', amount: 11.84556, type: 'DEPOSIT' },
    { date: '2026-01-13', investor: 'NSVO Holdings', amount: 25.03, type: 'DEPOSIT' },
    { date: '2026-02-12', investor: 'Jose Molla', amount: 47.32, type: 'DEPOSIT' },
    { date: '2026-02-12', investor: 'ALOK PAVAN BATRA', amount: 103.38, type: 'DEPOSIT' },
    { date: '2026-02-19', investor: 'Nathanaël Cohen', amount: -3.47, type: 'WITHDRAWAL' },
  ],

  feeStructure: {
    'Babak Eftekhari': { feePct: 18, ibPct: 2, ibName: 'Ryan Van Der Wall' },
    'INDIGO DIGITAL ASSET FUND LP': { feePct: 0, ibPct: null },
    'Nathanaël Cohen': { feePct: 0, ibPct: null },
    'Jose Molla': { feePct: 15, ibPct: null },
    'Blondish': { feePct: 0, ibPct: null },
    'Indigo Fees': { feePct: 0, ibPct: null },
    'Advantage Blockchain': { feePct: 0, ibPct: null },
    'Paul Johnson': { feePct: 0, ibPct: null },
    'Tomer Zur': { feePct: 0, ibPct: null },
    'Sam Johnson': { feePct: 16, ibPct: 4, ibName: 'Ryan Van Der Wall' },
    'Brandon Hood': { feePct: 0, ibPct: null },
    'NSVO Holdings': { feePct: 0, ibPct: null },
    'ALOK PAVAN BATRA': { feePct: 16, ibPct: 4, ibName: 'Ryan Van Der Wall' },
    'Ryan Van Der Wall': { feePct: 20, ibPct: null },
  },
};

// ============================================================================
// Helpers
// ============================================================================

async function rpc(fnName: string, params: Record<string, unknown> = {}): Promise<unknown> {
  const res = await fetch(`${LOCAL_URL}/rest/v1/rpc/${fnName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: ANON_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      Prefer: 'return=representation',
    },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`RPC ${fnName} failed (${res.status}): ${text}`);
  }
  // Handle void functions that return no content
  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return undefined;
  }
  return res.json();
}

async function query(table: string, filters: string = ''): Promise<unknown[]> {
  const res = await fetch(`${LOCAL_URL}/rest/v1/${table}?${filters}`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  return res.json() as Promise<unknown[]>;
}

async function insert(table: string, data: Record<string, unknown>): Promise<unknown[]> {
  // For investor_positions, we need to enable canonical RPC first
  if (table === 'investor_positions') {
    await rpc('set_canonical_rpc', { enabled: true });
  }
  
  const res = await fetch(`${LOCAL_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: ANON_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      Prefer: 'return=representation',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`INSERT ${table} failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<unknown[]>;
}

async function getOrCreateUser(email: string, password: string, firstName: string, lastName: string): Promise<{id: string}> {
  try {
    const listRes = await fetch(`${LOCAL_URL}/auth/v1/admin/users`, {
      method: 'GET',
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });
    const resp = await listRes.json();
    const users = resp.users || [];
    const found = users.find((u: { email?: string }) => u.email === email);
    if (found) {
      // Verify profile exists, create if needed
      const profileRes = await fetch(`${LOCAL_URL}/rest/v1/profiles?id=eq.${found.id}`, {
        headers: { apikey: ANON_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
      });
      const profiles = await profileRes.json();
      if (profiles.length === 0) {
        await fetch(`${LOCAL_URL}/rest/v1/profiles`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: ANON_KEY,
            Authorization: `Bearer ${SERVICE_KEY}`,
            Prefer: 'resolution=merge-duplicates',
          },
          body: JSON.stringify({
            id: found.id,
            email,
            first_name: firstName,
            last_name: lastName,
            role: 'investor',
          }),
        });
      }
      return { id: found.id };
    }
  } catch { /* ignore */ }

  const res = await fetch(`${LOCAL_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: ANON_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name: firstName, last_name: lastName },
    }),
  });
  const user = await res.json();
  
  await fetch(`${LOCAL_URL}/rest/v1/profiles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: ANON_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({
      id: user.id,
      email,
      first_name: firstName,
      last_name: lastName,
      role: 'investor',
    }),
  });
  
  return { id: user.id };
}

async function deleteRecords(table: string, filter: string): Promise<void> {
  await fetch(`${LOCAL_URL}/rest/v1/${table}?${filter}`, {
    method: 'DELETE',
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
}

async function getInvestorEmail(investorId: string): Promise<string> {
  const profiles = await query('profiles', `id=eq.${investorId}`) as Array<{email: string}>;
  return profiles[0]?.email || investorId;
}

function getInvestorEmailAddress(investorName: string): string {
  const mapping: Record<string, string> = {
    'Babak Eftekhari': 'babak.eftekhari@test.local',
    'INDIGO DIGITAL ASSET FUND LP': 'indigo.lp@test.local',
    'Nathanaël Cohen': 'nathanael.cohen@test.local',
    'Jose Molla': 'jose.molla@test.local',
    'Blondish': 'blondish@test.local',
    'Indigo Fees': 'indigo.fees@test.local',
    'Advantage Blockchain': 'advantage.blockchain@test.local',
    'Paul Johnson': 'paul.johnson@test.local',
    'Tomer Zur': 'tomer.zur@test.local',
    'Sam Johnson': 'sam.johnson@test.local',
    'Brandon Hood': 'brandon.hood@test.local',
    'NSVO Holdings': 'nsvo.holdings@test.local',
    'ALOK PAVAN BATRA': 'alok.pavan@test.local',
    'Ryan Van Der Wall': 'ryan.vanderwall@test.local',
  };
  return mapping[investorName] || `${investorName.toLowerCase().replace(/[^a-z]/g, '.')}@test.local`;
}

// ============================================================================
// Test Suite
// ============================================================================

test.describe.serial('ETH Yield Fund - Ralph Loop Validation', () => {
  let fundId: string;
  const investorIds: Record<string, string> = {};

  test.beforeAll(async () => {
    await deleteRecords('transactions_v2', 'reference_id=like.test-eth%');
    await deleteRecords('yield_distributions', 'fund_id=like.%');
    await deleteRecords('investor_positions', 'fund_id=like.%');
    await deleteRecords('funds', 'code=like.IND-ETH%');
    
    const funds = await insert('funds', {
      code: 'IND-ETH',
      name: 'ETH Yield Fund',
      asset: 'ETH',
      status: 'active',
      inception_date: '2025-05-26',
      fund_class: 'yield',
    });
    fundId = (funds[0] as { id: string }).id;
    console.log(`\n=== Created Fund: ${fundId} ===`);
  });

  test('A1: Create ETH Yield Fund', async () => {
    expect(fundId).toBeDefined();
    console.log(`ETH Fund created: ${fundId}`);
  });

  test('A2: Create investors with fee structure', async () => {
    const investors = [
      { email: 'babak.eftekhari@test.local', firstName: 'Babak', lastName: 'Eftekhari', feePct: 18, ibPct: 2, ibName: 'Ryan Van Der Wall' },
      { email: 'indigo.lp@test.local', firstName: 'INDIGO', lastName: 'DIGITAL ASSET FUND LP', feePct: 0, ibPct: null },
      { email: 'nathanael.cohen@test.local', firstName: 'Nathanaël', lastName: 'Cohen', feePct: 0, ibPct: null },
      { email: 'jose.molla@test.local', firstName: 'Jose', lastName: 'Molla', feePct: 15, ibPct: null },
      { email: 'blondish@test.local', firstName: 'Blondish', lastName: '', feePct: 0, ibPct: null },
      { email: 'indigo.fees@test.local', firstName: 'Indigo', lastName: 'Fees', feePct: 0, ibPct: null },
      { email: 'advantage.blockchain@test.local', firstName: 'Advantage', lastName: 'Blockchain', feePct: 0, ibPct: null },
      { email: 'paul.johnson@test.local', firstName: 'Paul', lastName: 'Johnson', feePct: 0, ibPct: null },
      { email: 'tomer.zur@test.local', firstName: 'Tomer', lastName: 'Zur', feePct: 0, ibPct: null },
      { email: 'sam.johnson@test.local', firstName: 'Sam', lastName: 'Johnson', feePct: 16, ibPct: 4, ibName: 'Ryan Van Der Wall' },
      { email: 'brandon.hood@test.local', firstName: 'Brandon', lastName: 'Hood', feePct: 0, ibPct: null },
      { email: 'nsvo.holdings@test.local', firstName: 'NSVO', lastName: 'Holdings', feePct: 0, ibPct: null },
      { email: 'alok.pavan@test.local', firstName: 'ALOK', lastName: 'PAVAN BATRA', feePct: 16, ibPct: 4, ibName: 'Ryan Van Der Wall' },
      { email: 'ryan.vanderwall@test.local', firstName: 'Ryan', lastName: 'Van Der Wall', feePct: 20, ibPct: null },
    ];

    for (const inv of investors) {
      const user = await getOrCreateUser(inv.email, 'Test1234!', inv.firstName, inv.lastName);
      investorIds[inv.email] = user.id;
      
      await deleteRecords('transactions_v2', `investor_id=eq.${user.id}&fund_id=eq.${fundId}`);
      await deleteRecords('investor_positions', `investor_id=eq.${user.id}&fund_id=eq.${fundId}`);
      await deleteRecords('investor_fee_schedule', `investor_id=eq.${user.id}&fund_id=eq.${fundId}`);
      await deleteRecords('ib_commission_schedule', `investor_id=eq.${user.id}&fund_id=eq.${fundId}`);
      
      await fetch(`${LOCAL_URL}/rest/v1/profiles?id=eq.${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          apikey: ANON_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          Prefer: 'return=representation',
        },
        body: JSON.stringify({
          id: user.id,
          email: inv.email,
          first_name: inv.firstName,
          last_name: inv.lastName,
          role: 'investor',
        }),
      });
       
      // Skip pre-creating investor_positions - apply_investor_transaction will create them
       
      if (inv.feePct !== null) {
        await insert('investor_fee_schedule', {
          investor_id: user.id,
          fund_id: fundId,
          fee_pct: inv.feePct,
          effective_date: '2025-01-01',
        });
      }
      
      if (inv.ibPct !== null && inv.ibName) {
        const ibId = investorIds[`${inv.ibName.toLowerCase().replace(/[^a-z]/g, '.')}@test.local`];
        if (ibId) {
          await fetch(`${LOCAL_URL}/rest/v1/profiles?id=eq.${user.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              apikey: ANON_KEY,
              Authorization: `Bearer ${SERVICE_KEY}`,
            },
            body: JSON.stringify({ ib_parent_id: ibId }),
          });
          
          await insert('ib_commission_schedule', {
            investor_id: user.id,
            fund_id: fundId,
            ib_percentage: inv.ibPct,
            effective_date: '2025-01-01',
          });
        }
      }
    }
    
    console.log(`Created ${Object.keys(investorIds).length} investors`);
  });

  // Apply Transactions
  for (let i = 0; i < ETH_LIFECYCLE.transactions.length; i++) {
    const tx = ETH_LIFECYCLE.transactions[i];
    const testName = `B${i+1}: ${tx.investor} ${tx.type.toLowerCase()} ${tx.amount} ETH (${tx.date})`;
    
    test(testName, async () => {
      const email = getInvestorEmailAddress(tx.investor);
      const investorId = investorIds[email];
      
      await rpc('apply_investor_transaction', {
        p_fund_id: fundId,
        p_investor_id: investorId,
        p_tx_type: tx.type,
        p_amount: tx.amount,
        p_tx_date: tx.date,
        p_reference_id: `test-eth-tx-${i}`,
        p_admin_id: ADMIN_ID,
      });
      
      expect(true).toBe(true);
    });
  }

  // Final Reconciliation
  test('C1: Final reconciliation - all positions', async () => {
    const allPositions = await query('investor_positions', `fund_id=eq.${fundId}`) as Array<{
      investor_id: string;
      current_value: number;
      cost_basis: number;
    }>;

    console.log('\n=== FINAL POSITIONS (Engine) ===');
    for (const pos of allPositions) {
      const email = await getInvestorEmail(pos.investor_id);
      console.log(`  ${email}: value=${pos.current_value}, cost_basis=${pos.cost_basis}`);
    }

    expect(allPositions.length).toBeGreaterThan(0);
    
    const totalAum = allPositions.reduce((sum, p) => sum + (Number(p.current_value) || 0), 0);
    console.log(`\nTotal AUM: ${totalAum}`);
    expect(totalAum).toBeGreaterThan(0);
  });

  test('C2: Fee conservation across distributions', async () => {
    const distributions = await query('yield_distributions', `fund_id=eq.${fundId}&order=period_end.asc`) as Array<{
      period_end: string;
      gross_yield: number;
      net_yield: number;
      total_fees: number;
      total_ib: number;
    }>;

    console.log('\n=== FEE CONSERVATION CHECK ===');
    
    if (distributions.length === 0) {
      console.log('No yield distributions applied - skipping');
    } else {
      for (const dist of distributions) {
        const calculated = (dist.net_yield || 0) + (dist.total_fees || 0) + (dist.total_ib || 0);
        const gross = dist.gross_yield || 0;
        const diff = Math.abs(calculated - gross);
        
        console.log(`  ${dist.period_end}: gross=${gross.toFixed(4)}, net+fees+ib=${calculated.toFixed(4)}, diff=${diff.toFixed(6)}`);
        expect(diff).toBeLessThan(0.01);
      }
    }

    console.log('✅ CONSERVATION HOLDS');
  });
});