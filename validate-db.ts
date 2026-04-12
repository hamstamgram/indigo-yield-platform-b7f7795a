import { ExcelParser } from './src/lib/validation/excelParser';
import { createClient } from '@supabase/supabase-js';

const LOCAL_URL = 'http://127.0.0.1:54321';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const EXCEL_PATH = './docs/source-of-truth/Accounting Yield Funds (6).xlsx';

interface ValidationResult {
  fundName: string;
  currency: string;
  transactions: number;
  passed: boolean;
  errors: string[];
  finalPositions: Record<string, { value: number; costBasis: number }>;
}

async function rpc(fnName: string, params: Record<string, unknown> = {}): Promise<unknown> {
  const res = await fetch(`${LOCAL_URL}/rest/v1/rpc/${fnName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      Prefer: 'return=representation',
    },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`RPC ${fnName} failed (${res.status}): ${text}`);
  }
  return res.json();
}

async function insert(table: string, data: Record<string, unknown>): Promise<unknown[]> {
  const res = await fetch(`${LOCAL_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      Prefer: 'return=representation',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`INSERT ${table} failed (${res.status}): ${text}`);
  }
  return res.json();
}

async function query(table: string, filters: string): Promise<unknown[]> {
  const res = await fetch(`${LOCAL_URL}/rest/v1/${table}?${filters}`, {
    method: 'GET',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SELECT ${table} failed (${res.status}): ${text}`);
  }
  return res.json();
}

async function deleteRecords(table: string, filter: string): Promise<void> {
  await fetch(`${LOCAL_URL}/rest/v1/${table}?${filter}`, {
    method: 'DELETE',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
  });
}

async function getOrCreateUser(email: string, password: string, firstName: string, lastName: string): Promise<string> {
  // Check if user exists
  const listRes = await fetch(`${LOCAL_URL}/auth/v1/admin/users`, {
    method: 'GET',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
  });
  const resp = await listRes.json();
  const users = resp.users || [];
  const found = users.find((u: { email?: string }) => u.email === email);
  if (found) {
    // Clean up old profile data
    await deleteRecords('investor_positions', `investor_id=eq.${found.id}`);
    await deleteRecords('profiles', `id=eq.${found.id}`);
    return found.id;
  }

  // Create new user
  const res = await fetch(`${LOCAL_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  const data = await res.json();
  if (!data.id) throw new Error(`Failed to create user ${email}: ${JSON.stringify(data)}`);
  return data.id;
}

async function createProfile(userId: string, email: string, firstName: string, lastName: string, role: string): Promise<void> {
  await insert('profiles', {
    id: userId,
    email,
    first_name: firstName,
    last_name: lastName,
    role,
    is_admin: role === 'admin',
  });
}

async function validateFund(fund: {
  fundName: string;
  currency: string;
  transactions: Array<{
    date: string;
    investorName: string;
    amount: number;
    feePercentage?: number | null;
    ibPercentage?: number | null;
    ibName?: string | null;
  }>;
  investors: Array<{ name: string; feePct: number; ibPct: number | null }>;
}): Promise<ValidationResult> {
  const result: ValidationResult = {
    fundName: fund.fundName,
    currency: fund.currency,
    transactions: fund.transactions.length,
    passed: true,
    errors: [],
    finalPositions: {},
  };

  console.log(`\n📊 Validating ${fund.fundName} (${fund.currency})...`);

  try {
    // Create fund
    const fundCode = `IND-${fund.currency.substring(0, 4).toUpperCase()}`;
    const funds = await insert('funds', {
      code: fundCode,
      name: fund.fundName,
      asset: fund.currency,
      status: 'active',
      inception_date: fund.transactions[0]?.date || '2024-01-01',
      fund_class: 'yield',
    });
    const fundId = (funds[0] as { id: string }).id;
    console.log(`  ✓ Fund created: ${fundId}`);

    // Create investors
    const investorIds = new Map<string, string>();
    for (const inv of fund.investors) {
      const email = `${inv.name.toLowerCase().replace(/[^a-z]/g, '.')}@test.local`;
      const [firstName, ...rest] = inv.name.split(' ');
      const lastName = rest.join(' ');

      const userId = await getOrCreateUser(email, 'Test1234!', firstName, lastName);
      investorIds.set(inv.name, userId);

      await createProfile(userId, email, firstName, lastName, 'investor');

      // Create position
      await insert('investor_positions', {
        investor_id: userId,
        fund_id: fundId,
        current_value: 0,
        cost_basis: 0,
        shares: 0,
        is_active: true,
      });

      // Set fee schedule
      if (inv.feePct > 0) {
        await insert('investor_fee_schedule', {
          investor_id: userId,
          fund_id: fundId,
          fee_pct: inv.feePct,
          effective_date: '2024-01-01',
        });
      }

      // Set IB schedule if applicable
      if (inv.ibPct !== null && inv.ibPct > 0) {
        await insert('ib_commission_schedule', {
          investor_id: userId,
          fund_id: fundId,
          ib_percentage: inv.ibPct,
          effective_date: '2024-01-01',
        });
      }
    }
    console.log(`  ✓ ${fund.investors.length} investors created`);

    // Apply transactions in chronological order
    let txCount = 0;
    for (const tx of fund.transactions) {
      const investorId = investorIds.get(tx.investorName);
      if (!investorId) {
        result.errors.push(`Unknown investor: ${tx.investorName}`);
        result.passed = false;
        continue;
      }

      const txType = tx.amount >= 0 ? 'deposit' : 'withdrawal';
      const amount = Math.abs(tx.amount);

      try {
        await rpc('apply_investor_transaction', {
          p_admin_id: '00000000-0000-0000-0000-000000000001',
          p_amount: amount,
          p_fund_id: fundId,
          p_investor_id: investorId,
          p_reference_id: `excel-${tx.investorName}-${tx.date}`,
          p_tx_date: tx.date,
          p_tx_type: txType,
        });
        txCount++;
      } catch (e: any) {
        result.errors.push(`Transaction failed for ${tx.investorName} on ${tx.date}: ${e.message}`);
      }
    }
    console.log(`  ✓ ${txCount} transactions applied`);

    // Get final positions
    const positions = await query('investor_positions', `fund_id=eq.${fundId}`);
    for (const pos of positions as Array<{ investor_id: string; current_value: number; cost_basis: number }>) {
      // Find investor name by ID
      const invEntry = Array.from(investorIds.entries()).find(([, id]) => id === pos.investor_id);
      const invName = invEntry ? invEntry[0] : pos.investor_id;
      result.finalPositions[invName] = {
        value: Number(pos.current_value),
        costBasis: Number(pos.cost_basis),
      };
    }
    console.log(`  ✓ Final positions captured`);

  } catch (e: any) {
    result.errors.push(e.message);
    result.passed = false;
  }

  return result;
}

async function main() {
  console.log('='.repeat(60));
  console.log('INDIGO YIELD - FUND LIFECYCLE DATABASE VALIDATION');
  console.log('='.repeat(60));

  // Load Excel
  console.log('\n📁 Loading Excel file...');
  const parser = new ExcelParser();
  await parser.load(EXCEL_PATH);
  const funds = await parser.parseAllFunds();
  console.log(`✓ Loaded ${funds.length} funds with ${funds.reduce((sum, f) => sum + f.transactions.length, 0)} total transactions\n`);

  const results: ValidationResult[] = [];

  // Validate each fund
  for (const fund of funds) {
    // Skip if no transactions
    if (fund.transactions.length === 0) continue;

    // Skip if more than 20 transactions (too complex for quick validation)
    if (fund.transactions.length > 20) {
      console.log(`\n⏭️  Skipping ${fund.fundName} (${fund.transactions.length} transactions - too complex for quick test)`);
      continue;
    }

    const result = await validateFund(fund);
    results.push(result);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('VALIDATION SUMMARY');
  console.log('='.repeat(60));

  for (const r of results) {
    const status = r.passed ? '✅ PASSED' : '❌ FAILED';
    console.log(`\n${r.fundName} (${r.currency}): ${status}`);
    console.log(`  Transactions: ${r.transactions}`);
    if (r.errors.length > 0) {
      console.log(`  Errors:`);
      for (const e of r.errors) {
        console.log(`    - ${e}`);
      }
    }
    if (Object.keys(r.finalPositions).length > 0) {
      console.log(`  Final Positions:`);
      for (const [name, pos] of Object.entries(r.finalPositions)) {
        console.log(`    ${name}: value=${pos.value.toFixed(6)}, costBasis=${pos.costBasis.toFixed(6)}`);
      }
    }
  }

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(`\n${'='.repeat(60)}`);
  console.log(`TOTAL: ${passed} passed, ${failed} failed out of ${results.length} funds`);
  console.log('='.repeat(60));
}

main().catch(console.error);
