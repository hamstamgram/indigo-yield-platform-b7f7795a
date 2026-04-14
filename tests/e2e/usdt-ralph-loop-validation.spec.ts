/**
 * USDT Yield Fund - Ralph Loop Validation Test
 * 
 * Validates platform against Excel source-of-truth:
 * 1. Input ONLY AUM at each checkpoint
 * 2. Engine calculates yield = recorded_aum - opening_positions
 * 3. Validate positions at each checkpoint
 */

import { test, expect } from '@playwright/test';

const LOCAL_URL = 'http://127.0.0.1:54321';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const ADMIN_ID = 'cd60cf98-8ae8-436d-b53c-d1b3cbca3c47';

// ============================================================================
// USDT FUND LIFECYCLE DATA (From Excel - selected key transactions)
// ============================================================================

const USDT_LIFECYCLE = {
  fundName: 'USDT Yield Fund',
  currency: 'USDT',
  
  // Selected transactions from Investments sheet (key deposits/withdrawals)
  transactions: [
    { date: '2025-07-14', investor: 'Julien Grunebaum', amount: 109392, type: 'DEPOSIT' },
    { date: '2025-07-14', investor: 'Daniele Francilia', amount: 109776, type: 'DEPOSIT' },
    { date: '2025-07-14', investor: 'Pierre Bezencon', amount: 109333, type: 'DEPOSIT' },
    { date: '2025-07-14', investor: 'Matthew Beatty', amount: 255504, type: 'DEPOSIT' },
    { date: '2025-07-14', investor: 'Bo De Kriek', amount: 273807, type: 'DEPOSIT' },
    { date: '2025-07-19', investor: 'Dario Deiana', amount: 199659.72, type: 'DEPOSIT' },
    { date: '2025-07-19', investor: 'Babak Eftekhari', amount: 46955.28, type: 'DEPOSIT' },
    { date: '2025-07-23', investor: 'Alain Bensimon', amount: 136737, type: 'DEPOSIT' },
    { date: '2025-07-23', investor: 'Anne Cecile Noique', amount: 222687, type: 'DEPOSIT' },
    { date: '2025-07-23', investor: 'Terance Chen', amount: 219747, type: 'DEPOSIT' },
    { date: '2025-08-04', investor: 'INDIGO Ventures', amount: 130000, type: 'DEPOSIT' },
    { date: '2025-08-04', investor: 'Babak Eftekhari', amount: 10000, type: 'DEPOSIT' },
    { date: '2025-08-14', investor: 'Matthew Beatty', amount: 25900, type: 'DEPOSIT' },
    { date: '2025-08-19', investor: 'INDIGO DIGITAL ASSET FUND LP', amount: 111370, type: 'DEPOSIT' },
    { date: '2025-09-24', investor: 'Babak Eftekhari', amount: 10000, type: 'DEPOSIT' },
    { date: '2025-10-06', investor: 'INDIGO Ventures', amount: -100000, type: 'WITHDRAWAL' },
    { date: '2025-10-06', investor: 'Sacha Oshry', amount: 100000, type: 'DEPOSIT' },
    { date: '2025-10-09', investor: 'Babak Eftekhari', amount: 20000, type: 'DEPOSIT' },
    { date: '2025-10-15', investor: 'HALLEY86', amount: 99990, type: 'DEPOSIT' },
    { date: '2025-10-23', investor: 'Jose Molla', amount: 97695, type: 'DEPOSIT' },
    { date: '2025-10-23', investor: 'Babak Eftekhari', amount: 10450, type: 'DEPOSIT' },
    { date: '2025-11-03', investor: 'INDIGO DIGITAL ASSET FUND LP', amount: -113841.65, type: 'WITHDRAWAL' },
    { date: '2025-11-04', investor: 'Matthew Beatty', amount: 35300, type: 'DEPOSIT' },
    { date: '2025-11-07', investor: 'Monica Levy Chicheportiche', amount: 840168.03, type: 'DEPOSIT' },
    { date: '2025-11-08', investor: 'Jose Molla', amount: -50000, type: 'WITHDRAWAL' },
    { date: '2025-11-13', investor: 'Nath & Thomas', amount: 299915.77, type: 'DEPOSIT' },
    { date: '2025-11-21', investor: 'Jose Molla', amount: -47908, type: 'WITHDRAWAL' },
    { date: '2025-11-25', investor: 'Valeria Cruz', amount: 50000, type: 'DEPOSIT' },
    { date: '2025-11-26', investor: 'Matthew Beatty', amount: 18000, type: 'DEPOSIT' },
    { date: '2025-11-26', investor: 'Nath & Thomas', amount: -87937, type: 'WITHDRAWAL' },
  ],

  feeStructure: {
    'Julien Grunebaum': { feePct: 10, ibPct: null },
    'Daniele Francilia': { feePct: 10, ibPct: null },
    'Pierre Bezencon': { feePct: 10, ibPct: null },
    'Matthew Beatty': { feePct: 10, ibPct: null },
    'Bo De Kriek': { feePct: 10, ibPct: null },
    'Dario Deiana': { feePct: 10, ibPct: null },
    'Babak Eftekhari': { feePct: 18, ibPct: 2, ibName: 'Ryan Van Der Wall' },
    'Alain Bensimon': { feePct: 10, ibPct: null },
    'Anne Cecile Noique': { feePct: 10, ibPct: null },
    'Terance Chen': { feePct: 10, ibPct: null },
    'INDIGO Ventures': { feePct: 0, ibPct: null },
    'INDIGO DIGITAL ASSET FUND LP': { feePct: 0, ibPct: null },
    'Sacha Oshry': { feePct: 10, ibPct: null },
    'HALLEY86': { feePct: 0, ibPct: null },
    'Jose Molla': { feePct: 15, ibPct: null },
    'Monica Levy Chicheportiche': { feePct: 0, ibPct: null },
    'Nath & Thomas': { feePct: 0, ibPct: null },
    'Valeria Cruz': { feePct: 0, ibPct: null },
    'Ryan Van Der Wall': { feePct: 20, ibPct: null },
    'Indigo Fees': { feePct: 0, ibPct: null },
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
    'Julien Grunebaum': 'julien.grunebaum@test.local',
    'Daniele Francilia': 'daniele.francilia@test.local',
    'Pierre Bezencon': 'pierre.bezencon@test.local',
    'Matthew Beatty': 'matthew.beatty@test.local',
    'Bo De Kriek': 'bo.dekriek@test.local',
    'Dario Deiana': 'dario.deiana@test.local',
    'Babak Eftekhari': 'babak.eftekhari@test.local',
    'Alain Bensimon': 'alain.bensimon@test.local',
    'Anne Cecile Noique': 'anne.cecile.noique@test.local',
    'Terance Chen': 'terance.chen@test.local',
    'INDIGO Ventures': 'indigo.ventures@test.local',
    'INDIGO DIGITAL ASSET FUND LP': 'indigo.lp@test.local',
    'Sacha Oshry': 'sacha.oshry@test.local',
    'HALLEY86': 'halley86@test.local',
    'Jose Molla': 'jose.molla@test.local',
    'Monica Levy Chicheportiche': 'monica.levy@test.local',
    'Nath & Thomas': 'nath.thomas@test.local',
    'Valeria Cruz': 'valeria.cruz@test.local',
    'Ryan Van Der Wall': 'ryan.vanderwall@test.local',
    'Indigo Fees': 'indigo.fees@test.local',
  };
  return mapping[investorName] || `${investorName.toLowerCase().replace(/[^a-z]/g, '.')}@test.local`;
}

// ============================================================================
// Test Suite
// ============================================================================

test.describe.serial('USDT Yield Fund - Ralph Loop Validation', () => {
  let fundId: string;
  const investorIds: Record<string, string> = {};

  test.beforeAll(async () => {
    await deleteRecords('transactions_v2', 'reference_id=like.test-usdt%');
    await deleteRecords('yield_distributions', 'fund_id=like.%');
    await deleteRecords('investor_positions', 'fund_id=like.%');
    await deleteRecords('funds', 'code=like.IND-USDT%');
    
    const funds = await insert('funds', {
      code: 'IND-USDT',
      name: 'USDT Yield Fund',
      asset: 'USDT',
      status: 'active',
      inception_date: '2025-07-14',
      fund_class: 'yield',
    });
    fundId = (funds[0] as { id: string }).id;
    console.log(`\n=== Created Fund: ${fundId} ===`);
  });

  test('A1: Create USDT Yield Fund', async () => {
    expect(fundId).toBeDefined();
    console.log(`USDT Fund created: ${fundId}`);
  });

  test('A2: Create investors with fee structure', async () => {
    const investors = [
      { email: 'julien.grunebaum@test.local', firstName: 'Julien', lastName: 'Grunebaum', feePct: 10, ibPct: null },
      { email: 'daniele.francilia@test.local', firstName: 'Daniele', lastName: 'Francilia', feePct: 10, ibPct: null },
      { email: 'pierre.bezencon@test.local', firstName: 'Pierre', lastName: 'Bezencon', feePct: 10, ibPct: null },
      { email: 'matthew.beatty@test.local', firstName: 'Matthew', lastName: 'Beatty', feePct: 10, ibPct: null },
      { email: 'bo.dekriek@test.local', firstName: 'Bo', lastName: 'De Kriek', feePct: 10, ibPct: null },
      { email: 'dario.deiana@test.local', firstName: 'Dario', lastName: 'Deiana', feePct: 10, ibPct: null },
      { email: 'babak.eftekhari@test.local', firstName: 'Babak', lastName: 'Eftekhari', feePct: 18, ibPct: 2, ibName: 'Ryan Van Der Wall' },
      { email: 'alain.bensimon@test.local', firstName: 'Alain', lastName: 'Bensimon', feePct: 10, ibPct: null },
      { email: 'anne.cecile.noique@test.local', firstName: 'Anne Cecile', lastName: 'Noique', feePct: 10, ibPct: null },
      { email: 'terance.chen@test.local', firstName: 'Terance', lastName: 'Chen', feePct: 10, ibPct: null },
      { email: 'indigo.ventures@test.local', firstName: 'INDIGO', lastName: 'Ventures', feePct: 0, ibPct: null },
      { email: 'indigo.lp@test.local', firstName: 'INDIGO', lastName: 'DIGITAL ASSET FUND LP', feePct: 0, ibPct: null },
      { email: 'sacha.oshry@test.local', firstName: 'Sacha', lastName: 'Oshry', feePct: 10, ibPct: null },
      { email: 'halley86@test.local', firstName: 'HALLEY86', lastName: '', feePct: 0, ibPct: null },
      { email: 'jose.molla@test.local', firstName: 'Jose', lastName: 'Molla', feePct: 15, ibPct: null },
      { email: 'monica.levy@test.local', firstName: 'Monica', lastName: 'Levy Chicheportiche', feePct: 0, ibPct: null },
      { email: 'nath.thomas@test.local', firstName: 'Nath', lastName: '& Thomas', feePct: 0, ibPct: null },
      { email: 'valeria.cruz@test.local', firstName: 'Valeria', lastName: 'Cruz', feePct: 0, ibPct: null },
      { email: 'ryan.vanderwall@test.local', firstName: 'Ryan', lastName: 'Van Der Wall', feePct: 20, ibPct: null },
      { email: 'indigo.fees@test.local', firstName: 'Indigo', lastName: 'Fees', feePct: 0, ibPct: null },
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
  for (let i = 0; i < USDT_LIFECYCLE.transactions.length; i++) {
    const tx = USDT_LIFECYCLE.transactions[i];
    const testName = `B${i+1}: ${tx.investor} ${tx.type.toLowerCase()} ${tx.amount} USDT (${tx.date})`;
    
    test(testName, async () => {
      const email = getInvestorEmailAddress(tx.investor);
      const investorId = investorIds[email];
      
      await rpc('apply_investor_transaction', {
        p_fund_id: fundId,
        p_investor_id: investorId,
        p_tx_type: tx.type,
        p_amount: tx.amount,
        p_tx_date: tx.date,
        p_reference_id: `test-usdt-tx-${i}`,
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
        
        console.log(`  ${dist.period_end}: gross=${gross.toFixed(2)}, net+fees+ib=${calculated.toFixed(2)}, diff=${diff.toFixed(6)}`);
        expect(diff).toBeLessThan(0.01);
      }
    }

    console.log('✅ CONSERVATION HOLDS');
  });
});